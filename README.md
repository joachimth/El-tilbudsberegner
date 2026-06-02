# El-tilbudsberegner

[![CI](https://github.com/joachimth/El-tilbudsberegner/actions/workflows/ci.yml/badge.svg)](https://github.com/joachimth/El-tilbudsberegner/actions/workflows/ci.yml)

Dansk tilbudsberegner til el-installatører. Vælg produkter fra et katalog, grupér dem pr. lokation, og generer et professionelt HTML-tilbud klar til print eller PDF.

---

## Screenshots

### Login
![Login](docs/screenshots/01-login.png)

### Tilbudsliste / Dashboard
![Tilbudsliste](docs/screenshots/02-tilbudsliste.png)

### Skabelon-vælger
![Skabelonvælger](docs/screenshots/03-skabelonvaelger.png)

### Editor
![Editor](docs/screenshots/04-editor.png)

### Forhåndsvisning
![Preview](docs/screenshots/05-preview.png)

### Admin-panel
![Admin](docs/screenshots/06-admin.png)

### Mobil
![Mobil](docs/screenshots/07-mobil-dashboard.png)

---

## Funktioner

- **5 skabeloner:** Standard, EV & Erhverv, Energi Privat, Modul Overslag, EV Erhverv V2
- **Blok-editor (V2):** Drag-and-drop blokke - tekst, sektioner, produktlister, advarselsbokse
- **Drag-and-drop lokationer** med dnd-kit
- **Auto-gem** til localStorage (tab kan lukkes uden at miste data)
- **Sekventielt tilbudsnummer** fra server (`2026-0001`, `2026-0002`, ...)
- **Bruger-auth** med rolle-baseret adgang (admin / montør)
- **Admin-panel:** produktkatalog, konfiguration, skabelon-indstillinger
- **HTML-eksport** med fuldt formateret tilbudsdokument
- **XSS-beskyttet** HTML-generator
- **Error boundary** - app crasher ikke ved fejl i én komponent

## Teknisk stak

| Lag | Teknologi |
|-----|-----------|
| Runtime | Bun 1.3+ |
| Backend | Express 5, Drizzle ORM, PostgreSQL |
| Frontend | React 18, Vite, TailwindCSS 4, shadcn/ui |
| Routing | Wouter |
| State | React Query + useState |
| Auth | Passport.js (local strategy) |
| Drag-and-drop | dnd-kit |

## Kom i gang

```bash
# Klon og installér
git clone https://github.com/joachimth/El-tilbudsberegner.git
cd El-tilbudsberegner
bun install

# Sæt DATABASE_URL i .env
echo "DATABASE_URL=postgresql://user:pass@localhost:5432/tilbud" > .env

# Push schema og start dev-server
bun run db:push
bun run dev
```

Åbn `http://localhost:5000`. Standard login: **admin / admin123**.

## Scripts

| Kommando | Beskrivelse |
|----------|-------------|
| `bun run dev` | Dev-server med hot-reload (port 5000) |
| `bun run build` | Produktionsbyg |
| `bun run start` | Start produktionsserver |
| `bun run check` | TypeScript-tjek |
| `bun run db:push` | Push Drizzle-schema til PostgreSQL |
| `node scripts/take-screenshots.mjs` | Generer screenshots lokalt |

## CI/CD

Ved hvert push til `main`:
1. **TypeScript-check** - 0 fejl krævet
2. **Auto-screenshots** - Playwright starter appen, logger ind og tager billeder af alle sider, committer ændringer med `[skip ci]`

Screenshots opdateres automatisk og er altid synkroniseret med seneste kode.

## Miljøvariabler

| Variabel | Beskrivelse |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session secret |
| `PORT` | Server port (default: 5000) |
| `NODE_ENV` | `development` eller `production` |

## Projekt-struktur

```
├── client/src/          # React frontend
│   ├── pages/           # editor, home, preview, login, admin
│   ├── components/      # UI-komponenter inkl. blok-editor
│   ├── hooks/           # useAutosave m.fl.
│   └── lib/             # offer-utils, types, auth
├── server/              # Express backend
│   ├── routes.ts        # API-endpoints + HTML-generator
│   ├── storage.ts       # Drizzle ORM queries
│   └── templates/       # Skabelon-renderers (ev_erhverv_v2.ts m.fl.)
├── shared/              # Zod-schemas og beregningslogik (delt client/server)
├── scripts/             # take-screenshots.mjs
└── docs/screenshots/    # Auto-genererede UI-screenshots
```
