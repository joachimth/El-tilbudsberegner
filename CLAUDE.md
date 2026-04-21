# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**El-tilbudsberegner** is a Danish electrical quote calculator web app for electricians. Users select services from a predefined catalog, group them by room/location, and generate polished HTML/PDF quotes. The UI is fully in Danish.

## Commands

```bash
npm run dev          # Start dev server (Express + Vite middleware, port 5000)
npm run build        # Production build (esbuild for server, Vite for client)
npm start            # Run production build (node dist/index.cjs)
npm run check        # TypeScript type checking (no emit)
npm run db:push      # Push Drizzle schema to PostgreSQL (rarely needed)
```

There are no test or lint scripts configured.

## Architecture

This is a **full-stack TypeScript monorepo** with three layers:

### Shared (`shared/schema.ts`)
Central source of truth. Contains Zod schemas (`Product`, `Linje`, `Lokation`, `Kunde`, `Offer`, `Config`) and pure calculation utilities (`beregnEnhedspris`, `beregnLinjepris`, `formatDKK`). Imported by both client and server via the `@shared/*` path alias.

`Product` felter: `id`, `navn`, `enhed`, `pris_1`, `pris_2plus`, `kategori`, `beskrivelse?`, `forbehold?` (newline-sep.), `tags?` (string[]), `billedeBase64?`.

`Config` felter: `firmanavn`, `adresse`, `postnrBy`, `telefon`, `email`, `cvr`, `momsprocent`, `standardtekst`, `betalingsbetingelser`, `standardforbehold`, `firmalogo` (Base64), `skabelonKategorier` (Record<string, string[]>).

### Backend (`server/`)
Express 5 server serving both the API and (in dev) the Vite dev middleware. All storage uses **PostgreSQL via Drizzle ORM** (`server/storage.ts` / `server/db.ts`). Tables are auto-created and seeded on startup via `server/db-init.ts` (users, products, settings, session table). API routes live in `routes.ts`.

### Frontend (`client/src/`)
React 18 + Vite + TailwindCSS 4 + shadcn/ui. Routing via Wouter. Server data (products, config) is fetched with React Query; offer state is managed locally in `editor.tsx` with `useState`. Calculations are performed client-side via `calculateOfferTotals()` in `lib/offer-utils.ts`.

## Key Conventions

### Pricing Logic
- 1 unit → use `pris_1`; 2+ units → use `pris_2plus` for **all** units
- VAT is 25% (`momsprocent` field on the offer, configurable)
- Prices formatted as Danish locale: `1.234,56 kr.` via `formatDKK()` (`Intl.NumberFormat('da-DK')`)

### Responsive Layout
- Mobile breakpoint: 768px (`useIsMobile()` hook)
- Mobile: tab-based navigation (Lokationer / Kunde / Resumé tabs) with sticky bottom bar
- Desktop: 3-column layout (customer info | locations | summary)
- Minimum touch target: 48px height on interactive elements

### Product Catalog
`server/data/products.json` is the seed source. On first startup, products are inserted into PostgreSQL from this file. To add products permanently, either edit the JSON (before first deploy) or use the admin panel. Schema:
```json
{ "id": "unique_id", "navn": "Name", "enhed": "stk", "pris_1": 895, "pris_2plus": 795, "kategori": "Category" }
```

### Path Aliases
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `client/src/assets/`

### API Error Shape
```json
{ "error": "message", "details": "<zod issues or undefined>" }
```
HTTP 400 for validation, 404 for not found, 500 for server errors.

### Build Output
- Server bundle: `dist/index.cjs` (esbuild, CJS, minified)
- Client assets: `dist/public/` (Vite)
- External server deps (not bundled): express, pg, drizzle-orm, passport, zod, ws, etc. — see `script/build.ts` allowlist.

---

## Template System (Skabeloner)

### Available Templates

Five templates are defined in `shared/schema.ts` as the `Skabelon` enum. Template is stored in `offer.skabelon` with default `"standard"`.

| ID | Navn | Tema | Beskrivelse |
|----|------|------|-------------|
| `standard` | Standard | Grå | Klassisk format med lokationer og produktliste |
| `ev_erhverv` | EV Erhverv | Blå | Kompakt erhvervsformat, priser synlige med det samme |
| `energi_privat` | Energi Privat | Grøn | Tillidsbaseret privat-format med løsningsoversigt og garantier |
| `modul_overslag` | Modul Overslag | Lilla | Fasebaseret modul-oversigt til større projekter |
| `ev_erhverv_v2` | EV Erhverv V2 | Mørkeblå | Premium full-design skabelon med hero-sektion, fordels-cards og CTA-blok |

### Template Selection Flow
- `client/src/pages/template-selector.tsx` — Valgskærm med beskrivelser af alle 5 skabeloner
- Valget gemmes i `offer.skabelon` ved oprettelse og kan ikke ændres bagefter

### Template Rendering

**V1-skabeloner** (`standard`, `ev_erhverv`, `energi_privat`, `modul_overslag`):
- Renderes client-side i `client/src/pages/preview.tsx` som React-komponenter
- Print/PDF via `window.print()` med `@media print` CSS

**V2-skabelon** (`ev_erhverv_v2`):
- Renderes server-side i `server/templates/ev_erhverv_v2.ts` som ren HTML-streng
- Hentes via `/api/tilbud/:id/html` og vises i en `<iframe>`
- Print via `iframeRef.current.contentWindow.print()`
- Eksport-til-HTML via download af HTML-filen

### V2 Data Schema (`v2DataSchema` i `shared/schema.ts`)

V2-tilbud har et ekstra `v2`-felt med disse underfelter:
```typescript
v2?: {
  hero: { overskrift?, underoverskrift?, billedeUrl? }
  globalPricingMode: "section_total" | "line_items" | "line_items_with_total" | "hidden_prices"
  sektioner: Array<{ lokationNavn, billedeUrl?, pricingMode? }>
  fordele: Array<{ ikon?, titel, tekst? }>          // Fordels-cards (3 stk default)
  salgsblokke: Array<{ type, overskrift?, tekst?, punkter? }>
  kontaktperson: { navn?, titel?, telefon?, email?, billedeUrl? }
}
```

### Forbehold / Bemærkninger

Alle skabeloner understøtter fritekst-forbehold via `offer.bemærkninger` (multiline string). Feltet redigeres i `client/src/components/kunde-info-form.tsx`. Parsing: linjer splittes på `\n`, tomme filtreres væk, bullet-tegn (`-`/`•`) strippes. Rendered sektions-titel varierer per skabelon:
- `standard` → "Bemærkninger"
- `ev_erhverv` / `ev_erhverv_v2` → "Generelle forbehold" (gul boks i V2)
- `energi_privat` → "Bemærkninger og aftalte forhold"
- `modul_overslag` → "Forudsætninger"

---

## Admin Panel (`client/src/pages/admin.tsx`)

Fire faner:
1. **Produkter** — Søg, opret, rediger, slet produkter. Filtrering pr. kategori.
2. **Indstillinger** — Firmaoplysninger (navn, adresse, CVR, tlf, email), timepris, momsprocent, standardtekst, betalingsbetingelser.
3. **Skabeloner** — Tilpas EV Erhverv V2-skabelonen: farvetema, hero-tekster, fordele-kort, kontaktperson, CTA-blok.
4. **Brugere** — Opret/slet brugere, tildel roller (`montør`/`admin`).

**Vigtigt:** Alle `queryFn` i admin.tsx **skal** kaste fejl ved non-OK svar (`if (!res.ok) throw new Error(...)`). Returneres fejl-JSON som data i stedet for at kaste, vil `.filter()` på et non-array crashe komponenten → blank side.

---

## Deployment (Replit)

### Reverse Proxy & Session Cookies
Replit terminates HTTPS externally and forwards HTTP internally to Node.js. **`app.set("trust proxy", 1)` is required** in `server/index.ts` — without it, `req.secure` is `false`, and `express-session` refuses to send cookies with `secure: true`, breaking all authentication after login.

### Session Store
Sessions use **`connect-pg-simple`** (PostgreSQL-backed), NOT MemoryStore. MemoryStore was replaced because:
1. It clears on every server restart (Replit restarts frequently due to inactivity sleep)
2. It doesn't work across multiple server instances

The session table (`sessioner`) is created in `server/db-init.ts` at startup. `connect-pg-simple` **must NOT be in the esbuild allowlist** in `script/build.ts` — when bundled, it cannot find its internal `table.sql` file and crashes.

### esbuild Bundling Rules
Packages that read files from their own `node_modules` directory at runtime must be kept **external** (not in the allowlist). Currently known: `connect-pg-simple`. If a package crashes with `ENOENT: no such file or directory` pointing inside `dist/`, remove it from the allowlist.

### Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string (Replit provides this automatically)
- `SESSION_SECRET` — optional, falls back to a hardcoded default (change in production)

---

## React Query Patterns

### Admin Page QueryFns
All custom `queryFn` functions in `client/src/pages/admin.tsx` **must throw on non-OK responses** (`if (!res.ok) throw new Error(...)`). If a queryFn returns an error object like `{ error: "401" }` instead of throwing, React Query uses it as data (not the default `[]`), and calling `.filter()` on a non-array crashes the component, causing a blank page.

### Auth Query
The auth query in `App.tsx` uses `staleTime: 5 * 60 * 1000` and `refetchOnWindowFocus: true` so session expiry is detected when the user returns to the app.

### Express 5 Params
`req.params.id` is typed as `string | string[]` in Express 5. Always cast: `String(req.params.id)` before passing to storage functions.

---

## PDF Export

### Current State
PDF generation is **client-side via `window.print()`** — no server-side browser required.
- V1 templates: `window.print()` direkte
- V2 template: `iframeRef.current.contentWindow.print()` (iframen indeholder server-renderet HTML)

Alle skabeloner har `@page` og `@media print` CSS-regler.

### Previous Approach (deprecated)
Previously used Playwright + Chromium (`server/templates/pdf.ts`). Removed because Chromium binaries are not installed on Replit deployments.

---

## TODO / Roadmap

### Fremtidige optimeringer
- SVG-logo i V2 header-band: fjern `filter:brightness(0) invert(1)` og lad admin vælge om logoet er lyst/mørkt
- Producentlogo per produkt (`producent_logo_base64`) — vises under produktnavn i tilbud
- Tags til skabelon-filtrering: kobl tags på produkter til skabelon-specifikke kategorier
- Base64-billeder er store i DB — overvej filbaseret storage ved skalering

---

## Implementeret / Roadmap (færdigt)

### ✅ Forbehold og forudsætninger

#### Generelle standardforbehold (admin-konfigureret)
Admin definerer standardforbehold i Indstillinger (én per linje). Gemmes som `standardforbehold` i `indstillinger`-tabellen. Vises adskilt fra tilbudsspecifikke bemærkninger i alle skabeloner via `StandardForbeholdBoks` i `preview.tsx` og separat sektion i V2.

#### Produkt-specifikke forbehold
Produkter har et `forbehold`-felt (newline-separeret tekst). `collectProduktForbehold()` i `offer-utils.ts` samler unikke linjer fra alle produkter i tilbuddet. Vises via `ProduktForbeholdBoks` i alle V1-skabeloner.

#### Hurtig tilføjelse under tilbudsgivning
`kunde-info-form.tsx` viser chip-række under bemærkninger-feltet. Chips hentes fra `config.standardforbehold`. Klik appender linjen til `offer.bemærkninger` — duplikater ignoreres. Chip skifter til grøn ✓ når linjen allerede er tilføjet.

### ✅ Upload af firmalogo
`POST /api/admin/logo` (multer memoryStorage → Base64 → `indstillinger`-tabellen, nøgle: `firmalogo`). `DELETE /api/admin/logo` fjerner det. Admin Indstillinger: upload-knap + preview med ×. V1: `DocHoved` viser logo i stedet for firmanavn i tekst. V2: logo i header-band (hvid/inverteret) og doc-hoved.

### ✅ Upload af produktbilleder
`POST /api/admin/products/:id/billede` (multer → Base64 → `billede_base64`-kolonne på `produkter`). `DELETE` fjerner. Admin ProduktDialog: upload ved redigering + live preview. Admin liste: 40×40px thumbnail. V2-skabelon: 32×32px thumbnail inline i tabelrækker.

### ✅ Tags til produkter
`tags TEXT`-kolonne på `produkter` (komma-separeret, eksponeret som `string[]` i API). Admin ProduktDialog: chip-input (Enter/komma tilføjer, × fjerner). Tags vises som outline-badges i produktlisten.

### ✅ Skabelon-specifikke produktkategorier
`skabelonKategorier` gemmes som JSON-streng i `indstillinger`-tabellen (`Record<string, string[]>`). Admin Indstillinger: `SkabelonKategorierCard` med chip-toggles per skabelon × kategori. Editor sender `kategoriFilter` til `LokationEditor` som filtrerer `visibleProducts`. Toggle "Vis alle kategorier" tilgængeligt når filter er aktivt.

### ✅ Redigering af skabeloner fra admin siden
Admin kan tilpasse EV Erhverv V2-skabelonen via "Skabeloner"-fanen i admin-panelet uden at ændre kode.

**Konfigurerbbare felter:**
- **Farvetema** — hex-farve for `--accent` (mørk/mid/lys variant beregnes automatisk via `darkenHex`/`lightenHex`)
- **Hero-sektion** — standardoverskrift og -underoverskrift (fallback når tilbud ikke har projektnavn)
- **Fordele-kort** — 3 kort med ikon, titel og beskrivelse
- **Kontaktperson** — navn, titel, telefon, e-mail (vises kun når tilbud ikke har specifik kontaktperson)
- **CTA-blok** — overskrift og brødtekst

**Lagring:** JSON-blob i `indstillinger`-tabellen under nøglen `skabelon_ev_erhverv_v2`.

**API:** `GET/PUT /api/admin/skabelon/:skabelon` (admin-only). Storage-metoder: `getSkabelonKonfig(skabelon)` / `updateSkabelonKonfig(skabelon, konfig)`.

**Prioriteringsrækkefølge ved rendering:** `offer.v2`-felter → template-konfiguration → hardcodede defaults.

**Renderer:** `renderEvErhvervV2` i `server/templates/ev_erhverv_v2.ts` accepterer nu et valgfrit 5. argument `templateKonfig: V2TemplateKonfig`.
