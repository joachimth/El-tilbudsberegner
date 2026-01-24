import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { Product, Config, Offer } from "@shared/schema";

const DATA_DIR = join(process.cwd(), "server", "data");
const PRODUCTS_FILE = join(DATA_DIR, "products.json");
const CONFIG_FILE = join(DATA_DIR, "config.json");
const OFFERS_DIR = join(DATA_DIR, "offers");

function ensureDirectoryExists(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export interface IStorage {
  getProducts(): Product[];
  getConfig(): Config;
  saveOffer(offer: Offer): string;
  getOffer(id: string): Offer | null;
  getOffers(): Offer[];
}

export class FileStorage implements IStorage {
  constructor() {
    ensureDirectoryExists(DATA_DIR);
    ensureDirectoryExists(OFFERS_DIR);
  }

  getProducts(): Product[] {
    try {
      const content = readFileSync(PRODUCTS_FILE, "utf-8");
      return JSON.parse(content) as Product[];
    } catch (error) {
      console.error("Error reading products:", error);
      return [];
    }
  }

  getConfig(): Config {
    try {
      const content = readFileSync(CONFIG_FILE, "utf-8");
      return JSON.parse(content) as Config;
    } catch (error) {
      console.error("Error reading config:", error);
      return {
        firmanavn: "ElPro Installation ApS",
        adresse: "Elektrikervej 42",
        postnrBy: "2650 Hvidovre",
        telefon: "+45 70 20 30 40",
        email: "info@elpro-installation.dk",
        cvr: "12345678",
        momsprocent: 25,
        standardtekst: "Alle priser er ekskl. moms.",
        betalingsbetingelser: "Betaling netto 8 dage."
      };
    }
  }

  saveOffer(offer: Offer): string {
    const id = offer.id || `offer-${Date.now()}`;
    const offerWithId = { ...offer, id };
    const filePath = join(OFFERS_DIR, `${id}.json`);
    writeFileSync(filePath, JSON.stringify(offerWithId, null, 2));
    return id;
  }

  getOffer(id: string): Offer | null {
    try {
      const filePath = join(OFFERS_DIR, `${id}.json`);
      if (!existsSync(filePath)) return null;
      const content = readFileSync(filePath, "utf-8");
      return JSON.parse(content) as Offer;
    } catch (error) {
      console.error("Error reading offer:", error);
      return null;
    }
  }

  getOffers(): Offer[] {
    try {
      if (!existsSync(OFFERS_DIR)) return [];
      const { readdirSync } = require("fs");
      const files = readdirSync(OFFERS_DIR) as string[];
      return files
        .filter((f: string) => f.endsWith(".json"))
        .map((f: string) => {
          const content = readFileSync(join(OFFERS_DIR, f), "utf-8");
          return JSON.parse(content) as Offer;
        });
    } catch (error) {
      console.error("Error reading offers:", error);
      return [];
    }
  }
}

export const storage = new FileStorage();
