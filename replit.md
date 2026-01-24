# Hurtig Tilbudsberegner for Elektrikere

## Overview
En webapplikation der gør det ekstremt hurtigt at lave professionelle tilbud for elektrikere. Brugeren vælger produkter fra et foruddefineret katalog, angiver antal, grupperer pr. rum/lokation, og appen genererer et poleret tilbud.

## Current State
Fuldt funktionel MVP med:
- Produktkatalog med 25 typiske el-ydelser
- Tilbudsopbygning med lokationer/rum
- Automatisk prisberegning med rabat ved 2+ stk
- Kundeinfo og projektdata
- Preview og print-funktionalitet
- Gem/indlæs tilbud som JSON
- PDF/HTML eksport

## Architecture

### Frontend (React + Vite)
- **Pages:**
  - `home.tsx` - Forside med "Nyt tilbud" og "Indlæs tilbud"
  - `editor.tsx` - Hovededitor med 3-kolonne layout
  - `preview.tsx` - Printvenlig forhåndsvisning
  
- **Components:**
  - `product-selector.tsx` - Søgbar dropdown til produktvalg
  - `linje-editor.tsx` - Redigering af produktlinjer
  - `lokation-editor.tsx` - Rum/lokationsadministration
  - `kunde-info-form.tsx` - Kundeoplysninger og projektinfo
  - `summary-panel.tsx` - Live-resumé med totaler

### Backend (Express)
- **Endpoints:**
  - `GET /api/products` - Hent produktkatalog
  - `GET /api/config` - Hent firmakonfiguration
  - `GET /api/offers` - Hent gemte tilbud
  - `POST /api/offers` - Gem tilbud
  - `POST /api/pdf` - Generer HTML tilbud til print/PDF

### Data (JSON-filer)
- `server/data/products.json` - Produktkatalog
- `server/data/config.json` - Firmakonfiguration
- `server/data/offers/` - Gemte tilbud

## Prisberegning
- Hvis antal = 1: brug `pris_1`
- Hvis antal >= 2: brug `pris_2plus` for ALLE stk
- Linjetotal = antal × enhedspris
- Moms = 25%

## Redigering af produkter
Rediger `server/data/products.json` med struktur:
```json
{
  "id": "unique_id",
  "navn": "Produktnavn",
  "enhed": "stk",
  "pris_1": 895,
  "pris_2plus": 795,
  "kategori": "Kategori"
}
```

## Kørsel
```bash
npm run dev
```

## Begrænsninger
- Ingen autentificering
- Priser kan kun ændres via products.json
- Ingen fri tekst-linjer til priser (kun bemærkninger)
