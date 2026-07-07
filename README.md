# POS & Lagerhanteringssystem

Internt POS- och lagerhanteringssystem (mobile-first PWA) kopplat till WooCommerce, byggt som LIA-projekt.

## Vad systemet gör

- **Kassa (POS)** — sök/skanna produkter via namn, EAN eller WooCommerce-URL, lägg till i varukorg, slutför köp, skriv ut kvitto. Lokalt lagersaldo minskas och synkas till WooCommerce.
- **Produktsök** — sök bland alla produkter med filter (kategori, varumärke, land, butik). Klicka på kort för att lägga till i varukorg direkt.
- **Upphämtningar** — hämtar WooCommerce-orders med status `processing`. Personal packar ordern, prickar av varor, skriver ut plocklista och markerar som packad (mail skickas till kund). Sedan markeras ordern som hämtad.
- **Produkthantering (admin)** — sök, filtrera per butik, redigera pris/EAN/lager/lagerplats per produkt och variant. Synka produkter från WooCommerce med realtids-progress.
- **Inställningar (admin)** — per-butik WooCommerce-koppling (URL + API-nycklar, krypterade), kvittoinställningar, mailkonfiguration, dynamiska meta-nycklar.
- **Användarhantering (admin)** — skapa/redigera användare, filtrera på roll, sök.
- **Dashboard (admin)** — sync-status, senaste aktiviteter, statistik.
- **Audit logs** — alla produktändringar loggas med användare, butik och gamla/nya värden.

## Teknik

- **Next.js 16** (App Router, Turbopack)
- **TypeScript** (strict)
- **Prisma ORM** + MariaDB
- **Tailwind CSS**
- **Auth.js v5** (HTTP-only cookies, bcrypt, RBAC)
- **Zod** — validering på alla API-routes
- **PWA** — installerbar på mobil, manifest konfigurerat

## Roller

| Roll | Åtkomst |
|------|---------|
| ADMIN | Allt — dashboard, produkter, inställningar, användare, logs |
| PERSONAL | Kassa, sök, upphämtningar |

## Kom igång

### 1. Databas

Projektet använder MariaDB på port **3307**. Starta med Docker:

```powershell
docker compose up -d
```

### 2. Miljövariabler

Kopiera `.env.example` till `.env`:

```env
DATABASE_URL="mysql://pos:pos_password@localhost:3307/pos_app"
AUTH_SECRET="din-hemliga-nyckel-minst-32-tecken"
NEXTAUTH_URL="http://localhost:3000"
ENCRYPTION_KEY="32-tecken-hex-nyckel-för-woo-nycklar"
```

### 3. Databas + testdata

```powershell
npm run db:migrate
npm run db:seed
```

### 4. Starta

```powershell
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000)

### Testkonton

| Roll | E-post | Lösenord |
|------|--------|----------|
| Admin | admin@butik.se | admin123 |
| Personal | personal@butik.se | personal123 |

## Projektstruktur

```
src/
  app/
    (app)/              # Skyddade sidor (kräver inloggning)
      kassa/            # POS-kassa
      sok/              # Produktsök med varukorg
      upphamtning/      # Upphämtningar
      admin/
        dashboard/      # Sync-status och statistik
        products/       # Produkthantering
        users/          # Användarhantering
        settings/       # Butiksinställningar
        logs/           # Audit logs
    api/                # API-routes (skyddade med auth + RBAC)
    login/              # Inloggningssida
  components/
    pickups/            # Upphämtnings-UI
    pos/                # Kassa-UI och kvitto
    products/           # Produktlista och verktyg
    search/             # Produktsök med varukorg
    settings/           # Inställningsformulär
    users/              # Användarhantering-UI
    ui/                 # Delade UI-komponenter (toast, etc.)
  lib/                  # Prisma, validering, WooCommerce-integrationer, mail
  auth.ts               # Auth.js-konfiguration
  middleware.ts         # RBAC och omdirigering
prisma/
  schema.prisma         # Datamodell
  seed.ts               # Testdata
```

## Branch-struktur

```
main        # Stabil kod
features    # Pågående funktionsutveckling
```

## Säkerhet

- Auth.js med secure HTTP-only session-cookies
- Bcrypt lösenordshashning (12 rounds)
- RBAC på middleware och alla API-routes
- Rate limiting på känsliga endpoints
- Zod-validering på all input
- WooCommerce API-nycklar krypterade (AES-256-GCM) i databasen
- Audit logs på alla produktändringar
