import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { X } from 'lucide-react';
import { Info } from 'lucide-react';

interface ProductFormProps {
  productName: string;
  description: string;
  category: string;
  subcategories: string[];
  price: string;
  tags: string[];
  tagInput: string;
  sku: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  stock: string;
  status: string;
  brand: string;
  material: string;
  careInstructions: string;
  shippingClass: string;
  taxStatus: string;
  metaTitle: string;
  metaDescription: string;
  isActive: boolean;
  onProductNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSubcategoriesChange: (value: string[]) => void;
  onPriceChange: (value: string) => void;
  onTagsChange: (value: string[]) => void;
  onTagInputChange: (value: string) => void;
  onSkuChange: (value: string) => void;
  onWeightChange: (value: string) => void;
  onLengthChange: (value: string) => void;
  onWidthChange: (value: string) => void;
  onHeightChange: (value: string) => void;
  onStockChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onMaterialChange: (value: string) => void;
  onCareInstructionsChange: (value: string) => void;
  onShippingClassChange: (value: string) => void;
  onTaxStatusChange: (value: string) => void;
  onMetaTitleChange: (value: string) => void;
  onMetaDescriptionChange: (value: string) => void;
  onIsActiveChange: (value: boolean) => void;
}

const subcategoryOptions = [
  'T-Shirts', 'Hoodies', 'Sweatshirts', 'Tank Tops', 'Long Sleeves',
  'Mugs', 'Phone Cases', 'Tote Bags', 'Posters', 'Stickers'
];

const commonTags = ['Cotton', 'Polyester', 'Unisex', 'Eco-Friendly', 'Limited Edition'];

export const ProductForm = ({
  productName,
  description,
  category,
  subcategories,
  price,
  tags,
  tagInput,
  sku,
  weight,
  length,
  width,
  height,
  stock,
  status,
  brand,
  material,
  careInstructions,
  shippingClass,
  taxStatus,
  metaTitle,
  metaDescription,
  isActive,
  onProductNameChange,
  onDescriptionChange,
  onCategoryChange,
  onSubcategoriesChange,
  onPriceChange,
  onTagsChange,
  onTagInputChange,
  onSkuChange,
  onWeightChange,
  onLengthChange,
  onWidthChange,
  onHeightChange,
  onStockChange,
  onStatusChange,
  onBrandChange,
  onMaterialChange,
  onCareInstructionsChange,
  onShippingClassChange,
  onTaxStatusChange,
  onMetaTitleChange,
  onMetaDescriptionChange,
  onIsActiveChange,
}: ProductFormProps) => {
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      onTagsChange([...tags, tagInput.trim()]);
      onTagInputChange('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    onTagsChange(tags.filter(t => t !== tag));
  };

  const handleAddSubcategory = (value: string) => {
    if (!subcategories.includes(value)) {
      onSubcategoriesChange([...subcategories, value]);
    }
  };

  const handleRemoveSubcategory = (sub: string) => {
    onSubcategoriesChange(subcategories.filter(s => s !== sub));
  };

  const handleAddCommonTag = (tag: string) => {
    if (!tags.includes(tag)) {
      onTagsChange([...tags, tag]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Product Name */}
      <div className="space-y-2">
        <Label htmlFor="productName">Product Name</Label>
        <Input
          id="productName"
          placeholder="Enter product name"
          value={productName}
          onChange={(e) => onProductNameChange(e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Enter product description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={4}
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apparel">Apparel</SelectItem>
            <SelectItem value="accessories">Accessories</SelectItem>
            <SelectItem value="home">Home & Living</SelectItem>
            <SelectItem value="art">Art Prints</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Subcategories */}
      <div className="space-y-2">
        <Label>Subcategories</Label>
        <Select
          value=""
          onValueChange={handleAddSubcategory}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select subcategories" />
          </SelectTrigger>
          <SelectContent>
            {subcategoryOptions.map((sub) => (
              <SelectItem key={sub} value={sub}>
                {sub}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {subcategories.map((sub) => (
              <Badge key={sub} variant="secondary" className="gap-1">
                {sub}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleRemoveSubcategory(sub)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Price */}
      <div className="space-y-2">
        <Label htmlFor="price">Price ($)</Label>
        <Input
          id="price"
          type="number"
          placeholder="0.00"
          value={price}
          onChange={(e) => onPriceChange(e.target.value)}
          min="0"
          step="0.01"
        />
      </div>

      {/* SKU */}
      <div className="space-y-2">
        <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
        <Input
          id="sku"
          placeholder="e.g., PROD-001"
          value={sku}
          onChange={(e) => onSkuChange(e.target.value)}
        />
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active Toggle */}
      <div className="flex items-center justify-between space-x-2">
        <div className="space-y-0.5">
          <Label htmlFor="isActive">Product Active</Label>
          <p className="text-xs text-muted-foreground">
            Make this product available to merchants
          </p>
        </div>
        <Switch
          id="isActive"
          checked={isActive}
          onCheckedChange={onIsActiveChange}
        />
      </div>

      <Separator />

      {/* Physical Attributes */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Physical Attributes</Label>
        
        {/* Weight */}
        <div className="space-y-2">
          <Label htmlFor="weight">Weight (lbs)</Label>
          <Input
            id="weight"
            type="number"
            placeholder="0.0"
            value={weight}
            onChange={(e) => onWeightChange(e.target.value)}
            min="0"
            step="0.1"
          />
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-2">
            <Label htmlFor="length">Length (in)</Label>
            <Input
              id="length"
              type="number"
              placeholder="0"
              value={length}
              onChange={(e) => onLengthChange(e.target.value)}
              min="0"
              step="0.1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="width">Width (in)</Label>
            <Input
              id="width"
              type="number"
              placeholder="0"
              value={width}
              onChange={(e) => onWidthChange(e.target.value)}
              min="0"
              step="0.1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Height (in)</Label>
            <Input
              id="height"
              type="number"
              placeholder="0"
              value={height}
              onChange={(e) => onHeightChange(e.target.value)}
              min="0"
              step="0.1"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Inventory */}
      <div className="space-y-2">
        <Label htmlFor="stock">Stock Quantity</Label>
        <Input
          id="stock"
          type="number"
          placeholder="0"
          value={stock}
          onChange={(e) => onStockChange(e.target.value)}
          min="0"
        />
        <p className="text-xs text-muted-foreground">
          Leave empty for unlimited stock
        </p>
      </div>

      <Separator />

      {/* Product Details */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Product Details</Label>
        
        {/* Brand */}
        <div className="space-y-2">
          <Label htmlFor="brand">Brand</Label>
          <Input
            id="brand"
            placeholder="Enter brand name"
            value={brand}
            onChange={(e) => onBrandChange(e.target.value)}
          />
        </div>

        {/* Material */}
        <div className="space-y-2">
          <Label htmlFor="material">Material</Label>
          <Input
            id="material"
            placeholder="e.g., 100% Cotton"
            value={material}
            onChange={(e) => onMaterialChange(e.target.value)}
          />
        </div>

        {/* Care Instructions */}
        <div className="space-y-2">
          <Label htmlFor="careInstructions">Care Instructions</Label>
          <Textarea
            id="careInstructions"
            placeholder="e.g., Machine wash cold, tumble dry low"
            value={careInstructions}
            onChange={(e) => onCareInstructionsChange(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      <Separator />

      {/* Shipping & Tax */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Shipping & Tax</Label>
        
        {/* Shipping Class */}
        <div className="space-y-2">
          <Label htmlFor="shippingClass">Shipping Class</Label>
          <Select value={shippingClass} onValueChange={onShippingClassChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select shipping class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="express">Express</SelectItem>
              <SelectItem value="overnight">Overnight</SelectItem>
              <SelectItem value="international">International</SelectItem>
              <SelectItem value="free">Free Shipping</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tax Status */}
        <div className="space-y-2">
          <Label htmlFor="taxStatus">Tax Status</Label>
          <Select value={taxStatus} onValueChange={onTaxStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select tax status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="taxable">Taxable</SelectItem>
              <SelectItem value="shipping">Shipping Only</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* SEO Settings */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">SEO Settings</Label>
        
        {/* Meta Title */}
        <div className="space-y-2">
          <Label htmlFor="metaTitle">Meta Title</Label>
          <Input
            id="metaTitle"
            placeholder="SEO title for search engines"
            value={metaTitle}
            onChange={(e) => onMetaTitleChange(e.target.value)}
            maxLength={60}
          />
          <p className="text-xs text-muted-foreground">
            {metaTitle.length}/60 characters
          </p>
        </div>

        {/* Meta Description */}
        <div className="space-y-2">
          <Label htmlFor="metaDescription">Meta Description</Label>
          <Textarea
            id="metaDescription"
            placeholder="SEO description for search engines"
            value={metaDescription}
            onChange={(e) => onMetaDescriptionChange(e.target.value)}
            rows={3}
            maxLength={160}
          />
          <p className="text-xs text-muted-foreground">
            {metaDescription.length}/160 characters
          </p>
        </div>
      </div>

      <Separator />

      {/* Product Tags & Attributes */}
      <div className="space-y-2">
        <Label>
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span>Product Tags & Attributes</span>
          </div>
        </Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add custom tag..."
            value={tagInput}
            onChange={(e) => onTagInputChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
          />
          <Button onClick={handleAddTag} size="sm">
            Add
          </Button>
        </div>
        <Select
          value=""
          onValueChange={handleAddCommonTag}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select from common tags" />
          </SelectTrigger>
          <SelectContent>
            {commonTags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="outline" className="gap-1">
                {tag}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleRemoveTag(tag)}
                />
              </Badge>
            ))}
          </div>
        )}
        {tags.length === 0 && (
          <p className="text-xs text-muted-foreground">No tags selected</p>
        )}
      </div>
    </div>
  );
};

