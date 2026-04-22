import { z } from "zod";

export const productSchema = z.object({
  id: z.string(),
  navn: z.string(),
  enhed: z.string().default("stk"),
  pris_1: z.number(),
  pris_2plus: z.number(),
  kategori: z.string(),
  kostpris: z.number().optional(),
  avanceProcent: z.number().optional(),
  arbejdstidMinutter: z.number().optional(),
  beskrivelse: z.string().optional(),
  forbehold: z.string().optional(),
  tags: z.array(z.string()).optional(),
  billedeBase64: z.string().optional(),
  producentLogoBase64: z.string().optional(),
  heeftBillede: z.boolean().optional(),
  heeftProducentLogo: z.boolean().optional(),
  ean: z.string().optional(),
  internVarenr: z.string().optional(),
});

export type Product = z.infer<typeof productSchema>;

export const linjeSchema = z.object({
  productId: z.string(),
  antal: z.number().int().min(1),
});

export type Linje = z.infer<typeof linjeSchema>;

export const lokationSchema = z.object({
  navn: z.string(),
  beskrivelse: z.string().optional(),
  linjer: z.array(linjeSchema),
});

export type Lokation = z.infer<typeof lokationSchema>;

export const kundeSchema = z.object({
  navn: z.string(),
  adresse: z.string(),
  email: z.string(),
  telefon: z.string(),
});

export type Kunde = z.infer<typeof kundeSchema>;

export const metaSchema = z.object({
  projektnavn: z.string(),
  dato: z.string(),
  reference: z.string(),
  tilbudNr: z.string().optional(),
});

export type Meta = z.infer<typeof metaSchema>;

export const momsSchema = z.object({
  visInkl: z.boolean().default(false),
});

export type Moms = z.infer<typeof momsSchema>;

export type Skabelon = "standard" | "ev_erhverv" | "energi_privat" | "modul_overslag" | "ev_erhverv_v2";

export type PricingMode = "section_total" | "line_items" | "line_items_with_total" | "hidden_prices";

export const blokTypeEnum = z.enum([
  "hero",
  "fordele",
  "lokationer",
  "prissummary",
  "forbehold",
  "cta",
  "kontaktperson",
  "custom_billede",
  "custom_tekst",
]);
export type BlokType = z.infer<typeof blokTypeEnum>;

export const blokDataSchema = z.object({
  // hero
  overskrift: z.string().optional(),
  underoverskrift: z.string().optional(),
  billedeUrl: z.string().optional(),
  // fordele
  kort: z.array(z.object({
    ikon: z.string().optional(),
    titel: z.string(),
    tekst: z.string().optional(),
  })).optional(),
  // cta
  ctaOverskrift: z.string().optional(),
  ctaTekst: z.string().optional(),
  // kontaktperson
  navn: z.string().optional(),
  titel: z.string().optional(),
  telefon: z.string().optional(),
  email: z.string().optional(),
  // custom_billede
  src: z.string().optional(),
  billedeTekst: z.string().optional(),
  bredde: z.enum(["fuld", "indhold"]).optional(),
  // custom_tekst
  tekst: z.string().optional(),
  stil: z.enum(["normal", "fremhævet"]).optional(),
});
export type BlokData = z.infer<typeof blokDataSchema>;

export const blokSchema = z.object({
  id: z.string(),
  type: blokTypeEnum,
  skjult: z.boolean().optional(),
  data: blokDataSchema.optional(),
});
export type Blok = z.infer<typeof blokSchema>;

export const STANDARD_BLOK_RAEKKEFOELGE: BlokType[] = [
  "hero",
  "fordele",
  "lokationer",
  "prissummary",
  "forbehold",
  "cta",
  "kontaktperson",
];

export const v2SektionSchema = z.object({
  lokationNavn: z.string(),
  billedeUrl: z.string().optional(),
  pricingMode: z.enum(["section_total", "line_items", "line_items_with_total", "hidden_prices"]).optional(),
});

export const v2FordelSchema = z.object({
  ikon: z.string().optional(),
  titel: z.string(),
  tekst: z.string().optional(),
});

export const v2SalgsblokSchema = z.object({
  type: z.enum(["fordele", "cta", "garanti"]),
  overskrift: z.string().optional(),
  tekst: z.string().optional(),
  punkter: z.array(z.string()).optional(),
});

export const v2DataSchema = z.object({
  hero: z.object({
    overskrift: z.string().optional(),
    underoverskrift: z.string().optional(),
    billedeUrl: z.string().optional(),
  }).optional(),
  globalPricingMode: z.enum(["section_total", "line_items", "line_items_with_total", "hidden_prices"]).default("line_items"),
  sektioner: z.array(v2SektionSchema).default([]),
  fordele: z.array(v2FordelSchema).optional(),
  salgsblokke: z.array(v2SalgsblokSchema).optional(),
  kontaktperson: z.object({
    navn: z.string().optional(),
    titel: z.string().optional(),
    telefon: z.string().optional(),
    email: z.string().optional(),
    billedeUrl: z.string().optional(),
  }).optional(),
  blokke: z.array(blokSchema).optional(),
});

export type V2Data = z.infer<typeof v2DataSchema>;

export const offerSchema = z.object({
  id: z.string().optional(),
  skabelon: z.enum(["standard", "ev_erhverv", "energi_privat", "modul_overslag", "ev_erhverv_v2"]).default("standard"),
  meta: metaSchema,
  kunde: kundeSchema,
  moms: momsSchema,
  bemærkninger: z.string().default(""),
  lokationer: z.array(lokationSchema),
  v2: v2DataSchema.optional(),
});

export type Offer = z.infer<typeof offerSchema>;

export const insertOfferSchema = offerSchema.omit({ id: true });
export type InsertOffer = z.infer<typeof insertOfferSchema>;

export const configSchema = z.object({
  firmanavn: z.string(),
  adresse: z.string(),
  postnrBy: z.string(),
  telefon: z.string(),
  email: z.string(),
  cvr: z.string(),
  momsprocent: z.number().default(25),
  standardtekst: z.string(),
  betalingsbetingelser: z.string(),
  standardforbehold: z.string().default(""),
  firmalogo: z.string().default(""),
  logoInverter: z.boolean().default(true),
  skabelonKategorier: z.record(z.string(), z.array(z.string())).default({}),
});

export type Config = z.infer<typeof configSchema>;

export function beregnEnhedspris(product: Product, antal: number): number {
  return antal === 1 ? product.pris_1 : product.pris_2plus;
}

export function beregnLinjepris(product: Product, antal: number): number {
  const enhedspris = beregnEnhedspris(product, antal);
  return antal * enhedspris;
}

export function formatDKK(amount: number): string {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
