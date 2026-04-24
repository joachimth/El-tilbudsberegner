import type { Skabelon } from "./schema";

export interface SkabelonMeta {
  id: Skabelon;
  navn: string;
  tagline: string;
  beskrivelse: string;
  farveklasse: string;
  tags: string[];
  nyhed?: boolean;
  erV2?: boolean;
}

export const SKABELON_REGISTRY: SkabelonMeta[] = [
  {
    id: "ev_erhverv_v2",
    navn: "EV & Erhverv V2",
    tagline: "Professionelt lækker — PDF-klar",
    beskrivelse:
      "Fuldt designet premium-skabelon med hero-sektion, fordelskort, løsningskort med billeder, smart prisoversigt og CTA-blok. Optimeret til PDF-eksport.",
    farveklasse: "bg-[#1f4d6b]",
    tags: ["EV-lader", "Erhverv", "Billeder", "PDF", "Premium"],
    nyhed: true,
    erV2: true,
  },
  {
    id: "ev_erhverv",
    navn: "EV & Erhverv",
    tagline: "Pris først – hurtig beslutning",
    beskrivelse:
      "Kompakt format til erhvervskunder. Prisen er synlig med det samme. Produkttabel, tillægspriser og forbehold i klart overblik.",
    farveklasse: "bg-blue-600",
    tags: ["Ladebokse", "Elinstallation", "Erhverv"],
  },
  {
    id: "energi_privat",
    navn: "Energi & Privat",
    tagline: "Forklarende – tryghed i fokus",
    beskrivelse:
      "Opbygger tillid og forståelse. Løsningsoverblik, kundens ansvar og garantier beskrives grundigt. Prisen kommer til sidst.",
    farveklasse: "bg-emerald-600",
    tags: ["Solceller", "Batterilager", "Varmepumpe", "VE-anlæg"],
  },
  {
    id: "modul_overslag",
    navn: "Modul Overslag",
    tagline: "Modulopdelt – del-priser",
    beskrivelse:
      "Hvert arbejdsområde vises som et selvstændigt modul med beskrivelse og delpris. Velegnet til større projekter med etaper.",
    farveklasse: "bg-violet-600",
    tags: ["Etaper", "Flerfagligt", "Delpriser"],
  },
  {
    id: "standard",
    navn: "Standard",
    tagline: "Generelt tilbud",
    beskrivelse:
      "Klassisk tilbudsformat med lokationer og produktliste. Til hverdagsjobs og mindre opgaver.",
    farveklasse: "bg-gray-600",
    tags: ["Alsidig", "Hurtig"],
  },
];
