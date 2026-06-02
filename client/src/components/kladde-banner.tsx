import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, X } from "lucide-react";
import { loadKladde, clearKladde, type AutosaveSlot } from "@/hooks/use-autosave";
import type { Offer } from "@shared/schema";

interface KladdeBannerProps {
  onRestore: (offer: Offer) => void;
}

function formatSavedAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "for under et minut siden";
  if (diffMin < 60) return `for ${diffMin} min. siden`;
  return d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
}

export function KladdeBanner({ onRestore }: KladdeBannerProps) {
  const [slot, setSlot] = useState<AutosaveSlot | null>(null);

  useEffect(() => {
    setSlot(loadKladde());
  }, []);

  if (!slot) return null;

  const projektnavn = slot.offer.meta?.projektnavn || "Unavngivet tilbud";

  const handleRestore = () => {
    onRestore(slot.offer);
    clearKladde();
    setSlot(null);
  };

  const handleDiscard = () => {
    clearKladde();
    setSlot(null);
  };

  return (
    <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-xl text-sm">
      <RotateCcw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-amber-900">
          Kladde fundet: &ldquo;{projektnavn}&rdquo;
        </p>
        <p className="text-amber-700 mt-0.5">
          Gendannet autosave fra {formatSavedAt(slot.savedAt)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="h-8 border-amber-300 hover:bg-amber-100"
          onClick={handleRestore}
        >
          Gendan
        </Button>
        <button
          onClick={handleDiscard}
          className="text-amber-500 hover:text-amber-700 transition-colors"
          title="Kassér kladde"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
