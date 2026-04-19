import { useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Zap, Calculator, FileDown, Clock, LogOut, Settings, FolderOpen, ChevronRight, Trash2 } from "lucide-react";
import { loadFromJsonFile } from "@/lib/offer-utils";
import { useToast } from "@/hooks/use-toast";
import { logout } from "@/lib/auth";
import type { CurrentUser } from "@/lib/auth";
import type { Offer } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OfferSummary {
  id: string;
  titel: string;
  tilbudNr: string | null;
  oprettetAt: string;
  opdateretAt: string;
  brugerNavn?: string;
}

interface HomeProps {
  currentUser: CurrentUser;
  onLoadOffer: (offer: Offer) => void;
}

export default function Home({ currentUser, onLoadOffer }: HomeProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: offers = [], isLoading: offersLoading } = useQuery<OfferSummary[]>({
    queryKey: ["/api/offers"],
    queryFn: async () => {
      const res = await fetch("/api/offers", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const handleLogout = async () => {
    await logout();
    queryClient.setQueryData(["/api/auth/me"], null);
    navigate("/login");
  };

  const handleNewOffer = () => {
    navigate("/editor");
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const offer = await loadFromJsonFile(file);
      onLoadOffer(offer);
      toast({
        title: "Tilbud indlæst",
        description: `Tilbud "${offer.meta.projektnavn || "Unavngivet"}" er klar til redigering.`,
      });
      navigate("/editor");
    } catch (error) {
      toast({
        title: "Fejl ved indlæsning",
        description: error instanceof Error ? error.message : "Kunne ikke indlæse tilbuddet.",
        variant: "destructive",
      });
    }
    e.target.value = "";
  };

  const handleOpenOffer = async (id: number) => {
    try {
      const res = await fetch(`/api/offers/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Kunne ikke hente tilbud");
      const offer: Offer = await res.json();
      onLoadOffer(offer);
      navigate("/editor");
    } catch (error) {
      toast({
        title: "Fejl",
        description: error instanceof Error ? error.message : "Kunne ikke åbne tilbud.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOffer = async (id: number, titel: string) => {
    try {
      const res = await fetch(`/api/offers/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Sletning fejlede");
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      toast({ title: "Tilbud slettet", description: `"${titel}" er slettet.` });
    } catch (error) {
      toast({
        title: "Fejl",
        description: error instanceof Error ? error.message : "Kunne ikke slette tilbud.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold hidden sm:inline">Tilbudsberegner</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{currentUser.brugernavn}</span>
            {currentUser.rolle === "admin" && (
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="gap-1.5">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Log ud</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
            Goddag, {currentUser.brugernavn}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Lav professionelle tilbud på få minutter.
          </p>
        </header>

        {/* Action cards */}
        <div className="grid gap-4 sm:grid-cols-2 mb-10">
          <Card className="hover-elevate cursor-pointer group" onClick={handleNewOffer}>
            <CardHeader className="pb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-xl">Nyt tilbud</CardTitle>
              <CardDescription>Start et nyt tilbud fra bunden.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" data-testid="button-new-offer">
                Opret nyt tilbud
              </Button>
            </CardContent>
          </Card>

          <Card className="hover-elevate cursor-pointer group" onClick={handleLoadClick}>
            <CardHeader className="pb-3">
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center mb-2 group-hover:bg-accent/80 transition-colors">
                <Upload className="w-5 h-5 text-accent-foreground" />
              </div>
              <CardTitle className="text-xl">Indlæs fra fil</CardTitle>
              <CardDescription>Åbn et tilbud gemt som JSON-fil.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" data-testid="button-load-offer">
                Vælg fil
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-load-file"
              />
            </CardContent>
          </Card>
        </div>

        {/* Saved offers */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold text-lg">Gemte tilbud</h2>
            {offers.length > 0 && (
              <Badge variant="secondary" className="ml-1">{offers.length}</Badge>
            )}
          </div>

          {offersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : offers.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-xl text-muted-foreground">
              <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Ingen gemte tilbud endnu</p>
              <p className="text-sm mt-1">Opret et nyt tilbud og gem det til serveren</p>
            </div>
          ) : (
            <div className="space-y-2">
              {offers.map(offer => (
                <div
                  key={offer.id}
                  className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{offer.titel || "Unavngivet tilbud"}</span>
                      {offer.tilbudNr && (
                        <Badge variant="outline" className="text-xs shrink-0">{offer.tilbudNr}</Badge>
                      )}
                      {currentUser.rolle === "admin" && offer.brugerNavn && (
                        <Badge variant="secondary" className="text-xs shrink-0">{offer.brugerNavn}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Opdateret {formatDate(offer.opdateretAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Slet tilbud?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{offer.titel || "Unavngivet tilbud"}" slettes permanent.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuller</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDeleteOffer(offer.id, offer.titel)}
                          >
                            Slet
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1"
                      onClick={() => handleOpenOffer(offer.id)}
                    >
                      Åbn
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Feature highlights */}
        <div className="grid gap-4 md:grid-cols-3 mb-10">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-card-border">
            <Calculator className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Automatisk prisberegning</h3>
              <p className="text-sm text-muted-foreground">Priser fra katalog med rabat ved 2+ stk.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-card-border">
            <FileDown className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium mb-1">PDF & Print</h3>
              <p className="text-sm text-muted-foreground">Generer polerede tilbud i PDF eller print.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-card-border">
            <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Gem til server</h3>
              <p className="text-sm text-muted-foreground">Tilbud gemmes sikkert og er tilgængelige overalt.</p>
            </div>
          </div>
        </div>

        <footer className="text-center text-sm text-muted-foreground border-t pt-8">
          <p>Tilbudsberegner til elektrikere — Hurtig og professionel</p>
        </footer>
      </div>
    </div>
  );
}
