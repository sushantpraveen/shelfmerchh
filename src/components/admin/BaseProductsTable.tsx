import { Link, useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Package, Eye, Images, Layers } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { CountChip } from './CountChip';
import { ActionsMenu } from './ActionsMenu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/utils/formatPrice';

interface BaseProduct {
  _id?: string;
  id?: string;
  catalogue?: {
    name: string;
    description?: string;
    basePrice?: number;
  };
  galleryImages?: Array<{ url: string; isPrimary?: boolean }>;
  design?: {
    views?: Array<{ mockupImageUrl?: string }>;
  };
  variants?: Array<any>;
  isActive?: boolean;
  createdAt?: string;
}

interface BaseProductsTableProps {
  products: BaseProduct[];
  isLoading?: boolean;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const BaseProductsTable = ({
  products,
  isLoading = false,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}: BaseProductsTableProps) => {
  const navigate = useNavigate();
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getProductId = (product: BaseProduct) => product._id || product.id || '';

  const getProductName = (product: BaseProduct) => 
    product.catalogue?.name || 'Unnamed Product';

  const getProductDescription = (product: BaseProduct) => 
    product.catalogue?.description || '';

  const getThumbnailUrl = (product: BaseProduct) => {
    const primaryImage = product.galleryImages?.find(img => img.isPrimary);
    return primaryImage?.url || product.galleryImages?.[0]?.url || '';
  };

  const getStatus = (product: BaseProduct): 'active' | 'draft' | 'archived' | 'inactive' => {
    if (!product.isActive) return 'inactive';
    // For now, assume all active products are 'active'
    // You can add a status field to the product model later
    return 'active';
  };

  const getVariantCount = (product: BaseProduct) => 
    product.variants?.length || 0;

  const getViewsCount = (product: BaseProduct) => 
    product.design?.views?.filter(v => v.mockupImageUrl).length || 0;

  const getGalleryImageCount = (product: BaseProduct) => 
    product.galleryImages?.length || 0;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b">
            <Skeleton className="h-12 w-12 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="rounded-full bg-muted p-3 mb-4">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No base products yet</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
          Create your first base product to let merchants add it to their stores.
        </p>
        <Button asChild>
          <Link to="/admin/products/new">Add Base Product</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
            <TableHead className="h-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Product
            </TableHead>
            <TableHead className="h-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
              Base Price
            </TableHead>
            <TableHead className="h-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Variants
            </TableHead>
            <TableHead className="h-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Views
            </TableHead>
            <TableHead className="h-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Gallery Images
            </TableHead>
            <TableHead className="h-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="h-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Created
            </TableHead>
            <TableHead className="h-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const productId = getProductId(product);
            const thumbnailUrl = getThumbnailUrl(product);
            const productName = getProductName(product);
            // const description = getProductDescription(product);

            return (
              <TableRow
                key={productId}
                className="hover:bg-gray-50/50 border-b border-gray-100 cursor-pointer"
                onClick={(e) => {
                  // Don't navigate if clicking on the actions menu or its buttons
                  const target = e.target as HTMLElement;
                  if (target.closest('[role="menu"]') || target.closest('button') || target.closest('a')) {
                    return;
                  }
                  navigate(`/admin/products/${productId}/edit`);
                }}
              >
                {/* Product Column */}
                <TableCell className="py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={productName}
                        className="h-12 w-12 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{productName}</div>
                      {/* {description && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {description}
                        </div>
                      )} */}
                    </div>
                  </div>
                </TableCell>

                {/* Base Price */}
                <TableCell className="py-3 text-right">
                  <span className="font-medium text-sm">
                    {formatPrice(product.catalogue?.basePrice)}
                  </span>
                </TableCell>

                {/* Variants */}
                <TableCell className="py-3">
                  <CountChip
                    count={getVariantCount(product)}
                    label="variant"
                    icon={Layers}
                  />
                </TableCell>

                {/* Views */}
                <TableCell className="py-3">
                  <CountChip
                    count={getViewsCount(product)}
                    label="view"
                    icon={Eye}
                  />
                </TableCell>

                {/* Gallery Images */}
                <TableCell className="py-3">
                  <CountChip
                    count={getGalleryImageCount(product)}
                    label="image"
                    icon={Images}
                  />
                </TableCell>

                {/* Status */}
                <TableCell className="py-3">
                  <StatusBadge status={getStatus(product)} />
                </TableCell>

                {/* Created */}
                <TableCell className="py-3">
                  <span className="text-sm text-muted-foreground" title={product.createdAt}>
                    {formatDate(product.createdAt)}
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell className="py-3 text-right">
                  <ActionsMenu
                    productId={productId}
                    isActive={product.isActive !== false}
                    onEdit={onEdit}
                    onDuplicate={onDuplicate}
                    onArchive={onArchive}
                    onDelete={onDelete}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};


