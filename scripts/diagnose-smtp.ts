import "dotenv/config";
import nodemailer from "nodemailer";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { resolveEnvSmtpConfig, resolveSmtpConfig } from "../src/lib/mail";

const TO = process.env.TEST_CUSTOMER_EMAIL ?? "adiiinaaaa86@gmail.com";

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL!;
  const url = new URL(databaseUrl);
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  });
  return new PrismaClient({ adapter });
}

async function main() {
  console.log("=== SMTP-diagnos ===\n");
  console.log("Mottagare (TO):", TO);
  console.log("Från .env (USER):", process.env.SMTP_USER);
  console.log("Från .env (FROM):", process.env.SMTP_FROM);
  console.log("Lösenord satt:", process.env.SMTP_PASS ? `ja (${process.env.SMTP_PASS.length} tecken)` : "NEJ");

  const prisma = createPrismaClient();
  const store = await prisma.store.findFirst({
    select: {
      name: true,
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      smtpFrom: true,
      smtpUser: true,
      smtpPass: true,
    },
  });

  if (store) {
    console.log("\nButik i databas:", store.name);
    console.log("Butik har SMTP host:", store.smtpHost ?? "(tom)");
    console.log("(Om butiken har SMTP ifyllt används DEN istället för .env)\n");
  }

  let config;
  try {
    config = store ? resolveSmtpConfig(store) : resolveEnvSmtpConfig()!;
    console.log("Aktiv SMTP-konfiguration:");
    console.log("  host:", config.host);
    console.log("  port:", config.port);
    console.log("  user:", config.user);
    console.log("  from:", config.from);
  } catch (e) {
    console.error("Kunde inte läsa SMTP:", e);
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });

  console.log("\n1) Verifierar inloggning mot Gmail...");
  try {
    await transporter.verify();
    console.log("   OK – Gmail accepterade inloggning.\n");
  } catch (error) {
    console.error("   MISSLYCKAD inloggning:");
    console.error(error);
    console.log("\n→ Byt SMTP_PASS till ett nytt app-lösenord för", config.user);
    process.exit(1);
  }

  console.log("2) Skickar testmail till", TO, "...");
  try {
    const info = await transporter.sendMail({
      from: config.from,
      to: TO,
      subject: "POS SMTP-test – om du ser detta fungerar utskick",
      text: `Detta mail skickades ${new Date().toISOString()} från ${config.user} till ${TO}.`,
      html: `<p>SMTP-test OK.</p><p>Från: <strong>${config.user}</strong></p><p>Till: <strong>${TO}</strong></p>`,
    });

    console.log("   Nodemailer svar:");
    console.log("   messageId:", info.messageId);
    console.log("   accepted:", info.accepted);
    console.log("   rejected:", info.rejected);
    console.log("   response:", info.response);
    console.log("\n→ Om accepted innehåller din adress skickade Gmail ut mailet.");
    console.log("→ Kolla INBOX + SKRÄPPOST + fliken Alla mail på", TO);
    console.log("→ Kolla också Skickat på", config.user, "om det hamnat där.");
  } catch (error) {
    console.error("   Skicka misslyckades:");
    console.error(error);
    process.exit(1);
  }

  await prisma.$disconnect();
}

main();
