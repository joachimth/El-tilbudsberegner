import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap, Leaf, Grid3X3, FileText, Star } from "lucide-react";
import type { Skabelon } from "@shared/schema";

interface TemplateSelectorProps {
  onSelect: (skabelon: Skabelon) => void;
}

const SKABELONER: {
  id: Skabelon;
  icon: React.ElementType;
  farve: string;
  navn: string;
  tagline: string;
  beskrivelse: string;
  tags: string[];
  nyhed?: boolean;
}[] = [
  {
    id: "ev_erhverv_v2",
    icon: Zap,
    farve: "bg-[#1f4d6b]",
    navn: "EV & Erhverv V2",
    tagline: "Professionelt lækker — PDF-klar",
    beskrivelse:
      "Fuldt designet premium-skabelon med hero-sektion, fordelskort, løsningskort med billeder, smart prisoversigt og CTA-blok. Optimeret til PDF-eksport.",
    tags: ["EV-lader", "Erhverv", "Billeder", "PDF", "Premium"],
    nyhed: true,
  },
  {
    id: "ev_erhverv",
    icon: Zap,
    farve: "bg-blue-600",
    navn: "EV & Erhverv",
    tagline: "Pris først – hurtig beslutning",
    beskrivelse:
      "Kompakt format til erhvervskunder. Prisen er synlig med det samme. Produkttabel, tillægspriser og forbehold i klart overblik.",
    tags: ["Ladebokse", "Elinstallation", "Erhverv"],
  },
  {
    id: "energi_privat",
    icon: Leaf,
    farve: "bg-emerald-600",
    navn: "Energi & Privat",
    tagline: "Forklarende – tryghed i fokus",
    beskrivelse:
      "Opbygger tillid og forståelse. Løsningsoverblik, kundens ansvar og garantier beskrives grundigt. Prisen kommer til sidst.",
    tags: ["Solceller", "Batterilager", "Varmepumpe", "VE-anlæg"],
  },
  {
    id: "modul_overslag",
    icon: Grid3X3,
    farve: "bg-violet-600",
    navn: "Modul Overslag",
    tagline: "Modulopdelt – del-priser",
    beskrivelse:
      "Hvert arbejdsområde vises som et selvstændigt modul med beskrivelse og delpris. Velegnet til større projekter med etaper.",
    tags: ["Etaper", "Flerfagligt", "Delpriser"],
  },
  {
    id: "standard",
    icon: FileText,
    farve: "bg-gray-600",
    navn: "Standard",
    tagline: "Generelt tilbud",
    beskrivelse:
      "Klassisk tilbudsformat med lokationer og produktliste. Til hverdagsjobs og mindre opgaver.",
    tags: ["Alsidig", "Hurtig"],
  },
];

export default function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-base">Nyt tilbud</h1>
            <p className="text-xs text-muted-foreground">Vælg skabelon</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-semibold mb-2">Hvad slags tilbud er det?</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Skabelonen bestemmer layout og fokus i det dokument kunden modtager. Du kan altid skifte til forhåndsvisning og se resultatet.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {SKABELONER.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={`group text-left border rounded-xl overflow-hidden bg-card hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${s.nyhed ? "ring-2 ring-[#1f4d6b]/30" : ""}`}
              >
                {/* Farvet top-band */}
                <div className={`${s.farve} h-2`} />

                <div className="p-5">
                  <div className="flex items-start gap-4 mb-3">
                    <div className={`${s.farve} w-10 h-10 rounded-lg flex items-center justify-center shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-lg leading-tight">{s.navn}</span>
                        {s.nyhed && (
                          <span className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-[#1f4d6b] text-white font-medium">
                            <Star className="w-3 h-3" />
                            Ny
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">{s.tagline}</div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {s.beskrivelse}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {s.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="px-5 pb-4">
                  <div className="text-sm font-medium text-primary group-hover:underline">
                    Vælg denne skabelon →
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
