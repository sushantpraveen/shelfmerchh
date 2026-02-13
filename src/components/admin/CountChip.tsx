import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountChipProps {
  count: number;
  label: string;
  icon?: LucideIcon;
  className?: string;
}

export const CountChip = ({ count, label, icon: Icon, className }: CountChipProps) => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
        'bg-gray-50 text-gray-600 text-xs font-medium',
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      <span>
        {count} {label}
      </span>
    </div>
  );
};




