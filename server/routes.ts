import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { storage } from "./storage";
import { requireAuth, requireAdmin, hashPassword } from "./auth";
import { offerSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ── Auth ──────────────────────────────────────────────────────────────

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: info?.message || "Login fejlede" });
      req.logIn(user, (err) => {
        if (err) return next(err);
        res.json({ id: user.id, brugernavn: user.brugernavn, rolle: user.rolle });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Ikke logget ind" });
    res.json({ id: req.user!.id, brugernavn: req.user!.brugernavn, rolle: req.user!.rolle });
  });

  // ── Produkter (public for auth'd users) ───────────────────────────────

  app.get("/api/products", requireAuth, async (_req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch {
      res.status(500).json({ error: "Kunne ikke hente produkter" });
    }
  });

  // ── Config ────────────────────────────────────────────────────────────

  app.get("/api/config", requireAuth, async (_req, res) => {
    try {
      const config = await storage.getConfig();
      res.json(config);
    } catch {
      res.status(500).json({ error: "Kunne ikke hente konfiguration" });
    }
  });

  // ── Tilbud ────────────────────────────────────────────────────────────

  app.get("/api/offers", requireAuth, async (req, res) => {
    try {
      const isAdmin = req.user!.rolle === "admin";
      const userId = isAdmin ? undefined : req.user!.id;
      const list = await storage.getOffersList(userId, isAdmin);
      res.json(list);
    } catch {
      res.status(500).json({ error: "Kunne ikke hente tilbud" });
    }
  });

  app.get("/api/offers/:id", requireAuth, async (req, res) => {
    try {
      const offer = await storage.getOffer(req.params.id);
      if (!offer) return res.status(404).json({ error: "Tilbud ikke fundet" });
      res.json(offer);
    } catch {
      res.status(500).json({ error: "Kunne ikke hente tilbud" });
    }
  });

  app.post("/api/offers", requireAuth, async (req, res) => {
    try {
      const parseResult = offerSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Ugyldigt tilbud", details: parseResult.error.errors });
      }
      const id = await storage.saveOffer(parseResult.data, req.user!.id);
      const saved = await storage.getOffer(id);
      res.status(201).json(saved);
    } catch {
      res.status(500).json({ error: "Kunne ikke gemme tilbud" });
    }
  });

  app.put("/api/offers/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getOffer(req.params.id);
      if (!existing) return res.status(404).json({ error: "Tilbud ikke fundet" });
      const parseResult = offerSchema.safeParse({ ...req.body, id: req.params.id });
      if (!parseResult.success) {
        return res.status(400).json({ error: "Ugyldigt tilbud", details: parseResult.error.errors });
      }
      await storage.saveOffer(parseResult.data, req.user!.id);
      const saved = await storage.getOffer(req.params.id);
      res.json(saved);
    } catch {
      res.status(500).json({ error: "Kunne ikke gemme tilbud" });
    }
  });

  app.delete("/api/offers/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteOffer(req.params.id);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Kunne ikke slette tilbud" });
    }
  });

  // ── HTML-eksport ──────────────────────────────────────────────────────

  app.post("/api/html-export", requireAuth, async (req, res) => {
    try {
      const parseResult = offerSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Ugyldigt tilbud", details: parseResult.error.errors });
      }

      const offer = parseResult.data;
      const products = await storage.getProducts();
      const config = await storage.getConfig();

      const productMap = new Map(products.map(p => [p.id, p]));

      const beregnEnhedspris = (productId: string, antal: number): number => {
        const p = productMap.get(productId);
        if (!p) return 0;
        return antal === 1 ? p.pris_1 : p.pris_2plus;
      };
      const beregnLinjepris = (productId: string, antal: number): number =>
        antal * beregnEnhedspris(productId, antal);

      const fmtDKK = (n: number) =>
        new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK" }).format(n);
      const fmtDate = (s: string) => {
        try { return new Date(s).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" }); }
        catch { return s; }
      };

      let total = 0;
      const lokHtml = offer.lokationer.map(lok => {
        let lokSub = 0;
        const linjerHtml = lok.linjer.map(l => {
          const p = productMap.get(l.productId);
          if (!p) return "";
          const ep = beregnEnhedspris(l.productId, l.antal);
          const lp = beregnLinjepris(l.productId, l.antal);
          lokSub += lp;
          return `<tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">${p.navn}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${l.antal} ${p.enhed}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${fmtDKK(ep)}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:500;">${fmtDKK(lp)}</td>
          </tr>`;
        }).join("");
        total += lokSub;
        return `<div style="margin-bottom:24px;">
          <h3 style="font-size:14px;font-weight:600;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #2563eb;">${lok.navn}</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="color:#666;border-bottom:1px solid #ddd;">
              <th style="padding:8px;text-align:left;font-weight:500;">Produkt</th>
              <th style="padding:8px;text-align:center;font-weight:500;width:80px;">Antal</th>
              <th style="padding:8px;text-align:right;font-weight:500;width:100px;">Enhedspris</th>
              <th style="padding:8px;text-align:right;font-weight:500;width:100px;">Linjepris</th>
            </tr></thead>
            <tbody>${linjerHtml}</tbody>
            <tfoot><tr>
              <td colspan="3" style="padding:8px;text-align:right;font-weight:500;color:#666;">Subtotal ${lok.navn}:</td>
              <td style="padding:8px;text-align:right;font-weight:600;">${fmtDKK(lokSub)}</td>
            </tr></tfoot>
          </table>
        </div>`;
      }).join("");

      const moms = total * (config.momsprocent / 100);
      const totalInkl = total + moms;

      const html = `<!DOCTYPE html><html lang="da"><head><meta charset="UTF-8">
        <title>Tilbud ${offer.meta.tilbudNr || ""}</title>
        <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;color:#333;line-height:1.5;}@page{margin:20mm;}</style>
      </head><body style="padding:40px;">
        <header style="display:flex;justify-content:space-between;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #111;">
          <div>
            <div style="width:180px;height:60px;background:#f0f9ff;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
              <span style="color:#2563eb;font-weight:700;font-size:18px;">${config.firmanavn}</span>
            </div>
            <div style="font-size:12px;color:#666;">
              <p>${config.adresse}</p><p>${config.postnrBy}</p>
              <p>Tlf: ${config.telefon}</p><p>Email: ${config.email}</p><p>CVR: ${config.cvr}</p>
            </div>
          </div>
          <div style="text-align:right;">
            <h1 style="font-size:24px;font-weight:700;margin-bottom:8px;">TILBUD</h1>
            ${offer.meta.tilbudNr ? `<p style="font-size:16px;font-weight:500;color:#2563eb;">#${offer.meta.tilbudNr}</p>` : ""}
            <p style="font-size:12px;color:#666;margin-top:8px;">Dato: ${fmtDate(offer.meta.dato)}</p>
            ${offer.meta.reference ? `<p style="font-size:12px;color:#666;">Reference: ${offer.meta.reference}</p>` : ""}
          </div>
        </header>
        <section style="margin-bottom:32px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;">
            <div>
              <h2 style="font-size:11px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Kunde</h2>
              <p style="font-weight:500;">${offer.kunde.navn || "—"}</p>
              <p>${offer.kunde.adresse || "—"}</p>
              <p>${offer.kunde.telefon || ""}</p><p>${offer.kunde.email || ""}</p>
            </div>
            <div>
              <h2 style="font-size:11px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Projekt</h2>
              <p style="font-weight:500;">${offer.meta.projektnavn || "—"}</p>
            </div>
          </div>
        </section>
        ${lokHtml}
        <section style="margin-top:32px;padding-top:24px;border-top:2px solid #111;">
          <div style="display:flex;justify-content:flex-end;">
            <div style="width:250px;">
              <div style="display:flex;justify-content:space-between;color:#666;margin-bottom:8px;">
                <span>Subtotal (ekskl. moms):</span><span style="font-weight:500;">${fmtDKK(total)}</span>
              </div>
              ${offer.moms.visInkl ? `
                <div style="display:flex;justify-content:space-between;color:#666;margin-bottom:8px;">
                  <span>Moms (${config.momsprocent}%):</span><span>${fmtDKK(moms)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;padding-top:8px;border-top:1px solid #ddd;">
                  <span>Total inkl. moms:</span><span style="color:#2563eb;">${fmtDKK(totalInkl)}</span>
                </div>` : `
                <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;padding-top:8px;border-top:1px solid #ddd;">
                  <span>Total ekskl. moms:</span><span style="color:#2563eb;">${fmtDKK(total)}</span>
                </div>`}
            </div>
          </div>
        </section>
        ${offer.bemærkninger ? `<section style="margin-top:32px;padding:16px;background:#f9fafb;border-radius:8px;">
          <h3 style="font-weight:600;margin-bottom:8px;">Bemærkninger</h3>
          <p style="font-size:13px;color:#666;white-space:pre-wrap;">${offer.bemærkninger}</p>
        </section>` : ""}
        <footer style="margin-top:48px;padding-top:24px;border-top:1px solid #ddd;font-size:12px;color:#666;">
          <p style="margin-bottom:16px;">${config.standardtekst}</p>
          <p>${config.betalingsbetingelser}</p>
        </footer>
      </body></html>`;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="tilbud-${offer.meta.tilbudNr || "draft"}.html"`);
      res.send(html);
    } catch (err) {
      console.error("HTML export error:", err);
      res.status(500).json({ error: "Kunne ikke generere HTML" });
    }
  });

  // ── Admin: Produkter ──────────────────────────────────────────────────

  app.get("/api/admin/products", requireAdmin, async (_req, res) => {
    try {
      res.json(await storage.getAllProducts());
    } catch {
      res.status(500).json({ error: "Kunne ikke hente produkter" });
    }
  });

  const adminProductSchema = z.object({
    id: z.string().min(1),
    navn: z.string().min(1),
    enhed: z.string().min(1).default("stk"),
    pris_1: z.number().min(0),
    pris_2plus: z.number().min(0),
    kategori: z.string().min(1),
    kostpris: z.number().min(0).nullable().optional(),
    avanceProcent: z.number().min(0).nullable().optional(),
    arbejdstidMinutter: z.number().min(0).nullable().optional(),
    beskrivelse: z.string().nullable().optional(),
    aktiv: z.boolean().default(true),
    sortering: z.number().default(0),
  });

  app.post("/api/admin/products", requireAdmin, async (req, res) => {
    try {
      const parsed = adminProductSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Ugyldige data", details: parsed.error.errors });
      await storage.createProduct(parsed.data as any);
      res.status(201).json({ ok: true });
    } catch (err: any) {
      if (err.code === "23505") return res.status(409).json({ error: "Et produkt med dette ID eksisterer allerede" });
      res.status(500).json({ error: "Kunne ikke oprette produkt" });
    }
  });

  app.put("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = adminProductSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Ugyldige data", details: parsed.error.errors });
      await storage.updateProduct(req.params.id, parsed.data as any);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Kunne ikke opdatere produkt" });
    }
  });

  app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Kunne ikke slette produkt" });
    }
  });

  // ── Admin: Indstillinger ──────────────────────────────────────────────

  app.get("/api/admin/settings", requireAdmin, async (_req, res) => {
    try {
      res.json(await storage.getSettings());
    } catch {
      res.status(500).json({ error: "Kunne ikke hente indstillinger" });
    }
  });

  app.put("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const settings = z.record(z.string()).parse(req.body);
      await storage.updateSettings(settings);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Kunne ikke gemme indstillinger" });
    }
  });

  // ── Admin: Brugere ────────────────────────────────────────────────────

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      res.json(await storage.getUsers());
    } catch {
      res.status(500).json({ error: "Kunne ikke hente brugere" });
    }
  });

  const newUserSchema = z.object({
    brugernavn: z.string().min(2),
    password: z.string().min(6),
    rolle: z.enum(["montør", "admin"]).default("montør"),
  });

  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const parsed = newUserSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Ugyldige data", details: parsed.error.errors });
      const user = await storage.createUser(parsed.data.brugernavn, parsed.data.password, parsed.data.rolle);
      res.status(201).json(user);
    } catch (err: any) {
      if (err.code === "23505") return res.status(409).json({ error: "Brugernavnet er allerede i brug" });
      res.status(500).json({ error: "Kunne ikke oprette bruger" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (id === req.user!.id) return res.status(400).json({ error: "Du kan ikke slette dig selv" });
      await storage.deleteUser(id);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Kunne ikke slette bruger" });
    }
  });

  // Skift adgangskode (auth'd bruger kan ændre sin egen)
  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const { password } = z.object({ password: z.string().min(6) }).parse(req.body);
      const hash = await hashPassword(password);
      const { db, brugere } = await import("./db");
      const { eq } = await import("drizzle-orm");
      await db.update(brugere).set({ passwordHash: hash }).where(eq(brugere.id, req.user!.id));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Kunne ikke ændre adgangskode" });
    }
  });

  return httpServer;
}
