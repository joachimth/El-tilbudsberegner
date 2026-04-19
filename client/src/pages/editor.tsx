import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Eye, Download, Menu, X, MapPin, User, Calculator, Save, LogOut, Settings, Cloud, Check } from "lucide-react";
import { KundeInfoForm } from "@/components/kunde-info-form";
import { LokationEditor } from "@/components/lokation-editor";
import { SummaryPanel } from "@/components/summary-panel";
import { createEmptyOffer, createEmptyLokation, calculateOfferTotals, downloadAsJson } from "@/lib/offer-utils";
import type { Offer, Product, Config, Lokation } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { logout } from "@/lib/auth";
import type { CurrentUser } from "@/lib/auth";
import { formatDKK } from "@shared/schema";

interface EditorPageProps {
  initialOffer: Offer | null;
  onOfferChange: (offer: Offer) => void;
  currentUser: CurrentUser;
}

type MobileTab = "lokationer" | "kunde" | "resume";

export default function EditorPage({ initialOffer, onOfferChange, currentUser }: EditorPageProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [offer, setOffer] = useState<Offer>(() => initialOffer || createEmptyOffer());
  const [mobileTab, setMobileTab] = useState<MobileTab>("lokationer");
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
    const nextNum = offer.lokationer.length + 1;
    setOffer({
      ...offer,
      lokationer: [...offer.lokationer, createEmptyLokation(`Rum ${nextNum}`)]
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

  const handleSaveToServer = async () => {
    setSaving(true);
    try {
      const isUpdate = !!offer.id;
      const url = isUpdate ? `/api/offers/${offer.id}` : "/api/offers";
      const method = isUpdate ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(offer),
      });
      if (!res.ok) throw new Error("Gemning fejlede");
      const saved: Offer = await res.json();
      setOffer(saved);
      onOfferChange(saved);
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      toast({ title: "Gemt", description: "Tilbud gemt til serveren." });
    } catch (err) {
      toast({ title: "Fejl", description: err instanceof Error ? err.message : "Kunne ikke gemme.", variant: "destructive" });
    } finally {
      setSaving(false);
      setMenuOpen(false);
    }
  };

  const handleSaveJson = () => {
    const filename = offer.meta.projektnavn
      ? `tilbud-${offer.meta.projektnavn.toLowerCase().replace(/\s+/g, '-')}.json`
      : `tilbud-${offer.meta.tilbudNr || 'draft'}.json`;
    downloadAsJson(offer, filename);
    toast({
      title: "Fil downloadet",
      description: `"${filename}" er downloadet.`,
    });
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    queryClient.setQueryData(["/api/auth/me"], null);
    navigate("/login");
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
    <div className="min-h-screen bg-background">
      {/* Overlays: lukker dropdowns ved tryk udenfor */}
      {(menuOpen || userMenuOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setMenuOpen(false); setUserMenuOpen(false); }}
          aria-hidden="true"
        />
      )}

      {/* Header */}
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
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="font-semibold truncate text-base" data-testid="text-offer-title">
                {offer.meta.projektnavn || "Nyt tilbud"}
              </h1>
              {offer.skabelon && offer.skabelon !== "standard" && (
                <span className="hidden sm:inline-block text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {{
                    ev_erhverv: "EV & Erhverv",
                    energi_privat: "Energi",
                    modul_overslag: "Modul",
                  }[offer.skabelon]}
                </span>
              )}
            </div>
            {offer.id && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Check className="w-3 h-3" />
                Gemt til server
              </p>
            )}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSaveJson} data-testid="button-save-json">
              <Download className="w-4 h-4 mr-2" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleSaveToServer} disabled={saving} data-testid="button-save-server">
              <Cloud className="w-4 h-4 mr-2" />
              {saving ? "Gemmer..." : "Gem"}
            </Button>
            <Button size="sm" onClick={handlePreview} data-testid="button-preview">
              <Eye className="w-4 h-4 mr-2" />
              Forhåndsvis
            </Button>
            {/* User menu desktop */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={e => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); }}
                className="gap-1.5"
              >
                <User className="w-4 h-4" />
                <span className="max-w-[80px] truncate">{currentUser.brugernavn}</span>
              </Button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-card border rounded-lg shadow-lg py-1 z-10" onClick={e => e.stopPropagation()}>
                  {currentUser.rolle === "admin" && (
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                      onClick={() => { setUserMenuOpen(false); navigate("/admin"); }}
                    >
                      <Settings className="w-4 h-4" />
                      Admin panel
                    </button>
                  )}
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2 text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" />
                    Log ud
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0"
            onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); setUserMenuOpen(false); }}
            data-testid="button-menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="md:hidden border-t bg-card px-4 py-3 space-y-2 animate-in slide-in-from-top-2 relative z-10" onClick={e => e.stopPropagation()}>
            <Button
              variant="outline"
              className="w-full justify-start h-12"
              onClick={handleSaveToServer}
              disabled={saving}
              data-testid="button-save-server-mobile"
            >
              <Cloud className="w-5 h-5 mr-3" />
              {saving ? "Gemmer..." : "Gem til server"}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-12"
              onClick={handleSaveJson}
              data-testid="button-save-json-mobile"
            >
              <Download className="w-5 h-5 mr-3" />
              Download som JSON
            </Button>
            <Button
              className="w-full justify-start h-12"
              onClick={handlePreview}
              data-testid="button-preview-mobile"
            >
              <Eye className="w-5 h-5 mr-3" />
              Forhåndsvis tilbud
            </Button>
            <div className="border-t pt-2 mt-2">
              <div className="px-1 py-1 text-xs text-muted-foreground mb-1">{currentUser.brugernavn}</div>
              {currentUser.rolle === "admin" && (
                <Button
                  variant="ghost"
                  className="w-full justify-start h-10 text-sm"
                  onClick={() => { setMenuOpen(false); navigate("/admin"); }}
                >
                  <Settings className="w-4 h-4 mr-3" />
                  Admin panel
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full justify-start h-10 text-sm text-destructive hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-3" />
                Log ud
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Tab Bar – sticky under headeren */}
      <nav className="md:hidden border-b bg-muted/50 sticky top-[61px] z-40">
        <div className="flex">
          <button
            onClick={() => setMobileTab("lokationer")}
            className={`flex-1 py-3 px-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              mobileTab === "lokationer"
                ? "text-primary border-b-2 border-primary bg-background"
                : "text-muted-foreground"
            }`}
            data-testid="tab-lokationer"
          >
            <MapPin className="w-4 h-4 shrink-0" />
            <span>Lokationer</span>
            {offer.lokationer.length > 0 && (
              <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full leading-none">
                {offer.lokationer.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileTab("kunde")}
            className={`flex-1 py-3 px-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              mobileTab === "kunde"
                ? "text-primary border-b-2 border-primary bg-background"
                : "text-muted-foreground"
            }`}
            data-testid="tab-kunde"
          >
            <User className="w-4 h-4 shrink-0" />
            <span>Kunde</span>
          </button>
          <button
            onClick={() => setMobileTab("resume")}
            className={`flex-1 py-3 px-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              mobileTab === "resume"
                ? "text-primary border-b-2 border-primary bg-background"
                : "text-muted-foreground"
            }`}
            data-testid="tab-resume"
          >
            <Calculator className="w-4 h-4 shrink-0" />
            <span>Resumé</span>
          </button>
        </div>
      </nav>

      {/* Desktop: 3-kolonne layout med constrained scroll */}
      <div className="hidden md:grid h-[calc(100vh-61px)] max-w-7xl mx-auto grid-cols-12 gap-6 p-4">
        <aside className="col-span-3 overflow-auto pr-2">
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
        </aside>

        <main className="col-span-6 overflow-auto pr-2">
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
                  skabelon={offer.skabelon}
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
        </main>

        <aside className="col-span-3 overflow-auto">
          <SummaryPanel
            offerWithTotals={offerWithTotals}
            showMoms={offer.moms.visInkl}
          />
        </aside>
      </div>

      {/* Mobil: naturlig page-scroll (ingen fixed height) */}
      <div className="md:hidden">
        {mobileTab === "lokationer" && (
          <div className="p-4 pb-28 space-y-4">
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
          <div className="p-4 pb-28">
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
          <div className="p-4 pb-28">
            <SummaryPanel
              offerWithTotals={offerWithTotals}
              showMoms={offer.moms.visInkl}
            />
          </div>
        )}
      </div>

      {/* Mobil: fast bundlinje med total og forhåndsvis */}
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
