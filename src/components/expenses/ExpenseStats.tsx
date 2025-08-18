
import { ChartLineData02Icon, DollarCircleIcon, File01Icon, Calendar01Icon, Target01Icon } from 'hugeicons-react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import StatCard from '@/components/ui/stat-card';

interface ExpenseStatsProps {
  expenses: Array<{
    id: string;
    amount: number;
    category: string;
    expense_date: string;
    description: string;
    payment_method?: string;
  }>;
}

const ExpenseStats = ({ expenses }: ExpenseStatsProps) => {
  const currentDate = new Date();
  const currentMonth = format(currentDate, 'yyyy-MM');
  const currentYear = format(currentDate, 'yyyy');
  
  // Calculate payment breakdowns
  const calculatePaymentBreakdown = (expenseList: typeof expenses) => {
    return expenseList.reduce((acc, expense) => {
      if (expense.payment_method === 'Cash') {
        acc.cash += expense.amount;
      } else {
        acc.digital += expense.amount;
      }
      return acc;
    }, { cash: 0, digital: 0 });
  };
  
  // Calculate monthly expenses
  const monthlyExpenses = expenses.filter(expense => 
    expense.expense_date.startsWith(currentMonth)
  );
  const monthlyTotal = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const monthlyBreakdown = calculatePaymentBreakdown(monthlyExpenses);
  
  // Calculate yearly expenses
  const yearlyExpenses = expenses.filter(expense => 
    expense.expense_date.startsWith(currentYear)
  );
  const yearlyTotal = yearlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const yearlyBreakdown = calculatePaymentBreakdown(yearlyExpenses);
  
  // Calculate average expense
  const averageExpense = expenses.length > 0 ? 
    expenses.reduce((sum, expense) => sum + expense.amount, 0) / expenses.length : 0;
  
  // Category breakdown
  const categoryTotals = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);
  
  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalBreakdown = calculatePaymentBreakdown(expenses);

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="flex gap-1 sm:gap-3 md:gap-4 w-full">
        <StatCard
          title="Total Expenses"
          value={`₹${totalExpenses.toLocaleString()}`}
          icon={<DollarCircleIcon className="h-4 w-4" />}
          colorClass="bg-primary/20 text-primary"
          paymentBreakdown={totalBreakdown}
        />
        <StatCard
          title="Monthly Total"
          value={`₹${monthlyTotal.toLocaleString()}`}
          icon={<Calendar01Icon className="h-4 w-4" />}
          colorClass="bg-primary/20 text-primary"
          paymentBreakdown={monthlyBreakdown}
        />
        <StatCard
          title="Yearly Total"
          value={`₹${yearlyTotal.toLocaleString()}`}
          icon={<ChartLineData02Icon className="h-4 w-4" />}
          colorClass="bg-primary/20 text-primary"
          paymentBreakdown={yearlyBreakdown}
        />
        <StatCard
          title="Average Expense"
          value={`₹${averageExpense.toLocaleString()}`}
          icon={<Target01Icon className="h-4 w-4" />}
          colorClass="bg-primary/20 text-primary"
        />
      </div>

      {/* Top Categories */}
      {topCategories.length > 0 && (
        <div className="bg-card text-card-foreground rounded-xl border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <File01Icon className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Top Expense Categories</h3>
          </div>
          <div className="space-y-3">
            {topCategories.map(([category, amount], index) => (
              <div key={category} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {index + 1}
                  </div>
                  <span className="font-medium">{category}</span>
                </div>
                <span className="font-semibold text-primary">₹{amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseStats;
