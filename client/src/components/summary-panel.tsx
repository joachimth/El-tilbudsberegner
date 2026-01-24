import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calculator, MapPin } from "lucide-react";
import type { OfferWithTotals } from "@/lib/types";
import { formatDKK } from "@shared/schema";

interface SummaryPanelProps {
  offerWithTotals: OfferWithTotals | null;
  showMoms: boolean;
}

export function SummaryPanel({ offerWithTotals, showMoms }: SummaryPanelProps) {
  if (!offerWithTotals) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Resumé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Tilføj lokationer og produkter for at se resumé
          </p>
        </CardContent>
      </Card>
    );
  }

  const { lokationerWithTotals, total, moms, totalInklMoms } = offerWithTotals;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          Resumé
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {lokationerWithTotals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Ingen lokationer tilføjet
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {lokationerWithTotals.map((lok, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{lok.navn || "Unavngivet"}</span>
                    <span className="text-muted-foreground shrink-0">
                      ({lok.linjer.length})
                    </span>
                  </div>
                  <span className="font-medium shrink-0 ml-2" data-testid={`text-summary-lokation-${index}`}>
                    {formatDKK(lok.subtotal)}
                  </span>
                </div>
              ))}
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Subtotal (ekskl. moms)</span>
                <span className="font-semibold" data-testid="text-summary-subtotal">
                  {formatDKK(total)}
                </span>
              </div>
              
              {showMoms && (
                <>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Moms (25%)</span>
                    <span data-testid="text-summary-moms">{formatDKK(moms)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total inkl. moms</span>
                    <span className="font-bold text-lg text-primary" data-testid="text-summary-total-inkl">
                      {formatDKK(totalInklMoms)}
                    </span>
                  </div>
                </>
              )}
              
              {!showMoms && (
                <p className="text-xs text-muted-foreground mt-2">
                  Slå &quot;Vis total inkl. moms&quot; til for at se momsen.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
