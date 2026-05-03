import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import multer from "multer";
import { storage } from "./storage";
import { requireAuth, requireAdmin, hashPassword } from "./auth";
import { offerSchema } from "@shared/schema";
import type { Offer } from "@shared/schema";
import type { Product, Config } from "@shared/schema";
import { SKABELON_REGISTRY } from "@shared/skabelon-registry";
import { z } from "zod";
import { renderEvErhvervV2 } from "./templates/ev_erhverv_v2.js";
import { htmlToPdf } from "./templates/pdf.js";

// ── HTML-generator (skabelon-specifik) ───────────────────────────────────────

function genererHtml(offer: Offer, products: Product[], config: Config): string {
  const pm = new Map(products.map(p => [p.id, p]));
  const fmtDKK = (n: number) =>
    new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK" }).format(n);
  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" }); }
    catch { return s; }
  };
  const ep = (id: string, antal: number) => { const p = pm.get(id); if (!p) return 0; return antal === 1 ? p.pris_1 : p.pris_2plus; };
  const lp = (id: string, antal: number) => antal * ep(id, antal);

  // Beregn totaler
  type LokMed = { navn: string; beskrivelse?: string; subtotal: number; linjerHtml: string; linjer: typeof offer.lokationer[0]["linjer"] };
  const loks: LokMed[] = offer.lokationer.map(lok => {
    let sub = 0;
    const linjerHtml = lok.linjer.map(l => {
      const p = pm.get(l.productId); if (!p) return "";
      const e = ep(l.productId, l.antal), line = lp(l.productId, l.antal);
      sub += line;
      return `<tr><td style="padding:8px 6px;border-bottom:1px solid #eee;">${p.navn}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center;">${l.antal} ${p.enhed}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;">${fmtDKK(e)}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-weight:500;">${fmtDKK(line)}</td></tr>`;
    }).join("");
    return { navn: lok.navn, beskrivelse: lok.beskrivelse, subtotal: sub, linjerHtml, linjer: lok.linjer };
  });
  const total = loks.reduce((s, l) => s + l.subtotal, 0);
  const moms = total * (config.momsprocent / 100);
  const totalInkl = total + moms;
  const slutpris = offer.moms.visInkl ? totalInkl : total;
  const slutLabel = offer.moms.visInkl ? "Samlet pris inkl. moms" : "Samlet pris ekskl. moms";

  const CSS = `*{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f2937;line-height:1.5;background:#fff;}
    h1,h2,h3,h4{margin-top:0;}
    @page{margin:20mm;}
    .band{background:#1f4d6b;color:#fff;padding:10px 32px;font-size:12px;letter-spacing:.03em;}
    .inner{padding:40px;}
    .hoved{display:flex;justify-content:space-between;gap:24px;margin-bottom:28px;padding-bottom:24px;border-bottom:2px solid #111;flex-wrap:wrap;}
    .firma{font-weight:700;font-size:18px;color:#1f4d6b;margin-bottom:8px;}
    .meta{font-size:13px;color:#6b7280;line-height:1.6;}
    table{width:100%;border-collapse:collapse;}
    th{padding:10px 6px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #d1d5db;font-weight:500;}
    th:last-child,td:last-child{text-align:right;white-space:nowrap;}
    th:nth-child(2),td:nth-child(2){text-align:center;width:90px;}
    .prisboks{display:flex;justify-content:flex-end;margin-top:20px;}
    .prisboks-inner{min-width:280px;border:2px solid #1f4d6b;border-radius:12px;padding:16px 18px;background:#eaf2f7;}
    .prisboks-label{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-bottom:6px;}
    .prisboks-amount{font-size:28px;font-weight:700;color:#111827;}
    .forbehold{border:1px solid #ead7a3;background:#fff8e6;border-radius:10px;padding:14px 16px;margin-top:14px;}
    .god{border:1px solid #b8ddc2;background:#eef8f1;border-radius:10px;padding:14px 16px;margin-top:14px;}
    ul{padding-left:20px;}li{margin-bottom:6px;font-size:13px;}
    .modul{border-top:4px solid #1f4d6b;border-left:1px solid #d1d5db;border-right:1px solid #d1d5db;border-bottom:1px solid #d1d5db;border-radius:10px;padding:18px;margin-bottom:16px;}
    .modul-row{display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;flex-wrap:wrap;}
    .modul-titel{font-size:18px;font-weight:700;}
    .modul-pris{font-size:20px;font-weight:700;white-space:nowrap;}
    .section{margin-bottom:28px;}
    .section h2{font-size:16px;font-weight:600;margin-bottom:12px;}
    footer{margin-top:40px;padding-top:20px;border-top:1px solid #d1d5db;font-size:12px;color:#6b7280;}`;

  const hoved = `<div class="hoved">
    <div><div class="firma">${config.firmanavn}</div>
    <div class="meta">${[config.adresse, config.postnrBy, config.telefon ? "Tlf. "+config.telefon : "", config.email].filter(Boolean).join("<br>")}</div></div>
    <div class="meta" style="text-align:right;">
      ${offer.kunde.navn ? `<strong>Kunde:</strong> ${offer.kunde.navn}<br>` : ""}
      ${offer.kunde.adresse ? `${offer.kunde.adresse}<br>` : ""}
      ${offer.meta.dato ? `<strong>Dato:</strong> ${fmtDate(offer.meta.dato)}<br>` : ""}
      ${offer.meta.tilbudNr ? `<strong>Ref.:</strong> ${offer.meta.tilbudNr}` : ""}
    </div></div>`;

  const prisboks = `<div class="prisboks"><div class="prisboks-inner">
    <div class="prisboks-label">${slutLabel}</div>
    <div class="prisboks-amount">${fmtDKK(slutpris)}</div>
  </div></div>`;

  const footer = `<footer>${config.standardtekst ? `<p style="margin-bottom:10px;">${config.standardtekst}</p>` : ""}
    ${config.betalingsbetingelser ? `<p>${config.betalingsbetingelser}</p>` : ""}</footer>`;

  const wrap = (band: string, body: string) =>
    `<!DOCTYPE html><html lang="da"><head><meta charset="UTF-8"><title>Tilbud ${offer.meta.tilbudNr||""}</title><style>${CSS}</style></head>
    <body><div class="band">${band}</div><div class="inner">${body}</div></body></html>`;

  const forbehold = offer.bemærkninger
    ? offer.bemærkninger.split("\n").filter(l => l.trim()).map(l => `<li>${l.replace(/^[-•]\s*/, "")}</li>`).join("")
    : "";

  // ── EV_ERHVERV_V2 ──
  if (offer.skabelon === "ev_erhverv_v2") {
    return renderEvErhvervV2(offer, products, config, offer.v2);
  }

  // ── EV_ERHVERV ──
  if (offer.skabelon === "ev_erhverv") {
    const tabeller = loks.map(lok => `
      ${loks.length > 1 ? `<h3 style="font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;margin:16px 0 8px;">${lok.navn}</h3>` : ""}
      <table><thead><tr><th>Beskrivelse</th><th>Antal</th><th>Pris</th></tr></thead>
      <tbody>${lok.linjerHtml.replace(/<td[^>]*>[^<]*<\/td>\s*$/gm, "").replace(/<td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;">/g, '<td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;">')}</tbody></table>`).join("");

    // Genbyg tabel uden enhedspris-kolonne (3 kolonner)
    const tbl3 = loks.map(lok => {
      const rækker = lok.linjer.map(l => {
        const p = pm.get(l.productId); if (!p) return "";
        const line = lp(l.productId, l.antal);
        return `<tr><td style="padding:10px 6px;border-bottom:1px solid #eee;">${p.navn}</td>
          <td style="padding:10px 6px;border-bottom:1px solid #eee;text-align:center;">${l.antal} ${p.enhed}</td>
          <td style="padding:10px 6px;border-bottom:1px solid #eee;text-align:right;">${fmtDKK(line)}</td></tr>`;
      }).join("");
      return `${loks.length > 1 ? `<h3 style="font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;margin:16px 0 8px;">${lok.navn}</h3>` : ""}
        <table><thead><tr><th>Beskrivelse</th><th>Antal</th><th>Pris</th></tr></thead><tbody>${rækker}</tbody></table>`;
    }).join("");

    return wrap("EV &amp; Erhverv · Tilbud", `
      ${hoved}
      <h1 style="font-size:28px;font-weight:700;margin-bottom:4px;">${offer.meta.projektnavn || "Tilbud"}</h1>
      <p style="color:#6b7280;margin-bottom:24px;font-size:13px;">Kompakt erhvervstilbud</p>
      <div class="section"><h2>Prissætning</h2>${tbl3}${prisboks}</div>
      ${forbehold ? `<div class="section"><h2>Generelle forbehold</h2><div class="forbehold"><ul>${forbehold}</ul></div></div>` : ""}
      ${footer}`);
  }

  // ── ENERGI_PRIVAT ──
  if (offer.skabelon === "energi_privat") {
    const løsning = loks.map(lok => `
      <div style="border:1px solid #d1d5db;border-radius:10px;padding:14px 16px;background:#fafbfc;break-inside:avoid;">
        <h4 style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-bottom:8px;">${lok.navn}</h4>
        <ul>${lok.linjer.map(l => { const p = pm.get(l.productId); return p ? `<li>${p.navn} (${l.antal} ${p.enhed})</li>` : ""; }).join("")}</ul>
      </div>`).join("");

    return wrap("Energi &amp; Privat · Tilbud", `
      ${hoved}
      <h1 style="font-size:28px;font-weight:700;margin-bottom:4px;">${offer.meta.projektnavn || "Tilbud"}</h1>
      <p style="color:#6b7280;margin-bottom:24px;font-size:13px;">Vi er glade for at præsentere vores tilbud. Løsningen er sammensat med fokus på driftssikkerhed og energibesparelse.</p>
      ${loks.length > 0 ? `<div class="section"><h2>Løsningen indeholder</h2>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;">${løsning}</div></div>` : ""}
      ${forbehold ? `<div class="section"><h2>Bemærkninger og aftalte forhold</h2><div class="forbehold"><ul>${forbehold}</ul></div></div>` : ""}
      <div class="section"><h2>Samlet pris</h2>${prisboks}
        <p style="font-size:13px;color:#6b7280;margin-top:12px;">Gyldighed: 30 dage fra tilbudsdato.</p></div>
      <div class="section"><h2>Vores opgave</h2><div class="god"><ul>
        <li>Installation og opsætning af anlæg</li>
        <li>Tilmelding til netselskab (hvis relevant)</li>
        <li>Vejledning i styring og overvågning</li>
      </ul></div></div>
      ${footer}`);
  }

  // ── MODUL_OVERSLAG ──
  if (offer.skabelon === "modul_overslag") {
    const moduler = loks.map(lok => {
      const rækker = lok.linjer.map(l => {
        const p = pm.get(l.productId); if (!p) return "";
        return `<tr><td style="padding:6px 4px;border-bottom:1px solid #f3f4f6;font-size:13px;">${p.navn}</td>
          <td style="padding:6px 4px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:13px;color:#9ca3af;">${l.antal} ${p.enhed}</td>
          <td style="padding:6px 4px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:13px;">${fmtDKK(lp(l.productId,l.antal))}</td></tr>`;
      }).join("");
      return `<div class="modul">
        <div class="modul-row"><div class="modul-titel">${lok.navn}</div><div class="modul-pris">${fmtDKK(lok.subtotal)}</div></div>
        ${lok.beskrivelse ? `<p style="font-size:13px;color:#6b7280;margin-bottom:10px;">${lok.beskrivelse}</p>` : ""}
        ${rækker ? `<table style="margin-top:6px;"><tbody>${rækker}</tbody></table>` : ""}
      </div>`;
    }).join("");

    return wrap("Modul Overslag", `
      ${hoved}
      <h1 style="font-size:28px;font-weight:700;margin-bottom:4px;">Overslagspris</h1>
      <p style="color:#6b7280;margin-bottom:24px;font-size:13px;">${offer.meta.projektnavn || "Flerfagligt projekt"}</p>
      ${forbehold ? `<div class="section"><h2>Forudsætninger</h2>
        <div style="border:1px solid #d1d5db;border-radius:10px;padding:14px 16px;background:#fafbfc;"><ul>${forbehold}</ul></div></div>` : ""}
      <div class="section">${moduler}</div>
      <div class="section"><h2>Samlet overslag</h2>${prisboks}</div>
      ${footer}`);
  }

  // ── STANDARD ──
  const lokSektioner = loks.map(lok => `
    <div class="section">
      <h2 style="font-size:15px;padding-bottom:8px;border-bottom:1px solid #d1d5db;">${lok.navn}</h2>
      <table><thead><tr><th>Produkt</th><th>Antal</th><th>Enhedspris</th><th>Linjepris</th></tr></thead>
      <tbody>${lok.linjerHtml}</tbody>
      <tfoot><tr><td colspan="3" style="padding:8px 6px;text-align:right;font-weight:500;color:#6b7280;">Subtotal ${lok.navn}:</td>
        <td style="padding:8px 6px;text-align:right;font-weight:600;">${fmtDKK(lok.subtotal)}</td></tr></tfoot>
    </table></div>`).join("");

  return wrap("Tilbud", `
    ${hoved}
    <h1 style="font-size:26px;font-weight:700;margin-bottom:20px;">${offer.meta.projektnavn || "Tilbud"}</h1>
    ${lokSektioner}
    <div style="margin-top:24px;padding-top:20px;border-top:2px solid #111;display:flex;justify-content:flex-end;">
      <div style="min-width:240px;">
        <div style="display:flex;justify-content:space-between;color:#6b7280;margin-bottom:6px;">
          <span>Subtotal ekskl. moms:</span><span>${fmtDKK(total)}</span></div>
        ${offer.moms.visInkl ? `<div style="display:flex;justify-content:space-between;color:#6b7280;margin-bottom:6px;">
          <span>Moms (${config.momsprocent}%):</span><span>${fmtDKK(moms)}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;padding-top:8px;border-top:1px solid #d1d5db;">
          <span>Total inkl. moms:</span><span style="color:#1f4d6b;">${fmtDKK(totalInkl)}</span></div>` :
          `<div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;padding-top:8px;border-top:1px solid #d1d5db;">
          <span>Total ekskl. moms:</span><span style="color:#1f4d6b;">${fmtDKK(total)}</span></div>`}
      </div></div>
    ${offer.bemærkninger ? `<div style="margin-top:28px;padding:16px;background:#f9fafb;border-radius:8px;">
      <h3 style="font-weight:600;margin-bottom:8px;">Bemærkninger</h3>
      <p style="font-size:13px;color:#6b7280;white-space:pre-wrap;">${offer.bemærkninger}</p></div>` : ""}
    ${footer}`);
}

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
      // Strip large Base64 blobs — images served via dedicated endpoints below
      res.json(products.map(({ billedeBase64, producentLogoBase64, ...p }) => ({
        ...p,
        heeftBillede: !!billedeBase64,
        heeftProducentLogo: !!producentLogoBase64,
      })));
    } catch {
      res.status(500).json({ error: "Kunne ikke hente produkter" });
    }
  });

  // ── Produkt-billeder (image serving) ─────────────────────────────────

  app.get("/api/products/:id/billede", requireAuth, async (req, res) => {
    try {
      const products = await storage.getProducts();
      const product = products.find(p => p.id === String(req.params.id));
      if (!product?.billedeBase64) return res.status(404).end();
      const match = product.billedeBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return res.status(500).end();
      const buf = Buffer.from(match[2], "base64");
      res.setHeader("Content-Type", match[1]);
      res.setHeader("Cache-Control", "private, max-age=86400");
      res.send(buf);
    } catch {
      res.status(500).end();
    }
  });

  app.get("/api/products/:id/producentlogo", requireAuth, async (req, res) => {
    try {
      const products = await storage.getProducts();
      const product = products.find(p => p.id === String(req.params.id));
      if (!product?.producentLogoBase64) return res.status(404).end();
      const match = product.producentLogoBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return res.status(500).end();
      const buf = Buffer.from(match[2], "base64");
      res.setHeader("Content-Type", match[1]);
      res.setHeader("Cache-Control", "private, max-age=86400");
      res.send(buf);
    } catch {
      res.status(500).end();
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
      const offer = await storage.getOffer(String(req.params.id));
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
      const id = String(req.params.id);
      const existing = await storage.getOffer(id);
      if (!existing) return res.status(404).json({ error: "Tilbud ikke fundet" });
      const parseResult = offerSchema.safeParse({ ...req.body, id });
      if (!parseResult.success) {
        return res.status(400).json({ error: "Ugyldigt tilbud", details: parseResult.error.errors });
      }
      await storage.saveOffer(parseResult.data, req.user!.id);
      const saved = await storage.getOffer(id);
      res.json(saved);
    } catch {
      res.status(500).json({ error: "Kunne ikke gemme tilbud" });
    }
  });

  app.delete("/api/offers/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteOffer(String(req.params.id));
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
      let html: string;
      if (offer.skabelon === "ev_erhverv_v2") {
        const templateKonfig = await storage.getSkabelonKonfig("ev_erhverv_v2");
        html = renderEvErhvervV2(offer, products, config, offer.v2, templateKonfig);
      } else {
        html = genererHtml(offer, products, config);
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="tilbud-${offer.meta.tilbudNr || "draft"}.html"`);
      res.send(html);
    } catch (err) {
      console.error("HTML export error:", err);
      res.status(500).json({ error: "Kunne ikke generere HTML" });
    }
  });

  // ── PDF-eksport ───────────────────────────────────────────────────────

  app.post("/api/pdf-export", requireAuth, async (req, res) => {
    try {
      const parseResult = offerSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Ugyldigt tilbud", details: parseResult.error.errors });
      }
      const offer = parseResult.data;
      const products = await storage.getProducts();
      const config = await storage.getConfig();
      const html = genererHtml(offer, products, config);
      const pdf = await htmlToPdf(html);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="tilbud-${offer.meta.tilbudNr || "draft"}.pdf"`);
      res.send(pdf);
    } catch (err) {
      console.error("PDF export error:", err);
      res.status(500).json({ error: "Kunne ikke generere PDF" });
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
    forbehold: z.string().nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
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
      await storage.updateProduct(String(req.params.id), parsed.data as any);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Kunne ikke opdatere produkt" });
    }
  });

  app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteProduct(String(req.params.id));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Kunne ikke slette produkt" });
    }
  });

  // ── Admin: Produktbillede ────────────────────────────────────────────

  const produktBilledeUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("image/")) cb(null, true);
      else cb(new Error("Kun billedfiler er tilladt"));
    },
  });

  app.post("/api/admin/products/:id/billede", requireAdmin, produktBilledeUpload.single("billede"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Ingen fil modtaget" });
      const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      await storage.updateProduct(String(req.params.id), { billedeBase64: base64 });
      res.json({ ok: true, billede: base64 });
    } catch {
      res.status(500).json({ error: "Kunne ikke gemme billede" });
    }
  });

  app.delete("/api/admin/products/:id/billede", requireAdmin, async (req, res) => {
    try {
      await storage.updateProduct(String(req.params.id), { billedeBase64: null });
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Kunne ikke fjerne billede" });
    }
  });

  // ── Admin: Producentlogo ──────────────────────────────────────────────

  const producentLogoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      cb(null, file.mimetype.startsWith("image/"));
    },
  });

  app.post("/api/admin/products/:id/producentlogo", requireAdmin, producentLogoUpload.single("producentlogo"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Ingen fil modtaget" });
      const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      await storage.updateProduct(String(req.params.id), { producentLogoBase64: base64 });
      res.json({ ok: true, logo: base64 });
    } catch {
      res.status(500).json({ error: "Kunne ikke gemme producentlogo" });
    }
  });

  app.delete("/api/admin/products/:id/producentlogo", requireAdmin, async (req, res) => {
    try {
      await storage.updateProduct(String(req.params.id), { producentLogoBase64: null });
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Kunne ikke fjerne producentlogo" });
    }
  });

  // ── Admin: Firmalogo ─────────────────────────────────────────────────

  const logoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("image/")) cb(null, true);
      else cb(new Error("Kun billedfiler er tilladt"));
    },
  });

  app.post("/api/admin/logo", requireAdmin, logoUpload.single("logo"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Ingen fil modtaget" });
      const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      await storage.updateSetting("firmalogo", base64);
      res.json({ ok: true, logo: base64 });
    } catch {
      res.status(500).json({ error: "Kunne ikke gemme logo" });
    }
  });

  app.delete("/api/admin/logo", requireAdmin, async (_req, res) => {
    try {
      await storage.updateSetting("firmalogo", "");
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Kunne ikke fjerne logo" });
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

  // ── Skabeloner: offentlig liste (kræver auth) ─────────────────────────

  app.get("/api/skabeloner", requireAuth, async (_req, res) => {
    try {
      const alleKonfig = await storage.getAllSkabelonKonfig();
      const result = SKABELON_REGISTRY.map(s => ({
        id: s.id,
        skjult: !!(alleKonfig[s.id]?.skjult),
      }));
      res.json(result);
    } catch {
      res.status(500).json({ error: "Fejl ved hentning af skabeloner" });
    }
  });

  // ── Skabelon-defaults: tilgængeligt for alle auth'd brugere ──────────────

  app.get("/api/skabelon/:skabelon/defaults", requireAuth, async (req, res) => {
    try {
      const konfig = await storage.getSkabelonKonfig(String(req.params.skabelon));
      res.json({
        defaultLokationer: (konfig.defaultLokationer as any[]) ?? [],
        blokke: (konfig.blokke as any[] | undefined) ?? undefined,
      });
    } catch {
      res.status(500).json({ error: "Kunne ikke hente skabelon-defaults" });
    }
  });

  // ── Admin: Skabelon-konfiguration ─────────────────────────────────────

  app.get("/api/admin/skabelon/:skabelon", requireAdmin, async (req, res) => {
    try {
      const konfig = await storage.getSkabelonKonfig(String(req.params.skabelon));
      res.json(konfig);
    } catch {
      res.status(500).json({ error: "Kunne ikke hente skabelon-konfiguration" });
    }
  });

  app.put("/api/admin/skabelon/:skabelon", requireAdmin, async (req, res) => {
    try {
      await storage.updateSkabelonKonfig(String(req.params.skabelon), req.body);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Kunne ikke gemme skabelon-konfiguration" });
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
      const id = parseInt(String(req.params.id));
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
