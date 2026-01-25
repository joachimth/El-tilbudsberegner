# Hurtig Tilbudsberegner for Elektrikere

## Overview
En webapplikation der gør det ekstremt hurtigt at lave professionelle tilbud for elektrikere. Brugeren vælger produkter fra et foruddefineret katalog, angiver antal, grupperer pr. rum/lokation, og appen genererer et poleret tilbud.

## Current State
Fuldt funktionel MVP med mobil-optimeret design:
- Produktkatalog med 25 typiske el-ydelser
- Tilbudsopbygning med lokationer/rum
- Automatisk prisberegning med rabat ved 2+ stk
- Kundeinfo og projektdata
- Preview og print-funktionalitet
- Gem/indlæs tilbud som JSON
- HTML eksport (brug browserens print til PDF)

## Mobile-First Design
Applikationen er optimeret til mobil brug med Apple-stil KISS-principper:

### Mobil Layout
- **Tab-navigation**: Tre tabs (Lokationer, Kunde, Resumé) for nem navigation
- **Sticky bottom bar**: Viser altid total pris og "Vis tilbud" knap
- **Hamburger-menu**: Handlinger (Gem, Forhåndsvis) i dropdown-menu
- **Store touch-targets**: Alle knapper og inputs er mindst 48px høje
- **Quantity stepper**: +/- knapper til nem ændring af antal

### Desktop Layout
- **3-kolonne layout**: Kundeinfo (venstre), Lokationer (midt), Resumé (højre)
- **Alle funktioner synlige**: Ingen skjulte menuer

## Architecture

### Frontend (React + Vite)
- **Pages:**
  - `home.tsx` - Forside med "Nyt tilbud" og "Indlæs tilbud"
  - `editor.tsx` - Hovededitor med responsivt layout (tabs på mobil, 3 kolonner på desktop)
  - `preview.tsx` - Printvenlig forhåndsvisning
  
- **Components:**
  - `product-selector.tsx` - Søgbar dropdown til produktvalg (mobil-venlig)
  - `linje-editor.tsx` - Redigering af produktlinjer med +/- stepper
  - `lokation-editor.tsx` - Rum/lokationsadministration med dropdown-menu
  - `kunde-info-form.tsx` - Kundeoplysninger og projektinfo (støtter testIdPrefix)
  - `summary-panel.tsx` - Live-resumé med totaler

### Backend (Express)
- **Endpoints:**
  - `GET /api/products` - Hent produktkatalog
  - `GET /api/config` - Hent firmakonfiguration
  - `GET /api/offers` - Hent gemte tilbud
  - `POST /api/offers` - Gem tilbud
  - `POST /api/html-export` - Generer HTML tilbud til print/PDF

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

## Design Principper
- **KISS**: Keep It Simple, Stupid - minimalt og rent design
- **Apple-stil**: Store touch-targets, tydelig visuel hierarki
- **Dansk formatering**: Priser med komma som decimalseparator (1.234,56 kr.)
- **Responsivt**: Fungerer på både mobil og desktop

## Begrænsninger
- Ingen autentificering
- Priser kan kun ændres via products.json
- Ingen fri tekst-linjer til priser (kun bemærkninger)
