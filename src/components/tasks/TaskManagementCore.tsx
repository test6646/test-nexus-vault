import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTaskService } from '@/hooks/useTaskService';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { PageTableSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tick02Icon, Add01Icon, Calendar01Icon, Clock01Icon } from 'hugeicons-react';
import { CheckCircle } from 'lucide-react';
import { Task } from '@/types/studio';
import { TASK_STATUSES } from '@/lib/task-status-utils';
import StatsGrid from '@/components/ui/stats-grid';
import UnifiedSearchFilter from '@/components/common/UnifiedSearchFilter';
import EnhancedTaskCardForStaff from './EnhancedTaskCardForStaff';
import TaskTableView from './TaskTableView';
import { TaskFormDialog } from './TaskFormDialog';
import { EmptyState } from '@/components/ui/empty-state';

interface SimpleEvent {
  id: string;
  title: string;
}

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  mobile_number: string;
}

const TaskManagementCore = () => {
  const { profile, user } = useAuth(); // ✅ Get user from auth
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<SimpleEvent[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('due_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const isAdmin = profile?.role === 'Admin';
  const currentFirmId = profile?.current_firm_id;

  const { loadTasks, createTask, updateTask, loading } = useTaskService(
    currentFirmId,
    profile?.id // ✅ CRITICAL FIX: Use profile.id for consistency
  );

  useEffect(() => {
    // ✅ CRITICAL: Only load when we have profile data
    if (profile?.id) {
      // Load tasks based on user role
      loadTasksData();
      if (isAdmin && currentFirmId) {
        loadEvents();
        loadStaffMembers();
      }
    }
  }, [profile?.id, isAdmin, currentFirmId]); // ✅ Depend on profile.id

  const loadTasksData = async () => {
    if (!profile?.id) return;
    
    try {
      const allTasks = await loadTasks();
      
      // ✅ CRITICAL: Filter tasks based on user role using profile.id
      let filteredTasks = allTasks as Task[];
      if (!isAdmin && profile?.id) {
        // Non-admin users only see tasks assigned to their profile
        filteredTasks = (allTasks as Task[]).filter(task => task.assigned_to === profile.id);
        // Staff sees only their assigned tasks
      } else {
        // Admin sees all tasks
      }
      
      setTasks(filteredTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadEvents = async () => {
    if (!currentFirmId) return;
    
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title')
        .eq('firm_id', currentFirmId)
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      console.error('Error loading events:', error);
    }
  };

  const loadStaffMembers = async () => {
    if (!currentFirmId) return;
    
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, current_firm_id, firm_id, mobile_number')
        .or(`current_firm_id.eq.${currentFirmId},firm_id.eq.${currentFirmId}`)
        .order('full_name');

      if (error) throw error;

      const { data: members, error: membersError } = await supabase
        .from('firm_members')
        .select(`
          profiles!inner(id, full_name, role, mobile_number)
        `)
        .eq('firm_id', currentFirmId);

      if (membersError) throw membersError;

      const allStaff = [
        ...(profiles || []),
        ...(members?.map(m => m.profiles).filter(Boolean) || [])
      ];

      const validStaff = allStaff.filter((staff: any) => 
        staff && 
        typeof staff === 'object' && 
        'id' in staff && 
        'full_name' in staff && 
        'role' in staff
      );
      
      const uniqueStaff: StaffMember[] = validStaff
        .map((staff: any) => ({
          id: staff.id,
          full_name: staff.full_name,
          role: staff.role,
          mobile_number: staff.mobile_number || ''
        }))
        .filter((staff, index, self) => 
          index === self.findIndex(s => s.id === staff.id)
        );

      setStaffMembers(uniqueStaff);
    } catch (error: any) {
      console.error('Error loading staff members:', error);
    }
  };

  const handleTaskSuccess = async () => {
    await loadTasksData();
    setIsDialogOpen(false);
    setEditingTask(null);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const handleNewTask = () => {
    setEditingTask(null);
    setIsDialogOpen(true);
  };

  const filteredAndSortedTasks = tasks
    .filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'due_date':
          const aDate = a.due_date ? new Date(a.due_date).getTime() : 0;
          const bDate = b.due_date ? new Date(b.due_date).getTime() : 0;
          comparison = aDate - bDate;
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const getStats = () => {
    const totalTasks = tasks.length;
    const completedTasksCount = tasks.filter(t => t.status === 'Completed').length;
    const pendingTasksCount = tasks.filter(t => t.status === 'Pending').length;
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
    
    return { totalTasks, completedTasksCount, pendingTasksCount, inProgressTasks };
  };

  const stats = getStats();

  if (loading) {
    return <PageTableSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Tasks
        </h1>
        {isAdmin && (
          <Button onClick={handleNewTask} className="rounded-full p-3">
            <Add01Icon className="h-4 w-4" />
          </Button>
        )}
      </div>

      <StatsGrid stats={[
        {
          title: "Total Tasks",
          value: stats.totalTasks,
          icon: <Tick02Icon className="h-4 w-4" />,
          colorClass: "bg-blue-100 text-blue-600"
        },
        {
          title: "Pending",
          value: stats.pendingTasksCount,
          icon: <Clock01Icon className="h-4 w-4" />,
          colorClass: "bg-orange-100 text-orange-600"
        },
        {
          title: "In Progress",
          value: stats.inProgressTasks,
          icon: <Calendar01Icon className="h-4 w-4" />,
          colorClass: "bg-purple-100 text-purple-600"
        },
        {
          title: "Completed",
          value: stats.completedTasksCount,
          icon: <Tick02Icon className="h-4 w-4" />,
          colorClass: "bg-green-100 text-green-600"
        }
      ]} />

      <UnifiedSearchFilter
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilters={TASK_STATUSES.map(status => ({
          value: status,
          label: status
        }))}
        selectedStatus={statusFilter}
        onStatusChange={setStatusFilter}
        sortOptions={[
          { value: 'due_date', label: 'Due Date' },
          { value: 'title', label: 'Title' },
          { value: 'created_at', label: 'Created Date' },
          { value: 'status', label: 'Status' }
        ]}
        selectedSort={sortBy}
        onSortChange={setSortBy}
        sortDirection={sortDirection}
        onSortDirectionChange={setSortDirection}
        placeholder="Search tasks by title or description..."
        className="mb-6"
      />

      {filteredAndSortedTasks.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title={isAdmin ? 'No Tasks Yet' : 'No Tasks Assigned'}
          description={isAdmin 
            ? 'Start organizing your workflow by creating your first task.'
            : 'You have no tasks assigned to you at the moment.'
          }
          action={isAdmin ? {
            label: "Add Task",
            onClick: handleNewTask
          } : undefined}
        />
      ) : (
        <>
          {isAdmin ? (
            <TaskTableView 
              tasks={filteredAndSortedTasks} 
              onEdit={handleEdit}
              onStatusChange={loadTasksData}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredAndSortedTasks.map((task) => (
                <EnhancedTaskCardForStaff
                  key={task.id}
                  task={task}
                  onStatusChange={loadTasksData}
                />
              ))}
            </div>
          )}
        </>
      )}

      {isAdmin && (
        <TaskFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSuccess={handleTaskSuccess}
          editingTask={editingTask}
          events={events}
          staffMembers={staffMembers}
        />
      )}
    </div>
  );
};

export default TaskManagementCore;
