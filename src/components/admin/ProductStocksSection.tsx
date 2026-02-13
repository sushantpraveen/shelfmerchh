import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { ProductStocksData } from '@/types/product';
import { Separator } from '@/components/ui/separator';
import { HelpCircle } from 'lucide-react';

interface ProductStocksSectionProps {
  data: ProductStocksData;
  onChange: (data: ProductStocksData) => void;
}

export const ProductStocksSection = ({ data, onChange }: ProductStocksSectionProps) => {
  return (
    <div className="space-y-6">
      {/* Minimum Quantity Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="minimumQuantity">Minimum quantity for sale</Label>
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          id="minimumQuantity"
          type="number"
          min="1"
          placeholder="1"
          value={data.minimumQuantity || ''}
          onChange={(e) => onChange({
            ...data,
            minimumQuantity: parseInt(e.target.value) || 1,
          })}
        />
        <p className="text-xs text-muted-foreground">
          The minimum quantity customers must order for this product
        </p>
      </div>

      <Separator />

      {/* Stock Location Section */}
      <div className="space-y-2">
        <Label htmlFor="stockLocation">Stock location</Label>
        <Input
          id="stockLocation"
          type="text"
          placeholder="Enter stock location"
          value={data.stockLocation || ''}
          onChange={(e) => onChange({
            ...data,
            stockLocation: e.target.value,
          })}
        />
        <p className="text-xs text-muted-foreground">
          Warehouse or location where this product is stored
        </p>
      </div>

      <Separator />

      {/* Low Stock Alert Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="lowStockAlert">Receive a low stock alert by email</Label>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="lowStockAlert"
              checked={data.lowStockAlertEnabled || false}
              onCheckedChange={(checked) => onChange({
                ...data,
                lowStockAlertEnabled: checked,
              })}
            />
            <Label>{data.lowStockAlertEnabled ? 'Yes' : 'No'}</Label>
          </div>
        </div>

        {data.lowStockAlertEnabled && (
          <div className="space-y-4 pl-6 border-l-2 border-primary/20">
            <div className="space-y-2">
              <Label htmlFor="lowStockEmail">Email address</Label>
              <Input
                id="lowStockEmail"
                type="email"
                placeholder="alert@example.com"
                value={data.lowStockAlertEmail || ''}
                onChange={(e) => onChange({
                  ...data,
                  lowStockAlertEmail: e.target.value,
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lowStockThreshold">Low stock threshold</Label>
              <Input
                id="lowStockThreshold"
                type="number"
                min="1"
                placeholder="10"
                value={data.lowStockThreshold || ''}
                onChange={(e) => onChange({
                  ...data,
                  lowStockThreshold: parseInt(e.target.value) || 0,
                })}
              />
              <p className="text-xs text-muted-foreground">
                Alert will be sent when stock falls below this quantity
              </p>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* When Out of Stock Section */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">When out of stock</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Define the product's behavior when stock runs out
          </p>
        </div>

        <RadioGroup
          value={data.outOfStockBehavior || 'default'}
          onValueChange={(value: 'deny' | 'allow' | 'default') => onChange({
            ...data,
            outOfStockBehavior: value,
          })}
        >
          <div className="flex items-center space-x-2 space-y-1">
            <RadioGroupItem value="deny" id="deny-orders" />
            <Label htmlFor="deny-orders" className="font-normal cursor-pointer">
              Deny orders
            </Label>
          </div>
          <div className="flex items-center space-x-2 space-y-1">
            <RadioGroupItem value="allow" id="allow-orders" />
            <Label htmlFor="allow-orders" className="font-normal cursor-pointer">
              Allow orders
            </Label>
          </div>
          <div className="flex items-center space-x-2 space-y-1">
            <RadioGroupItem value="default" id="default-behavior" />
            <Label htmlFor="default-behavior" className="font-normal cursor-pointer">
              Use default behavior (Allow orders)
            </Label>
          </div>
        </RadioGroup>

        <div className="text-sm">
          <a href="#" className="text-primary hover:underline">Edit default behavior</a>
        </div>
      </div>

      {/* Current Stock (Optional) */}
      <Separator />

      <div className="space-y-2">
        <Label htmlFor="currentStock">Current stock quantity (optional)</Label>
        <Input
          id="currentStock"
          type="number"
          min="0"
          placeholder="0"
          value={data.currentStock || ''}
          onChange={(e) => onChange({
            ...data,
            currentStock: parseInt(e.target.value) || undefined,
          })}
        />
        <p className="text-xs text-muted-foreground">
          Current available quantity. This may be managed separately in inventory management.
        </p>
      </div>
    </div>
  );
};

