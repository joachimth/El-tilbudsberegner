import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, GripVertical, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LinjeEditor } from "./linje-editor";
import type { Lokation, Product } from "@/lib/types";
import { formatDKK, beregnLinjepris } from "@shared/schema";

interface LokationEditorProps {
  lokation: Lokation;
  products: Product[];
  lokationIndex: number;
  totalLokationer: number;
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
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: LokationEditorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);

  const subtotal = lokation.linjer.reduce((sum, linje) => {
    const product = products.find(p => p.id === linje.productId);
    return sum + (product ? beregnLinjepris(product, linje.antal) : 0);
  }, 0);

  const handleNameChange = (navn: string) => {
    onChange({ ...lokation, navn });
  };

  const handleAddLinje = () => {
    const firstProduct = products[0];
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
    <Card className="mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={onMoveUp}
                disabled={lokationIndex === 0}
                className="h-8 w-8"
                title="Flyt op"
                data-testid="button-move-up"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onMoveDown}
                disabled={lokationIndex === totalLokationer - 1}
                className="h-8 w-8"
                title="Flyt ned"
                data-testid="button-move-down"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
            
            <MapPin className="w-4 h-4 text-muted-foreground" />
            
            {isEditingName ? (
              <Input
                value={lokation.navn}
                onChange={e => handleNameChange(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={e => e.key === "Enter" && setIsEditingName(false)}
                className="w-48 h-8"
                autoFocus
                data-testid="input-lokation-navn"
              />
            ) : (
              <CardTitle
                className="text-base cursor-pointer hover:text-primary transition-colors"
                onClick={() => setIsEditingName(true)}
                data-testid="text-lokation-navn"
              >
                {lokation.navn || "Unavngivet lokation"}
              </CardTitle>
            )}
            
            <span className="text-sm text-muted-foreground">
              ({lokation.linjer.length} {lokation.linjer.length === 1 ? "linje" : "linjer"})
            </span>
            
            <div className="flex-1" />
            
            <span className="font-semibold text-sm" data-testid="text-lokation-subtotal">
              {formatDKK(subtotal)}
            </span>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="text-destructive hover:text-destructive h-8 w-8"
              title="Slet lokation"
              data-testid="button-delete-lokation"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-toggle-lokation">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="space-y-2">
              {lokation.linjer.map((linje, index) => (
                <LinjeEditor
                  key={index}
                  productId={linje.productId}
                  antal={linje.antal}
                  products={products}
                  onProductChange={productId => handleLinjeChange(index, { productId })}
                  onAntalChange={antal => handleLinjeChange(index, { antal })}
                  onDelete={() => handleDeleteLinje(index)}
                  onCopy={() => handleCopyLinje(index)}
                  onEnterPress={handleAddLinje}
                />
              ))}
              
              {lokation.linjer.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Ingen linjer endnu. Tilføj den første linje nedenfor.
                </div>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddLinje}
              className="mt-4 w-full"
              data-testid="button-add-linje"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tilføj linje
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
