import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarCircleIcon, CreditCardIcon, Calendar01Icon, Tick02Icon } from 'hugeicons-react';

interface PaymentBreakdown {
  cash: number;
  digital: number;
}

interface EventBreakdown {
  completed: number;
  active: number;
}

interface EnhancedStatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass?: string;
  paymentBreakdown?: PaymentBreakdown;
  eventBreakdown?: EventBreakdown;
}

const EnhancedStatCard = ({ 
  title, 
  value, 
  icon, 
  colorClass = 'bg-primary/20 text-primary',
  paymentBreakdown,
  eventBreakdown
}: EnhancedStatCardProps) => {
  return (
    <Card className="min-h-[70px] sm:min-h-[80px] md:min-h-[120px] flex flex-col items-center justify-center bg-white border-2 border-primary/30 rounded-full shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="flex flex-col items-center justify-center space-y-0 pb-1 md:pb-2 px-2 sm:px-3 md:px-4 pt-1 sm:pt-2 md:pt-4">
        <div className="p-1 md:p-2 rounded-full bg-primary/10 mb-1 md:mb-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
        <CardTitle className="text-[10px] xs:text-xs sm:text-xs md:text-sm font-medium text-gray-700 text-center leading-tight px-1">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center pt-0 pb-1 sm:pb-2 md:pb-4 px-2 sm:px-3 md:px-4 space-y-1">
        <div className="text-xs sm:text-sm md:text-xl lg:text-2xl font-bold text-center text-primary">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {paymentBreakdown && (
          <div className="hidden md:flex items-center gap-2 text-[8px] sm:text-[9px] md:text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <DollarCircleIcon className="w-2 h-2 sm:w-3 sm:h-3" />
              <span>
                {typeof paymentBreakdown.cash === 'number' && paymentBreakdown.cash < 1000 
                  ? paymentBreakdown.cash 
                  : `₹${paymentBreakdown.cash.toLocaleString()}`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <CreditCardIcon className="w-2 h-2 sm:w-3 sm:h-3" />
              <span>
                {typeof paymentBreakdown.digital === 'number' && paymentBreakdown.digital < 1000 
                  ? paymentBreakdown.digital 
                  : `₹${paymentBreakdown.digital.toLocaleString()}`}
              </span>
            </div>
          </div>
        )}
        {eventBreakdown && (
          <div className="hidden md:flex items-center gap-2 text-[8px] sm:text-[9px] md:text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Tick02Icon className="w-2 h-2 sm:w-3 sm:h-3" />
              <span>{eventBreakdown.completed}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar01Icon className="w-2 h-2 sm:w-3 sm:h-3" />
              <span>{eventBreakdown.active}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedStatCard;