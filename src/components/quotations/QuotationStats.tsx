
import StatsGrid from '@/components/ui/stats-grid';
import { File01Icon, Calendar01Icon, AlertCircleIcon, Tick02Icon, DollarCircleIcon } from 'hugeicons-react';
import { Quotation } from '@/types/studio';
import { isExpired } from './QuotationFilters';

interface QuotationStatsProps {
  quotations: Quotation[];
}

const QuotationStats = ({ quotations }: QuotationStatsProps) => {
  const activeQuotations = quotations.filter(q => !q.converted_to_event);
  const expiredQuotations = activeQuotations.filter(q => isExpired(q.valid_until));
  const totalQuotationValue = quotations.reduce((sum, q) => sum + (q.amount || 0), 0);
  const activeQuotationValue = activeQuotations.reduce((sum, q) => sum + (q.amount || 0), 0);

  return (
    <StatsGrid stats={[
      {
        title: "Active Quotations",
        value: activeQuotations.length,
        icon: <File01Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Pending",
        value: activeQuotations.filter(q => !isExpired(q.valid_until)).length,
        icon: <Calendar01Icon className="h-4 w-4" />,
        colorClass: "bg-primary/15 text-primary"
      },
      {
        title: "Expired",
        value: expiredQuotations.length,
        icon: <AlertCircleIcon className="h-4 w-4" />,
        colorClass: "bg-primary/25 text-primary"
      },
      {
        title: "Total Value",
        value: `₹${totalQuotationValue.toLocaleString()}`,
        icon: <DollarCircleIcon className="h-4 w-4" />,
        colorClass: "bg-primary/10 text-primary"
      }
    ]} />
  );
};

export default QuotationStats;
