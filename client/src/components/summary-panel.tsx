import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calculator, MapPin, TrendingUp } from "lucide-react";
import type { OfferWithTotals } from "@/lib/types";
import { formatDKK } from "@shared/schema";

interface SummaryPanelProps {
  offerWithTotals: OfferWithTotals | null;
  showMoms: boolean;
  momsprocent?: number;
}

export function SummaryPanel({ offerWithTotals, showMoms, momsprocent = 25 }: SummaryPanelProps) {
  if (!offerWithTotals) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Resumé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Tilføj lokationer og produkter for at se resumé
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { lokationerWithTotals, total, moms, totalInklMoms } = offerWithTotals;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Resumé
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lokationerWithTotals.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Ingen lokationer tilføjet
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {lokationerWithTotals.map((lok, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <span className="font-medium block truncate">
                        {lok.navn || "Unavngivet"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {lok.linjer.length} {lok.linjer.length === 1 ? "produkt" : "produkter"}
                      </span>
                    </div>
                  </div>
                  <span className="font-semibold shrink-0 ml-3" data-testid={`text-summary-lokation-${index}`}>
                    {formatDKK(lok.subtotal)}
                  </span>
                </div>
              ))}
            </div>
            
            <Separator />
            
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal (ekskl. moms)</span>
                <span className="font-semibold text-lg" data-testid="text-summary-subtotal">
                  {formatDKK(total)}
                </span>
              </div>
              
              {showMoms && (
                <>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Moms ({momsprocent}%)</span>
                    <span data-testid="text-summary-moms">{formatDKK(moms)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between pt-2">
                    <span className="font-semibold text-lg">Total inkl. moms</span>
                    <span className="font-bold text-2xl text-primary" data-testid="text-summary-total-inkl">
                      {formatDKK(totalInklMoms)}
                    </span>
                  </div>
                </>
              )}
              
              {!showMoms && (
                <p className="text-sm text-muted-foreground">
                  Slå &quot;Vis total inkl. moms&quot; til under Kunde for at se momsen.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
