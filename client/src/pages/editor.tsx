import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Eye, Download, Printer, Save } from "lucide-react";
import { KundeInfoForm } from "@/components/kunde-info-form";
import { LokationEditor } from "@/components/lokation-editor";
import { SummaryPanel } from "@/components/summary-panel";
import { createEmptyOffer, createEmptyLokation, calculateOfferTotals, downloadAsJson } from "@/lib/offer-utils";
import type { Offer, Product, Config, Lokation } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface EditorPageProps {
  initialOffer: Offer | null;
  onOfferChange: (offer: Offer) => void;
}

export default function EditorPage({ initialOffer, onOfferChange }: EditorPageProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [offer, setOffer] = useState<Offer>(() => initialOffer || createEmptyOffer());
  
  useEffect(() => {
    if (initialOffer) {
      setOffer(initialOffer);
    }
  }, [initialOffer]);

  useEffect(() => {
    onOfferChange(offer);
  }, [offer, onOfferChange]);

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: config } = useQuery<Config>({
    queryKey: ["/api/config"],
  });

  const offerWithTotals = useMemo(() => {
    if (!products.length) return null;
    return calculateOfferTotals(offer, products, config?.momsprocent || 25);
  }, [offer, products, config?.momsprocent]);

  const handleBack = () => {
    navigate("/");
  };

  const handleAddLokation = () => {
    const commonNames = ["Stue", "Køkken", "Badeværelse", "Soveværelse", "Gang", "Kontor", "Kælder", "Garage", "Have", "Tavlerum"];
    const usedNames = new Set(offer.lokationer.map(l => l.navn));
    const suggestedName = commonNames.find(n => !usedNames.has(n)) || `Lokation ${offer.lokationer.length + 1}`;
    
    setOffer({
      ...offer,
      lokationer: [...offer.lokationer, createEmptyLokation(suggestedName)]
    });
  };

  const handleLokationChange = (index: number, lokation: Lokation) => {
    const newLokationer = [...offer.lokationer];
    newLokationer[index] = lokation;
    setOffer({ ...offer, lokationer: newLokationer });
  };

  const handleDeleteLokation = (index: number) => {
    const newLokationer = offer.lokationer.filter((_, i) => i !== index);
    setOffer({ ...offer, lokationer: newLokationer });
  };

  const handleMoveLokation = (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= offer.lokationer.length) return;
    
    const newLokationer = [...offer.lokationer];
    [newLokationer[fromIndex], newLokationer[toIndex]] = [newLokationer[toIndex], newLokationer[fromIndex]];
    setOffer({ ...offer, lokationer: newLokationer });
  };

  const handleSave = () => {
    const filename = offer.meta.projektnavn 
      ? `tilbud-${offer.meta.projektnavn.toLowerCase().replace(/\s+/g, '-')}.json`
      : `tilbud-${offer.meta.tilbudNr || 'draft'}.json`;
    downloadAsJson(offer, filename);
    toast({
      title: "Tilbud gemt",
      description: `Filen "${filename}" er downloadet.`,
    });
  };

  const handlePreview = () => {
    navigate("/preview");
  };

  const handlePrint = () => {
    navigate("/preview");
    setTimeout(() => window.print(), 500);
  };

  if (productsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-6 w-48" />
          </div>
        </header>
        <div className="max-w-7xl mx-auto p-4 grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <Skeleton className="h-96" />
          </div>
          <div className="col-span-6">
            <Skeleton className="h-64 mb-4" />
            <Skeleton className="h-64" />
          </div>
          <div className="col-span-3">
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
          <Button variant="ghost" size="sm" onClick={handleBack} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tilbage
          </Button>
          
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate" data-testid="text-offer-title">
              {offer.meta.projektnavn || "Nyt tilbud"}
            </h1>
            {offer.meta.tilbudNr && (
              <span className="text-xs text-muted-foreground">
                Tilbud #{offer.meta.tilbudNr}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} data-testid="button-save">
              <Download className="w-4 h-4 mr-2" />
              Gem som JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button size="sm" onClick={handlePreview} data-testid="button-preview">
              <Eye className="w-4 h-4 mr-2" />
              Forhåndsvis
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full grid grid-cols-12 gap-6 p-4">
          <aside className="col-span-3 overflow-auto">
            <ScrollArea className="h-[calc(100vh-120px)]">
              <KundeInfoForm
                kunde={offer.kunde}
                meta={offer.meta}
                moms={offer.moms}
                bemærkninger={offer.bemærkninger}
                onKundeChange={kunde => setOffer({ ...offer, kunde })}
                onMetaChange={meta => setOffer({ ...offer, meta })}
                onMomsChange={moms => setOffer({ ...offer, moms })}
                onBemærkningerChange={bemærkninger => setOffer({ ...offer, bemærkninger })}
              />
            </ScrollArea>
          </aside>

          <main className="col-span-6 overflow-auto">
            <ScrollArea className="h-[calc(100vh-120px)]">
              <div className="pr-2">
                {offer.lokationer.length === 0 ? (
                  <div className="text-center py-16 px-4 border-2 border-dashed rounded-lg">
                    <h3 className="font-medium mb-2">Ingen lokationer endnu</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start med at tilføje en lokation (f.eks. køkken, badeværelse) og tilføj derefter produkter.
                    </p>
                    <Button onClick={handleAddLokation} data-testid="button-add-first-lokation">
                      <Plus className="w-4 h-4 mr-2" />
                      Tilføj første lokation
                    </Button>
                  </div>
                ) : (
                  <>
                    {offer.lokationer.map((lokation, index) => (
                      <LokationEditor
                        key={index}
                        lokation={lokation}
                        products={products}
                        lokationIndex={index}
                        totalLokationer={offer.lokationer.length}
                        onChange={lok => handleLokationChange(index, lok)}
                        onDelete={() => handleDeleteLokation(index)}
                        onMoveUp={() => handleMoveLokation(index, "up")}
                        onMoveDown={() => handleMoveLokation(index, "down")}
                      />
                    ))}
                    
                    <Button
                      variant="outline"
                      onClick={handleAddLokation}
                      className="w-full"
                      data-testid="button-add-lokation"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Tilføj lokation
                    </Button>
                  </>
                )}
              </div>
            </ScrollArea>
          </main>

          <aside className="col-span-3 overflow-auto">
            <ScrollArea className="h-[calc(100vh-120px)]">
              <SummaryPanel
                offerWithTotals={offerWithTotals}
                showMoms={offer.moms.visInkl}
              />
            </ScrollArea>
          </aside>
        </div>
      </div>
    </div>
  );
}
