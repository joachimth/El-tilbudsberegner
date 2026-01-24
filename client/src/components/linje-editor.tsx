import { Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  onEnterPress,
}: LinjeEditorProps) {
  const product = products.find(p => p.id === productId);
  const enhedspris = product ? beregnEnhedspris(product, antal) : 0;
  const linjepris = product ? beregnLinjepris(product, antal) : 0;

  const handleAntalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      onAntalChange(value);
    } else if (e.target.value === "") {
      onAntalChange(1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onEnterPress) {
      e.preventDefault();
      onEnterPress();
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-card rounded-md border border-card-border group">
      <div className="flex-1 min-w-0">
        <ProductSelector
          products={products}
          value={productId}
          onSelect={onProductChange}
        />
      </div>
      
      <div className="w-20 shrink-0">
        <Input
          type="number"
          min={1}
          value={antal}
          onChange={handleAntalChange}
          onKeyDown={handleKeyDown}
          className="text-center"
          data-testid="input-antal"
        />
        {product && (
          <span className="text-xs text-muted-foreground block text-center mt-1">
            {product.enhed}
          </span>
        )}
      </div>
      
      <div className="w-24 shrink-0 text-right">
        <div className="text-sm font-medium" data-testid="text-enhedspris">
          {formatDKK(enhedspris)}
        </div>
        <span className="text-xs text-muted-foreground">pr. enhed</span>
      </div>
      
      <div className="w-28 shrink-0 text-right">
        <div className="font-semibold" data-testid="text-linjepris">
          {formatDKK(linjepris)}
        </div>
        <span className="text-xs text-muted-foreground">i alt</span>
      </div>
      
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
  );
}
