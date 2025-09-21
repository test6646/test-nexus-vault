import { Badge } from '@/components/ui/badge';
import { getCategoryColors } from '@/lib/status-colors';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  category: string;
  variant?: 'default' | 'subtle';
  className?: string;
}

export const CategoryBadge = ({ category, variant = 'default', className }: CategoryBadgeProps) => {
  const textColor = getCategoryColors(category, 'text');
  const bgColor = getCategoryColors(category, 'background');

  return (
    <Badge
      className={cn(
        'px-2 py-1 text-xs font-medium',
        variant === 'subtle' ? [bgColor, textColor] : [textColor, 'bg-background'],
        className
      )}
    >
      {category}
    </Badge>
  );
};