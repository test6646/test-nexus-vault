import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface MetadataItem {
  label: string;
  value: string | number;
  colorClass?: string;
}

interface StaffDetailedStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  colorClass?: string;
  metadata: MetadataItem[];
}

const StaffDetailedStatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  colorClass = 'bg-primary/10 text-primary',
  metadata
}: StaffDetailedStatCardProps) => {
  return (
    <Card className="w-full rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 border-2 border-primary/20">
      <CardHeader className="flex flex-col items-center justify-center space-y-0 pb-2 pt-4 px-4">
        <div className={`p-2 sm:p-3 rounded-full ${colorClass} mb-2`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <CardTitle className="text-sm sm:text-base font-semibold text-center text-foreground leading-tight">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center pt-0 pb-4 px-4">
        <div className="text-lg sm:text-2xl font-bold text-center text-primary mb-3">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className="space-y-1 w-full max-w-full">
          {metadata.map((item, index) => (
            <div key={index} className="flex justify-between items-center text-xs gap-2">
              <span className="text-muted-foreground text-left truncate">{item.label}:</span>
              <span className={`font-medium text-right ${item.colorClass || 'text-foreground'} truncate`}>
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default StaffDetailedStatCard;