import type { Offer, Product, Config, V2Data } from "../../shared/schema.js";

type PricingMode = "section_total" | "line_items" | "line_items_with_total" | "hidden_prices";

type LokData = {
  navn: string;
  subtotal: number;
  linjer: { navn: string; enhed: string; antal: number; linjepris: number }[];
};

export function renderEvErhvervV2(
  offer: Offer,
  products: Product[],
  config: Config,
  v2: V2Data = { globalPricingMode: "line_items", sektioner: [] }
): string {
  const pm = new Map(products.map(p => [p.id, p]));

  const fmtDKK = (n: number) =>
    new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK" }).format(n);

  const fmtDate = (s: string) => {
    try {
      return new Date(s).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      return s;
    }
  };

  const loks: LokData[] = offer.lokationer.map(lok => {
    let sub = 0;
    const linjer = lok.linjer.flatMap(l => {
      const p = pm.get(l.productId);
      if (!p) return [];
      const enhedspris = l.antal === 1 ? p.pris_1 : p.pris_2plus;
      const price = l.antal * enhedspris;
      sub += price;
      return [{ navn: p.navn, enhed: p.enhed, antal: l.antal, linjepris: price }];
    });
    return { navn: lok.navn, subtotal: sub, linjer };
  });

  const total = loks.reduce((s, l) => s + l.subtotal, 0);
  const momsPct = config.momsprocent || 25;
  const momsBeløb = total * (momsPct / 100);
  const totalInkl = total + momsBeløb;
  const slutpris = offer.moms.visInkl ? totalInkl : total;
  const slutLabel = offer.moms.visInkl ? "Samlet pris inkl. moms" : "Samlet pris ekskl. moms";
  const globalMode = (v2.globalPricingMode || "line_items") as PricingMode;

  const getSektionMode = (lokNavn: string): PricingMode => {
    const s = v2.sektioner?.find(s => s.lokationNavn === lokNavn);
    return (s?.pricingMode as PricingMode) || globalMode;
  };

  const getSektionBillede = (lokNavn: string): string | undefined => {
    return v2.sektioner?.find(s => s.lokationNavn === lokNavn)?.billedeUrl;
  };

  // ── CSS ──────────────────────────────────────────────────────────────────────
  const CSS = `
    :root {
      --accent: #1f4d6b;
      --accent-dark: #163751;
      --accent-light: #e8f1f7;
      --accent-mid: #2d6d96;
      --text: #111827;
      --muted: #6b7280;
      --border: #e5e7eb;
      --bg: #ffffff;
      --bg-soft: #f8fafc;
      --amber-light: #fef3c7;
      --radius: 12px;
      --radius-sm: 8px;
      --shadow: 0 2px 8px rgba(0,0,0,.06);
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 13px;
      color: var(--text);
      background: var(--bg);
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @page { margin: 16mm 18mm; size: A4; }

    /* Header band */
    .header-band {
      background: var(--accent);
      color: #fff;
      padding: 10px 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      letter-spacing: 0.04em;
    }
    .header-band-firma { font-weight: 700; font-size: 13px; }
    .header-band-contact { opacity: 0.8; }

    .container { padding: 32px 36px; }

    /* Doc header */
    .doc-hoved {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      padding-bottom: 22px;
      border-bottom: 2px solid var(--text);
      margin-bottom: 28px;
    }
    .firma-navn { font-weight: 700; font-size: 17px; color: var(--accent); margin-bottom: 5px; }
    .firma-info { font-size: 11px; color: var(--muted); line-height: 1.7; }
    .kunde-info { text-align: right; font-size: 11px; color: #374151; line-height: 1.7; }

    /* Hero */
    .hero {
      background: linear-gradient(135deg, var(--accent-light) 0%, #f0f7ff 100%);
      border-radius: var(--radius);
      padding: 26px 30px;
      margin-bottom: 26px;
      break-inside: avoid;
    }
    .hero-with-image { display: flex; gap: 22px; align-items: flex-start; }
    .hero-text { flex: 1; }
    .hero-image {
      width: 200px;
      height: 140px;
      object-fit: cover;
      border-radius: var(--radius-sm);
      flex-shrink: 0;
    }
    .hero-tag {
      display: inline-block;
      background: var(--accent);
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 3px 10px;
      border-radius: 20px;
      margin-bottom: 10px;
    }
    .hero-h1 {
      font-size: 24px;
      font-weight: 800;
      color: var(--accent-dark);
      margin-bottom: 7px;
      line-height: 1.25;
    }
    .hero-sub { font-size: 13px; color: #374151; max-width: 520px; }

    /* Section */
    .section { margin-bottom: 26px; }
    .section-h2 {
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 12px;
      padding-bottom: 7px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-h2::before {
      content: '';
      display: inline-block;
      width: 3px;
      height: 15px;
      background: var(--accent);
      border-radius: 2px;
      flex-shrink: 0;
    }

    /* Benefit cards */
    .fordele-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 13px;
      margin-bottom: 0;
    }
    .fordel-card {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px 16px;
      background: var(--bg-soft);
      break-inside: avoid;
      display: flex;
      flex-direction: column;
    }
    .fordel-ikon { font-size: 22px; margin-bottom: 7px; }
    .fordel-titel { font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
    .fordel-tekst { font-size: 11px; color: var(--muted); line-height: 1.5; }

    /* Lokation cards */
    .lokation-card {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      margin-bottom: 13px;
      break-inside: avoid;
      box-shadow: var(--shadow);
    }
    .lokation-card-top {
      background: var(--accent);
      padding: 7px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .lokation-card-navn {
      color: #fff;
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .lokation-card-total-badge {
      background: rgba(255,255,255,0.2);
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 10px;
      border-radius: 20px;
    }
    .lokation-card-body { display: flex; }
    .lokation-card-image {
      width: 180px;
      flex-shrink: 0;
      object-fit: cover;
      min-height: 120px;
    }
    .lokation-card-content { flex: 1; padding: 14px 16px; }

    /* Product table */
    .prod-table { width: 100%; border-collapse: collapse; }
    .prod-table th {
      padding: 5px 7px;
      text-align: left;
      font-size: 10px;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border);
    }
    .prod-table th:last-child { text-align: right; }
    .prod-table th.col-antal { text-align: center; width: 60px; }
    .prod-table td {
      padding: 7px 7px;
      font-size: 12px;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: middle;
    }
    .prod-table td:last-child { text-align: right; font-weight: 500; white-space: nowrap; }
    .prod-table td.col-antal { text-align: center; color: var(--muted); }
    .prod-table tr:last-child td { border-bottom: none; }
    .prod-table .subtotal-row td {
      border-top: 1px solid var(--border);
      border-bottom: none;
      font-weight: 700;
      font-size: 13px;
      padding-top: 9px;
    }

    /* Section total box */
    .section-total-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: var(--bg-soft);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
    }
    .section-total-label { font-size: 12px; color: var(--muted); }
    .section-total-amount { font-size: 18px; font-weight: 700; color: var(--accent); }

    /* Price box */
    .prisboks-wrap { display: flex; justify-content: flex-end; margin-top: 16px; margin-bottom: 8px; }
    .prisboks {
      min-width: 300px;
      border: 2px solid var(--accent);
      border-radius: var(--radius);
      padding: 16px 22px;
      background: var(--accent-light);
      break-inside: avoid;
    }
    .prisboks-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--muted);
      margin-bottom: 5px;
      font-weight: 600;
    }
    .prisboks-amount { font-size: 28px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
    .prisboks-sub { font-size: 11px; color: var(--muted); margin-top: 5px; }

    /* Forbehold */
    .forbehold-boks {
      border: 1px solid #fcd34d;
      background: var(--amber-light);
      border-radius: var(--radius);
      padding: 13px 17px;
      break-inside: avoid;
    }
    .forbehold-header { font-size: 11px; font-weight: 700; color: #92400e; margin-bottom: 7px; }
    .forbehold-boks ul { padding-left: 15px; }
    .forbehold-boks li { font-size: 11px; color: #78350f; margin-bottom: 4px; }

    /* CTA */
    .cta-boks {
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-mid) 100%);
      border-radius: var(--radius);
      padding: 22px 28px;
      color: #fff;
      break-inside: avoid;
      text-align: center;
    }
    .cta-h { font-size: 17px; font-weight: 700; margin-bottom: 7px; }
    .cta-sub { font-size: 12px; opacity: 0.85; margin-bottom: 14px; }
    .cta-contacts { display: flex; justify-content: center; gap: 32px; flex-wrap: wrap; }
    .cta-contact-item { font-size: 12px; }
    .cta-contact-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; opacity: 0.6; margin-bottom: 2px; }

    /* Contact person */
    .kontakt-card {
      display: flex;
      align-items: center;
      gap: 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 15px 19px;
      background: var(--bg-soft);
      break-inside: avoid;
    }
    .kontakt-avatar {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }
    .kontakt-avatar-placeholder {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: var(--accent);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .kontakt-navn { font-size: 14px; font-weight: 700; color: var(--text); }
    .kontakt-titel { font-size: 11px; color: var(--muted); margin-bottom: 4px; }
    .kontakt-detail { font-size: 12px; color: var(--accent); }

    /* Footer */
    .doc-footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      font-size: 11px;
      color: var(--muted);
      line-height: 1.6;
    }
  `;

  // ── Sections ─────────────────────────────────────────────────────────────────

  const headerBand = `<div class="header-band">
    <div class="header-band-firma">${config.firmalogo
      ? `<img src="${config.firmalogo}" alt="Logo" style="max-height:28px;max-width:120px;object-fit:contain;vertical-align:middle;filter:brightness(0) invert(1);">`
      : esc(config.firmanavn)
    }</div>
    <div class="header-band-contact">${[
      config.telefon && `Tlf. ${esc(config.telefon)}`,
      config.email && esc(config.email),
    ].filter(Boolean).join(" &nbsp;·&nbsp; ")}</div>
  </div>`;

  const docHoved = `<div class="doc-hoved">
    <div>
      ${config.firmalogo
        ? `<img src="${config.firmalogo}" alt="Firmalogo" style="max-height:48px;max-width:160px;object-fit:contain;margin-bottom:8px;display:block;">`
        : `<div class="firma-navn">${esc(config.firmanavn)}</div>`
      }
      <div class="firma-info">
        ${[config.adresse, config.postnrBy, config.cvr && `CVR: ${esc(config.cvr)}`]
          .filter(Boolean).map(esc).join("<br>")}
      </div>
    </div>
    <div class="kunde-info">
      ${offer.kunde.navn ? `<strong>${esc(offer.kunde.navn)}</strong><br>` : ""}
      ${offer.kunde.adresse ? `${esc(offer.kunde.adresse)}<br>` : ""}
      ${offer.kunde.email ? `${esc(offer.kunde.email)}<br>` : ""}
      ${offer.kunde.telefon ? `Tlf. ${esc(offer.kunde.telefon)}<br>` : ""}
      <br>
      ${offer.meta.dato ? `<span style="color:var(--muted);font-size:10px;">Dato: ${fmtDate(offer.meta.dato)}</span><br>` : ""}
      ${offer.meta.tilbudNr ? `<span style="color:var(--muted);font-size:10px;">Ref.: ${esc(offer.meta.tilbudNr)}</span>` : ""}
    </div>
  </div>`;

  const heroH = v2.hero?.overskrift || offer.meta.projektnavn || "Tilbud";
  const heroSub = v2.hero?.underoverskrift || "Vi præsenterer hermed vores tilbud og ser frem til at levere den bedste løsning for Jer.";
  const heroContent = v2.hero?.billedeUrl
    ? `<div class="hero-with-image">
        <div class="hero-text">
          <div class="hero-tag">EV &amp; Erhverv</div>
          <h1 class="hero-h1">${esc(heroH)}</h1>
          <p class="hero-sub">${esc(heroSub)}</p>
        </div>
        <img class="hero-image" src="${esc(v2.hero.billedeUrl)}" alt="" onerror="this.style.display='none'" />
      </div>`
    : `<div class="hero-tag">EV &amp; Erhverv</div>
       <h1 class="hero-h1">${esc(heroH)}</h1>
       <p class="hero-sub">${esc(heroSub)}</p>`;
  const hero = `<div class="hero">${heroContent}</div>`;

  const defaultFordele = [
    { ikon: "⚡", titel: "Hurtig levering", tekst: "Vi tilpasser tidsplanen til Jeres drift og sikrer minimal afbrydelse" },
    { ikon: "🏅", titel: "Certificeret kvalitet", tekst: "Autoriserede el-installatører med dokumenteret erhvervserfaring" },
    { ikon: "🛡️", titel: "Garanti & service", tekst: "Fuld garanti på arbejde og materialer samt efterfølgende support" },
  ];
  const fordele = v2.fordele && v2.fordele.length > 0 ? v2.fordele : defaultFordele;
  const fordeleSektionHtml = `<div class="section">
    <div class="section-h2">Hvorfor vælge os</div>
    <div class="fordele-grid">${fordele.map(f => `<div class="fordel-card">
      ${f.ikon ? `<div class="fordel-ikon">${f.ikon}</div>` : ""}
      <div class="fordel-titel">${esc(f.titel)}</div>
      ${f.tekst ? `<div class="fordel-tekst">${esc(f.tekst)}</div>` : ""}
    </div>`).join("")}</div>
  </div>`;

  const lokKort = loks.map(lok => {
    const mode = getSektionMode(lok.navn);
    const billedeUrl = getSektionBillede(lok.navn);

    let prissætningHtml: string;
    if (mode === "hidden_prices") {
      prissætningHtml = `<table class="prod-table">
        <thead><tr><th>Beskrivelse</th><th class="col-antal">Antal</th></tr></thead>
        <tbody>${lok.linjer.map(l =>
          `<tr><td>${esc(l.navn)}</td><td class="col-antal">${l.antal}&nbsp;${esc(l.enhed)}</td></tr>`
        ).join("")}</tbody>
      </table>`;
    } else if (mode === "section_total") {
      prissætningHtml = `<div class="section-total-box">
        <div class="section-total-label">Samlet pris for ${esc(lok.navn)}</div>
        <div class="section-total-amount">${fmtDKK(lok.subtotal)}</div>
      </div>`;
    } else {
      const showSubtotal = mode === "line_items_with_total";
      prissætningHtml = `<table class="prod-table">
        <thead><tr><th>Beskrivelse</th><th class="col-antal">Antal</th><th>Pris</th></tr></thead>
        <tbody>
          ${lok.linjer.map(l =>
            `<tr><td>${esc(l.navn)}</td><td class="col-antal">${l.antal}&nbsp;${esc(l.enhed)}</td><td>${fmtDKK(l.linjepris)}</td></tr>`
          ).join("")}
          ${showSubtotal ? `<tr class="subtotal-row">
            <td colspan="2" style="text-align:right;color:var(--muted);">Subtotal</td>
            <td>${fmtDKK(lok.subtotal)}</td>
          </tr>` : ""}
        </tbody>
      </table>`;
    }

    const topBadge = mode !== "hidden_prices" && mode !== "section_total"
      ? `<span class="lokation-card-total-badge">${fmtDKK(lok.subtotal)}</span>`
      : "";

    const cardBody = billedeUrl
      ? `<div class="lokation-card-body">
          <img class="lokation-card-image" src="${esc(billedeUrl)}" alt="${esc(lok.navn)}" onerror="this.style.display='none'" />
          <div class="lokation-card-content">${prissætningHtml}</div>
        </div>`
      : `<div style="padding:14px 16px;">${prissætningHtml}</div>`;

    return `<div class="lokation-card">
      <div class="lokation-card-top">
        <div class="lokation-card-navn">${esc(lok.navn)}</div>
        ${topBadge}
      </div>
      ${cardBody}
    </div>`;
  }).join("");

  const lokationerHtml = loks.length > 0 ? `<div class="section">
    <div class="section-h2">Løsningsbeskrivelse</div>
    ${lokKort}
  </div>` : "";

  const prissummaryHtml = globalMode !== "hidden_prices" ? `<div class="section">
    <div class="section-h2">Samlet pris</div>
    <div class="prisboks-wrap">
      <div class="prisboks">
        <div class="prisboks-label">${slutLabel}</div>
        <div class="prisboks-amount">${fmtDKK(slutpris)}</div>
        ${offer.moms.visInkl
          ? `<div class="prisboks-sub">Ekskl. moms: ${fmtDKK(total)}</div>`
          : `<div class="prisboks-sub">+ moms (${momsPct}%): ${fmtDKK(momsBeløb)} &rarr; inkl.: ${fmtDKK(totalInkl)}</div>`}
      </div>
    </div>
    <p style="font-size:11px;color:var(--muted);margin-top:7px;text-align:right;">Gyldighed: 30 dage fra tilbudsdato</p>
  </div>` : "";

  const forbeholdLinjer = offer.bemærkninger
    ? offer.bemærkninger.split("\n").filter(l => l.trim())
    : [];
  const standardForbeholdLinjer = config.standardforbehold
    ? config.standardforbehold.split("\n").filter(l => l.trim())
    : [];
  const forbeholdHtml = (forbeholdLinjer.length > 0 || standardForbeholdLinjer.length > 0) ? `<div class="section">
    <div class="section-h2">Generelle forbehold</div>
    <div class="forbehold-boks">
      ${forbeholdLinjer.length > 0 ? `<div class="forbehold-header">Tilbudsspecifikke bemærkninger</div>
      <ul>${forbeholdLinjer.map(l => `<li>${esc(l.replace(/^[-•]\s*/, ""))}</li>`).join("")}</ul>` : ""}
      ${standardForbeholdLinjer.length > 0 ? `<div class="forbehold-header" style="margin-top:${forbeholdLinjer.length > 0 ? "10px" : "0"}">Standardforbehold</div>
      <ul>${standardForbeholdLinjer.map(l => `<li>${esc(l.replace(/^[-•]\s*/, ""))}</li>`).join("")}</ul>` : ""}
    </div>
  </div>` : "";

  const ctaBlok = v2.salgsblokke?.find(b => b.type === "cta");
  const ctaH = ctaBlok?.overskrift || "Klar til at komme i gang?";
  const ctaSub = ctaBlok?.tekst || "Kontakt os i dag for at aftale næste skridt — vi er klar til at hjælpe.";
  const ctaKontakter = [
    config.telefon && `<div class="cta-contact-item"><div class="cta-contact-label">Telefon</div>${esc(config.telefon)}</div>`,
    config.email && `<div class="cta-contact-item"><div class="cta-contact-label">Email</div>${esc(config.email)}</div>`,
  ].filter(Boolean).join("");

  const ctaHtml = `<div class="section">
    <div class="cta-boks">
      <div class="cta-h">${esc(ctaH)}</div>
      <div class="cta-sub">${esc(ctaSub)}</div>
      ${ctaKontakter ? `<div class="cta-contacts">${ctaKontakter}</div>` : ""}
    </div>
  </div>`;

  let kontaktHtml = "";
  if (v2.kontaktperson) {
    const k = v2.kontaktperson;
    const avatar = k.billedeUrl
      ? `<img class="kontakt-avatar" src="${esc(k.billedeUrl)}" alt="" onerror="this.style.display='none'" />`
      : `<div class="kontakt-avatar-placeholder">${esc((k.navn || "?")[0].toUpperCase())}</div>`;
    kontaktHtml = `<div class="section">
      <div class="section-h2">Jeres kontaktperson</div>
      <div class="kontakt-card">
        ${avatar}
        <div>
          <div class="kontakt-navn">${esc(k.navn || "")}</div>
          ${k.titel ? `<div class="kontakt-titel">${esc(k.titel)}</div>` : ""}
          ${k.telefon ? `<div class="kontakt-detail">&#128222; ${esc(k.telefon)}</div>` : ""}
          ${k.email ? `<div class="kontakt-detail">&#9993; ${esc(k.email)}</div>` : ""}
        </div>
      </div>
    </div>`;
  }

  const footer = `<div class="doc-footer">
    ${config.standardtekst ? `<p style="margin-bottom:5px;">${esc(config.standardtekst)}</p>` : ""}
    ${config.betalingsbetingelser ? `<p>${esc(config.betalingsbetingelser)}</p>` : ""}
  </div>`;

  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8" />
  <title>Tilbud — ${esc(offer.meta.projektnavn || offer.meta.tilbudNr || config.firmanavn)}</title>
  <style>${CSS}</style>
</head>
<body>
  ${headerBand}
  <div class="container">
    ${docHoved}
    ${hero}
    ${fordeleSektionHtml}
    ${lokationerHtml}
    ${prissummaryHtml}
    ${forbeholdHtml}
    ${ctaHtml}
    ${kontaktHtml}
    ${footer}
  </div>
</body>
</html>`;
}

function esc(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
