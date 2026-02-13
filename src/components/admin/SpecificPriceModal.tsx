import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { SpecificPrice } from '@/types/product';
import { X, Calendar } from 'lucide-react';

interface SpecificPriceModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (specificPrice: SpecificPrice) => void;
  specificPrice?: SpecificPrice | null; // For editing existing price
  taxRate?: number; // For calculating tax-inclusive prices
}

// Mock data - can be replaced with API calls later
const CURRENCIES = ['All currencies', 'INR', 'USD', 'EUR', 'GBP'];
const COUNTRIES = ['All countries', 'IN', 'US', 'UK', 'CA'];
const GROUPS = ['All groups', 'Guest', 'Customer', 'VIP', 'Wholesale'];
const STORES = ['All stores', 'Main Store', 'Store 2'];
const COMBINATIONS = ['All combinations']; // Can be expanded with actual variants later

export const SpecificPriceModal = ({ 
  open, 
  onClose, 
  onSave, 
  specificPrice = null,
  taxRate = 0 
}: SpecificPriceModalProps) => {
  const [formData, setFormData] = useState<SpecificPrice>({
    id: specificPrice?.id || `sp_${Date.now()}`,
    combination: specificPrice?.combination || 'All combinations',
    currency: specificPrice?.currency || 'All currencies',
    country: specificPrice?.country || 'All countries',
    group: specificPrice?.group || 'All groups',
    store: specificPrice?.store || 'All stores',
    customer: specificPrice?.customer || '',
    applyToAllCustomers: specificPrice?.applyToAllCustomers ?? true,
    minQuantity: specificPrice?.minQuantity || 1,
    startDate: specificPrice?.startDate || '',
    endDate: specificPrice?.endDate || '',
    isUnlimited: specificPrice?.isUnlimited ?? false,
    useDiscount: specificPrice?.useDiscount ?? false,
    discountValue: specificPrice?.discountValue || 0,
    discountType: specificPrice?.discountType || 'percentage',
    discountTaxMode: specificPrice?.discountTaxMode || 'tax_excluded',
    useSpecificPrice: specificPrice?.useSpecificPrice ?? false,
    specificPriceTaxExcl: specificPrice?.specificPriceTaxExcl || 0,
  });

  useEffect(() => {
    if (specificPrice) {
      setFormData(specificPrice);
    } else {
      // Reset form for new entry
      setFormData({
        id: `sp_${Date.now()}`,
        combination: 'All combinations',
        currency: 'All currencies',
        country: 'All countries',
        group: 'All groups',
        store: 'All stores',
        customer: '',
        applyToAllCustomers: true,
        minQuantity: 1,
        startDate: '',
        endDate: '',
        isUnlimited: false,
        useDiscount: false,
        discountValue: 0,
        discountType: 'percentage',
        discountTaxMode: 'tax_excluded',
        useSpecificPrice: false,
        specificPriceTaxExcl: 0,
      });
    }
  }, [specificPrice, open]);

  const handleSave = () => {
    // Validate that at least one impact method is selected
    if (!formData.useDiscount && !formData.useSpecificPrice) {
      alert('Please select at least one impact on price: discount or specific price');
      return;
    }

    // Calculate tax-inclusive values
    const updatedPrice: SpecificPrice = {
      ...formData,
      specificPriceTaxIncl: formData.specificPriceTaxExcl && formData.specificPriceTaxExcl > 0
        ? formData.specificPriceTaxExcl * (1 + (taxRate || 0) / 100)
        : undefined,
      discountTaxIncl: formData.useDiscount && formData.discountValue && formData.discountValue > 0
        ? (formData.discountType === 'amount' 
            ? formData.discountValue * (1 + (taxRate || 0) / 100)
            : formData.discountValue)
        : undefined,
    };

    onSave(updatedPrice);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {specificPrice ? 'Edit specific price' : 'Add a specific price'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Apply to Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Apply to</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr} value={curr}>
                        {curr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger id="country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="group">Group</Label>
                <Select
                  value={formData.group}
                  onValueChange={(value) => setFormData({ ...formData, group: value })}
                >
                  <SelectTrigger id="group">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUPS.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="store">Store</Label>
                <Select
                  value={formData.store}
                  onValueChange={(value) => setFormData({ ...formData, store: value })}
                >
                  <SelectTrigger id="store">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STORES.map((store) => (
                      <SelectItem key={store} value={store}>
                        {store}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.applyToAllCustomers}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, applyToAllCustomers: checked, customer: '' })
                  }
                />
                <Label>Apply to all customers</Label>
              </div>
              
              {!formData.applyToAllCustomers && (
                <div className="space-y-2">
                  <Label htmlFor="customer">Search customer</Label>
                  <Input
                    id="customer"
                    placeholder="Search for customer email or ID"
                    value={formData.customer || ''}
                    onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="combination">Combination</Label>
              <Select
                value={formData.combination || 'All combinations'}
                onValueChange={(value) => setFormData({ ...formData, combination: value })}
              >
                <SelectTrigger id="combination">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMBINATIONS.map((comb) => (
                    <SelectItem key={comb} value={comb}>
                      {comb}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Minimum Units */}
          <div className="space-y-2">
            <Label htmlFor="minQuantity">Units (minimum number of units purchased)</Label>
            <Input
              id="minQuantity"
              type="number"
              min="1"
              value={formData.minQuantity || 1}
              onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 1 })}
            />
          </div>

          <Separator />

          {/* Duration Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Duration</h3>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isUnlimited}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, isUnlimited: checked, startDate: '', endDate: '' })
                }
              />
              <Label>Unlimited</Label>
            </div>

            {!formData.isUnlimited && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate || ''}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate || ''}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.startDate || undefined}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Impact on Price Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Impact on price</h3>
            
            {/* Apply Discount Toggle */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.useDiscount}
                  onCheckedChange={(checked) => setFormData({ ...formData, useDiscount: checked })}
                />
                <Label>Apply a discount to the initial price</Label>
              </div>

              {formData.useDiscount && (
                <div className="grid grid-cols-3 gap-4 ml-8">
                  <div className="space-y-2">
                    <Label htmlFor="discountValue">Discount value</Label>
                    <Input
                      id="discountValue"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.discountValue || ''}
                      onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discountType">Discount type</Label>
                    <Select
                      value={formData.discountType || 'percentage'}
                      onValueChange={(value: 'amount' | 'percentage') => 
                        setFormData({ ...formData, discountType: value })
                      }
                    >
                      <SelectTrigger id="discountType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amount">Amount</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discountTaxMode">Tax mode</Label>
                    <Select
                      value={formData.discountTaxMode || 'tax_excluded'}
                      onValueChange={(value: 'tax_included' | 'tax_excluded') => 
                        setFormData({ ...formData, discountTaxMode: value })
                      }
                    >
                      <SelectTrigger id="discountTaxMode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tax_excluded">Tax excluded</SelectItem>
                        <SelectItem value="tax_included">Tax included</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Set Specific Price Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.useSpecificPrice}
                  onCheckedChange={(checked) => setFormData({ ...formData, useSpecificPrice: checked })}
                />
                <Label>Set specific price</Label>
              </div>

              {formData.useSpecificPrice && (
                <div className="space-y-2 ml-8">
                  <Label htmlFor="specificPriceTaxExcl">Retail price (tax excl.)</Label>
                  <Input
                    id="specificPriceTaxExcl"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.specificPriceTaxExcl || ''}
                    onChange={(e) => setFormData({ ...formData, specificPriceTaxExcl: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save and publish
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
