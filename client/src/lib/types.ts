import type { Product, Lokation, Kunde, Meta, Moms, Offer, Config } from "@shared/schema";

export type { Product, Lokation, Kunde, Meta, Moms, Offer, Config };

export interface LinjeWithProduct {
  productId: string;
  product: Product;
  antal: number;
  enhedspris: number;
  linjepris: number;
}

export interface LokationWithTotals extends Lokation {
  linjerWithProducts: LinjeWithProduct[];
  subtotal: number;
}

export interface OfferWithTotals {
  offer: Offer;
  lokationerWithTotals: LokationWithTotals[];
  total: number;
  moms: number;
  totalInklMoms: number;
}

export interface ProductsByCategory {
  kategori: string;
  products: Product[];
}
