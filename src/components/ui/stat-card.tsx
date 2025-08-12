
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass?: string;
}

const StatCard = ({ 
  title, 
  value, 
  icon, 
  colorClass = 'bg-primary/20 text-primary'
}: StatCardProps) => {
  return (
    <Card className="min-h-[60px] sm:min-h-[80px] md:min-h-[120px] flex flex-col items-center justify-center bg-white border-2 border-primary/30 rounded-full shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="flex flex-col items-center justify-center space-y-0 p-0 sm:pb-1 md:pb-2 sm:px-3 md:px-4 sm:pt-2 md:pt-4">
        <div className="hidden sm:block p-1 md:p-2 rounded-full bg-primary/10 mb-1 md:mb-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
        <CardTitle className="text-[8px] xs:text-[9px] sm:text-xs md:text-sm font-medium text-gray-700 text-center leading-tight p-0 sm:mt-0">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center p-0 sm:pb-2 md:pb-4 sm:px-3 md:px-4">
        <div className="text-[10px] sm:text-sm md:text-xl lg:text-2xl font-bold text-center text-primary">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
