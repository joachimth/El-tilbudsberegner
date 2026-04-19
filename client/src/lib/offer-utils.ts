import type { Product, Offer, Lokation, Skabelon } from "@shared/schema";
import { beregnEnhedspris, beregnLinjepris } from "@shared/schema";
import type { OfferWithTotals, LokationWithTotals, LinjeWithProduct } from "./types";

export function calculateOfferTotals(
  offer: Offer,
  products: Product[],
  momsprocent: number = 25
): OfferWithTotals {
  const productMap = new Map(products.map(p => [p.id, p]));
  
  const lokationerWithTotals: LokationWithTotals[] = offer.lokationer.map(lok => {
    const linjerWithProducts: LinjeWithProduct[] = lok.linjer.map(linje => {
      const product = productMap.get(linje.productId);
      if (!product) {
        return {
          productId: linje.productId,
          product: {
            id: linje.productId,
            navn: "Ukendt produkt",
            enhed: "stk",
            pris_1: 0,
            pris_2plus: 0,
            kategori: "Ukendt"
          },
          antal: linje.antal,
          enhedspris: 0,
          linjepris: 0
        };
      }
      
      const enhedspris = beregnEnhedspris(product, linje.antal);
      const linjepris = beregnLinjepris(product, linje.antal);
      
      return {
        productId: linje.productId,
        product,
        antal: linje.antal,
        enhedspris,
        linjepris
      };
    });
    
    const subtotal = linjerWithProducts.reduce((sum, l) => sum + l.linjepris, 0);
    
    return {
      ...lok,
      linjerWithProducts,
      subtotal
    };
  });
  
  const total = lokationerWithTotals.reduce((sum, l) => sum + l.subtotal, 0);
  const moms = total * (momsprocent / 100);
  const totalInklMoms = total + moms;
  
  return {
    offer,
    lokationerWithTotals,
    total,
    moms,
    totalInklMoms
  };
}

export function createEmptyOffer(skabelon: Skabelon = "standard"): Offer {
  const today = new Date().toISOString().split('T')[0];
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');

  return {
    skabelon,
    meta: {
      projektnavn: "",
      dato: today,
      reference: "",
      tilbudNr: `${year}-${randomNum}`
    },
    kunde: {
      navn: "",
      adresse: "",
      email: "",
      telefon: ""
    },
    moms: {
      visInkl: false
    },
    bemærkninger: "",
    lokationer: []
  };
}

export function createEmptyLokation(navn: string = "Ny lokation"): Lokation {
  return {
    navn,
    linjer: []
  };
}

export function groupProductsByCategory(products: Product[]): Map<string, Product[]> {
  const grouped = new Map<string, Product[]>();
  
  products.forEach(product => {
    const existing = grouped.get(product.kategori) || [];
    grouped.set(product.kategori, [...existing, product]);
  });
  
  return grouped;
}

export function downloadAsJson(offer: Offer, filename: string) {
  const json = JSON.stringify(offer, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function loadFromJsonFile(file: File): Promise<Offer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const offer = JSON.parse(content) as Offer;
        resolve(offer);
      } catch (error) {
        reject(new Error("Ugyldig fil - kunne ikke læse tilbuddet"));
      }
    };
    reader.onerror = () => reject(new Error("Kunne ikke læse filen"));
    reader.readAsText(file);
  });
}
