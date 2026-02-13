import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProductOptionsData } from '@/types/product';
import { Separator } from '@/components/ui/separator';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';

interface ProductOptionsSectionProps {
  data: ProductOptionsData;
  onChange: (data: ProductOptionsData) => void;
}

export const ProductOptionsSection = ({ data, onChange }: ProductOptionsSectionProps) => {
  const [supplierInput, setSupplierInput] = useState('');

  const handleAddSupplier = () => {
    if (supplierInput.trim() && !data.suppliers?.includes(supplierInput.trim())) {
      onChange({
        ...data,
        suppliers: [...(data.suppliers || []), supplierInput.trim()],
      });
      setSupplierInput('');
    }
  };

  const handleRemoveSupplier = (supplier: string) => {
    onChange({
      ...data,
      suppliers: data.suppliers?.filter(s => s !== supplier) || [],
    });
  };

  return (
    <div className="space-y-6">
      {/* Visibility Section */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">Visibility</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Where do you want your product to appear?
          </p>
        </div>

        <RadioGroup
          value={data.visibility || 'everywhere'}
          onValueChange={(value: 'everywhere' | 'catalog' | 'search' | 'nowhere') => onChange({
            ...data,
            visibility: value,
          })}
        >
          <div className="flex items-center space-x-2 space-y-1">
            <RadioGroupItem value="everywhere" id="everywhere" />
            <Label htmlFor="everywhere" className="font-normal cursor-pointer">
              Everywhere
            </Label>
          </div>
          <p className="text-xs text-muted-foreground ml-6">
            Customers can access the product by browsing the catalog, using the search bar, or the link.
          </p>

          <div className="flex items-center space-x-2 space-y-1 mt-2">
            <RadioGroupItem value="catalog" id="catalog-only" />
            <Label htmlFor="catalog-only" className="font-normal cursor-pointer">
              Catalog only
            </Label>
          </div>

          <div className="flex items-center space-x-2 space-y-1 mt-2">
            <RadioGroupItem value="search" id="search-only" />
            <Label htmlFor="search-only" className="font-normal cursor-pointer">
              Search only
            </Label>
          </div>

          <div className="flex items-center space-x-2 space-y-1 mt-2">
            <RadioGroupItem value="nowhere" id="nowhere" />
            <Label htmlFor="nowhere" className="font-normal cursor-pointer">
              Nowhere
            </Label>
          </div>
        </RadioGroup>
      </div>

      <Separator />

      {/* Available for Order Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="availableForOrder" className="text-base font-semibold">
              Available for order
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Allow customers to purchase this product
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="availableForOrder"
              checked={data.availableForOrder !== false}
              onCheckedChange={(checked) => onChange({
                ...data,
                availableForOrder: checked,
              })}
            />
            <Label>{data.availableForOrder !== false ? 'Yes' : 'No'}</Label>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="applyOrderAllStores"
            defaultChecked={false}
          />
          <Label htmlFor="applyOrderAllStores" className="font-normal text-sm">
            Apply changes to all stores
          </Label>
        </div>
      </div>

      <Separator />

      {/* Show Price Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="showPrice" className="text-base font-semibold">
              Show price
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Display price to customers on the product page
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="showPrice"
              checked={data.showPrice || false}
              onCheckedChange={(checked) => onChange({
                ...data,
                showPrice: checked,
              })}
            />
            <Label>{data.showPrice ? 'Yes' : 'No'}</Label>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="applyPriceAllStores"
            defaultChecked={false}
          />
          <Label htmlFor="applyPriceAllStores" className="font-normal text-sm">
            Apply changes to all stores
          </Label>
        </div>
      </div>

      <Separator />

      {/* Web Only Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="webOnly" className="text-base font-semibold">
              Web only (not sold in your retail store)
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              This product is only available online, not in physical retail locations
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="webOnly"
              checked={data.webOnly || false}
              onCheckedChange={(checked) => onChange({
                ...data,
                webOnly: checked,
              })}
            />
            <Label>{data.webOnly ? 'Yes' : 'No'}</Label>
          </div>
        </div>
      </div>

      <Separator />

      {/* Suppliers Section */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">Suppliers</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Choose the suppliers associated with this product
          </p>
        </div>

        {/* Supplier Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter supplier name"
            value={supplierInput}
            onChange={(e) => setSupplierInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddSupplier()}
          />
          <Button
            type="button"
            onClick={handleAddSupplier}
            variant="secondary"
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {/* Supplier List */}
        {data.suppliers && data.suppliers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.suppliers.map((supplier) => (
              <Badge key={supplier} variant="secondary" className="gap-1">
                {supplier}
                <button
                  onClick={() => handleRemoveSupplier(supplier)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

