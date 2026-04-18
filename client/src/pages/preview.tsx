import { useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import { calculateOfferTotals } from "@/lib/offer-utils";
import type { Offer, Product, Config } from "@/lib/types";
import { formatDKK } from "@shared/schema";

interface PreviewPageProps {
  offer: Offer | null;
}

export default function PreviewPage({ offer }: PreviewPageProps) {
  const [, navigate] = useLocation();

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: config, isLoading: configLoading } = useQuery<Config>({
    queryKey: ["/api/config"],
  });

  const offerWithTotals = useMemo(() => {
    if (!offer || !products.length) return null;
    return calculateOfferTotals(offer, products, config?.momsprocent || 25);
  }, [offer, products, config?.momsprocent]);

  const handleBack = () => {
    navigate("/editor");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtml = async () => {
    if (!offer) return;

    try {
      const response = await fetch("/api/html-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(offer),
      });

      if (!response.ok) throw new Error("Kunne ikke generere HTML");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tilbud-${offer.meta.tilbudNr || "draft"}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("HTML export failed:", error);
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

  if (productsLoading || configLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-8">
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-muted">
      {/* Navigationsbar – kompakt på mobil */}
      <header className="border-b bg-card sticky top-0 z-50 no-print">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack} data-testid="button-preview-back">
            <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Tilbage til editor</span>
            <span className="sm:hidden">Tilbage</span>
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={handleDownloadHtml} data-testid="button-download-html">
              <FileText className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Download HTML</span>
            </Button>
            <Button size="sm" onClick={handlePrint} data-testid="button-print-preview">
              <Printer className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Print / PDF</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-3 sm:p-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none">
          <div className="p-4 sm:p-8 print:p-12">

            {/* Dokumenthoved: firmainfo venstre, tilbudsnr højre */}
            <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-6 sm:mb-8 pb-6 border-b">
              <div>
                <div className="w-36 sm:w-48 h-12 sm:h-16 bg-primary/10 rounded flex items-center justify-center mb-3">
                  <span className="text-primary font-bold text-base sm:text-lg">
                    {config?.firmanavn || "Logo"}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>{config?.adresse}</p>
                  <p>{config?.postnrBy}</p>
                  <p>Tlf: {config?.telefon}</p>
                  <p>Email: {config?.email}</p>
                  <p>CVR: {config?.cvr}</p>
                </div>
              </div>

              <div className="sm:text-right">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">TILBUD</h1>
                {offer.meta.tilbudNr && (
                  <p className="text-lg font-medium text-primary" data-testid="text-preview-tilbudnr">
                    #{offer.meta.tilbudNr}
                  </p>
                )}
                <p className="text-sm text-gray-600 mt-2">
                  Dato: {formatDate(offer.meta.dato)}
                </p>
                {offer.meta.reference && (
                  <p className="text-sm text-gray-600">
                    Reference: {offer.meta.reference}
                  </p>
                )}
              </div>
            </header>

            {/* Kunde og projekt */}
            <section className="mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Kunde
                  </h2>
                  <div className="text-gray-900">
                    <p className="font-medium" data-testid="text-preview-kunde-navn">{offer.kunde.navn || "—"}</p>
                    <p>{offer.kunde.adresse || "—"}</p>
                    <p>{offer.kunde.telefon}</p>
                    <p>{offer.kunde.email}</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Projekt
                  </h2>
                  <p className="font-medium text-gray-900" data-testid="text-preview-projektnavn">
                    {offer.meta.projektnavn || "—"}
                  </p>
                </div>
              </div>
            </section>

            {/* Lokationer med produkttabeller */}
            {offerWithTotals?.lokationerWithTotals.map((lok, lokIndex) => (
              <section key={lokIndex} className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                  {lok.navn}
                </h3>

                {/* Tabel: horisontal scroll på smal mobil */}
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <table className="w-full text-sm min-w-[360px]">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="py-2 font-medium">Produkt</th>
                        <th className="py-2 font-medium text-center w-16 sm:w-20">Antal</th>
                        <th className="py-2 font-medium text-right w-24 sm:w-28">Enhedspris</th>
                        <th className="py-2 font-medium text-right w-24 sm:w-28">Linjepris</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lok.linjerWithProducts.map((linje, linjeIndex) => (
                        <tr key={linjeIndex} className="border-b border-gray-100">
                          <td className="py-2">
                            <span className="font-medium">{linje.product.navn}</span>
                          </td>
                          <td className="py-2 text-center">
                            {linje.antal} {linje.product.enhed}
                          </td>
                          <td className="py-2 text-right text-gray-600">
                            {formatDKK(linje.enhedspris)}
                          </td>
                          <td className="py-2 text-right font-medium">
                            {formatDKK(linje.linjepris)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="py-2 text-right font-medium text-gray-600">
                          Subtotal {lok.navn}:
                        </td>
                        <td className="py-2 text-right font-semibold">
                          {formatDKK(lok.subtotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            ))}

            {/* Totaler – fuld bredde på mobil, 256px på desktop */}
            <section className="mt-8 pt-6 border-t-2 border-gray-900">
              <div className="flex justify-end">
                <div className="w-full sm:w-64 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal (ekskl. moms):</span>
                    <span className="font-medium" data-testid="text-preview-subtotal">
                      {formatDKK(offerWithTotals?.total || 0)}
                    </span>
                  </div>

                  {offer.moms.visInkl && (
                    <>
                      <div className="flex justify-between text-gray-600">
                        <span>Moms (25%):</span>
                        <span data-testid="text-preview-moms">
                          {formatDKK(offerWithTotals?.moms || 0)}
                        </span>
                      </div>

                      <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>Total inkl. moms:</span>
                        <span className="text-primary" data-testid="text-preview-total">
                          {formatDKK(offerWithTotals?.totalInklMoms || 0)}
                        </span>
                      </div>
                    </>
                  )}

                  {!offer.moms.visInkl && (
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total ekskl. moms:</span>
                      <span className="text-primary" data-testid="text-preview-total-ekskl">
                        {formatDKK(offerWithTotals?.total || 0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {offer.bemærkninger && (
              <section className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Bemærkninger</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {offer.bemærkninger}
                </p>
              </section>
            )}

            <footer className="mt-12 pt-6 border-t text-sm text-gray-500">
              <p className="mb-4">{config?.standardtekst}</p>
              <p>{config?.betalingsbetingelser}</p>
            </footer>

          </div>
        </div>
      </main>
    </div>
  );
}
