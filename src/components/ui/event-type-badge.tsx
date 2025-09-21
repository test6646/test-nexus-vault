import { Badge } from '@/components/ui/badge';
import { getEventTypeColors } from '@/lib/status-colors';
import { cn } from '@/lib/utils';

interface EventTypeBadgeProps {
  eventType: string;
  variant?: 'default' | 'subtle';
  className?: string;
}

export const EventTypeBadge = ({ eventType, variant = 'subtle', className }: EventTypeBadgeProps) => {
  const textColor = getEventTypeColors(eventType, 'text');
  const bgColor = getEventTypeColors(eventType, 'background');

  return (
    <Badge
      className={cn(
        'px-2 py-1 text-xs font-medium border-0',
        variant === 'subtle' ? [bgColor, textColor] : [textColor, 'bg-background'],
        className
      )}
    >
      {eventType}
    </Badge>
  );
};