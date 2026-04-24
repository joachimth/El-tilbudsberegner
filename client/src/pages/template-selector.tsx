import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap, Leaf, Grid3X3, FileText, Star } from "lucide-react";
import type { Skabelon } from "@shared/schema";
import { SKABELON_REGISTRY } from "@shared/skabelon-registry";

interface TemplateSelectorProps {
  onSelect: (skabelon: Skabelon) => void;
}

const IKONER: Record<string, React.ElementType> = {
  ev_erhverv_v2: Zap,
  ev_erhverv: Zap,
  energi_privat: Leaf,
  modul_overslag: Grid3X3,
  standard: FileText,
};

export default function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const [, navigate] = useLocation();

  const { data: skabelonerInfo = [] } = useQuery<{ id: string; skjult: boolean }[]>({
    queryKey: ["/api/skabeloner"],
    queryFn: async () => {
      const res = await fetch("/api/skabeloner", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const skjulteIds = new Set(skabelonerInfo.filter(s => s.skjult).map(s => s.id));
  const synlige = SKABELON_REGISTRY.filter(s => !skjulteIds.has(s.id));

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
          <p className="text-muted-foreground max-lg mx-auto">
            Skabelonen bestemmer layout og fokus i det dokument kunden modtager. Du kan altid skifte til forhåndsvisning og se resultatet.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {synlige.map((s) => {
            const Icon = IKONER[s.id] ?? FileText;
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={`group text-left border rounded-xl overflow-hidden bg-card hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${s.nyhed ? "ring-2 ring-[#1f4d6b]/30" : ""}`}
              >
                <div className={`${s.farveklasse} h-2`} />

                <div className="p-5">
                  <div className="flex items-start gap-4 mb-3">
                    <div className={`${s.farveklasse} w-10 h-10 rounded-lg flex items-center justify-center shrink-0`}>
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
