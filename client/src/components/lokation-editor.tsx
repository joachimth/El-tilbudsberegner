import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, MapPin, MoreVertical, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LinjeEditor } from "./linje-editor";
import type { Lokation, Product } from "@/lib/types";
import { formatDKK, beregnLinjepris } from "@shared/schema";

const RUM_FORSLAG = [
  // Private
  "Stue", "Køkken", "Alrum", "Badeværelse", "Soveværelse", "Værelse",
  "Gang", "Entré", "Bryggers", "Kontor", "Kælder", "Loft", "Garage",
  "Have", "Terrasse", "Carport",
  // Erhverv
  "Mødelokale", "Reception", "Serverrum", "Fællesareal", "Kantine",
  "Lager", "Produktion", "Toilet", "Teknikrum", "Tavlerum",
  "Elevator", "Facade", "Parkeringsplads", "Udvendig belysning",
];

interface LokationEditorProps {
  lokation: Lokation;
  products: Product[];
  lokationIndex: number;
  totalLokationer: number;
  skabelon?: string;
  kategoriFilter?: string[];
  onChange: (lokation: Lokation) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function LokationEditor({
  lokation,
  products,
  lokationIndex,
  totalLokationer,
  skabelon,
  kategoriFilter = [],
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: LokationEditorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [visAlle, setVisAlle] = useState(false);

  const filterAktiv = kategoriFilter.length > 0;
  const visibleProducts = filterAktiv && !visAlle
    ? products.filter(p => kategoriFilter.includes(p.kategori))
    : products;

  const subtotal = lokation.linjer.reduce((sum, linje) => {
    const product = products.find(p => p.id === linje.productId);
    return sum + (product ? beregnLinjepris(product, linje.antal) : 0);
  }, 0);

  const handleNameChange = (navn: string) => {
    onChange({ ...lokation, navn });
  };

  const handleAddLinje = () => {
    const firstProduct = visibleProducts[0] ?? products[0];
    if (!firstProduct) return;
    onChange({
      ...lokation,
      linjer: [...lokation.linjer, { productId: firstProduct.id, antal: 1 }]
    });
  };

  const handleLinjeChange = (index: number, updates: Partial<{ productId: string; antal: number }>) => {
    const newLinjer = [...lokation.linjer];
    newLinjer[index] = { ...newLinjer[index], ...updates };
    onChange({ ...lokation, linjer: newLinjer });
  };

  const handleDeleteLinje = (index: number) => {
    const newLinjer = lokation.linjer.filter((_, i) => i !== index);
    onChange({ ...lokation, linjer: newLinjer });
  };

  const handleCopyLinje = (index: number) => {
    const linjeToCopy = lokation.linjer[index];
    const newLinjer = [
      ...lokation.linjer.slice(0, index + 1),
      { ...linjeToCopy },
      ...lokation.linjer.slice(index + 1)
    ];
    onChange({ ...lokation, linjer: newLinjer });
  };

  return (
    <Card className="mb-4 overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center gap-3">
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="shrink-0" 
                data-testid="button-toggle-lokation"
              >
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </Button>
            </CollapsibleTrigger>
            
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <>
                  <input
                    list="rum-forslag"
                    value={lokation.navn}
                    onChange={e => handleNameChange(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={e => e.key === "Enter" && setIsEditingName(false)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    autoFocus
                    data-testid="input-lokation-navn"
                  />
                  <datalist id="rum-forslag">
                    {RUM_FORSLAG.map(navn => <option key={navn} value={navn} />)}
                  </datalist>
                </>
              ) : (
                <button
                  className="text-left w-full"
                  onClick={() => setIsEditingName(true)}
                  data-testid="text-lokation-navn"
                >
                  <span className="font-semibold text-base block truncate">
                    {lokation.navn || "Unavngivet lokation"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {lokation.linjer.length} {lokation.linjer.length === 1 ? "produkt" : "produkter"}
                  </span>
                </button>
              )}
            </div>
            
            <div className="text-right shrink-0">
              <span className="font-bold text-lg" data-testid="text-lokation-subtotal">
                {formatDKK(subtotal)}
              </span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="shrink-0"
                  data-testid="button-lokation-menu"
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  onClick={onMoveUp}
                  disabled={lokationIndex === 0}
                  data-testid="menu-move-up"
                >
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Flyt op
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={onMoveDown}
                  disabled={lokationIndex === totalLokationer - 1}
                  data-testid="menu-move-down"
                >
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Flyt ned
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                  data-testid="menu-delete-lokation"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Slet lokation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0 px-4 pb-4">
            {skabelon === "modul_overslag" && (
              <div className="mb-4">
                <textarea
                  value={lokation.beskrivelse || ""}
                  onChange={e => onChange({ ...lokation, beskrivelse: e.target.value })}
                  placeholder="Kort beskrivelse af modulet (vises i tilbudsdokumentet)..."
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground"
                />
              </div>
            )}
            {filterAktiv && (
              <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                <ListFilter className="w-3.5 h-3.5 shrink-0" />
                <span>Filtreret til: {kategoriFilter.join(", ")}</span>
                <button
                  type="button"
                  onClick={() => setVisAlle(v => !v)}
                  className="ml-auto underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  {visAlle ? "Vis filtreret" : "Vis alle kategorier"}
                </button>
              </div>
            )}
            <div className="space-y-3">
              {lokation.linjer.map((linje, index) => (
                <LinjeEditor
                  key={index}
                  productId={linje.productId}
                  antal={linje.antal}
                  products={visibleProducts}
                  onProductChange={productId => handleLinjeChange(index, { productId })}
                  onAntalChange={antal => handleLinjeChange(index, { antal })}
                  onDelete={() => handleDeleteLinje(index)}
                  onCopy={() => handleCopyLinje(index)}
                />
              ))}
              
              {lokation.linjer.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-4">Ingen produkter endnu</p>
                </div>
              )}
            </div>
            
            <Button
              variant="outline"
              onClick={handleAddLinje}
              className="mt-4 w-full h-12 text-base"
              data-testid="button-add-linje"
            >
              <Plus className="w-5 h-5 mr-2" />
              Tilføj produkt
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
