import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Eye, Download, Menu, X, MapPin, User, Calculator } from "lucide-react";
import { KundeInfoForm } from "@/components/kunde-info-form";
import { LokationEditor } from "@/components/lokation-editor";
import { SummaryPanel } from "@/components/summary-panel";
import { createEmptyOffer, createEmptyLokation, calculateOfferTotals, downloadAsJson } from "@/lib/offer-utils";
import type { Offer, Product, Config, Lokation } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { formatDKK } from "@shared/schema";

interface EditorPageProps {
  initialOffer: Offer | null;
  onOfferChange: (offer: Offer) => void;
}

type MobileTab = "lokationer" | "kunde" | "resume";

export default function EditorPage({ initialOffer, onOfferChange }: EditorPageProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [offer, setOffer] = useState<Offer>(() => initialOffer || createEmptyOffer());
  const [mobileTab, setMobileTab] = useState<MobileTab>("lokationer");
  const [menuOpen, setMenuOpen] = useState(false);
  
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
    setMenuOpen(false);
  };

  const handlePreview = () => {
    navigate("/preview");
  };

  if (productsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="px-4 py-4 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-6 w-48" />
          </div>
        </header>
        <div className="p-4 space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  const totalDisplay = offerWithTotals 
    ? (offer.moms.visInkl ? offerWithTotals.totalInklMoms : offerWithTotals.total)
    : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - Clean Apple-style */}
      <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-50 no-print">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack} 
            className="shrink-0"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate text-base" data-testid="text-offer-title">
              {offer.meta.projektnavn || "Nyt tilbud"}
            </h1>
          </div>
          
          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} data-testid="button-save">
              <Download className="w-4 h-4 mr-2" />
              Gem
            </Button>
            <Button size="sm" onClick={handlePreview} data-testid="button-preview">
              <Eye className="w-4 h-4 mr-2" />
              Forhåndsvis
            </Button>
          </div>
          
          {/* Mobile menu button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden shrink-0"
            onClick={() => setMenuOpen(!menuOpen)}
            data-testid="button-menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
        
        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="md:hidden border-t bg-card px-4 py-3 space-y-2 animate-in slide-in-from-top-2">
            <Button 
              variant="outline" 
              className="w-full justify-start h-12" 
              onClick={handleSave}
              data-testid="button-save-mobile"
            >
              <Download className="w-5 h-5 mr-3" />
              Gem som JSON
            </Button>
            <Button 
              className="w-full justify-start h-12" 
              onClick={handlePreview}
              data-testid="button-preview-mobile"
            >
              <Eye className="w-5 h-5 mr-3" />
              Forhåndsvis tilbud
            </Button>
          </div>
        )}
      </header>

      {/* Mobile Tab Bar */}
      <nav className="md:hidden border-b bg-muted/50 sticky top-[57px] z-40">
        <div className="flex">
          <button
            onClick={() => setMobileTab("lokationer")}
            className={`flex-1 py-3 px-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              mobileTab === "lokationer" 
                ? "text-primary border-b-2 border-primary bg-background" 
                : "text-muted-foreground"
            }`}
            data-testid="tab-lokationer"
          >
            <MapPin className="w-4 h-4" />
            <span>Lokationer</span>
            {offer.lokationer.length > 0 && (
              <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">
                {offer.lokationer.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileTab("kunde")}
            className={`flex-1 py-3 px-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              mobileTab === "kunde" 
                ? "text-primary border-b-2 border-primary bg-background" 
                : "text-muted-foreground"
            }`}
            data-testid="tab-kunde"
          >
            <User className="w-4 h-4" />
            <span>Kunde</span>
          </button>
          <button
            onClick={() => setMobileTab("resume")}
            className={`flex-1 py-3 px-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              mobileTab === "resume" 
                ? "text-primary border-b-2 border-primary bg-background" 
                : "text-muted-foreground"
            }`}
            data-testid="tab-resume"
          >
            <Calculator className="w-4 h-4" />
            <span>Resumé</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Desktop: 3-column layout */}
        <div className="hidden md:grid h-full max-w-7xl mx-auto grid-cols-12 gap-6 p-4">
          <aside className="col-span-3 overflow-auto">
            <div className="h-[calc(100vh-120px)] overflow-auto pr-2">
              <KundeInfoForm
                kunde={offer.kunde}
                meta={offer.meta}
                moms={offer.moms}
                bemærkninger={offer.bemærkninger}
                onKundeChange={kunde => setOffer({ ...offer, kunde })}
                onMetaChange={meta => setOffer({ ...offer, meta })}
                onMomsChange={moms => setOffer({ ...offer, moms })}
                onBemærkningerChange={bemærkninger => setOffer({ ...offer, bemærkninger })}
                testIdPrefix="desktop"
              />
            </div>
          </aside>

          <main className="col-span-6 overflow-auto">
            <div className="h-[calc(100vh-120px)] overflow-auto pr-2">
              {offer.lokationer.length === 0 ? (
                <div className="text-center py-16 px-4 border-2 border-dashed rounded-xl">
                  <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Ingen lokationer endnu</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Start med at tilføje en lokation
                  </p>
                  <Button onClick={handleAddLokation} size="lg" data-testid="button-add-first-lokation">
                    <Plus className="w-5 h-5 mr-2" />
                    Tilføj lokation
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
                    className="w-full h-12"
                    data-testid="button-add-lokation"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Tilføj lokation
                  </Button>
                </>
              )}
            </div>
          </main>

          <aside className="col-span-3 overflow-auto">
            <div className="h-[calc(100vh-120px)] overflow-auto">
              <SummaryPanel
                offerWithTotals={offerWithTotals}
                showMoms={offer.moms.visInkl}
              />
            </div>
          </aside>
        </div>

        {/* Mobile: Tab content */}
        <div className="md:hidden h-[calc(100vh-180px)] overflow-auto">
          {mobileTab === "lokationer" && (
            <div className="p-4 pb-24 space-y-4">
              {offer.lokationer.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MapPin className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium text-lg mb-2">Ingen lokationer endnu</h3>
                  <p className="text-muted-foreground mb-6">
                    Tryk på knappen for at tilføje din første lokation
                  </p>
                  <Button 
                    onClick={handleAddLokation} 
                    size="lg" 
                    className="h-14 text-base px-8"
                    data-testid="button-add-first-lokation-mobile"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Tilføj lokation
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
                    className="w-full h-14 text-base"
                    data-testid="button-add-lokation-mobile"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Tilføj lokation
                  </Button>
                </>
              )}
            </div>
          )}

          {mobileTab === "kunde" && (
            <div className="p-4 pb-24">
              <KundeInfoForm
                kunde={offer.kunde}
                meta={offer.meta}
                moms={offer.moms}
                bemærkninger={offer.bemærkninger}
                onKundeChange={kunde => setOffer({ ...offer, kunde })}
                onMetaChange={meta => setOffer({ ...offer, meta })}
                onMomsChange={moms => setOffer({ ...offer, moms })}
                onBemærkningerChange={bemærkninger => setOffer({ ...offer, bemærkninger })}
                testIdPrefix="mobile"
              />
            </div>
          )}

          {mobileTab === "resume" && (
            <div className="p-4 pb-24">
              <SummaryPanel
                offerWithTotals={offerWithTotals}
                showMoms={offer.moms.visInkl}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t safe-area-bottom z-50">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">
              {offer.moms.visInkl ? "Total inkl. moms" : "Subtotal"}
            </p>
            <p className="text-xl font-bold text-primary" data-testid="text-mobile-total">
              {formatDKK(totalDisplay)}
            </p>
          </div>
          <Button 
            size="lg" 
            className="h-12 px-6"
            onClick={handlePreview}
            data-testid="button-preview-bottom"
          >
            <Eye className="w-5 h-5 mr-2" />
            Vis tilbud
          </Button>
        </div>
      </div>
    </div>
  );
}
