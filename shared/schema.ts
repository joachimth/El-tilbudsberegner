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

export const offerSchema = z.object({
  id: z.string().optional(),
  meta: metaSchema,
  kunde: kundeSchema,
  moms: momsSchema,
  bemærkninger: z.string().default(""),
  lokationer: z.array(lokationSchema),
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
