
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { getEventStatus } from '@/lib/event-status-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSkeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Calendar,
  ClipboardList,
  Users,
  FileText,
  Download
} from 'lucide-react';
import StaffDetailedStatCard from './StaffDetailedStatCard';
import { generateStaffDashboardPDF } from './StaffDashboardPDF';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  reportedTasks: number;
  totalAssignments: number;
  completedEvents: number;
  upcomingEvents: number;
  totalEarnings: number;
  taskEarnings: number;
  assignmentEarnings: number;
  paidAmount: number;
  pendingAmount: number;
}

const StaffDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    reportedTasks: 0,
    totalAssignments: 0,
    completedEvents: 0,
    upcomingEvents: 0,
    totalEarnings: 0,
    taskEarnings: 0,
    assignmentEarnings: 0,
    paidAmount: 0,
    pendingAmount: 0
  });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);
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

      // Fetch assignments for this staff member
      const { data: assignments, error: assignmentsError } = await supabase
        .from('event_staff_assignments')
        .select(`
          *,
          event:events(
            id, title, event_type, event_date,
            client:clients(name)
          )
        `)
        .eq('staff_id', profile.id);

      if (assignmentsError) throw assignmentsError;

      // Calculate task stats
      const completedTasks = tasks?.filter(t => t.status === 'Completed').length || 0;
      const pendingTasks = tasks?.filter(t => t.status === 'Pending' || t.status === 'In Progress' || t.status === 'Waiting for Response').length || 0;
      const reportedTasks = tasks?.filter(t => t.status === 'Reported').length || 0;

      // Calculate assignment stats using proper status logic
      const completedEvents = assignments?.filter(a => 
        a.event && getEventStatus(a.event as any).label === 'COMPLETED'
      ).length || 0;
      const upcomingEvents = assignments?.filter(a => 
        a.event && ['PENDING', 'UPCOMING', 'IN PROGRESS'].includes(getEventStatus(a.event as any).label)
      ).length || 0;

      // Calculate task earnings (all task amounts regardless of status)
      const taskEarnings = tasks?.filter(t => t.amount)
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Calculate assignment earnings from staff payments 
      const assignmentEarnings = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      
      // Total earnings = task earnings + assignment earnings
      const totalEarnings = taskEarnings + assignmentEarnings;
      
      // Paid amount = only assignment payments (staff payments)
      const paidAmount = assignmentEarnings;
      
      // Pending amount = task earnings (tasks are typically unpaid/pending payment)
      const pendingAmount = taskEarnings;

      setStats({
        totalTasks: tasks?.length || 0,
        completedTasks,
        pendingTasks,
        reportedTasks,
        totalAssignments: assignments?.length || 0,
        completedEvents,
        upcomingEvents,
        totalEarnings,
        taskEarnings,
        assignmentEarnings,
        paidAmount,
        pendingAmount
      });

      // Set recent data
      setRecentTasks(tasks?.slice(0, 5) || []);
      setRecentAssignments(assignments?.slice(0, 5) || []);

    } catch (error: any) {
      // Dashboard data loading error
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      const dashboardData = {
        profile: {
          full_name: profile?.full_name || 'Unknown',
          role: profile?.role || 'Staff',
          mobile_number: profile?.mobile_number
        },
        stats,
        tasks: recentTasks.map(task => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority || 'Medium',
          due_date: task.due_date,
          amount: task.amount,
          event: task.event
        })),
        assignments: recentAssignments.map(assignment => ({
          id: assignment.id,
          event_title: assignment.event?.title || 'Unknown Event',
          event_type: assignment.event?.event_type || 'Unknown',
          event_date: assignment.event?.event_date || new Date().toISOString(),
          role: assignment.role,
          day_number: assignment.day_number,
          client_name: assignment.event?.client?.name
        }))
      };

      await generateStaffDashboardPDF(dashboardData);
      toast({
        title: "PDF Generated",
        description: "Your dashboard report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'text-green-600 font-medium';
      case 'In Progress':
        return 'text-blue-600 font-medium';
      case 'Waiting for Response':
        return 'text-orange-600 font-medium';
      case 'Pending':
        return 'text-yellow-600 font-medium';
      case 'Reported':
        return 'text-purple-600 font-medium';
      default:
        return 'text-gray-600 font-medium';
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-8 px-2 sm:px-6 py-6">
      {/* Header with PDF Export */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <Button 
          onClick={handleGeneratePDF}
          className="rounded-full px-6"
          variant="outline"
        >
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Detailed Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
        <StaffDetailedStatCard
          title="Total Tasks"
          value={stats.totalTasks}
          icon={ClipboardList}
          colorClass="bg-primary/10 text-primary"
          metadata={[
            { label: "Completed", value: stats.completedTasks, colorClass: "text-success" },
            { label: "Pending", value: stats.pendingTasks, colorClass: "text-warning" },
            { label: "Reported", value: stats.reportedTasks, colorClass: "text-info" }
          ]}
        />
        
        <StaffDetailedStatCard
          title="Total Assignments"
          value={stats.totalAssignments}
          icon={Users}
          colorClass="bg-info/10 text-info"
          metadata={[
            { label: "Completed Events", value: stats.completedEvents, colorClass: "text-success" },
            { label: "Upcoming Events", value: stats.upcomingEvents, colorClass: "text-warning" },
            { label: "Active Status", value: stats.totalAssignments > 0 ? "Active" : "~", colorClass: "text-muted-foreground" }
          ]}
        />
        
        <StaffDetailedStatCard
          title="Total Earnings"
          value={`₹${stats.totalEarnings.toLocaleString()}`}
          icon={DollarSign}
          colorClass="bg-success/10 text-success"
          metadata={[
            { label: "Task Earnings", value: `₹${stats.taskEarnings.toLocaleString()}`, colorClass: "text-primary" },
            { label: "Assignment Earnings", value: `₹${stats.assignmentEarnings.toLocaleString()}`, colorClass: "text-primary" },
            { label: "Pending Amount", value: `₹${stats.pendingAmount.toLocaleString()}`, colorClass: "text-warning" }
          ]}
        />
      </div>

      {/* Recent Tasks and Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <Card className="rounded-3xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <FileText className="h-5 w-5" />
              Recent Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">No tasks assigned yet</p>
            ) : (
              <div className="space-y-2">
                {recentTasks.map((task) => (
                  <div key={task.id} className="p-3 border rounded-2xl hover:bg-accent/50 transition-colors">
                    {/* Top row: Title and Money */}
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-sm truncate text-gray-900 flex-1 mr-2">{task.title}</h4>
                      {task.amount && (
                        <p className="text-sm font-bold text-primary whitespace-nowrap">₹{Number(task.amount).toLocaleString()}</p>
                      )}
                    </div>
                    {/* Bottom row: Event and Status */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground truncate flex-1 mr-2">
                        {task.event ? task.event.title : 'No event assigned'}
                      </p>
                      <span className={`text-xs whitespace-nowrap ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Assignments */}
        <Card className="rounded-3xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Calendar className="h-5 w-5" />
              Recent Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAssignments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">No assignments yet</p>
            ) : (
              <div className="space-y-2">
                {recentAssignments.map((assignment) => (
                  <div key={assignment.id} className="p-3 border rounded-2xl hover:bg-accent/50 transition-colors">
                    {/* Top row: Event Title and Date */}
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-sm truncate text-gray-900 flex-1 mr-2">
                        {assignment.event?.title || 'Unknown Event'}
                      </h4>
                      <p className="text-sm font-medium text-gray-900 whitespace-nowrap">
                        {assignment.event?.event_date ? new Date(assignment.event.event_date).toLocaleDateString() : '~'}
                      </p>
                    </div>
                    {/* Bottom row: Role and Event Type */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground truncate flex-1 mr-2">
                        {assignment.role} - Day {assignment.day_number}
                        {assignment.event?.client?.name && ` • ${assignment.event.client.name}`}
                      </p>
                      <span className="text-xs text-primary font-medium whitespace-nowrap">
                        {assignment.event?.event_type || 'Unknown'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffDashboard;
