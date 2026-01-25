import { useState, useMemo } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Product } from "@/lib/types";
import { formatDKK } from "@shared/schema";

interface ProductSelectorProps {
  products: Product[];
  value: string | null;
  onSelect: (productId: string) => void;
  disabled?: boolean;
}

export function ProductSelector({ products, value, onSelect, disabled }: ProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedProduct = useMemo(
    () => products.find(p => p.id === value),
    [products, value]
  );

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, Product[]>();
    products.forEach(product => {
      const existing = groups.get(product.kategori) || [];
      groups.set(product.kategori, [...existing, product]);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0], 'da'));
  }, [products]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groupedProducts;
    
    const searchLower = search.toLowerCase();
    return groupedProducts
      .map(([kategori, prods]) => {
        const filtered = prods.filter(p => 
          p.navn.toLowerCase().includes(searchLower) ||
          p.kategori.toLowerCase().includes(searchLower) ||
          p.id.toLowerCase().includes(searchLower)
        );
        return [kategori, filtered] as [string, Product[]];
      })
      .filter(([, prods]) => prods.length > 0);
  }, [groupedProducts, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between text-left font-normal h-auto min-h-12 py-2 px-3"
          data-testid="button-product-selector"
        >
          {selectedProduct ? (
            <div className="flex flex-col items-start gap-0.5 overflow-hidden">
              <span className="truncate font-medium">{selectedProduct.navn}</span>
              <span className="text-xs text-muted-foreground">
                {formatDKK(selectedProduct.pris_1)} (1 stk) / {formatDKK(selectedProduct.pris_2plus)} (2+ stk)
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">Vælg produkt...</span>
          )}
          <ChevronDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(400px,calc(100vw-32px))] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Søg efter produkt..."
            value={search}
            onValueChange={setSearch}
            className="h-12"
            data-testid="input-product-search"
          />
          <CommandList className="max-h-[50vh]">
            <CommandEmpty>Ingen produkter fundet.</CommandEmpty>
            {filteredGroups.map(([kategori, prods]) => (
              <CommandGroup key={kategori} heading={kategori}>
                {prods.map(product => (
                  <CommandItem
                    key={product.id}
                    value={product.id}
                    onSelect={() => {
                      onSelect(product.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="flex items-start gap-3 py-3 px-3 min-h-[56px]"
                    data-testid={`product-option-${product.id}`}
                  >
                    <Check
                      className={cn(
                        "h-5 w-5 mt-0.5 shrink-0",
                        value === product.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-medium">{product.navn}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatDKK(product.pris_1)} / {formatDKK(product.pris_2plus)} (2+)
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
