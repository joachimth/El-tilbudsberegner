import { Trash2, Copy, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductSelector } from "./product-selector";
import type { Product } from "@/lib/types";
import { formatDKK, beregnEnhedspris, beregnLinjepris } from "@shared/schema";

interface LinjeEditorProps {
  productId: string;
  antal: number;
  products: Product[];
  onProductChange: (productId: string) => void;
  onAntalChange: (antal: number) => void;
  onDelete: () => void;
  onCopy: () => void;
  onEnterPress?: () => void;
}

export function LinjeEditor({
  productId,
  antal,
  products,
  onProductChange,
  onAntalChange,
  onDelete,
  onCopy,
}: LinjeEditorProps) {
  const product = products.find(p => p.id === productId);
  const enhedspris = product ? beregnEnhedspris(product, antal) : 0;
  const linjepris = product ? beregnLinjepris(product, antal) : 0;

  const handleDecrement = () => {
    if (antal > 1) {
      onAntalChange(antal - 1);
    }
  };

  const handleIncrement = () => {
    onAntalChange(antal + 1);
  };

  return (
    <div className="p-4 bg-muted/50 rounded-xl space-y-3">
      {/* Product selector - full width */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <ProductSelector
            products={products}
            value={productId}
            onSelect={onProductChange}
          />
        </div>
        
        {/* Action buttons - always visible on mobile */}
        <div className="flex gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCopy}
            title="Kopiér linje"
            data-testid="button-copy-linje"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
            title="Slet linje"
            data-testid="button-delete-linje"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Quantity and price row */}
      <div className="flex items-center gap-3">
        {/* Quantity stepper */}
        <div className="flex items-center gap-1 bg-background rounded-lg border p-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDecrement}
            disabled={antal <= 1}
            data-testid="button-decrement"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <div className="w-12 text-center">
            <span className="text-lg font-semibold" data-testid="text-antal">{antal}</span>
            {product && (
              <span className="text-xs text-muted-foreground block">{product.enhed}</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleIncrement}
            data-testid="button-increment"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Price info — stacked to avoid clipping on narrow screens */}
        <div className="flex-1 flex justify-end">
          <div className="text-right">
            <div className="text-lg font-semibold whitespace-nowrap" data-testid="text-linjepris">
              {formatDKK(linjepris)}
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap" data-testid="text-enhedspris">
              {formatDKK(enhedspris)}/{product?.enhed || "stk"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
