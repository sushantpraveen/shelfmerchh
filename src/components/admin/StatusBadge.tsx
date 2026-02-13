import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'active' | 'draft' | 'archived' | 'inactive';
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const variants = {
    active: 'bg-green-50 text-green-700 border-green-200',
    draft: 'bg-gray-50 text-gray-700 border-gray-200',
    archived: 'bg-red-50 text-red-700 border-red-200',
    inactive: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  const labels = {
    active: 'Active',
    draft: 'Draft',
    archived: 'Archived',
    inactive: 'Inactive',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-medium px-2 py-0.5 border',
        variants[status],
        className
      )}
    >
      {labels[status]}
    </Badge>
  );
};




