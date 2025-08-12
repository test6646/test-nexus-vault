export const formatEventDateRange = (eventDate: string, totalDays: number = 1, eventEndDate?: string | null) => {
  const startDate = new Date(eventDate);
  
  if (totalDays > 1) {
    const endDate = eventEndDate ? 
      new Date(eventEndDate) : 
      new Date(startDate.getTime() + (totalDays - 1) * 24 * 60 * 60 * 1000);
    return `${startDate.toLocaleDateString('en-GB')} - ${endDate.toLocaleDateString('en-GB')}`;
  }
  
  return startDate.toLocaleDateString('en-GB');
};

export const getDateRangeForFinance = (timeRange: string) => {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date();
  let isGlobal = false;

  switch (timeRange) {
    case 'week':
      // Start of current week (Sunday)
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'quarter':
      // Predefined quarters: Q1(Jan-Mar), Q2(Apr-Jun), Q3(Jul-Sep), Q4(Oct-Dec)
      const currentMonth = now.getMonth();
      let quarterStart: number;
      
      if (currentMonth >= 0 && currentMonth <= 2) {
        // Q1: Jan-Mar
        quarterStart = 0;
      } else if (currentMonth >= 3 && currentMonth <= 5) {
        // Q2: Apr-Jun
        quarterStart = 3;
      } else if (currentMonth >= 6 && currentMonth <= 8) {
        // Q3: Jul-Sep
        quarterStart = 6;
      } else {
        // Q4: Oct-Dec
        quarterStart = 9;
      }
      
      startDate = new Date(now.getFullYear(), quarterStart, 1);
      endDate = new Date(now.getFullYear(), quarterStart + 3, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'global':
      isGlobal = true;
      startDate = new Date('2010-01-01'); // Truly all time from a decade ago
      endDate = new Date();
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate, isGlobal };
};

export const formatFinanceTimeRange = (timeRange: string) => {
  switch (timeRange) {
    case 'week':
      return 'This Week';
    case 'month':
      return 'This Month';
    case 'quarter':
      return 'This Quarter';
    case 'year':
      return 'This Year';
    case 'global':
      return 'All Time';
    default:
      return 'This Month';
  }
};

// Format date as DD-MON-YYYY (e.g., 04-AUG-2025)
export const formatDate = (date: Date) => {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
};