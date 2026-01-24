import { useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Upload, Zap, Calculator, FileDown, Clock } from "lucide-react";
import { loadFromJsonFile } from "@/lib/offer-utils";
import { useToast } from "@/hooks/use-toast";

interface HomeProps {
  onLoadOffer: (offer: any) => void;
}

export default function Home({ onLoadOffer }: HomeProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        description: `Tilbud "${offer.meta.projektnavn || 'Unavngivet'}" er klar til redigering.`,
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Hurtig Tilbudsberegner</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Lav professionelle tilbud på få minutter. Vælg produkter fra kataloget, angiv antal, og generer et poleret tilbud.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 mb-12">
          <Card className="hover-elevate cursor-pointer group" onClick={handleNewOffer}>
            <CardHeader className="pb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-xl">Nyt tilbud</CardTitle>
              <CardDescription>
                Start et nyt tilbud fra bunden med kundeoplysninger og lokationer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button data-testid="button-new-offer" className="w-full">
                Opret nyt tilbud
              </Button>
            </CardContent>
          </Card>

          <Card className="hover-elevate cursor-pointer group" onClick={handleLoadClick}>
            <CardHeader className="pb-3">
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center mb-2 group-hover:bg-accent/80 transition-colors">
                <Upload className="w-5 h-5 text-accent-foreground" />
              </div>
              <CardTitle className="text-xl">Indlæs tilbud</CardTitle>
              <CardDescription>
                Åbn et tidligere gemt tilbud (JSON-fil) for at fortsætte arbejdet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button data-testid="button-load-offer" variant="outline" className="w-full">
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

        <div className="grid gap-4 md:grid-cols-3 mb-12">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-card-border">
            <Calculator className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Automatisk prisberegning</h3>
              <p className="text-sm text-muted-foreground">
                Priser hentes fra kataloget med rabat ved 2+ stk.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-card-border">
            <FileDown className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium mb-1">PDF & Print</h3>
              <p className="text-sm text-muted-foreground">
                Generer polerede tilbud i PDF eller print direkte.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-card-border">
            <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Gem og fortsæt</h3>
              <p className="text-sm text-muted-foreground">
                Gem dine tilbud som JSON og åbn dem senere.
              </p>
            </div>
          </div>
        </div>

        <footer className="text-center text-sm text-muted-foreground border-t pt-8">
          <p>Tilbudsberegner til elektrikere - Hurtig og professionel</p>
        </footer>
      </div>
    </div>
  );
}
