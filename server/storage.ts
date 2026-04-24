import { db, brugere, produkter, tilbud, indstillinger } from "./db";
import { eq, desc } from "drizzle-orm";
import { hashPassword } from "./auth";
import type { Product, Config, Offer } from "@shared/schema";

export class DbStorage {
  // ── Produkter ──────────────────────────────────────────────────────────

  async getProducts(): Promise<Product[]> {
    const rows = await db
      .select()
      .from(produkter)
      .where(eq(produkter.aktiv, true))
      .orderBy(produkter.sortering);
    return rows.map(dbRowToProduct);
  }

  async getAllProducts() {
    const rows = await db.select().from(produkter).orderBy(produkter.sortering);
    return rows.map(r => ({
      ...dbRowToProduct(r),
      kostpris: r.kostpris ?? undefined,
      avanceProcent: r.avanceProcent ?? undefined,
      arbejdstidMinutter: r.arbejdstidMinutter ?? undefined,
      aktiv: r.aktiv,
      sortering: r.sortering ?? 0,
    }));
  }

  async createProduct(p: AdminProductInput): Promise<void> {
    await db.insert(produkter).values({
      id: p.id,
      navn: p.navn,
      enhed: p.enhed,
      pris1: p.pris_1,
      pris2plus: p.pris_2plus,
      kategori: p.kategori,
      kostpris: p.kostpris ?? null,
      avanceProcent: p.avanceProcent ?? null,
      arbejdstidMinutter: p.arbejdstidMinutter ?? null,
      beskrivelse: p.beskrivelse ?? null,
      forbehold: p.forbehold ?? null,
      tags: p.tags?.length ? p.tags.join(",") : null,
      billedeBase64: p.billedeBase64 ?? null,
      producentLogoBase64: p.producentLogoBase64 ?? null,
      aktiv: p.aktiv !== false,
      sortering: p.sortering ?? 0,
    });
  }

  async updateProduct(id: string, p: Partial<AdminProductInput>): Promise<void> {
    await db.update(produkter).set({
      navn: p.navn,
      enhed: p.enhed,
      pris1: p.pris_1,
      pris2plus: p.pris_2plus,
      kategori: p.kategori,
      kostpris: p.kostpris !== undefined ? (p.kostpris ?? null) : undefined,
      avanceProcent: p.avanceProcent !== undefined ? (p.avanceProcent ?? null) : undefined,
      arbejdstidMinutter: p.arbejdstidMinutter !== undefined ? (p.arbejdstidMinutter ?? null) : undefined,
      beskrivelse: p.beskrivelse !== undefined ? (p.beskrivelse ?? null) : undefined,
      forbehold: p.forbehold !== undefined ? (p.forbehold ?? null) : undefined,
      tags: p.tags !== undefined ? (p.tags?.length ? p.tags.join(",") : null) : undefined,
      billedeBase64: p.billedeBase64 !== undefined ? (p.billedeBase64 ?? null) : undefined,
      producentLogoBase64: p.producentLogoBase64 !== undefined ? (p.producentLogoBase64 ?? null) : undefined,
      aktiv: p.aktiv !== undefined ? p.aktiv : undefined,
    }).where(eq(produkter.id, id));
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(produkter).where(eq(produkter.id, id));
  }

  // ── Config / Indstillinger ─────────────────────────────────────────────

  async getConfig(): Promise<Config> {
    const rows = await db.select().from(indstillinger);
    const m = Object.fromEntries(rows.map(r => [r.nøgle, r.værdi]));
    return {
      firmanavn: m.firmanavn || "",
      adresse: m.adresse || "",
      postnrBy: m.postnrBy || "",
      telefon: m.telefon || "",
      email: m.email || "",
      cvr: m.cvr || "",
      momsprocent: parseInt(m.momsprocent || "25"),
      standardtekst: m.standardtekst || "",
      betalingsbetingelser: m.betalingsbetingelser || "",
      standardforbehold: m.standardforbehold || "",
      firmalogo: m.firmalogo || "",
      logoInverter: m.logoInverter !== "false",
      skabelonKategorier: (() => { try { return JSON.parse(m.skabelonKategorier || "{}"); } catch { return {}; } })(),
    };
  }

  async getSettings(): Promise<Record<string, string>> {
    const rows = await db.select().from(indstillinger);
    return Object.fromEntries(rows.map(r => [r.nøgle, r.værdi]));
  }

  async updateSetting(key: string, value: string): Promise<void> {
    await db
      .insert(indstillinger)
      .values({ nøgle: key, værdi: value })
      .onConflictDoUpdate({ target: indstillinger.nøgle, set: { værdi: value } });
  }

  async updateSettings(settings: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.updateSetting(key, value);
    }
  }

  async getSkabelonKonfig(skabelon: string): Promise<Record<string, any>> {
    const rows = await db.select().from(indstillinger)
      .where(eq(indstillinger.nøgle, `skabelon_${skabelon}`));
    if (!rows.length) return {};
    try { return JSON.parse(rows[0].værdi); } catch { return {}; }
  }

  async getAllSkabelonKonfig(): Promise<Record<string, Record<string, any>>> {
    const rows = await db.select().from(indstillinger);
    const result: Record<string, Record<string, any>> = {};
    for (const row of rows) {
      if (row.nøgle.startsWith("skabelon_")) {
        const id = row.nøgle.slice("skabelon_".length);
        try { result[id] = JSON.parse(row.værdi); } catch { result[id] = {}; }
      }
    }
    return result;
  }

  async updateSkabelonKonfig(skabelon: string, konfig: Record<string, any>): Promise<void> {
    await this.updateSetting(`skabelon_${skabelon}`, JSON.stringify(konfig));
  }

  // ── Tilbud ─────────────────────────────────────────────────────────────

  async saveOffer(offer: Offer, userId?: number): Promise<string> {
    const titel = offer.meta.projektnavn || "Nyt tilbud";
    const offerNr = offer.meta.tilbudNr || null;

    if (offer.id) {
      const numId = parseInt(offer.id);
      if (!isNaN(numId)) {
        const [existing] = await db.select({ id: tilbud.id }).from(tilbud).where(eq(tilbud.id, numId));
        if (existing) {
          await db.update(tilbud).set({
            titel,
            tilbudNr: offerNr,
            data: offer as any,
            opdateretAt: new Date(),
          }).where(eq(tilbud.id, numId));
          return offer.id;
        }
      }
    }

    const [row] = await db.insert(tilbud).values({
      titel,
      tilbudNr: offerNr,
      data: offer as any,
      brugerId: userId ?? null,
    }).returning({ id: tilbud.id });
    return String(row.id);
  }

  async getOffer(id: string): Promise<Offer | null> {
    const numId = parseInt(id);
    if (isNaN(numId)) return null;
    const [row] = await db.select().from(tilbud).where(eq(tilbud.id, numId));
    if (!row) return null;
    return { ...(row.data as any), id: String(row.id) };
  }

  async getOffersList(userId?: number, isAdmin = false) {
    const rows = isAdmin
      ? await db.select({
          id: tilbud.id,
          titel: tilbud.titel,
          tilbudNr: tilbud.tilbudNr,
          oprettetAt: tilbud.oprettetAt,
          opdateretAt: tilbud.opdateretAt,
          brugerId: tilbud.brugerId,
        }).from(tilbud).orderBy(desc(tilbud.opdateretAt))
      : await db.select({
          id: tilbud.id,
          titel: tilbud.titel,
          tilbudNr: tilbud.tilbudNr,
          oprettetAt: tilbud.oprettetAt,
          opdateretAt: tilbud.opdateretAt,
          brugerId: tilbud.brugerId,
        }).from(tilbud).where(eq(tilbud.brugerId, userId!)).orderBy(desc(tilbud.opdateretAt));
    return rows.map(r => ({ ...r, id: String(r.id) }));
  }

  async deleteOffer(id: string): Promise<void> {
    const numId = parseInt(id);
    if (!isNaN(numId)) {
      await db.delete(tilbud).where(eq(tilbud.id, numId));
    }
  }

  // ── Brugere ────────────────────────────────────────────────────────────

  async getUsers() {
    return db.select({
      id: brugere.id,
      brugernavn: brugere.brugernavn,
      rolle: brugere.rolle,
      oprettetAt: brugere.oprettetAt,
    }).from(brugere).orderBy(brugere.id);
  }

  async createUser(brugernavn: string, password: string, rolle: "montør" | "admin") {
    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(brugere).values({ brugernavn, passwordHash, rolle })
      .returning({ id: brugere.id, brugernavn: brugere.brugernavn, rolle: brugere.rolle });
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(brugere).where(eq(brugere.id, id));
  }
}

export const storage = new DbStorage();

// ── Helpers ──────────────────────────────────────────────────────────────

export interface AdminProductInput {
  id: string;
  navn: string;
  enhed: string;
  pris_1: number;
  pris_2plus: number;
  kategori: string;
  kostpris?: number | null;
  avanceProcent?: number | null;
  arbejdstidMinutter?: number | null;
  beskrivelse?: string | null;
  forbehold?: string | null;
  tags?: string[] | null;
  billedeBase64?: string | null;
  producentLogoBase64?: string | null;
  aktiv?: boolean;
  sortering?: number;
}

function dbRowToProduct(r: {
  id: string; navn: string; enhed: string; pris1: number; pris2plus: number;
  kategori: string; beskrivelse: string | null; forbehold: string | null;
  tags: string | null; billedeBase64: string | null; producentLogoBase64: string | null;
}): Product {
  return {
    id: r.id,
    navn: r.navn,
    enhed: r.enhed,
    pris_1: r.pris1,
    pris_2plus: r.pris2plus,
    kategori: r.kategori,
    beskrivelse: r.beskrivelse ?? undefined,
    forbehold: r.forbehold ?? undefined,
    tags: r.tags ? r.tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
    billedeBase64: r.billedeBase64 ?? undefined,
    producentLogoBase64: r.producentLogoBase64 ?? undefined,
  };
}
