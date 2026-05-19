# POS & Lagerhanteringssystem

Internt POS- och lagerhanteringssystem (mobile-first) enligt LIA-projektbeskrivningen.

## Vecka 1 – vad som är klart

- Inloggning med **Auth.js (NextAuth)**
- Roller: **ADMIN** och **PERSONAL** (RBAC i middleware + API)
- Krypterade lösenord med **bcrypt**
- **Produkthantering** för admin (sök, filtrera per butik, redigera pris/EAN/lager/lagerplats)
- **Audit logs** vid produktändringar
- **Zod**-validering på API

## Teknik

- Next.js 16 + TypeScript
- Prisma ORM + MySQL
- Tailwind CSS
- Auth.js v5

## Kom igång (steg för steg)

### 1. Installera MySQL

**Alternativ A – Docker (rekommenderat om du har Docker Desktop):**

```powershell
cd c:\Users\adiii\OneDrive\Documents\LIA2\pos-app
docker compose up -d
```

**Alternativ B – XAMPP (om du inte har Docker):**

1. Ladda ner [XAMPP](https://www.apachefriends.org/) och starta **MySQL**
2. Öppna phpMyAdmin (`http://localhost/phpmyadmin`)
3. Skapa databasen `pos_app`
4. Skapa användare `pos` med lösenord `pos_password` och ge åtkomst till `pos_app`
5. Uppdatera `.env` om du använder andra uppgifter

Vänta tills MySQL körs innan du går vidare.

### 3. Miljövariabler

Kopiera `.env.example` till `.env` (redan skapad vid utveckling):

```
DATABASE_URL="mysql://pos:pos_password@localhost:3306/pos_app"
AUTH_SECRET="din-hemliga-nyckel-minst-32-tecken"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Databasmigrering och testdata

```powershell
npm run db:migrate
npm run db:seed
```

### 5. Starta appen

```powershell
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000)

### Testkonton

| Roll     | E-post              | Lösenord     |
|----------|---------------------|--------------|
| Admin    | admin@butik.se      | admin123     |
| Personal | personal@butik.se   | personal123  |

## Projektstruktur

```
src/
  app/
    login/          # Inloggning
    (app)/          # Skyddade sidor med navigation
      kassa/
      admin/products/
  auth.ts           # Auth.js-konfiguration
  middleware.ts     # RBAC & omdirigering
  lib/              # Prisma, validering, audit
  components/       # UI-komponenter
prisma/
  schema.prisma     # Datamodell
  seed.ts           # Testdata
```

## Nästa steg (vecka 2+)

- Kassaflöde (skanning, kvitto)
- WooCommerce webhook-sync
- Upphämtningar
- PWA + kamera
- Dashboard med sync-status

## Git

```powershell
git checkout -b dev
git add .
git commit -m "feat: login, roller och produkthantering"
```
