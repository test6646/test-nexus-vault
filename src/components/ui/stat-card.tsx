
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarCircleIcon, CreditCardIcon, TaskDaily01Icon, UserGroupIcon } from 'hugeicons-react';

interface PaymentBreakdown {
  cash: number;
  digital: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass?: string;
  paymentBreakdown?: PaymentBreakdown;
  breakdownType?: 'payment' | 'task-assignment';
}

const StatCard = ({ 
  title, 
  value, 
  icon, 
  colorClass = 'bg-primary/20 text-primary',
  paymentBreakdown,
  breakdownType = 'payment'
}: StatCardProps) => {
  return (
    <Card className="flex-1 h-[80px] sm:h-[150px] flex flex-col items-center justify-center bg-card border-2 border-primary/30 rounded-full shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="flex flex-col items-center justify-center space-y-0 p-1 sm:pb-1 md:pb-1 sm:px-2 md:px-3 sm:pt-1 md:pt-2">
        <div className="hidden sm:block p-1 md:p-2 rounded-full bg-primary/10 mb-1 md:mb-1">
          <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
        <CardTitle className="text-[7px] xs:text-[8px] sm:text-xs md:text-sm font-medium text-gray-700 text-center leading-tight px-1 sm:px-0">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center pt-0 pb-1 sm:pb-1 md:pb-2 px-1 sm:px-2 md:px-3 space-y-0">
        <div className="text-xs sm:text-sm md:text-xl lg:text-2xl font-bold text-center text-primary">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {paymentBreakdown && (
          <div className="hidden md:flex items-center gap-1 text-[8px] md:text-[11px] text-muted-foreground mt-1">
            <div className="flex items-center gap-0.5">
              {breakdownType === 'task-assignment' ? (
                <TaskDaily01Icon className="w-2 h-2" />
              ) : (
                <DollarCircleIcon className="w-2 h-2" />
              )}
              <span>
                {breakdownType === 'task-assignment' 
                  ? paymentBreakdown.cash
                  : (typeof paymentBreakdown.cash === 'number' && paymentBreakdown.cash < 1000 
                      ? paymentBreakdown.cash 
                      : `₹${paymentBreakdown.cash.toLocaleString()}`)
                }
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              {breakdownType === 'task-assignment' ? (
                <UserGroupIcon className="w-2 h-2" />
              ) : (
                <CreditCardIcon className="w-2 h-2" />
              )}
              <span>
                {breakdownType === 'task-assignment' 
                  ? paymentBreakdown.digital
                  : (typeof paymentBreakdown.digital === 'number' && paymentBreakdown.digital < 1000 
                      ? paymentBreakdown.digital 
                      : `₹${paymentBreakdown.digital.toLocaleString()}`)
                }
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
