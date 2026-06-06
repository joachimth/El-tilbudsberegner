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
  // Klik på "Nyt tilbud" kortet (Button[data-testid] er mere pålidelig end has-text)
  const nyBtn = p.locator('[data-testid="button-new-offer"]').first();
  const nyBtnFallback = p.locator('button:has-text("Opret nyt tilbud"), button:has-text("Nyt tilbud")').first();
  const nyBtnEl = (await nyBtn.count()) ? nyBtn : nyBtnFallback;
  if (await nyBtnEl.count()) {
    await nyBtnEl.click();
    // Vent eksplicit på at URL skifter til /template-selector
    await p.waitForURL("**/template-selector", { timeout: 10000 }).catch(() => {});
    // Vent til V2-knappen er synlig (API-kald /api/skabeloner er returneret)
    await p.waitForSelector('[data-skabelon="ev_erhverv_v2"]', { timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/03-skabelonvaelger.png` });

    // Vælg EV Erhverv V2 (flagship-skabelon med hero, fordele osv.)
    const v2Btn = p.locator('[data-skabelon="ev_erhverv_v2"]').first();
    const stdBtn = p.locator('[data-skabelon="standard"]').first();
    const v2Count = await v2Btn.count();
    console.log(`V2-knap fundet: ${v2Count > 0 ? "JA" : "NEJ – falder tilbage til Standard"}`);

    const templateBtn = v2Count > 0 ? v2Btn : stdBtn;
    await templateBtn.click();
    // Vent på editor er klar (offerKey remount + API-kald til defaults er færdige)
    await p.waitForURL("**/editor", { timeout: 10000 }).catch(() => {});
    await p.waitForSelector('[data-testid="button-preview"]', { timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(800);

    // 4. Editor
    await p.screenshot({ path: `${OUT}/04-editor.png`, fullPage: false });
    await p.screenshot({ path: `${OUT}/04-editor-full.png`, fullPage: true });

    // 5. HTML-preview (viser hero + fordele + lokationer osv. for V2)
    const prevBtn = p.locator('[data-testid="button-preview"]').first();
    if (await prevBtn.count()) {
      await prevBtn.click();
      await p.waitForSelector('[data-testid="button-preview-back"]', { timeout: 15000 }).catch(() => {});
      // Vent til iframe/preview er loadet (V2 bruger iframe med blob: URL)
      await p.waitForLoadState("networkidle").catch(() => {});
      await p.waitForTimeout(1500);
      await p.screenshot({ path: `${OUT}/05-preview.png`, fullPage: true });
    }
  }

  await ctx.close();

  // ── Admin flow (frisk context) ─────────────────────────────────────────
  // Session-cookie er nu HTTP-kompatibel i CI (secure:false når CI=true).
  // isLoading-guard på alle ruter forhindrer premature redirect.
  const adminCtx = await browser.newContext({ viewport: DESKTOP });
  const a = await adminCtx.newPage();

  await a.goto(`${BASE}/login`);
  await a.waitForSelector('#brugernavn', { timeout: 10000 });
  await a.fill('#brugernavn', USER);
  await a.fill('input[type="password"]', PASS);
  await a.click('button[type="submit"]');
  await a.waitForURL(`${BASE}/`, { timeout: 15000 });

  // Naviger til admin og vent på tabs
  await a.goto(`${BASE}/admin`);
  await a.waitForSelector('[role="tab"]', { timeout: 15000 });
  await waitReady(a, 800);

  // 6. Admin - Produkter (default tab)
  await a.screenshot({ path: `${OUT}/06-admin-produkter.png` });

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
