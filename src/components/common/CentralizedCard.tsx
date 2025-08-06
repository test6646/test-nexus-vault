
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CentralizedCardProps {
  title: string;
  subtitle?: string;
  amount?: number;
  status?: string;
  statusVariant?: 'default' | 'destructive' | 'outline' | 'secondary';
  date?: string;
  description?: string;
  badges?: Array<{ label: string; color?: string }>;
  metadata?: Array<{ icon: React.ReactNode; label?: string; value: string | React.ReactNode; isDate?: boolean }>;
  actions?: Array<{ 
    label: string; 
    onClick: () => void; 
    variant?: 'default' | 'outline' | 'destructive' | 'ghost';
    icon?: React.ReactNode;
    className?: string;
  }>;
  children?: React.ReactNode;
  className?: string;
}

const CentralizedCard = ({
  title,
  subtitle,
  amount,
  status,
  statusVariant = 'default',
  date,
  description,
  badges = [],
  metadata = [],
  actions = [],
  children,
  className
}: CentralizedCardProps) => {
  return (
    <Card className={cn(
      // Portrait aspect ratios - like mobile screens
      'w-full h-full flex flex-col',
      'bg-card border border-border shadow-sm',
      'transition-all duration-200 hover:shadow-md hover:border-primary/30',
      
      // Mobile: smaller portrait aspect ratio
      'aspect-[9/11] sm:aspect-[9/11]',
      // Desktop: smaller portrait aspect ratio
      'lg:aspect-[9/12] xl:aspect-[9/12]',
      
      // Remove any scrolling
      'overflow-hidden',
      
      className
    )}>
      <CardHeader className="pb-3 px-4 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-foreground leading-tight">
              {title}
            </CardTitle>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {badges.map((badge, index) => (
                  <Badge
                    key={index}
                    className={cn('text-xs px-2 py-1', badge.color || 'bg-muted/50 text-muted-foreground')}
                  >
                    {badge.label}
                  </Badge>
                ))}
              </div>
            )}
            {status && (
              <Badge variant={statusVariant} className="text-xs px-2 py-1">
                {status}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-between px-4 pb-4 min-h-0">
        <div className="flex-1 space-y-3 min-h-0">
          {amount !== undefined && amount !== null && (
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded border border-primary/20">
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-lg font-semibold text-primary">₹{amount.toLocaleString('en-IN')}</p>
              </div>
            </div>
          )}
          
          {date && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/20 px-3 py-2 rounded">
              <span className="text-primary">📅</span>
              {new Date(date).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: '2-digit'
              })}
            </div>
          )}
          
           {metadata.length > 0 && (
            <div className="flex flex-col items-center gap-3">
              {metadata.map((item, index) => (
                 <div key={index} className="flex flex-col items-center gap-1">
                   {item.icon}
                   <div className={cn("text-sm font-medium text-center", item.isDate ? "whitespace-nowrap" : "break-words")}>{item.value}</div>
                 </div>
              ))}
            </div>
          )}
          
          {description && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Description</p>
              <div className="overflow-hidden">
                <p className="text-xs leading-relaxed bg-muted/20 p-2 rounded">
                  {description}
                </p>
              </div>
            </div>
          )}
          
          
          {children && (
            <div className="space-y-2">
              {children}
            </div>
          )}
        </div>
        
        {/* Icon buttons - fully rounded, spaced evenly */}
        {actions.length > 0 && (
          <div className="pt-3 border-t border-muted flex-shrink-0">
            <div className="flex justify-evenly gap-2">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  size="icon"
                  onClick={action.onClick}
                  className={cn("rounded-full w-8 h-8 p-0", action.className)}
                  title={action.label}
                >
                  {action.icon}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CentralizedCard;
