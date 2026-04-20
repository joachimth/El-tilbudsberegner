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

## React Query Patterns

### Admin Page QueryFns
All custom `queryFn` functions in `client/src/pages/admin.tsx` **must throw on non-OK responses** (`if (!res.ok) throw new Error(...)`). If a queryFn returns an error object like `{ error: "401" }` instead of throwing, React Query uses it as data (not the default `[]`), and calling `.filter()` on a non-array crashes the component, causing a blank page.

### Auth Query
The auth query in `App.tsx` uses `staleTime: 5 * 60 * 1000` and `refetchOnWindowFocus: true` so session expiry is detected when the user returns to the app.

### Express 5 Params
`req.params.id` is typed as `string | string[]` in Express 5. Always cast: `String(req.params.id)` before passing to storage functions.

## PDF Export

### Current State
PDF generation uses **Playwright + Chromium** (`server/templates/pdf.ts`). Playwright is imported dynamically to avoid crashing the server if binaries are not installed:
```typescript
const playwright = await import("playwright");
```
**Chromium browser binaries are NOT pre-installed on Replit deployments.** PDF export currently fails in production.

### TODO: Replace Playwright with HTML-to-PDF (no browser required)
Switch the PDF export (`/api/pdf-export` in `server/routes.ts` and `server/templates/pdf.ts`) to a library that generates PDF from HTML without a headless browser. Candidates:
- **`@playwright/test`** with a pre-installed system Chromium — complex on Replit
- **`jsPDF` + `html2canvas`** — client-side only, no server changes needed
- **`pdfkit`** — programmatic PDF, requires rewriting the template as code
- **`puppeteer` with `puppeteer-core` + system Chromium** — still needs a browser
- **`@sparticuz/chromium`** — lightweight Chromium for serverless, works without install step

Recommended approach: move PDF generation to the **client side** using the browser's built-in `window.print()` with a print-optimized CSS stylesheet, avoiding all server-side browser dependencies. The existing HTML template already has `@page` CSS rules.
