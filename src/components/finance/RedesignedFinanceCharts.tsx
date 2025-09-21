import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';

interface RedesignedFinanceChartsProps {
  stats: any;
  timeRange: string;
  customStartDate?: string;
  customEndDate?: string;
}

const RedesignedFinanceCharts = ({ stats, timeRange }: RedesignedFinanceChartsProps) => {
  // Chart colors using CSS variables from design system - EXACT MATCH with expense table
  const CHART_COLORS = {
    equipment: 'hsl(var(--category-equipment))',
    travel: 'hsl(var(--category-travel))',
    accommodation: 'hsl(var(--category-accommodation))',
    food: 'hsl(var(--category-food))',
    marketing: 'hsl(var(--category-marketing))',
    software: 'hsl(var(--category-software))',
    maintenance: 'hsl(var(--category-maintenance))',
    salary: 'hsl(var(--category-salary))',
    other: 'hsl(var(--category-other))',
    // Payment methods (Cash vs Digital only)
    cash: 'hsl(var(--success))',
    digital: 'hsl(var(--primary))',
    // Revenue colors
    revenue: 'hsl(var(--success))',
    expenses: 'hsl(var(--destructive))',
    profit: 'hsl(var(--primary))'
  };

  // Prepare expense data by category for pie chart
  const expenseByCategory = stats?.expensesByCategory?.map((item: any) => ({
    name: item.category,
    value: item.amount,
    color: CHART_COLORS[item.category.toLowerCase()] || CHART_COLORS.other
  })) || [];

  // 🔥 FIXED: Prepare monthly trend data with proper formatting
  const monthlyData = stats?.monthlyStats?.length > 0 ? stats.monthlyStats.map((item: any) => ({
    month: item.month || 'Unknown', // Ensure month exists
    revenue: Number(item.revenue) || 0,
    expenses: Number(item.expenses) || 0,
    profit: Number(item.revenue || 0) - Number(item.expenses || 0)
  })) : [{
    month: 'No Data',
    revenue: 0,
    expenses: 0,  
    profit: 0
  }];

  // Payment method distribution (Cash vs Digital only)
  const paymentMethods = stats?.paymentMethodStats?.filter((item: any) => 
    item.method === 'Cash' || item.method === 'Digital'
  ).map((item: any) => ({
    name: item.method,
    value: item.amount,
    color: item.method === 'Cash' ? CHART_COLORS.cash : CHART_COLORS.digital
  })) || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-card-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: ₹{entry.value?.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const totalValue = paymentMethods.reduce((sum, item) => sum + item.value, 0);
      const percentage = totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : '0.0';
      
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-card-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Amount: ₹{data.value?.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">
            {percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
      {/* Expense Categories Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary"></div>
            Expense Distribution
          </CardTitle>
          <CardDescription>
            Breakdown of expenses by category for better cost management
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 md:p-6">
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={40}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {expenseByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {expenseByCategory.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="h-3 w-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                ></div>
                <span className="text-sm text-muted-foreground capitalize">
                  {entry.name}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods - TRUE PIE CHART */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-secondary"></div>
            Payment Methods Distribution
          </CardTitle>
          <CardDescription>
            Breakdown of all payments by method (Cash vs Digital)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 md:p-6">
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethods}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  innerRadius={0}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="white"
                >
                  {paymentMethods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {paymentMethods.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="h-3 w-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                ></div>
                <span className="text-sm text-muted-foreground">
                  {entry.name}: ₹{entry.value?.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Revenue vs Expenses */}
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-accent"></div>
            Monthly Financial Overview
          </CardTitle>
          <CardDescription>
            Revenue, expenses, and profit trends over time
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 md:p-6">
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="revenue" 
                  name="Revenue" 
                  fill={CHART_COLORS.revenue}
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="expenses" 
                  name="Expenses" 
                  fill={CHART_COLORS.expenses}
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="profit" 
                  name="Profit" 
                  fill={CHART_COLORS.profit}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RedesignedFinanceCharts;