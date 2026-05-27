import nodemailer from "nodemailer";
import type { Store } from "@/generated/prisma/client";
import { decryptSecret } from "@/lib/secret-crypto";
import { resolvePickupAddress } from "@/lib/constants/pickup";
import { getStaticMapImageUrlForAddress } from "@/lib/maps";
import {
  buildPickupReadyHtml,
  buildPickupReadySubject,
  buildPickupReadyText,
  type PickupReadyEmailData,
} from "@/lib/mail/pickup-ready-email";

export type { PickupReadyEmailData } from "@/lib/mail/pickup-ready-email";
export { PICKUP_EMAIL_COPY } from "@/lib/mail/pickup-ready-email";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

type StoreSmtpFields = Pick<
  Store,
  "smtpHost" | "smtpPort" | "smtpSecure" | "smtpUser" | "smtpPass" | "smtpFrom"
>;

export class MailConfigurationError extends Error {
  constructor(message = "SMTP är inte konfigurerat") {
    super(message);
    this.name = "MailConfigurationError";
  }
}

export function resolveEnvSmtpConfig(): SmtpConfig | null {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS ||
    !process.env.SMTP_FROM
  ) {
    return null;
  }

  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
  };
}

export function resolveStoreSmtpConfig(store: StoreSmtpFields): SmtpConfig | null {
  if (
    !store.smtpHost ||
    !store.smtpPort ||
    !store.smtpUser ||
    !store.smtpPass ||
    !store.smtpFrom
  ) {
    return null;
  }

  try {
    return {
      host: store.smtpHost,
      port: store.smtpPort,
      secure: store.smtpSecure,
      user: decryptSecret(store.smtpUser),
      pass: decryptSecret(store.smtpPass),
      from: store.smtpFrom,
    };
  } catch {
    return null;
  }
}

export function resolveSmtpConfig(store?: StoreSmtpFields | null): SmtpConfig {
  const storeConfig = store ? resolveStoreSmtpConfig(store) : null;
  if (storeConfig) {
    return storeConfig;
  }

  const envConfig = resolveEnvSmtpConfig();
  if (envConfig) {
    return envConfig;
  }

  throw new MailConfigurationError(
    "SMTP saknas. Fyll i under Inställningar eller i .env (SMTP_HOST, SMTP_USER m.fl.).",
  );
}

export function createMailTransporter(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

export async function sendPickupReadyEmail(
  pickup: PickupReadyEmailData,
  smtpConfig?: SmtpConfig,
) {
  if (!pickup.customerEmail) {
    throw new Error("Kunden saknar e-postadress");
  }

  const config = smtpConfig ?? resolveSmtpConfig();
  const transporter = createMailTransporter(config);

  const pickupForSend: PickupReadyEmailData = {
    ...pickup,
    store: {
      ...pickup.store,
      address: resolvePickupAddress(pickup.store.address),
    },
  };

  const rawMapImageSrc = await getStaticMapImageUrlForAddress(
    pickupForSend.store.address!,
  );
  const mapImageSrc = toEmailSafeImageUrl(rawMapImageSrc);

  await transporter.sendMail({
    from: config.from,
    to: pickup.customerEmail,
    subject: buildPickupReadySubject(pickupForSend),
    text: buildPickupReadyText(pickupForSend),
    html: buildPickupReadyHtml(pickupForSend, {
      mapImageSrc,
      productImageSrcs: pickupForSend.items.map((item) =>
        toEmailSafeImageUrl(item.productImageUrl),
      ),
    }),
  });
}

export async function sendTestEmail(config: SmtpConfig, recipient: string) {
  // Även ett SMTP-test ska visa den riktiga kundupplevelsen:
  // produkt, upphämtningskod, butiksadress och karta.
  await sendPickupReadyEmail(
    {
      customerEmail: recipient,
      customerName: "Testkund",
      pickupCode: "TEST-ORDER",
      notes:
        "Det här är en förhandsvisning av mailet som skickas när en order är redo för upphämtning.",
      store: {
        name: "POS & Lager",
        address: null,
        logoUrl: null,
        thankYouMessage: "Tack för ditt köp - vi ses i butiken!",
        returnText: null,
        receiptFooter: null,
      },
      items: [
        {
          productName: "Exempelprodukt",
          variantName: "1 st",
          quantity: 1,
          productImageUrl:
            "https://dummyimage.com/640x420/1a4d5c/ffffff.jpg?text=Produktbild",
          productInfo:
            "Här visas produktens metabeskrivning, korta beskrivning eller annan produktinformation.",
        },
      ],
    },
    config,
  );
}

function toEmailSafeImageUrl(url: string | null | undefined): string | null {
  const trimmedUrl = url?.trim();
  if (!trimmedUrl || !/^https?:\/\//i.test(trimmedUrl)) {
    return null;
  }

  // Mailklienter är sämre än webbläsare på moderna bildformat som WebP.
  // Därför gör vi produktbilder/kartor till JPG-länkar, men fortfarande som
  // vanliga externa HTML-bilder, inte som bilagor eller cid.
  const proxiedUrl = new URL("https://images.weserv.nl/");
  proxiedUrl.searchParams.set("url", trimmedUrl);
  proxiedUrl.searchParams.set("w", "640");
  proxiedUrl.searchParams.set("output", "jpg");

  return proxiedUrl.toString();
}
