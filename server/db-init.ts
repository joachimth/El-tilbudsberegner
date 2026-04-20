import { pool } from "./db";
import { hashPassword } from "./auth";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    // Session-tabel til connect-pg-simple (createTableIfMissing virker ikke i bundlet kode)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessioner (
        sid VARCHAR NOT NULL COLLATE "default",
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL,
        CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_session_expire ON sessioner (expire)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS brugere (
        id SERIAL PRIMARY KEY,
        brugernavn TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        rolle TEXT NOT NULL DEFAULT 'montør' CHECK (rolle IN ('montør', 'admin')),
        oprettet_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS produkter (
        id TEXT PRIMARY KEY,
        navn TEXT NOT NULL,
        enhed TEXT NOT NULL DEFAULT 'stk',
        pris_1 INTEGER NOT NULL,
        pris_2plus INTEGER NOT NULL,
        kategori TEXT NOT NULL,
        kostpris INTEGER,
        avance_procent REAL,
        arbejdstid_minutter REAL,
        beskrivelse TEXT,
        aktiv BOOLEAN NOT NULL DEFAULT TRUE,
        sortering INTEGER DEFAULT 0
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tilbud (
        id SERIAL PRIMARY KEY,
        titel TEXT NOT NULL DEFAULT 'Nyt tilbud',
        tilbud_nr TEXT,
        data JSONB NOT NULL,
        bruger_id INTEGER REFERENCES brugere(id) ON DELETE SET NULL,
        oprettet_at TIMESTAMP DEFAULT NOW() NOT NULL,
        opdateret_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await client.query(`
      ALTER TABLE produkter ADD COLUMN IF NOT EXISTS forbehold TEXT
    `);
    await client.query(`
      ALTER TABLE produkter ADD COLUMN IF NOT EXISTS tags TEXT
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS indstillinger (
        nøgle TEXT PRIMARY KEY,
        værdi TEXT NOT NULL
      )
    `);

    // Seed standardbrugere
    const { rows: userRows } = await client.query("SELECT COUNT(*) AS count FROM brugere");
    if (parseInt(userRows[0].count) === 0) {
      await client.query(
        "INSERT INTO brugere (brugernavn, password_hash, rolle) VALUES ($1, $2, $3)",
        ["admin", await hashPassword("admin123"), "admin"]
      );
      await client.query(
        "INSERT INTO brugere (brugernavn, password_hash, rolle) VALUES ($1, $2, $3)",
        ["montør", await hashPassword("montor123"), "montør"]
      );
      console.log("Oprettede standardbrugere: admin/admin123 og montør/montor123");
    }

    // Seed produkter fra products.json
    const { rows: prodRows } = await client.query("SELECT COUNT(*) AS count FROM produkter");
    if (parseInt(prodRows[0].count) === 0) {
      const productsFile = join(process.cwd(), "server", "data", "products.json");
      if (existsSync(productsFile)) {
        const prods = JSON.parse(readFileSync(productsFile, "utf-8"));
        for (let i = 0; i < prods.length; i++) {
          const p = prods[i];
          await client.query(
            "INSERT INTO produkter (id, navn, enhed, pris_1, pris_2plus, kategori, sortering) VALUES ($1,$2,$3,$4,$5,$6,$7)",
            [p.id, p.navn, p.enhed, p.pris_1, p.pris_2plus, p.kategori, i]
          );
        }
        console.log(`Indlæste ${prods.length} produkter fra products.json`);
      }
    }

    // Seed indstillinger fra config.json
    const { rows: settingRows } = await client.query("SELECT COUNT(*) AS count FROM indstillinger");
    if (parseInt(settingRows[0].count) === 0) {
      const configFile = join(process.cwd(), "server", "data", "config.json");
      const config = existsSync(configFile) ? JSON.parse(readFileSync(configFile, "utf-8")) : {};
      const defaults: Record<string, string> = {
        firmanavn: config.firmanavn || "ElPro Installation ApS",
        adresse: config.adresse || "Elektrikervej 42",
        postnrBy: config.postnrBy || "2650 Hvidovre",
        telefon: config.telefon || "+45 70 20 30 40",
        email: config.email || "info@elpro-installation.dk",
        cvr: config.cvr || "12345678",
        momsprocent: String(config.momsprocent || 25),
        standardtekst: config.standardtekst || "Alle priser er ekskl. moms.",
        betalingsbetingelser: config.betalingsbetingelser || "Betaling netto 8 dage.",
        standardforbehold: config.standardforbehold || "",
        skabelonKategorier: "{}",
        timepris: "595",
      };
      for (const [key, value] of Object.entries(defaults)) {
        await client.query(
          "INSERT INTO indstillinger (nøgle, værdi) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [key, value]
        );
      }
    }
  } finally {
    client.release();
  }
}
