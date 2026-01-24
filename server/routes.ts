import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { offerSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/products", (_req, res) => {
    try {
      const products = storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to load products" });
    }
  });

  app.get("/api/config", (_req, res) => {
    try {
      const config = storage.getConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to load config" });
    }
  });

  app.get("/api/offers", (_req, res) => {
    try {
      const offers = storage.getOffers();
      res.json(offers);
    } catch (error) {
      res.status(500).json({ error: "Failed to load offers" });
    }
  });

  app.get("/api/offers/:id", (req, res) => {
    try {
      const offer = storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }
      res.json(offer);
    } catch (error) {
      res.status(500).json({ error: "Failed to load offer" });
    }
  });

  app.post("/api/offers", (req, res) => {
    try {
      const parseResult = offerSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid offer data", 
          details: parseResult.error.errors 
        });
      }
      
      const id = storage.saveOffer(parseResult.data);
      res.status(201).json({ id });
    } catch (error) {
      res.status(500).json({ error: "Failed to save offer" });
    }
  });

  app.post("/api/html-export", async (req, res) => {
    try {
      const parseResult = offerSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid offer data", 
          details: parseResult.error.errors 
        });
      }

      const offer = parseResult.data;
      const products = storage.getProducts();
      const config = storage.getConfig();

      const productMap = new Map(products.map(p => [p.id, p]));
      
      const beregnEnhedspris = (productId: string, antal: number): number => {
        const product = productMap.get(productId);
        if (!product) return 0;
        return antal === 1 ? product.pris_1 : product.pris_2plus;
      };

      const beregnLinjepris = (productId: string, antal: number): number => {
        return antal * beregnEnhedspris(productId, antal);
      };

      const formatDKK = (amount: number): string => {
        return new Intl.NumberFormat('da-DK', {
          style: 'currency',
          currency: 'DKK',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
      };

      const formatDate = (dateStr: string) => {
        try {
          return new Date(dateStr).toLocaleDateString("da-DK", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
        } catch {
          return dateStr;
        }
      };

      let total = 0;
      const lokationerHtml = offer.lokationer.map(lok => {
        let lokSubtotal = 0;
        const linjerHtml = lok.linjer.map(linje => {
          const product = productMap.get(linje.productId);
          if (!product) return "";
          
          const enhedspris = beregnEnhedspris(linje.productId, linje.antal);
          const linjepris = beregnLinjepris(linje.productId, linje.antal);
          lokSubtotal += linjepris;

          return `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${product.navn}</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${linje.antal} ${product.enhed}</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatDKK(enhedspris)}</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: 500;">${formatDKK(linjepris)}</td>
            </tr>
          `;
        }).join("");

        total += lokSubtotal;

        return `
          <div style="margin-bottom: 24px;">
            <h3 style="font-size: 14px; font-weight: 600; color: #111; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #2563eb; display: flex; align-items: center; gap: 8px;">
              <span style="width: 8px; height: 8px; background: #2563eb; border-radius: 50%;"></span>
              ${lok.navn}
            </h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="color: #666; border-bottom: 1px solid #ddd;">
                  <th style="padding: 8px; text-align: left; font-weight: 500;">Produkt</th>
                  <th style="padding: 8px; text-align: center; font-weight: 500; width: 80px;">Antal</th>
                  <th style="padding: 8px; text-align: right; font-weight: 500; width: 100px;">Enhedspris</th>
                  <th style="padding: 8px; text-align: right; font-weight: 500; width: 100px;">Linjepris</th>
                </tr>
              </thead>
              <tbody>
                ${linjerHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding: 8px; text-align: right; font-weight: 500; color: #666;">Subtotal ${lok.navn}:</td>
                  <td style="padding: 8px; text-align: right; font-weight: 600;">${formatDKK(lokSubtotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        `;
      }).join("");

      const moms = total * (config.momsprocent / 100);
      const totalInklMoms = total + moms;

      const html = `
        <!DOCTYPE html>
        <html lang="da">
        <head>
          <meta charset="UTF-8">
          <title>Tilbud ${offer.meta.tilbudNr || ""}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; color: #333; line-height: 1.5; }
            @page { margin: 20mm; }
          </style>
        </head>
        <body style="padding: 40px;">
          <header style="display: flex; justify-content: space-between; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #111;">
            <div>
              <div style="width: 180px; height: 60px; background: #f0f9ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <span style="color: #2563eb; font-weight: 700; font-size: 18px;">${config.firmanavn}</span>
              </div>
              <div style="font-size: 12px; color: #666;">
                <p>${config.adresse}</p>
                <p>${config.postnrBy}</p>
                <p>Tlf: ${config.telefon}</p>
                <p>Email: ${config.email}</p>
                <p>CVR: ${config.cvr}</p>
              </div>
            </div>
            <div style="text-align: right;">
              <h1 style="font-size: 24px; font-weight: 700; color: #111; margin-bottom: 8px;">TILBUD</h1>
              ${offer.meta.tilbudNr ? `<p style="font-size: 16px; font-weight: 500; color: #2563eb;">#${offer.meta.tilbudNr}</p>` : ""}
              <p style="font-size: 12px; color: #666; margin-top: 8px;">Dato: ${formatDate(offer.meta.dato)}</p>
              ${offer.meta.reference ? `<p style="font-size: 12px; color: #666;">Reference: ${offer.meta.reference}</p>` : ""}
            </div>
          </header>

          <section style="margin-bottom: 32px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
              <div>
                <h2 style="font-size: 11px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Kunde</h2>
                <p style="font-weight: 500;">${offer.kunde.navn || "—"}</p>
                <p>${offer.kunde.adresse || "—"}</p>
                <p>${offer.kunde.telefon || ""}</p>
                <p>${offer.kunde.email || ""}</p>
              </div>
              <div>
                <h2 style="font-size: 11px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Projekt</h2>
                <p style="font-weight: 500;">${offer.meta.projektnavn || "—"}</p>
              </div>
            </div>
          </section>

          ${lokationerHtml}

          <section style="margin-top: 32px; padding-top: 24px; border-top: 2px solid #111;">
            <div style="display: flex; justify-content: flex-end;">
              <div style="width: 250px;">
                <div style="display: flex; justify-content: space-between; color: #666; margin-bottom: 8px;">
                  <span>Subtotal (ekskl. moms):</span>
                  <span style="font-weight: 500;">${formatDKK(total)}</span>
                </div>
                ${offer.moms.visInkl ? `
                  <div style="display: flex; justify-content: space-between; color: #666; margin-bottom: 8px;">
                    <span>Moms (25%):</span>
                    <span>${formatDKK(moms)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; padding-top: 8px; border-top: 1px solid #ddd;">
                    <span>Total inkl. moms:</span>
                    <span style="color: #2563eb;">${formatDKK(totalInklMoms)}</span>
                  </div>
                ` : `
                  <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; padding-top: 8px; border-top: 1px solid #ddd;">
                    <span>Total ekskl. moms:</span>
                    <span style="color: #2563eb;">${formatDKK(total)}</span>
                  </div>
                `}
              </div>
            </div>
          </section>

          ${offer.bemærkninger ? `
            <section style="margin-top: 32px; padding: 16px; background: #f9fafb; border-radius: 8px;">
              <h3 style="font-weight: 600; margin-bottom: 8px;">Bemærkninger</h3>
              <p style="font-size: 13px; color: #666; white-space: pre-wrap;">${offer.bemærkninger}</p>
            </section>
          ` : ""}

          <footer style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            <p style="margin-bottom: 16px;">${config.standardtekst}</p>
            <p>${config.betalingsbetingelser}</p>
          </footer>
        </body>
        </html>
      `;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="tilbud-${offer.meta.tilbudNr || 'draft'}.html"`);
      res.send(html);

    } catch (error) {
      console.error("HTML export error:", error);
      res.status(500).json({ error: "Failed to generate HTML export" });
    }
  });

  return httpServer;
}
