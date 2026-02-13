import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Info, HelpCircle } from 'lucide-react';
import { ProductShippingData } from '@/types/product';

interface ShippingPackagingSectionProps {
  data: ProductShippingData;
  onChange: (data: ProductShippingData) => void;
}

export const ShippingPackagingSection = ({ data, onChange }: ShippingPackagingSectionProps) => {
  return (
    <div className="space-y-6">
      {/* Package Dimensions */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">Package dimension</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Charge additional shipping costs based on packet dimensions covered here.
          </p>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="packageWidth">Width</Label>
            <div className="flex items-center gap-2">
              <Input
                id="packageWidth"
                type="number"
                placeholder="0"
                value={data.packageWidthCm || ''}
                onChange={(e) => onChange({ ...data, packageWidthCm: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.1"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">cm</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="packageHeight">Height</Label>
            <div className="flex items-center gap-2">
              <Input
                id="packageHeight"
                type="number"
                placeholder="0"
                value={data.packageHeightCm || ''}
                onChange={(e) => onChange({ ...data, packageHeightCm: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.1"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">cm</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="packageDepth">Depth</Label>
            <div className="flex items-center gap-2">
              <Input
                id="packageDepth"
                type="number"
                placeholder="0"
                value={data.packageLengthCm || ''}
                onChange={(e) => onChange({ ...data, packageLengthCm: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.1"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">cm</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="packageWeight">Weight</Label>
            <div className="flex items-center gap-2">
              <Input
                id="packageWeight"
                type="number"
                placeholder="0"
                value={data.packageWeightGrams ? (data.packageWeightGrams / 1000).toFixed(1) : ''}
                onChange={(e) => {
                  const kgValue = parseFloat(e.target.value) || 0;
                  onChange({ ...data, packageWeightGrams: kgValue * 1000 });
                }}
                min="0"
                step="0.1"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">Kg</span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Delivery Time */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-base font-semibold">Delivery time</Label>
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <RadioGroup
          value={data.deliveryTimeOption || 'specific'}
          onValueChange={(value) => onChange({ ...data, deliveryTimeOption: value as 'none' | 'default' | 'specific' })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id="delivery-none" />
            <Label htmlFor="delivery-none" className="font-normal cursor-pointer">None</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="default" id="delivery-default" />
            <Label htmlFor="delivery-default" className="font-normal cursor-pointer">
              Default delivery time: N/A - N/A Edit delivery time
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="specific" id="delivery-specific" />
            <Label htmlFor="delivery-specific" className="font-normal cursor-pointer">
              Specific delivery time to this product
            </Label>
          </div>
        </RadioGroup>

        {data.deliveryTimeOption === 'specific' && (
          <div className="space-y-4 ml-6 mt-4">
            <div className="space-y-2">
              <Label htmlFor="inStockDelivery">Delivery time of in-stock products:</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="inStockDelivery"
                  placeholder="e.g., Delivered within 3-4 days"
                  value={data.inStockDeliveryTime || ''}
                  onChange={(e) => onChange({ ...data, inStockDeliveryTime: e.target.value })}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">en</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="outOfStockDelivery">Delivery time of out-of-stock products with allowed orders:</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="outOfStockDelivery"
                  placeholder="e.g., Delivered within 5-7 days"
                  value={data.outOfStockDeliveryTime || ''}
                  onChange={(e) => onChange({ ...data, outOfStockDeliveryTime: e.target.value })}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">en</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Shipping Fees */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-base font-semibold">Shipping fees</Label>
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <Label className="text-sm text-muted-foreground">Additional shipping costs</Label>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm">₹</span>
            <Input
              type="number"
              placeholder="0.000000"
              value={data.additionalShippingCost || ''}
              onChange={(e) => onChange({ ...data, additionalShippingCost: parseFloat(e.target.value) || 0 })}
              min="0"
              step="0.01"
              className="max-w-xs"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Available Carriers */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Available carriers</Label>
        
        <div className="flex gap-2">
          <Button
            type="button"
            variant={data.carrierSelection === 'selected' ? 'default' : 'outline'}
            onClick={() => onChange({ ...data, carrierSelection: 'selected' })}
            size="sm"
          >
            Only selected carriers ({data.selectedCarriers?.length || 0})
          </Button>
          <Button
            type="button"
            variant={data.carrierSelection === 'all' ? 'default' : 'outline'}
            onClick={() => onChange({ ...data, carrierSelection: 'all' })}
            size="sm"
          >
            All carriers
          </Button>
        </div>

        {data.carrierSelection === 'selected' && (
          <div className="space-y-2">
            <Label className="text-sm">Select carriers:</Label>
            <div className="space-y-2">
              {['Standard Shipping (3 - 7 business days)', 'Express Shipping (1 - 2 business days)', 'Overnight Shipping'].map((carrier) => (
                <div key={carrier} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`carrier-${carrier}`}
                    checked={data.selectedCarriers?.includes(carrier) || false}
                    onChange={(e) => {
                      const current = data.selectedCarriers || [];
                      if (e.target.checked) {
                        onChange({ ...data, selectedCarriers: [...current, carrier] });
                      } else {
                        onChange({ ...data, selectedCarriers: current.filter(c => c !== carrier) });
                      }
                    }}
                    className="rounded"
                  />
                  <Label htmlFor={`carrier-${carrier}`} className="font-normal cursor-pointer text-sm">
                    {carrier}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

