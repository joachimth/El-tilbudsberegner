import { useMemo, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import { calculateOfferTotals } from "@/lib/offer-utils";
import type { Offer, Product, Config } from "@/lib/types";
import type { OfferWithTotals } from "@/lib/types";
import { formatDKK } from "@shared/schema";

interface PreviewPageProps {
  offer: Offer | null;
  currentUser?: { brugernavn: string; rolle: string };
}

// ── Fælles hjælpere ───────────────────────────────────────────────────────────

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return s;
  }
}

function bulletLines(text: string) {
  return text.split("\n").filter(l => l.trim());
}

// ── Fælles hoved (firma + kunde) ─────────────────────────────────────────────

function DocHoved({ offer, config }: { offer: Offer; config: Config }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between gap-6 mb-8 pb-6 border-b-2 border-gray-900">
      <div>
        <div className="font-bold text-xl text-[#1f4d6b] mb-2">{config.firmanavn}</div>
        <div className="text-sm text-gray-500 leading-relaxed">
          {config.adresse && <div>{config.adresse}</div>}
          {config.postnrBy && <div>{config.postnrBy}</div>}
          {config.telefon && <div>Tlf. {config.telefon}</div>}
          {config.email && <div>{config.email}</div>}
        </div>
      </div>
      <div className="sm:text-right text-sm text-gray-600">
        {offer.kunde.navn && <div><strong>Kunde:</strong> {offer.kunde.navn}</div>}
        {offer.kunde.adresse && <div><strong>Adresse:</strong> {offer.kunde.adresse}</div>}
        {offer.meta.dato && <div><strong>Dato:</strong> {fmtDate(offer.meta.dato)}</div>}
        {offer.meta.tilbudNr && <div><strong>Reference:</strong> {offer.meta.tilbudNr}</div>}
        {offer.meta.reference && <div><strong>Reference:</strong> {offer.meta.reference}</div>}
      </div>
    </div>
  );
}

function PrisBoks({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-end mt-6">
      <div className="min-w-[280px] border-2 border-[#1f4d6b] rounded-xl p-4 bg-[#eaf2f7]">
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</div>
        <div className="text-3xl font-bold text-gray-900">{formatDKK(amount)}</div>
      </div>
    </div>
  );
}

function ForbeholdBoks({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <div className="border border-amber-300 bg-amber-50 rounded-xl p-4 mt-4">
      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
        {lines.map((l, i) => <li key={i}>{l.replace(/^[-•]\s*/, "")}</li>)}
      </ul>
    </div>
  );
}

function GodBoks({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <div className="border border-green-300 bg-green-50 rounded-xl p-4 mt-4">
      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
        {lines.map((l, i) => <li key={i}>{l.replace(/^[-•]\s*/, "")}</li>)}
      </ul>
    </div>
  );
}

// ── SKABELON: EV_ERHVERV ──────────────────────────────────────────────────────

function PreviewEvErhverv({ owt, config }: { owt: OfferWithTotals; config: Config }) {
  const { offer, lokationerWithTotals, total, moms, totalInklMoms } = owt;
  const visInkl = offer.moms.visInkl;
  const slutpris = visInkl ? totalInklMoms : total;
  const slutLabel = visInkl ? "Samlet pris inkl. moms" : "Samlet pris ekskl. moms";

  const forbehold = offer.bemærkninger ? bulletLines(offer.bemærkninger) : [];

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none">
      {/* Farvet top-band */}
      <div className="bg-[#1f4d6b] text-white text-xs px-6 py-2 tracking-wide">
        EV &amp; Erhverv · Tilbud
      </div>

      <div className="p-6 sm:p-10 print:p-12">
        <DocHoved offer={offer} config={config} />

        <h1 className="text-3xl font-bold mb-1 text-gray-900">{offer.meta.projektnavn || "Tilbud"}</h1>
        <p className="text-gray-500 mb-6 text-sm">Kompakt erhvervstilbud — priser og specifikation</p>

        {/* Prissektion */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Prissætning</h2>
          {lokationerWithTotals.map((lok, i) => (
            <div key={i} className="mb-6">
              {lokationerWithTotals.length > 1 && (
                <h3 className="font-medium text-gray-700 mb-2 text-sm uppercase tracking-wide">{lok.navn}</h3>
              )}
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="py-2 text-left font-medium">Beskrivelse</th>
                    <th className="py-2 text-center font-medium w-20">Antal</th>
                    <th className="py-2 text-right font-medium w-28">Pris</th>
                  </tr>
                </thead>
                <tbody>
                  {lok.linjerWithProducts.map((l, j) => (
                    <tr key={j} className="border-b border-gray-100">
                      <td className="py-2">{l.product.navn}</td>
                      <td className="py-2 text-center">{l.antal} {l.product.enhed}</td>
                      <td className="py-2 text-right">{formatDKK(l.linjepris)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <PrisBoks label={slutLabel} amount={slutpris} />
          {visInkl && (
            <div className="flex justify-end mt-2">
              <div className="text-sm text-gray-500 min-w-[280px] flex justify-between px-1">
                <span>Ekskl. moms:</span><span>{formatDKK(total)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Forbehold */}
        {forbehold.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Generelle forbehold</h2>
            <ForbeholdBoks lines={forbehold} />
          </section>
        )}

        <footer className="mt-10 pt-6 border-t text-sm text-gray-400">
          {config.standardtekst && <p className="mb-2">{config.standardtekst}</p>}
          {config.betalingsbetingelser && <p>{config.betalingsbetingelser}</p>}
        </footer>
      </div>
    </div>
  );
}

// ── SKABELON: ENERGI_PRIVAT ───────────────────────────────────────────────────

function PreviewEnergiPrivat({ owt, config }: { owt: OfferWithTotals; config: Config }) {
  const { offer, lokationerWithTotals, total, totalInklMoms } = owt;
  const visInkl = offer.moms.visInkl;
  const slutpris = visInkl ? totalInklMoms : total;
  const slutLabel = visInkl ? "Samlet pris inkl. moms" : "Samlet pris for løsning";

  const noterLinjer = offer.bemærkninger ? bulletLines(offer.bemærkninger) : [];

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none">
      <div className="bg-[#1f4d6b] text-white text-xs px-6 py-2 tracking-wide">
        Energi &amp; Privat · Tilbud
      </div>

      <div className="p-6 sm:p-10 print:p-12">
        <DocHoved offer={offer} config={config} />

        <h1 className="text-3xl font-bold mb-1">{offer.meta.projektnavn || "Tilbud"}</h1>
        <p className="text-gray-500 mb-8 text-sm">
          Vi er glade for at præsentere vores tilbud. Løsningen er sammensat med fokus på driftssikkerhed og energibesparelse.
        </p>

        {/* Løsningen indeholder */}
        {lokationerWithTotals.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Løsningen indeholder</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {lokationerWithTotals.map((lok, i) => (
                <div key={i} className="border rounded-xl p-4 bg-gray-50">
                  <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-2">{lok.navn}</h4>
                  <ul className="text-sm space-y-1">
                    {lok.linjerWithProducts.map((l, j) => (
                      <li key={j} className="flex justify-between gap-2">
                        <span>{l.product.navn}</span>
                        <span className="text-gray-400 shrink-0">{l.antal} {l.product.enhed}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bemærkninger / aftalte forhold */}
        {noterLinjer.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Bemærkninger og aftalte forhold</h2>
            <ForbeholdBoks lines={noterLinjer} />
          </section>
        )}

        {/* Samlet pris */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Samlet pris</h2>
          <PrisBoks label={slutLabel} amount={slutpris} />
          <p className="text-sm text-gray-500 mt-3">
            Gyldighed: 30 dage fra tilbudsdato. Forudbetaling aftales ved ordrebekræftelse.
          </p>
        </section>

        {/* Eilands opgave */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Vores opgave</h2>
          <GodBoks lines={[
            "Installation og opsætning af anlæg",
            "Tilmelding til netselskab (hvis relevant)",
            "Vejledning i styring og overvågning",
            "Koordinering af nødvendige installationsmæssige forhold",
          ]} />
        </section>

        <footer className="mt-10 pt-6 border-t text-sm text-gray-400">
          {config.standardtekst && <p className="mb-2">{config.standardtekst}</p>}
          {config.betalingsbetingelser && <p>{config.betalingsbetingelser}</p>}
        </footer>
      </div>
    </div>
  );
}

// ── SKABELON: MODUL_OVERSLAG ──────────────────────────────────────────────────

function PreviewModulOverslag({ owt, config }: { owt: OfferWithTotals; config: Config }) {
  const { offer, lokationerWithTotals, total, totalInklMoms } = owt;
  const visInkl = offer.moms.visInkl;
  const slutpris = visInkl ? totalInklMoms : total;

  const forudsætninger = offer.bemærkninger ? bulletLines(offer.bemærkninger) : [];

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none">
      <div className="bg-[#1f4d6b] text-white text-xs px-6 py-2 tracking-wide">
        Modul Overslag · {offer.meta.tilbudNr && `Rev ${offer.meta.tilbudNr} · `}{fmtDate(offer.meta.dato)}
      </div>

      <div className="p-6 sm:p-10 print:p-12">
        <DocHoved offer={offer} config={config} />

        <h1 className="text-3xl font-bold mb-1">Overslagspris</h1>
        <p className="text-gray-500 mb-8 text-sm">
          {offer.meta.projektnavn || "Flerfagligt projekt"} — hvert modul kan behandles selvstændigt.
        </p>

        {/* Forudsætninger */}
        {forudsætninger.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Forudsætninger</h2>
            <div className="border rounded-xl p-4 bg-gray-50">
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                {forudsætninger.map((l, i) => <li key={i}>{l.replace(/^[-•]\s*/, "")}</li>)}
              </ul>
            </div>
          </section>
        )}

        {/* Moduler */}
        <section className="mb-8 space-y-4">
          {lokationerWithTotals.map((lok, i) => (
            <div key={i} className="border-t-4 border-[#1f4d6b] border-x border-b rounded-xl p-5 bg-white">
              <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
                <h3 className="text-xl font-bold">{lok.navn}</h3>
                <div className="text-2xl font-bold text-gray-900 shrink-0">{formatDKK(lok.subtotal)}</div>
              </div>

              {lok.beskrivelse && (
                <p className="text-sm text-gray-600 mb-3">{lok.beskrivelse}</p>
              )}

              {lok.linjerWithProducts.length > 0 && (
                <table className="w-full text-sm border-collapse mt-2">
                  <tbody>
                    {lok.linjerWithProducts.map((l, j) => (
                      <tr key={j} className="border-b border-gray-100">
                        <td className="py-1.5 text-gray-700">{l.product.navn}</td>
                        <td className="py-1.5 text-gray-400 text-right w-16">{l.antal} {l.product.enhed}</td>
                        <td className="py-1.5 text-right w-24">{formatDKK(l.linjepris)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </section>

        {/* Total */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Samlet overslag</h2>
          <PrisBoks
            label={visInkl ? "Samlet overslagspris inkl. moms" : "Samlet overslagspris ekskl. moms"}
            amount={slutpris}
          />
        </section>

        <footer className="mt-10 pt-6 border-t text-sm text-gray-400">
          {config.standardtekst && <p className="mb-2">{config.standardtekst}</p>}
          {config.betalingsbetingelser && <p>{config.betalingsbetingelser}</p>}
        </footer>
      </div>
    </div>
  );
}

// ── SKABELON: STANDARD ────────────────────────────────────────────────────────

function PreviewStandard({ owt, config }: { owt: OfferWithTotals; config: Config }) {
  const { offer, lokationerWithTotals, total, moms, totalInklMoms } = owt;
  const visInkl = offer.moms.visInkl;

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none">
      <div className="p-6 sm:p-10 print:p-12">
        <DocHoved offer={offer} config={config} />

        <div className="sm:text-right mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">TILBUD</h1>
          {offer.meta.projektnavn && (
            <p className="text-gray-600 font-medium">{offer.meta.projektnavn}</p>
          )}
        </div>

        {lokationerWithTotals.map((lok, i) => (
          <section key={i} className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b flex items-center gap-2">
              <span className="w-2 h-2 bg-[#1f4d6b] rounded-full shrink-0" />
              {lok.navn}
            </h3>
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm min-w-[360px]">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 font-medium">Produkt</th>
                    <th className="py-2 font-medium text-center w-16">Antal</th>
                    <th className="py-2 font-medium text-right w-24">Enhedspris</th>
                    <th className="py-2 font-medium text-right w-24">Linjepris</th>
                  </tr>
                </thead>
                <tbody>
                  {lok.linjerWithProducts.map((l, j) => (
                    <tr key={j} className="border-b border-gray-100">
                      <td className="py-2 font-medium">{l.product.navn}</td>
                      <td className="py-2 text-center">{l.antal} {l.product.enhed}</td>
                      <td className="py-2 text-right text-gray-500">{formatDKK(l.enhedspris)}</td>
                      <td className="py-2 text-right font-medium">{formatDKK(l.linjepris)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="py-2 text-right font-medium text-gray-500">Subtotal {lok.navn}:</td>
                    <td className="py-2 text-right font-semibold">{formatDKK(lok.subtotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        ))}

        <section className="mt-8 pt-6 border-t-2 border-gray-900">
          <div className="flex justify-end">
            <div className="w-full sm:w-64 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ekskl. moms:</span>
                <span className="font-medium">{formatDKK(total)}</span>
              </div>
              {visInkl && (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>Moms (25%):</span>
                    <span>{formatDKK(moms)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t">
                    <span>Total inkl. moms:</span>
                    <span className="text-[#1f4d6b]">{formatDKK(totalInklMoms)}</span>
                  </div>
                </>
              )}
              {!visInkl && (
                <div className="flex justify-between text-base font-bold pt-2 border-t">
                  <span>Total ekskl. moms:</span>
                  <span className="text-[#1f4d6b]">{formatDKK(total)}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {offer.bemærkninger && (
          <section className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Bemærkninger</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{offer.bemærkninger}</p>
          </section>
        )}

        <footer className="mt-12 pt-6 border-t text-sm text-gray-400">
          {config.standardtekst && <p className="mb-3">{config.standardtekst}</p>}
          {config.betalingsbetingelser && <p>{config.betalingsbetingelser}</p>}
        </footer>
      </div>
    </div>
  );
}

// ── SKABELON: EV_ERHVERV_V2 (server-rendered iframe) ─────────────────────────

function PreviewEvErhvervV2({ offer, iframeRef }: { offer: Offer; iframeRef: React.RefObject<HTMLIFrameElement> }) {
  const [iframeHeight, setIframeHeight] = useState(900);
  const [htmlUrl, setHtmlUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useMemo(() => {
    let blobUrl: string | null = null;
    let cancelled = false;
    setLoading(true);
    fetch("/api/html-export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(offer),
    })
      .then(r => r.text())
      .then(html => {
        if (cancelled) return;
        const blob = new Blob([html], { type: "text/html; charset=utf-8" });
        blobUrl = URL.createObjectURL(blob);
        setHtmlUrl(blobUrl);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(offer)]);

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      {loading && <Skeleton className="h-[900px]" />}
      {htmlUrl && (
        <iframe
          ref={iframeRef}
          src={htmlUrl}
          title="Tilbud preview"
          className="w-full border-0"
          style={{ height: iframeHeight }}
          onLoad={e => {
            const doc = (e.target as HTMLIFrameElement).contentDocument;
            if (doc?.body) {
              setIframeHeight(Math.max(600, doc.body.scrollHeight + 40));
            }
          }}
        />
      )}
    </div>
  );
}

// ── Hoved-komponent ───────────────────────────────────────────────────────────

export default function PreviewPage({ offer }: PreviewPageProps) {
  const [, navigate] = useLocation();
  const v2IframeRef = useRef<HTMLIFrameElement>(null) as React.RefObject<HTMLIFrameElement>;

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: config, isLoading: configLoading } = useQuery<Config>({
    queryKey: ["/api/config"],
  });

  const owt = useMemo(() => {
    if (!offer || !products.length) return null;
    return calculateOfferTotals(offer, products, config?.momsprocent || 25);
  }, [offer, products, config?.momsprocent]);

  const handleDownloadHtml = async () => {
    if (!offer) return;
    try {
      const res = await fetch("/api/html-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(offer),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tilbud-${offer.meta.tilbudNr || "draft"}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      console.error("HTML export failed");
    }
  };

  const handlePrint = () => {
    if (offer?.skabelon === "ev_erhverv_v2") {
      v2IframeRef.current?.contentWindow?.print();
    } else {
      window.print();
    }
  };

  if (!offer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Intet tilbud at vise</h2>
          <p className="text-muted-foreground mb-4">Gå tilbage og opret et tilbud først.</p>
          <Button onClick={() => navigate("/")}>Gå til forsiden</Button>
        </div>
      </div>
    );
  }

  if (productsLoading || configLoading || !owt || !config) {
    return (
      <div className="min-h-screen bg-muted">
        <div className="max-w-4xl mx-auto p-8"><Skeleton className="h-96" /></div>
      </div>
    );
  }

  const skabelon = offer.skabelon || "standard";
  const isV2 = skabelon === "ev_erhverv_v2";

  return (
    <div className="min-h-screen bg-muted">
      <header className="border-b bg-card sticky top-0 z-50 no-print">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/editor")} data-testid="button-preview-back">
            <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Tilbage til editor</span>
            <span className="sm:hidden">Tilbage</span>
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            {!isV2 && (
              <Button variant="outline" size="sm" onClick={handleDownloadHtml} data-testid="button-download-html">
                <FileText className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Download HTML</span>
              </Button>
            )}
            <Button size="sm" onClick={handlePrint} data-testid="button-print-preview">
              <Printer className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Print / PDF</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-3 sm:p-8">
        {skabelon === "ev_erhverv_v2" && <PreviewEvErhvervV2 offer={offer} iframeRef={v2IframeRef} />}
        {skabelon === "ev_erhverv" && <PreviewEvErhverv owt={owt} config={config} />}
        {skabelon === "energi_privat" && <PreviewEnergiPrivat owt={owt} config={config} />}
        {skabelon === "modul_overslag" && <PreviewModulOverslag owt={owt} config={config} />}
        {(skabelon === "standard" || !skabelon) && <PreviewStandard owt={owt} config={config} />}
      </main>
    </div>
  );
}
