import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ProductDetailsData } from '@/types/product';

interface ProductDetailsSectionProps {
  data: ProductDetailsData;
  onChange: (data: ProductDetailsData) => void;
}

export const ProductDetailsSection = ({ data, onChange }: ProductDetailsSectionProps) => {
  return (
    <div className="space-y-6">
      {/* MPN */}
      <div className="space-y-2">
        <Label htmlFor="mpn">MPN (Manufacturer Part Number)</Label>
        <Input
          id="mpn"
          type="text"
          placeholder="Enter MPN"
          value={data.mpn || ''}
          onChange={(e) => onChange({ ...data, mpn: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Manufacturer Part Number helps identify the product
        </p>
      </div>

      {/* UPC Barcode */}
      <div className="space-y-2">
        <Label htmlFor="upc">UPC Barcode</Label>
        <Input
          id="upc"
          type="text"
          placeholder="Enter UPC barcode"
          value={data.upc || ''}
          onChange={(e) => onChange({ ...data, upc: e.target.value })}
          maxLength={12}
        />
        <p className="text-xs text-muted-foreground">
          Universal Product Code (12 digits)
        </p>
      </div>

      {/* EAN-13 or JAN Barcode */}
      <div className="space-y-2">
        <Label htmlFor="ean13">EAN-13 or JAN Barcode</Label>
        <Input
          id="ean13"
          type="text"
          placeholder="Enter EAN-13 or JAN barcode"
          value={data.ean13 || ''}
          onChange={(e) => onChange({ ...data, ean13: e.target.value })}
          maxLength={13}
        />
        <p className="text-xs text-muted-foreground">
          European Article Number or Japanese Article Number (13 digits)
        </p>
      </div>

      {/* ISBN */}
      <div className="space-y-2">
        <Label htmlFor="isbn">ISBN</Label>
        <Input
          id="isbn"
          type="text"
          placeholder="Enter ISBN"
          value={data.isbn || ''}
          onChange={(e) => onChange({ ...data, isbn: e.target.value })}
          maxLength={17}
        />
        <p className="text-xs text-muted-foreground">
          International Standard Book Number (for books only)
        </p>
      </div>
    </div>
  );
};

