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
  await p.waitForSelector('#brugernavn', { timeout: 15000 });
  await p.screenshot({ path: `${OUT}/01-login.png` });

  // Log ind
  await p.fill('#brugernavn', USER);
  await p.fill('input[type="password"]', PASS);
  await p.click('button[type="submit"]');
  await p.waitForURL(`${BASE}/`, { timeout: 15000 });
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

      // 5. HTML-preview
      const prevBtn = p.locator('[data-testid="button-preview"]').first();
      if (await prevBtn.count()) {
        await prevBtn.click();
        // Vent til preview-indhold er loadet - back-knap renderes kun når content er klar
        await p.waitForSelector('[data-testid="button-preview-back"]', { timeout: 15000 }).catch(() => {});
        await waitReady(p, 800);
        await p.screenshot({ path: `${OUT}/05-preview.png`, fullPage: true });
      }
    }
  }

  await ctx.close();

  // ── Admin flow (frisk context) ─────────────────────────────────────────
  // App.tsx har isLoading-guard på alle beskyttede ruter:
  //   {isLoading ? null : !currentUser ? <Redirect to="/login" /> : ...}
  // Det betyder at /admin aldrig redirecter til /login mens auth fetches.
  // Vi kan navigere direkte til /admin efter login uden race condition.
  const adminCtx = await browser.newContext({ viewport: DESKTOP });
  const a = await adminCtx.newPage();
  
  // Intercept responses to diagnose login
  let loginResponse = null;
  a.on('response', resp => {
    if (resp.url().includes('/api/auth/login')) {
      loginResponse = { url: resp.url(), status: resp.status() };
    }
  });

  await a.goto(`${BASE}/login`);
  await a.waitForSelector('#brugernavn', { timeout: 10000 });
  await a.fill('#brugernavn', USER);
  await a.fill('input[type="password"]', PASS);
  console.log("[Admin] Clicking login button...");
  await a.click('button[type="submit"]');
  
  try {
    await a.waitForURL(`${BASE}/`, { timeout: 15000 });
  } catch (e) {
    console.log(`[Admin] ERROR: Login redirect timeout. Current URL: ${a.url()}, Login response: ${JSON.stringify(loginResponse)}`);
    throw e;
  }
  console.log(`[Admin] Login successful, at ${a.url()}`);

  // Naviger til admin - ingen ekstra vent nødvendig pga. isLoading-guard
  await a.goto(`${BASE}/admin`);
  // Vent til tabs er i DOM
  await a.waitForSelector('[role="tab"]', { timeout: 15000 });
  await waitReady(a, 800);

  // 6. Admin - Produkter (default tab)
  await a.screenshot({ path: `${OUT}/06-admin-produkter.png` });

  // Admin-tabs via index: 0=Produkter, 1=Indstillinger, 2=Skabeloner, 3=Brugere
  const allTabs = a.locator('[role="tab"]');
  const tabCount = await allTabs.count();
  console.log(`Admin tab count: ${tabCount}`);

  if (tabCount >= 2) {
    await allTabs.nth(1).click();
    await waitReady(a, 700);
    // 7. Admin - Indstillinger
    await a.screenshot({ path: `${OUT}/07-admin-indstillinger.png`, fullPage: true });
  }
  if (tabCount >= 3) {
    await allTabs.nth(2).click();
    await waitReady(a, 700);
    // 8. Admin - Skabeloner
    await a.screenshot({ path: `${OUT}/08-admin-skabeloner.png` });
  }
  if (tabCount >= 4) {
    await allTabs.nth(3).click();
    await waitReady(a, 700);
    // 9. Admin - Brugere
    await a.screenshot({ path: `${OUT}/09-admin-brugere.png` });
  }

  await adminCtx.close();

  // ── Mobil flow ─────────────────────────────────────────────────────────
  const mCtx = await browser.newContext({ viewport: MOBILE });
  const m = await mCtx.newPage();

  await m.goto(`${BASE}/login`);
  await m.waitForSelector('#brugernavn', { timeout: 15000 });
  await m.fill('#brugernavn', USER);
  await m.fill('input[type="password"]', PASS);
  await m.click('button[type="submit"]');
  await waitReady(m, 800);

  // 10. Mobil dashboard
  await m.screenshot({ path: `${OUT}/10-mobil-dashboard.png` });

  await mCtx.close();
  await browser.close();

  console.log(`Screenshots gemt i ${OUT}`);
  const files = fs.readdirSync(OUT).filter(f => f.endsWith(".png"));
  files.forEach(f => console.log(`  ✓ ${f}`));
})();
