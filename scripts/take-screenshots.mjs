/**
 * take-screenshots.mjs
 * Kræver: APP_URL, DEMO_USER og DEMO_PASS env vars (defaults til localhost:5000 / admin / admin123)
 * Playwright Chromium skal være installeret.
 */
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const BASE = process.env.APP_URL ?? "http://localhost:5000";
const USER = process.env.DEMO_USER ?? "admin";
const PASS = process.env.DEMO_PASS ?? "admin123";
const OUT  = path.join(path.dirname(fileURLToPath(import.meta.url)), "../docs/screenshots");
fs.mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1280, height: 900 };
const MOBILE  = { width: 390, height: 844 };

async function waitReady(page, ms = 500) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(ms);
}

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });

  // ── Desktop flow ───────────────────────────────────────────────────────
  const ctx = await browser.newContext({ viewport: DESKTOP });
  const p = await ctx.newPage();

  // 1. Login-side
  await p.goto(`${BASE}/login`);
  // Vent til brugernavns-feltet er synligt (SPA + stor JS-bundle kan tage tid)
  // Login-siden bruger id="brugernavn" (ikke name-attribut)
  await p.waitForSelector('#brugernavn', { timeout: 15000 });
  await p.screenshot({ path: `${OUT}/01-login.png` });

  // Log ind
  await p.fill('#brugernavn', USER);
  await p.fill('input[type="password"]', PASS);
  await p.click('button[type="submit"]');
  await waitReady(p, 1200);

  // 2. Tilbudsliste / dashboard
  await p.screenshot({ path: `${OUT}/02-tilbudsliste.png` });

  // 3. Skabelon-vælger
  const nyBtn = p.locator('button:has-text("Nyt tilbud"), a:has-text("Nyt tilbud")').first();
  if (await nyBtn.count()) {
    await nyBtn.click();
    await waitReady(p, 600);
    await p.screenshot({ path: `${OUT}/03-skabelonvaelger.png` });

    // Vælg standard-skabelon
    const stdBtn = p.locator('[data-skabelon="standard"], button:has-text("Standard"), button:has-text("standard")').first();
    if (await stdBtn.count()) {
      await stdBtn.click();
      await waitReady(p, 800);
      // 4. Editor
      await p.screenshot({ path: `${OUT}/04-editor.png`, fullPage: false });
      await p.screenshot({ path: `${OUT}/04-editor-full.png`, fullPage: true });

      // 5. HTML-preview - brug data-testid der altid er til stede
      const prevBtn = p.locator('[data-testid="button-preview"]').first();
      if (await prevBtn.count()) {
        await prevBtn.click();
        await waitReady(p, 1000);
        await p.screenshot({ path: `${OUT}/05-preview.png`, fullPage: true });
        // Gå tilbage til editor inden admin
        await p.goBack();
        await waitReady(p, 600);
      }
    }
  }

  // 6-9. Admin panel – alle 4 tabs
  await p.goto(`${BASE}/admin`);
  await waitReady(p, 800);
  await p.screenshot({ path: `${OUT}/06-admin-produkter.png` });

  // Admin-tabs via index (Radix UI role=tab, Lucide-ikoner kan forstyrre tekst-match)
  // Tab-rækkefølge: 0=Produkter, 1=Indstillinger, 2=Skabeloner, 3=Brugere
  const allTabs = p.locator('[role="tab"]');
  const tabCount = await allTabs.count();

  if (tabCount >= 2) {
    await allTabs.nth(1).click();
    await waitReady(p, 700);
    await p.screenshot({ path: `${OUT}/07-admin-indstillinger.png`, fullPage: true });
  }
  if (tabCount >= 3) {
    await allTabs.nth(2).click();
    await waitReady(p, 700);
    await p.screenshot({ path: `${OUT}/08-admin-skabeloner.png` });
  }
  if (tabCount >= 4) {
    await allTabs.nth(3).click();
    await waitReady(p, 700);
    await p.screenshot({ path: `${OUT}/09-admin-brugere.png` });
  }

  await ctx.close();

  // ── Mobil flow ─────────────────────────────────────────────────────────
  const mCtx = await browser.newContext({ viewport: MOBILE });
  const m = await mCtx.newPage();

  await m.goto(`${BASE}/login`);
  await m.waitForSelector('#brugernavn', { timeout: 15000 });
  await m.fill('#brugernavn', USER);
  await m.fill('input[type="password"]', PASS);
  await m.click('button[type="submit"]');
  await waitReady(m, 800);
  await m.screenshot({ path: `${OUT}/10-mobil-dashboard.png` });

  await mCtx.close();
  await browser.close();

  console.log(`Screenshots gemt i ${OUT}`);
  const files = fs.readdirSync(OUT).filter(f => f.endsWith(".png"));
  files.forEach(f => console.log(`  ✓ ${f}`));
})();
