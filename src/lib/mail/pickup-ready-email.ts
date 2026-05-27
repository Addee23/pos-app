import type { Pickup, PickupItem, Store } from "@/generated/prisma/client";
import { buildGoogleMapsUrl } from "@/lib/maps";

/** Färger och texter – enkelt att justera. */
export const EMAIL_THEME = {
  pageBg: "#e8eef2",
  cardBg: "#ffffff",
  primary: "#1a4d5c",
  primaryDark: "#123a46",
  accent: "#c9a227",
  accentSoft: "#f7f0de",
  text: "#1e293b",
  muted: "#64748b",
  border: "#dce5ea",
  success: "#0f766e",
} as const;

export const PICKUP_EMAIL_COPY = {
  subjectPrefix: "Din order är redo att hämtas",
  headline: "Din order är redo!",
  subheadline: "Du kan hämta den i butiken när det passar dig.",
  intro:
    "Vi har packat din order och den väntar på dig. Ta med upphämtningskoden nedan.",
  pickupLabel: "Upphämtningskod",
  productsHeading: "Detta ingår i din order",
  mapHeading: "Här hämtar du din order",
  mapButton: "Öppna i Google Maps",
  instructionsHeading: "Vid upphämtning",
  instructions: [
    "Visa upphämtningskoden eller detta mail i kassan.",
    "Ha legitimation redo om vi behöver verifiera köpet.",
  ],
  defaultThankYou: "Tack för ditt köp – vi ses i butiken!",
  footerNote:
    "Automatiskt meddelande om din order. Kontakta butiken vid frågor.",
} as const;

export type PickupReadyEmailStore = Pick<
  Store,
  "name" | "address" | "logoUrl" | "thankYouMessage" | "returnText" | "receiptFooter"
>;

export type PickupReadyEmailItem = Pick<
  PickupItem,
  "productName" | "variantName" | "quantity" | "productImageUrl"
> & {
  /** Produktinfo i mail: helst metabeskrivning, annars Woo short_description/description. */
  productInfo: string | null;
};

export type PickupReadyEmailData = Pick<
  Pickup,
  "customerEmail" | "customerName" | "pickupCode" | "notes"
> & {
  store: PickupReadyEmailStore;
  items: PickupReadyEmailItem[];
};

/** Bildlänkar som läggs direkt i HTML-mailet. Det här är inte bilagor. */
export type PickupReadyEmailVisualAssets = {
  mapImageSrc?: string | null;
  productImageSrcs?: Array<string | null>;
};

export function buildPickupReadySubject(pickup: PickupReadyEmailData): string {
  return `${PICKUP_EMAIL_COPY.subjectPrefix} – ${pickup.pickupCode}`;
}

export function buildPickupReadyText(pickup: PickupReadyEmailData): string {
  const mapsUrl = pickup.store.address
    ? buildGoogleMapsUrl(pickup.store.address)
    : null;

  const itemLines = pickup.items
    .map((item) => {
      const lines = [`  • ${item.quantity} st – ${itemLabel(item)}`];
      if (item.productInfo) {
        lines.push(`    ${item.productInfo}`);
      }
      return lines.join("\n");
    })
    .join("\n");

  const thankYou =
    pickup.store.thankYouMessage?.trim() || PICKUP_EMAIL_COPY.defaultThankYou;

  return [
    `Hej ${pickup.customerName}!`,
    "",
    `${PICKUP_EMAIL_COPY.headline} ${PICKUP_EMAIL_COPY.subheadline}`,
    "",
    PICKUP_EMAIL_COPY.intro,
    "",
    `${PICKUP_EMAIL_COPY.pickupLabel}: ${pickup.pickupCode}`,
    pickup.store.address ? `\n${PICKUP_EMAIL_COPY.mapHeading}:\n${pickup.store.address}` : "",
    mapsUrl ? `\nGoogle Maps: ${mapsUrl}` : "",
    "",
    `${PICKUP_EMAIL_COPY.productsHeading}:`,
    itemLines || "  • Produktinformation saknas",
    "",
    thankYou,
    "",
    `— ${pickup.store.name}`,
    pickup.store.receiptFooter ?? "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function buildPickupReadyHtml(
  pickup: PickupReadyEmailData,
  visualAssets?: PickupReadyEmailVisualAssets,
): string {
  const t = EMAIL_THEME;
  const thankYou =
    pickup.store.thankYouMessage?.trim() || PICKUP_EMAIL_COPY.defaultThankYou;

  const address = pickup.store.address?.trim() ?? "";
  const mapsUrl = address ? buildGoogleMapsUrl(address) : null;
  const mapImageSrc = visualAssets?.mapImageSrc ?? null;

  const productCards = pickup.items
    .map((item, index) =>
      buildProductCard(
        item,
        t,
        visualAssets?.productImageSrcs?.[index] ?? item.productImageUrl,
      ),
    )
    .join("");

  const instructionItems = PICKUP_EMAIL_COPY.instructions
    .map(
      (line) =>
        `<li style="margin:0 0 8px;font-size:14px;line-height:1.5;color:${t.muted};">${escapeHtml(line)}</li>`,
    )
    .join("");

  const logoUrl = pickup.store.logoUrl?.trim() ?? "";
  const canRenderLogo = logoUrl && !logoUrl.toLowerCase().includes(".svg");
  const logoBlock = canRenderLogo
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(pickup.store.name)}" width="160" style="display:block;max-width:160px;max-height:72px;width:auto;height:auto;margin:0 auto;" />`
    : `<p style="margin:0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:0.02em;">${escapeHtml(pickup.store.name)}</p>`;

  const mapSection = address
    ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 28px;border:1px solid ${t.border};border-radius:14px;overflow:hidden;">
      ${
        mapImageSrc && mapsUrl
          ? `<tr>
              <td style="padding:0;line-height:0;background:#e8eef2;">
                <a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
                  <img src="${escapeHtml(mapImageSrc)}" alt="Karta till ${escapeHtml(pickup.store.name)}" width="512" style="display:block;width:100%;max-width:100%;height:auto;min-height:180px;object-fit:cover;border:0;" />
                </a>
              </td>
            </tr>`
          : ""
      }
      <tr>
        <td style="padding:18px 20px;background:${t.cardBg};">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${t.primary};">
            ${escapeHtml(PICKUP_EMAIL_COPY.mapHeading)}
          </p>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.5;color:${t.text};">
            ${escapeHtml(address)}
          </p>
          ${
            mapsUrl
              ? `<a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:${t.primary};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 18px;border-radius:10px;">
                  ${escapeHtml(PICKUP_EMAIL_COPY.mapButton)}
                </a>`
              : ""
          }
          ${
            mapImageSrc && mapsUrl
              ? `<p style="margin:12px 0 0;font-size:12px;line-height:1.45;color:${t.muted};">
                  Om kartbilden inte visas i mailprogrammet kan du öppna platsen via knappen ovan.
                </p>`
              : ""
          }
        </td>
      </tr>
    </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="sv">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(buildPickupReadySubject(pickup))}</title>
  </head>
  <body style="margin:0;padding:0;background:${t.pageBg};font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${t.pageBg};padding:28px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${t.cardBg};border-radius:20px;overflow:hidden;border:1px solid ${t.border};box-shadow:0 12px 40px rgba(26,77,92,0.12);">
            <tr>
              <td style="background:linear-gradient(145deg,${t.primary} 0%,${t.primaryDark} 100%);padding:32px 28px 28px;text-align:center;">
                ${logoBlock}
                <p style="margin:16px 0 6px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${t.accent};">
                  ${escapeHtml(pickup.store.name)}
                </p>
                <h1 style="margin:0 0 8px;font-size:28px;line-height:1.2;font-weight:800;color:#ffffff;">
                  ${escapeHtml(PICKUP_EMAIL_COPY.headline)}
                </h1>
                <p style="margin:0;font-size:15px;line-height:1.5;color:#d9eef3;">
                  ${escapeHtml(PICKUP_EMAIL_COPY.subheadline)}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px 8px;color:${t.text};">
                <p style="margin:0 0 20px;font-size:16px;line-height:1.6;">
                  Hej <strong>${escapeHtml(pickup.customerName)}</strong>,
                </p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:${t.muted};">
                  ${escapeHtml(PICKUP_EMAIL_COPY.intro)}
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 28px;background:${t.accentSoft};border:2px solid ${t.accent};border-radius:14px;">
                  <tr>
                    <td style="padding:22px 20px;text-align:center;">
                      <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${t.primary};">
                        ${escapeHtml(PICKUP_EMAIL_COPY.pickupLabel)}
                      </p>
                      <p style="margin:0;font-size:32px;font-weight:800;letter-spacing:0.06em;color:${t.primaryDark};">
                        ${escapeHtml(pickup.pickupCode)}
                      </p>
                    </td>
                  </tr>
                </table>

                ${mapSection}

                <p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${t.primary};">
                  ${escapeHtml(PICKUP_EMAIL_COPY.productsHeading)}
                </p>
                ${productCards || `<p style="margin:0 0 24px;color:${t.muted};font-size:14px;">Produktinformation saknas.</p>`}

                <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${t.primary};">
                  ${escapeHtml(PICKUP_EMAIL_COPY.instructionsHeading)}
                </p>
                <ul style="margin:0 0 24px;padding-left:18px;">
                  ${instructionItems}
                </ul>

                ${
                  pickup.notes
                    ? `<p style="margin:0 0 24px;padding:14px 16px;background:#f8fafc;border-left:4px solid ${t.accent};border-radius:8px;font-size:14px;line-height:1.55;color:${t.muted};"><strong style="color:${t.text};">Meddelande:</strong> ${escapeHtml(pickup.notes)}</p>`
                    : ""
                }

                ${
                  pickup.store.returnText
                    ? `<p style="margin:0 0 24px;font-size:13px;line-height:1.55;color:${t.muted};">${escapeHtml(pickup.store.returnText)}</p>`
                    : ""
                }

                <p style="margin:0;font-size:17px;font-weight:700;color:${t.primary};">
                  ${escapeHtml(thankYou)}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 24px;background:#f8fafc;border-top:1px solid ${t.border};text-align:center;">
                <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:${t.text};">
                  ${escapeHtml(pickup.store.name)}
                </p>
                ${
                  pickup.store.receiptFooter
                    ? `<p style="margin:0 0 10px;font-size:12px;line-height:1.5;color:${t.muted};">${escapeHtml(pickup.store.receiptFooter)}</p>`
                    : ""
                }
                <p style="margin:0;font-size:11px;line-height:1.45;color:#94a3b8;">
                  ${escapeHtml(PICKUP_EMAIL_COPY.footerNote)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildProductCard(
  item: PickupReadyEmailItem,
  t: typeof EMAIL_THEME,
  imageSrc: string | null | undefined,
): string {
  const src = imageSrc ?? item.productImageUrl;
  const image = src
    ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(itemLabel(item))}" width="96" height="96" style="display:block;width:96px;height:96px;object-fit:cover;border-radius:12px;border:1px solid ${t.border};" />`
    : `<div style="width:96px;height:96px;border-radius:12px;background:linear-gradient(145deg,${t.primary} 0%,${t.primaryDark} 100%);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:11px;font-weight:700;text-align:center;padding:8px;">Ingen bild</div>`;

  const variantLine = item.variantName
    ? `<p style="margin:4px 0 0;font-size:13px;font-weight:600;color:${t.primary};">${escapeHtml(item.variantName)}</p>`
    : "";

  const descriptionLine = item.productInfo
    ? `<p style="margin:10px 0 0;font-size:13px;line-height:1.55;color:${t.muted};">${escapeHtml(item.productInfo)}</p>`
    : "";

  const imageFallbackLink = src
    ? `<p style="margin:8px 0 0;font-size:12px;line-height:1.4;">
        <a href="${escapeHtml(src)}" target="_blank" rel="noopener noreferrer" style="color:${t.primary};font-weight:700;text-decoration:none;">
          Öppna produktbild
        </a>
      </p>`
    : "";

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 12px;border:1px solid ${t.border};border-radius:14px;overflow:hidden;">
      <tr>
        <td width="112" style="padding:12px;vertical-align:top;background:#f8fafc;">
          ${image}
        </td>
        <td style="padding:14px 16px 14px 0;vertical-align:top;">
          <p style="margin:0;font-size:16px;font-weight:700;line-height:1.35;color:${t.text};">
            ${escapeHtml(item.productName)}
          </p>
          ${variantLine}
          ${descriptionLine}
          ${imageFallbackLink}
          <p style="margin:${item.productInfo ? "12" : "10"}px 0 0;font-size:13px;font-weight:700;color:${t.success};">
            Antal: ${item.quantity} st
          </p>
        </td>
      </tr>
    </table>`;
}

function itemLabel(item: PickupReadyEmailItem): string {
  return item.variantName
    ? `${item.productName} – ${item.variantName}`
    : item.productName;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
