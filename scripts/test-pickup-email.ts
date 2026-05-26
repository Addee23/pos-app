/**
 * Testar hela flödet: redo-order → mail till kundens e-post.
 * Kör: npm run test:pickup-email
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PickupStatus, PrismaClient } from "../src/generated/prisma/client";
import { autoNotifyPickupReady } from "../src/lib/pickup-notifications";

const TEST_CUSTOMER_EMAIL =
  process.env.TEST_CUSTOMER_EMAIL ?? "adiiinaaaa86@gmail.com";

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL saknas i .env");
  }

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
  const prisma = createPrismaClient();

  const pickups = await prisma.pickup.findMany({
    where: { status: PickupStatus.READY },
    select: { id: true, pickupCode: true, customerEmail: true },
  });

  if (pickups.length === 0) {
    console.log("Inga redo-order hittades. Kör först: npm run db:seed");
    return;
  }

  console.log(`\nTestar upphämtningsmail till: ${TEST_CUSTOMER_EMAIL}`);
  console.log(`(Skickas FRÅN: ${process.env.SMTP_USER ?? "SMTP saknas i .env"})\n`);

  for (const pickup of pickups) {
    await prisma.pickup.update({
      where: { id: pickup.id },
      data: {
        customerEmail: TEST_CUSTOMER_EMAIL,
        readyEmailSentAt: null,
        status: PickupStatus.READY,
      },
    });

    const result = await autoNotifyPickupReady(pickup.id);
    console.log(`${pickup.pickupCode}: ${result.status}`, result);
  }

  console.log("\nKlart! Kolla inkorgen (och skräppost) på:", TEST_CUSTOMER_EMAIL);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
