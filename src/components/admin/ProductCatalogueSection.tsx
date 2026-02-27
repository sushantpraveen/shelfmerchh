import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { X, Info } from 'lucide-react';
import { ProductCatalogueData } from '@/types/product';
import { CATEGORIES, CategoryId, getSubcategories, generateProductTypeCode } from '@/config/productCategories';
import { getFieldDefinitions, FieldDefinition } from '@/config/productFieldDefinitions';
import { catalogueFieldsApi } from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';

interface ProductCatalogueSectionProps {
  data: ProductCatalogueData;
  onChange: (data: ProductCatalogueData) => void;
}

const commonTags = ['Cotton', 'Polyester', 'Unisex', 'Eco-Friendly', 'Limited Edition'];

export const ProductCatalogueSection = ({ data, onChange }: ProductCatalogueSectionProps) => {
  const navigate = useNavigate();
  const [dynamicFields, setDynamicFields] = useState<any[]>([]);
  const [isLoadingDynamicFields, setIsLoadingDynamicFields] = useState(false);

  // Get available subcategories based on selected category
  const availableSubcategories = useMemo(() => {
    if (!data.categoryId) return [];
    return getSubcategories(data.categoryId as CategoryId);
  }, [data.categoryId]);

  // Get static field definitions based on category and subcategories
  const staticFieldDefinitions = useMemo(() => {
    if (!data.categoryId) return [];
    return getFieldDefinitions(data.categoryId as CategoryId, data.subcategoryIds);
  }, [data.categoryId, data.subcategoryIds]);

  // Fetch dynamic fields from database
  useEffect(() => {
    if (!data.categoryId) {
      setDynamicFields([]);
      return;
    }

    const fetchDynamicFields = async () => {
      setIsLoadingDynamicFields(true);
      try {
        const response = await catalogueFieldsApi.getAll({
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryIds[0], // Use first subcategory if available
        });

        if (response.success && response.data) {
          setDynamicFields(response.data);
        }
      } catch (error) {
        console.error('Error fetching dynamic catalogue fields:', error);
        // Fail silently - dynamic fields are optional
      } finally {
        setIsLoadingDynamicFields(false);
      }
    };

    fetchDynamicFields();
  }, [data.categoryId, data.subcategoryIds]);

  // Merge static and dynamic fields
  const fieldDefinitions = useMemo(() => {
    // Convert dynamic fields to FieldDefinition format
    const dynamicFieldDefs: FieldDefinition[] = dynamicFields.map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type,
      options: field.options || [],
      required: field.required || false,
      placeholder: field.placeholder || '',
      unit: field.unit || '',
    }));

    // Merge: static first, then dynamic (avoid duplicates by key)
    const staticKeys = staticFieldDefinitions.map(f => f.key);
    const uniqueDynamicFields = dynamicFieldDefs.filter(f => !staticKeys.includes(f.key));

    return [...staticFieldDefinitions, ...uniqueDynamicFields];
  }, [staticFieldDefinitions, dynamicFields]);

  // Update productTypeCode when subcategories change
  useEffect(() => {
    if (data.subcategoryIds.length > 0) {
      // Use the first subcategory to generate the product type code
      const newProductTypeCode = generateProductTypeCode(data.subcategoryIds[0]);
      if (data.productTypeCode !== newProductTypeCode) {
        onChange({ ...data, productTypeCode: newProductTypeCode });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.subcategoryIds]);

  const handleAddTag = (tag: string) => {
    if (tag.trim() && !data.tags.includes(tag.trim())) {
      onChange({ ...data, tags: [...data.tags, tag.trim()] });
    }
  };

  const handleRemoveTag = (tag: string) => {
    onChange({ ...data, tags: data.tags.filter(t => t !== tag) });
  };

  const handleCategoryChange = (value: string) => {
    // When category changes, reset subcategories and attributes
    onChange({
      ...data,
      categoryId: value,
      subcategoryIds: [],
      attributes: {}
    });
  };

  const handleAddSubcategory = (value: string) => {
    if (!data.subcategoryIds.includes(value)) {
      onChange({ ...data, subcategoryIds: [...data.subcategoryIds, value] });
    }
  };

  const handleRemoveSubcategory = (sub: string) => {
    onChange({ ...data, subcategoryIds: data.subcategoryIds.filter(s => s !== sub) });
  };

  const handleAttributeChange = (key: string, value: any) => {
    onChange({
      ...data,
      attributes: {
        ...data.attributes,
        [key]: value
      }
    });
  };

  const renderField = (field: FieldDefinition) => {
    const value = data.attributes[field.key] ?? '';

    switch (field.type) {
      case 'select':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
              {field.unit && <span className="text-muted-foreground text-xs ml-1">({field.unit})</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(val) => handleAttributeChange(field.key, val)}
            >
              <SelectTrigger id={field.key}>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'number':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
              {field.unit && <span className="text-muted-foreground text-xs ml-1">({field.unit})</span>}
            </Label>
            <Input
              id={field.key}
              type="number"
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleAttributeChange(field.key, parseFloat(e.target.value) || 0)}
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={field.key}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleAttributeChange(field.key, e.target.value)}
              rows={3}
            />
          </div>
        );

      case 'text':
      default:
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
              {field.unit && <span className="text-muted-foreground text-xs ml-1">({field.unit})</span>}
            </Label>
            <Input
              id={field.key}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleAttributeChange(field.key, e.target.value)}
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">

      {/* Product Name */}
      <div className="space-y-2">
        <Label htmlFor="productName">Product Name *</Label>
        <Input
          id="productName"
          placeholder="Enter product name"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
        />
      </div>

      {/* Description / Size Chart Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="sizeChartEnabled" className="text-base font-semibold cursor-pointer">
            {data.sizeChart?.enabled ? 'Size Chart' : 'Size Guide (HTML)'}
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {data.sizeChart?.enabled ? 'Switch to HTML' : 'Use Table Editor'}
            </span>
            <Switch
              id="sizeChartEnabled"
              checked={data.sizeChart?.enabled || false}
              onCheckedChange={(checked) =>
                onChange({
                  ...data,
                  sizeChart: {
                    enabled: checked,
                    rows: data.sizeChart?.rows || 3,
                    cols: data.sizeChart?.cols || 3,
                    data: data.sizeChart?.data || Array(3).fill(null).map(() => Array(3).fill(''))
                  }
                })
              }
            />
          </div>
        </div>

        {!data.sizeChart?.enabled ? (
          <div className="space-y-2">
            <Textarea
              id="description"
              placeholder="Enter size guide HTML content"
              value={data.description}
              onChange={(e) => onChange({ ...data, description: e.target.value })}
              rows={12}
            />
          </div>
        ) : (
          <div className="space-y-4 border rounded-md p-4 bg-muted/20">
            <div className="flex gap-4">
              <div className="space-y-2">
                <Label htmlFor="sc-rows">Rows</Label>
                <Input
                  id="sc-rows"
                  type="number"
                  min="1"
                  max="20"
                  value={data.sizeChart.rows}
                  onChange={(e) => {
                    const rows = parseInt(e.target.value) || 0;
                    if (rows < 1 || rows > 20) return;
                    const newData = [...data.sizeChart!.data];
                    if (rows > newData.length) {
                      const cols = data.sizeChart!.cols;
                      for (let i = newData.length; i < rows; i++) {
                        newData.push(Array(cols).fill(''));
                      }
                    } else if (rows < newData.length) {
                      newData.length = rows;
                    }
                    onChange({
                      ...data,
                      sizeChart: { ...data.sizeChart!, rows, data: newData }
                    });
                  }}
                  className="w-20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sc-cols">Columns</Label>
                <Input
                  id="sc-cols"
                  type="number"
                  min="1"
                  max="10"
                  value={data.sizeChart.cols}
                  onChange={(e) => {
                    const cols = parseInt(e.target.value) || 0;
                    if (cols < 1 || cols > 10) return;
                    const newData = data.sizeChart!.data.map(row => {
                      const newRow = [...row];
                      if (cols > newRow.length) {
                        for (let i = newRow.length; i < cols; i++) {
                          newRow.push('');
                        }
                      } else if (cols < newRow.length) {
                        newRow.length = cols;
                      }
                      return newRow;
                    });
                    onChange({
                      ...data,
                      sizeChart: { ...data.sizeChart!, cols, data: newData }
                    });
                  }}
                  className="w-20"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Array.from({ length: data.sizeChart.cols }).map((_, colIndex) => (
                      <TableHead key={colIndex} className="p-1">
                        <Input
                          value={data.sizeChart!.data[0]?.[colIndex] || ''}
                          onChange={(e) => {
                            const newData = [...data.sizeChart!.data];
                            if (!newData[0]) newData[0] = Array(data.sizeChart!.cols).fill('');
                            newData[0][colIndex] = e.target.value;
                            onChange({
                              ...data,
                              sizeChart: { ...data.sizeChart!, data: newData }
                            });
                          }}
                          className="h-8 font-bold bg-muted"
                          placeholder={colIndex === 0 ? "Size" : "Header"}
                        />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sizeChart.data.slice(1).map((row, rowIndex) => (
                    <TableRow key={rowIndex + 1}>
                      {row.map((cell, colIndex) => (
                        <TableCell key={colIndex} className="p-1">
                          <Input
                            value={cell}
                            onChange={(e) => {
                              const newData = [...data.sizeChart!.data];
                              newData[rowIndex + 1][colIndex] = e.target.value;
                              onChange({
                                ...data,
                                sizeChart: { ...data.sizeChart!, data: newData }
                              });
                            }}
                            className="h-8"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">First row is treated as the header.</p>
          </div>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select value={data.categoryId} onValueChange={handleCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(CATEGORIES).map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subcategories */}
      {data.categoryId && (
        <div className="space-y-2">
          <Label>Subcategories</Label>
          <Select value="" onValueChange={handleAddSubcategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select subcategories" />
            </SelectTrigger>
            <SelectContent>
              {availableSubcategories.map((sub) => (
                <SelectItem key={sub} value={sub}>
                  {sub}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data.subcategoryIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {data.subcategoryIds.map((sub) => (
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
      )}

      {/* Base Price */}
      <div className="space-y-2">
        <Label htmlFor="basePrice">Base Price ($) *</Label>
        <Input
          id="basePrice"
          type="number"
          placeholder="0.00"
          value={data.basePrice || ''}
          onChange={(e) => onChange({ ...data, basePrice: parseFloat(e.target.value) || 0 })}
          min="0"
          step="0.01"
        />
      </div>

      {/* Product Attributes - Dynamic based on category/subcategory */}
      {fieldDefinitions.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Product Attributes</Label>
              {/* <span className="text-xs text-muted-foreground">
                Based on: {data.categoryId} {data.subcategoryIds.length > 0 && `→ ${data.subcategoryIds.join(', ')}`}
              </span> */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/catalogue-fields', {
                  state: { from: window.location.pathname }
                })}
              >
                <Plus className="h-4 w-4" />
                Add Attribute
              </Button>
            </div>
            {fieldDefinitions.map(field => renderField(field))}
          </div>
        </>
      )}


      <Separator />

      {/* Tags */}
      <div className="space-y-2">
        <Label>
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span>Product Tags</span>
          </div>
        </Label>
        <Select value="" onValueChange={handleAddTag}>
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
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {data.tags.map((tag) => (
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
      </div>
    </div>
  );
};

