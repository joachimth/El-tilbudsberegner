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
Express 5 server serving both the API and (in dev) the Vite dev middleware. Storage is entirely **file-based JSON** in `server/data/` — PostgreSQL/Drizzle is configured but not actively used for offers. The `IStorage` interface in `storage.ts` abstracts reads/writes. API routes live in `routes.ts`.

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
Edit `server/data/products.json` to add/modify products. Schema:
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
