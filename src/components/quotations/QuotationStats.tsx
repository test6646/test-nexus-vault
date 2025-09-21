import React from 'react';
import StatsGrid from '@/components/ui/stats-grid';
import { Note01Icon, HourglassIcon, AlertCircleIcon, MoneyBag02Icon } from 'hugeicons-react';
import { useGlobalQuotationStats } from '@/hooks/useGlobalQuotationStats';

// Helper function to check if quotation is expired
const isExpired = (validUntil: string | null) => {
  if (!validUntil) return false;
  const expiryDate = new Date(validUntil);
  const today = new Date();
  
  // Set both dates to midnight for date-only comparison
  expiryDate.setHours(23, 59, 59, 999);
  today.setHours(0, 0, 0, 0);
  
  return expiryDate < today;
};

const QuotationStats = () => {
  const { quotations, loading } = useGlobalQuotationStats();

  if (loading) {
    return (
      <div className="flex gap-1 sm:gap-3 md:gap-4 w-full">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-1 h-[80px] sm:h-[150px] flex flex-col items-center justify-center bg-card border-2 border-primary/30 rounded-full shadow-sm animate-pulse">
            <div className="flex flex-col items-center justify-center space-y-0 p-1 sm:pb-1 md:pb-1 sm:px-2 md:px-3 sm:pt-1 md:pt-2">
              <div className="hidden sm:block p-1 md:p-2 rounded-full bg-primary/10 mb-1 md:mb-1">
                <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full bg-gray-300 animate-pulse" />
              </div>
              <div className="h-2 sm:h-3 md:h-4 w-12 sm:w-16 md:w-20 rounded bg-gray-300 animate-pulse" />
            </div>
            <div className="flex items-center justify-center pt-0 pb-1 sm:pb-1 md:pb-2 px-1 sm:px-2 md:px-3">
              <div className="h-3 sm:h-4 md:h-6 w-6 sm:w-8 md:w-12 rounded bg-gray-300 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const activeQuotations = quotations.filter(q => !q.converted_to_event);
  const expiredQuotations = activeQuotations.filter(q => isExpired(q.valid_until));
  const totalQuotationValue = quotations.reduce((sum, q) => sum + (q.amount || 0), 0);

  return (
    <StatsGrid stats={[
      {
        title: "Active Quotations",
        value: activeQuotations.length,
        icon: <Note01Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Pending",
        value: activeQuotations.filter(q => !isExpired(q.valid_until)).length,
        icon: <HourglassIcon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Expired",
        value: expiredQuotations.length,
        icon: <AlertCircleIcon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Total Value",
        value: `₹${totalQuotationValue.toLocaleString()}`,
        icon: <MoneyBag02Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      }
    ]} />
  );
};

export default QuotationStats;