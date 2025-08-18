
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
  eventType?: string;
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
  className,
  eventType
}: CentralizedCardProps) => {
  
  // Check if task is overdue
  const isOverdue = metadata.some(item => 
    item.label?.toLowerCase().includes('due') && 
    item.value && 
    typeof item.value === 'string' && 
    new Date(item.value) < new Date()
  );
  
  const getEventTypeIcon = (eventType: string) => {
    const eventTypeStyles = {
      'Wedding': 'bg-wedding-color text-white',
      'Pre-Wedding': 'bg-pre-wedding-color text-white', 
      'Ring-Ceremony': 'bg-ring-ceremony-color text-white',
      'Maternity Photography': 'bg-maternity-color text-white',
      'Others': 'bg-others-color text-white'
    };
    return eventTypeStyles[eventType as keyof typeof eventTypeStyles] || 'bg-primary text-white';
  };
  return (
    <Card 
      className={cn(
        'w-full h-full flex flex-col max-w-full overflow-hidden glass-card-premium',
        
        // Portrait aspect ratios with mobile optimization
        'aspect-[9/11] sm:aspect-[9/11]',
        'lg:aspect-[9/12] xl:aspect-[9/12]',
        
        // Overdue styling - pastel red background
        isOverdue && 'bg-red-50/80 border-red-200/60',
        
        className
      )}
    >
      <CardHeader className="pb-3 px-2 flex-shrink-0">
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
      
      <CardContent className="flex-1 flex flex-col justify-between px-2 pb-2 min-h-0">
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
            <div className="space-y-3">
              {metadata.map((item, index) => (
                <div key={index} className="flex flex-col items-center text-center space-y-2">
                  <div className="flex-shrink-0">
                    {item.icon}
                  </div>
                  <div className="w-full">
                    {item.label && (
                      <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                    )}
                    <div className={cn(
                      "text-sm font-medium px-2", 
                      item.isDate ? "whitespace-nowrap" : "break-words",
                      typeof item.value === 'string' && item.value === '~' ? "text-muted-foreground" : ""
                    )}>
                      {item.value}
                    </div>
                  </div>
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
          <div className="pt-1 border-t border-muted flex-shrink-0 mb-1">
            <div className="flex justify-center gap-0 px-0">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  size="icon"
                  onClick={action.onClick}
                  className={cn("rounded-full w-10 h-10 p-0 mx-0.5", action.className)}
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
