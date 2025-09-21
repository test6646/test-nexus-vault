import { Badge } from '@/components/ui/badge';
import { getStatusColors } from '@/lib/status-colors';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'subtle';
  className?: string;
}

export const StatusBadge = ({ status, variant = 'default', className }: StatusBadgeProps) => {
  const textColor = getStatusColors(status, 'text');
  const bgColor = getStatusColors(status, 'background');
  const borderColor = getStatusColors(status, 'border');

  return (
    <Badge
      className={cn(
        'px-2 py-1 text-xs font-medium border-0 bg-transparent',
        textColor,
        className
      )}
    >
      {status.includes('-') ? status.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ') : status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};