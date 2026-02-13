import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface CatalogToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  totalCount: number;
  activeCount?: number;
  draftCount?: number;
  archivedCount?: number;
}

export const CatalogToolbar = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  sortBy,
  onSortChange,
  totalCount,
  activeCount,
  draftCount,
  archivedCount,
}: CatalogToolbarProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4 border-b">
      {/* Left side - Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          Base Products · {totalCount}
        </span>
        {(activeCount !== undefined || draftCount !== undefined || archivedCount !== undefined) && (
          <span className="hidden sm:inline-flex items-center gap-1">
            <span className={activeCount ? 'text-green-600' : ''}>Active: {activeCount || 0}</span>
            <span>·</span>
            <span className={draftCount ? 'text-gray-600' : ''}>Draft: {draftCount || 0}</span>
            <span>·</span>
            <span className={archivedCount ? 'text-red-600' : ''}>Archived: {archivedCount || 0}</span>
          </span>
        )}
      </div>

      {/* Right side - Filters and Search */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 sm:flex-initial sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="hoodies">Hoodies</SelectItem>
            <SelectItem value="tshirts">T-Shirts</SelectItem>
            <SelectItem value="mugs">Mugs</SelectItem>
            <SelectItem value="notebooks">Notebooks</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="price-low">Base price (low–high)</SelectItem>
            <SelectItem value="price-high">Base price (high–low)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};




