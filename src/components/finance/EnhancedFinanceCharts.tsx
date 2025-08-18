import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ChartHistogramIcon, 
  ChartLineData02Icon, 
  PieChartIcon,
  MoneyBag02Icon,
  CreditCardIcon,
  AnalyticsUpIcon,
  Calendar03Icon
} from 'hugeicons-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { getDateRangeForFinance } from '@/lib/date-utils';

interface EnhancedFinanceChartsProps {
  stats: {
    totalEvents: number;
    totalRevenue: number;
    pendingAmount: number;
    totalExpenses: number;
    activeEvents: number;
    completedEvents: number;
    monthlyRevenue: number;
    paymentIn: number;
    paymentOut: number;
    netProfit: number;
  };
  timeRange: string;
  customStartDate?: string;
  customEndDate?: string;
}

const EnhancedFinanceCharts = ({ stats, timeRange, customStartDate, customEndDate }: EnhancedFinanceChartsProps) => {
  const { profile, currentFirmId } = useAuth();
  const [timeBasedData, setTimeBasedData] = useState<any[]>([]);
  const [categoryExpenses, setCategoryExpenses] = useState<any[]>([]);

  // Enhanced color palette using design system
  const COLORS = {
    primary: 'hsl(var(--primary))',
    primaryLight: 'hsl(var(--primary) / 0.8)',
    primaryDark: 'hsl(var(--primary) / 0.6)',
    primaryVeryLight: 'hsl(var(--primary) / 0.4)',
    primaryMuted: 'hsl(var(--primary) / 0.5)',
    success: 'hsl(var(--success))',
    warning: 'hsl(var(--warning))',
    destructive: 'hsl(var(--destructive))',
    secondary: 'hsl(var(--secondary))',
    muted: 'hsl(var(--muted))',
    mutedForeground: 'hsl(var(--muted-foreground))',
    border: 'hsl(var(--border))'
  };

  useEffect(() => {
    if (currentFirmId) {
      loadTimeBasedData();
      loadCategoryExpenses();
    }
  }, [timeRange, currentFirmId, customStartDate, customEndDate]);

  const loadTimeBasedData = async () => {
    if (!currentFirmId) return;

    try {
      let startDate: Date;
      let labels: string[] = [];
      let groupBy: string = '';

      if (timeRange === 'custom' && customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        const endDate = new Date(customEndDate);
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 7) {
          // Daily view for custom range <= 7 days
          for (let i = 0; i < daysDiff; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            labels.push(date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }));
          }
          groupBy = 'daily';
        } else if (daysDiff <= 60) {
          // Weekly view for custom range <= 60 days
          const weeks = Math.ceil(daysDiff / 7);
          for (let i = 0; i < weeks; i++) {
            labels.push(`Week ${i + 1}`);
          }
          groupBy = 'weekly';
        } else {
          // Monthly view for larger ranges
          const months = Math.ceil(daysDiff / 30);
          for (let i = 0; i < months; i++) {
            const date = new Date(startDate);
            date.setMonth(startDate.getMonth() + i);
            labels.push(date.toLocaleDateString('en-GB', { month: 'short' }));
          }
          groupBy = 'monthly';
        }
      } else {
        const { startDate: calculatedStart } = getDateRangeForFinance(timeRange);
        startDate = calculatedStart;

        switch (timeRange) {
          case 'week':
            labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            groupBy = 'daily';
            break;
          case 'month':
            labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
            groupBy = 'weekly';
            break;
          case 'quarter':
            const quarterStart = Math.floor(new Date().getMonth() / 3) * 3;
            for (let i = 0; i < 3; i++) {
              const monthDate = new Date();
              monthDate.setMonth(quarterStart + i);
              labels.push(monthDate.toLocaleDateString('en-GB', { month: 'short' }));
            }
            groupBy = 'monthly';
            break;
          case 'year':
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            groupBy = 'monthly';
            break;
          default:
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
            groupBy = 'monthly';
        }
      }

      // Generate real time-based data
      const data = await Promise.all(labels.map(async (label, index) => {
        let periodStart: Date;
        let periodEnd: Date;

        if (groupBy === 'daily') {
          periodStart = new Date(startDate);
          periodStart.setDate(startDate.getDate() + index);
          periodEnd = new Date(periodStart);
          periodEnd.setDate(periodEnd.getDate() + 1);
        } else if (groupBy === 'weekly') {
          periodStart = new Date(startDate);
          periodStart.setDate(startDate.getDate() + (index * 7));
          periodEnd = new Date(periodStart);
          periodEnd.setDate(periodEnd.getDate() + 7);
        } else {
          periodStart = new Date(startDate);
          periodStart.setMonth(startDate.getMonth() + index);
          periodEnd = new Date(periodStart);
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        // Fetch payments for this period
        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('firm_id', currentFirmId)
          .gte('payment_date', periodStart.toISOString().split('T')[0])
          .lt('payment_date', periodEnd.toISOString().split('T')[0]);

        // Fetch staff payments for this period
        const { data: staffPayments } = await supabase
          .from('staff_payments')
          .select('amount')
          .eq('firm_id', currentFirmId)
          .gte('payment_date', periodStart.toISOString().split('T')[0])
          .lt('payment_date', periodEnd.toISOString().split('T')[0]);

        // Fetch expenses for this period
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('firm_id', currentFirmId)
          .gte('expense_date', periodStart.toISOString().split('T')[0])
          .lt('expense_date', periodEnd.toISOString().split('T')[0]);

        const paymentIn = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const paymentOut = staffPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const periodExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
        const profit = paymentIn - paymentOut - periodExpenses;

        return {
          period: label,
          paymentIn,
          paymentOut,
          expenses: periodExpenses,
          profit
        };
      }));

      setTimeBasedData(data);
    } catch (error) {
      console.error('Error loading time-based data:', error);
    }
  };

  const loadCategoryExpenses = async () => {
    if (!currentFirmId) return;

    try {
      let startDate: Date;
      if (timeRange === 'custom' && customStartDate) {
        startDate = new Date(customStartDate);
      } else {
        const { startDate: calculatedStart } = getDateRangeForFinance(timeRange);
        startDate = calculatedStart;
      }

      const endDate = timeRange === 'custom' && customEndDate ? new Date(customEndDate) : new Date();

      const { data: expenses } = await supabase
        .from('expenses')
        .select('category, amount')
        .eq('firm_id', currentFirmId)
        .gte('expense_date', startDate.toISOString().split('T')[0])
        .lte('expense_date', endDate.toISOString().split('T')[0]);

      const categoryTotals = expenses?.reduce((acc: any, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {}) || {};

      const categoryData = Object.entries(categoryTotals).map(([category, amount], index) => ({
        name: category,
        value: amount as number,
        fill: [COLORS.primary, COLORS.success, COLORS.warning, COLORS.destructive, COLORS.secondary][index % 5]
      }));

      setCategoryExpenses(categoryData);
    } catch (error) {
      console.error('Error loading category expenses:', error);
    }
  };

  // Payment flow data
  const paymentFlowData = [
    {
      name: 'Payment In',
      amount: stats.paymentIn,
      fill: COLORS.success
    },
    {
      name: 'Payment Out',
      amount: stats.paymentOut,
      fill: COLORS.warning
    },
    {
      name: 'Expenses',
      amount: stats.totalExpenses,
      fill: COLORS.destructive
    },
    {
      name: 'Net Profit',
      amount: stats.netProfit,
      fill: stats.netProfit >= 0 ? COLORS.success : COLORS.destructive
    }
  ];

  // Events status data - need to fetch date-based data
  const [eventsStatusData, setEventsStatusData] = useState([
    { name: 'Completed', value: stats.completedEvents, fill: COLORS.success },
    { name: 'Active', value: stats.activeEvents, fill: COLORS.warning }
  ]);

  useEffect(() => {
    if (currentFirmId) {
      loadEventsByDateRange();
    }
  }, [timeRange, currentFirmId, customStartDate, customEndDate]);

  const loadEventsByDateRange = async () => {
    if (!currentFirmId) return;

    try {
      let startDate: Date;
      let endDate: Date;

      if (timeRange === 'custom' && customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
      } else {
        const { startDate: calculatedStart } = getDateRangeForFinance(timeRange);
        startDate = calculatedStart;
        endDate = new Date();
      }

      const { data: events } = await supabase
        .from('events')
        .select('event_date')
        .eq('firm_id', currentFirmId)
        .gte('event_date', startDate.toISOString().split('T')[0])
        .lte('event_date', endDate.toISOString().split('T')[0]);

      const completed = events?.filter(event => new Date(event.event_date) <= new Date()).length || 0;
      const active = (events?.length || 0) - completed;

      setEventsStatusData([
        { name: 'Completed', value: completed, fill: COLORS.success },
        { name: 'Active', value: active, fill: COLORS.warning }
      ]);
    } catch (error) {
      console.error('Error loading events by date range:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Financial Overview */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-3">
            <ChartHistogramIcon className="h-5 w-5 text-primary" />
            Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={paymentFlowData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} opacity={0.3} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: COLORS.mutedForeground, fontSize: 12 }}
                axisLine={{ stroke: COLORS.mutedForeground }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis 
                tick={{ fill: COLORS.mutedForeground, fontSize: 12 }}
                axisLine={{ stroke: COLORS.mutedForeground }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                width={60}
              />
              <Tooltip 
                formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Amount']}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Bar 
                dataKey="amount" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Time-based Trend Analysis */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-3">
            <ChartLineData02Icon className="h-5 w-5 text-primary" />
            Trends Over Time
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={timeBasedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} opacity={0.3} />
              <XAxis 
                dataKey="period" 
                tick={{ fill: COLORS.mutedForeground, fontSize: 12 }}
                axisLine={{ stroke: COLORS.mutedForeground }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis 
                tick={{ fill: COLORS.mutedForeground, fontSize: 12 }}
                axisLine={{ stroke: COLORS.mutedForeground }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                width={60}
              />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  const labels = {
                    paymentIn: 'Payment In',
                    paymentOut: 'Payment Out', 
                    expenses: 'Expenses',
                    profit: 'Net Profit'
                  };
                  return [`₹${value.toLocaleString()}`, labels[name as keyof typeof labels] || name];
                }}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line 
                type="monotone" 
                dataKey="paymentIn" 
                stroke={COLORS.success} 
                strokeWidth={3}
                name="Payment In"
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="paymentOut" 
                stroke={COLORS.warning} 
                strokeWidth={3}
                name="Payment Out"
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke={COLORS.primary} 
                strokeWidth={3}
                name="Net Profit"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Events Status */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Events Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={eventsStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {eventsStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [value, 'Events']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={20}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <MoneyBag02Icon className="h-5 w-5 text-primary" />
              Expense Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {categoryExpenses.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryExpenses}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryExpenses.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Amount']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={20}
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-muted-foreground">
                <div className="text-center">
                  <MoneyBag02Icon className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs md:text-sm">No expense data</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default EnhancedFinanceCharts;