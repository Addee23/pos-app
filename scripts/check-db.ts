import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL saknas");
}

const url = new URL(databaseUrl);
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  }),
});

async function main() {
  const stores = await prisma.store.count();
  const products = await prisma.product.count();
  console.log(`DB OK — ${stores} butiker, ${products} produkter`);
}

void main()
  .catch((error) => {
    console.error("DB FEL:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
