import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  serial,
  real,
} from "drizzle-orm/pg-core";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL mangler i miljøvariablerne");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

export const brugere = pgTable("brugere", {
  id: serial("id").primaryKey(),
  brugernavn: text("brugernavn").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  rolle: text("rolle").$type<"montør" | "admin">().notNull().default("montør"),
  oprettetAt: timestamp("oprettet_at").defaultNow().notNull(),
});

export const produkter = pgTable("produkter", {
  id: text("id").primaryKey(),
  navn: text("navn").notNull(),
  enhed: text("enhed").notNull().default("stk"),
  pris1: integer("pris_1").notNull(),
  pris2plus: integer("pris_2plus").notNull(),
  kategori: text("kategori").notNull(),
  kostpris: integer("kostpris"),
  avanceProcent: real("avance_procent"),
  arbejdstidMinutter: real("arbejdstid_minutter"),
  beskrivelse: text("beskrivelse"),
  forbehold: text("forbehold"),
  tags: text("tags"),
  billedeBase64: text("billede_base64"),
  aktiv: boolean("aktiv").default(true).notNull(),
  sortering: integer("sortering").default(0),
});

export const tilbud = pgTable("tilbud", {
  id: serial("id").primaryKey(),
  titel: text("titel").notNull().default("Nyt tilbud"),
  tilbudNr: text("tilbud_nr"),
  data: jsonb("data").notNull().$type<Record<string, unknown>>(),
  brugerId: integer("bruger_id").references(() => brugere.id, { onDelete: "set null" }),
  oprettetAt: timestamp("oprettet_at").defaultNow().notNull(),
  opdateretAt: timestamp("opdateret_at").defaultNow().notNull(),
});

export const indstillinger = pgTable("indstillinger", {
  nøgle: text("nøgle").primaryKey(),
  værdi: text("værdi").notNull(),
});

export type Bruger = typeof brugere.$inferSelect;
export type DbProdukt = typeof produkter.$inferSelect;
export type NyProdukt = typeof produkter.$inferInsert;
export type DbTilbud = typeof tilbud.$inferSelect;
