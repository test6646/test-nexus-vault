
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSkeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Calendar, 
  User,
  TrendingUp,
  AlertTriangle,
  ClipboardList
} from 'lucide-react';
import StatsGrid from '@/components/ui/stats-grid';

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueLength: number;
  totalEarnings: number;
  thisMonthEarnings: number;
  upcomingEvents: number;
}

const StaffDashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueLength: 0,
    totalEarnings: 0,
    thisMonthEarnings: 0,
    upcomingEvents: 0
  });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchDashboardData();
    }
  }, [profile?.id]);

  const fetchDashboardData = async () => {
    if (!profile?.id) return;

    try {
      // Fetch tasks assigned to this staff member (including freelancer tasks)
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          event:events(title, event_date)
        `)
        .or(`assigned_to.eq.${profile.id},freelancer_id.eq.${profile.id}`);

      if (tasksError) throw tasksError;

      // Fetch staff payments
      const { data: payments, error: paymentsError } = await supabase
        .from('staff_payments')
        .select('amount, payment_date')
        .eq('staff_id', profile.id);

      if (paymentsError) throw paymentsError;

      // Fetch upcoming events where user is assigned
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          id, title, event_date,
          event_staff_assignments!inner(staff_id)
        `)
        .eq('event_staff_assignments.staff_id', profile.id)
        .gte('event_date', new Date().toISOString().split('T')[0]);

      if (eventsError) throw eventsError;

      // Calculate stats
      const completedTasks = tasks?.filter(t => t.status === 'Completed').length || 0;
      const pendingTasks = tasks?.filter(t => t.status !== 'Completed').length || 0;
      const overdueTasks = tasks?.filter(t => 
        t.due_date && 
        new Date(t.due_date) < new Date() && 
        t.status !== 'Completed'
      ).length || 0;

      // Calculate task-based earnings (from tasks with amounts)
      const taskEarnings = tasks?.filter(t => t.amount && t.status === 'Completed')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Calculate salary-based earnings (from staff_payments)
      const salaryEarnings = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      
      const totalEarnings = taskEarnings + salaryEarnings;
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const thisMonthTaskEarnings = tasks?.filter(t => 
        t.amount && 
        t.status === 'Completed' && 
        t.completed_at && 
        new Date(t.completed_at) >= thisMonth
      ).reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      
      const thisMonthSalaryEarnings = payments?.filter(p => 
        new Date(p.payment_date) >= thisMonth
      ).reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      
      const thisMonthEarnings = thisMonthTaskEarnings + thisMonthSalaryEarnings;

      setStats({
        totalTasks: tasks?.length || 0,
        completedTasks,
        pendingTasks,
        overdueLength: overdueTasks,
        totalEarnings,
        thisMonthEarnings,
        upcomingEvents: events?.length || 0
      });

      // Set recent tasks
      setRecentTasks(tasks?.slice(0, 5) || []);

    } catch (error: any) {
      // Dashboard data loading error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  const statsData = [
    {
      title: "Total Tasks",
      value: stats.totalTasks,
      icon: <ClipboardList className="h-4 w-4" />,
      colorClass: "bg-primary/10 text-primary"
    },
    {
      title: "Completed",
      value: stats.completedTasks,
      icon: <CheckCircle className="h-4 w-4" />,
      colorClass: "bg-success/10 text-success"
    },
    {
      title: "Pending",
      value: stats.pendingTasks,
      icon: <Clock className="h-4 w-4" />,
      colorClass: "bg-warning/10 text-warning"
    },
    {
      title: "Overdue",
      value: stats.overdueLength,
      icon: <AlertTriangle className="h-4 w-4" />,
      colorClass: "bg-destructive/10 text-destructive"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
        <p className="text-muted-foreground">Welcome back, {profile?.full_name}</p>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={statsData} />

      {/* Earnings Stats */}
      <StatsGrid stats={[
        {
          title: "Total Earnings",
          value: `₹${stats.totalEarnings.toLocaleString()}`,
          icon: <DollarSign className="h-4 w-4" />,
          colorClass: "bg-primary/10 text-primary"
        },
        {
          title: "This Month",
          value: `₹${stats.thisMonthEarnings.toLocaleString()}`,
          icon: <TrendingUp className="h-4 w-4" />,
          colorClass: "bg-primary/10 text-primary"
        },
        {
          title: "Upcoming Events",
          value: stats.upcomingEvents,
          icon: <Calendar className="h-4 w-4" />,
          colorClass: "bg-primary/10 text-primary"
        }
      ]} />

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentTasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No tasks assigned yet</p>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{task.title}</h4>
                    {task.event && (
                      <p className="text-sm text-muted-foreground">Event: {task.event.title}</p>
                    )}
                    {task.amount && (
                      <p className="text-sm font-medium text-primary">Amount: ₹{Number(task.amount).toLocaleString()}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      task.status === 'Completed' 
                        ? 'bg-status-completed-bg text-status-completed border border-status-completed-border'
                        : 'bg-status-pending-bg text-status-pending border border-status-pending-border'
                    }`}>
                      {task.status}
                    </div>
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffDashboard;
