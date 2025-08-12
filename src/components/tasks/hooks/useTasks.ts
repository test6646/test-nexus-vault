
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Task, Event, TaskStatus } from '@/types/studio';

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  mobile_number: string;
}

export const useTasks = () => {
  const { profile, user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const isAdmin = profile?.role === 'Admin';
  const { currentFirmId } = useAuth();

  const loadTasks = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('tasks')
        .select(`
          *,
          event:events(id, title, client:clients(name)),
          assigned_staff:profiles!tasks_assigned_to_fkey(id, full_name, role),
          freelancer:freelancers!tasks_freelancer_id_fkey(id, full_name, role)
        `);

      if (isAdmin && currentFirmId) {
        query = query.eq('firm_id', currentFirmId);
      } else if (profile?.id) {
        query = query.or(`assigned_to.eq.${profile.id},freelancer_id.eq.${profile.id}`);
      } else {
        setTasks([]);
        setLoading(false);
        return;
      }

      query = query.order('due_date', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      setTasks(data as any || []);
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      toast({
        title: "Error loading tasks",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    if (!currentFirmId) return;
    
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, event_type')
        .eq('firm_id', currentFirmId)
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data as any || []);
    } catch (error: any) {
      console.error('Error loading events:', error);
    }
  };

  const loadStaffMembers = async () => {
    if (!currentFirmId) return;
    
    try {
      const [profilesData, freelancersData] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, role, mobile_number')
          .eq('firm_id', currentFirmId)
          .order('full_name'),
        
        supabase
          .from('freelancers')
          .select('id, full_name, role, phone')
          .eq('firm_id', currentFirmId)
          .order('full_name')
      ]);

      if (profilesData.error) throw profilesData.error;
      if (freelancersData.error) throw freelancersData.error;

      const allStaff = [
        ...(profilesData.data || []).map(p => ({
          id: p.id,
          full_name: p.full_name,
          role: p.role,
          mobile_number: p.mobile_number || '',
          is_freelancer: false
        })),
        ...(freelancersData.data || []).map(f => ({
          id: f.id,
          full_name: f.full_name,
          role: f.role,
          mobile_number: f.phone || '',
          is_freelancer: true
        }))
      ];

      setStaffMembers(allStaff as any);
    } catch (error: any) {
      console.error('Error loading staff members:', error);
    }
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      // OPTIMISTIC UPDATE: Update UI immediately
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, status, completed_at: status === 'Completed' ? new Date().toISOString() : task.completed_at }
            : task
        )
      );

      toast({
        title: "Task status updated",
        description: `Task marked as ${status.toLowerCase()}`,
      });

      // Background operations
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === 'Completed') {
        updates.completed_at = new Date().toISOString();
      }

      // Start database update in background
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) {
        // Revert optimistic update on error
        loadTasks();
        throw error;
      }

      // ✅ ENHANCED: Sync to Google Sheets in background using centralized service
      if (currentFirmId) {
        import('@/services/googleSheetsSync').then(({ syncTaskInBackground }) => {
          syncTaskInBackground(taskId, currentFirmId, 'update');
          console.log(`🔄 Task ${taskId} status synced to Google Sheets`);
        }).catch(syncError => {
          console.error('❌ Failed to sync task status to Google Sheets:', syncError);
        });
      }

      // Background operations - don't await to keep UI responsive
      supabase
        .from('tasks')
        .select(`
          *,
          event:events(title),
          assigned_staff:profiles!tasks_assigned_to_fkey(full_name, mobile_number),
          freelancer:freelancers!tasks_freelancer_id_fkey(full_name, phone)
        `)
        .eq('id', taskId)
        .single()
        .then(({ data: taskData }) => {
          if (!taskData) return;

          // ✅ CRITICAL: Update event editing status when photo/video task is completed
          if ((taskData.task_type === 'Photo Editing' || taskData.task_type === 'Video Editing') && status === 'Completed' && taskData.event_id) {
            supabase.functions.invoke('update-event-editing-status', {
              body: {
                eventId: taskData.event_id,
                taskType: taskData.task_type,
                isCompleted: true
              }
            }).catch(editingError => {
              console.error('Error updating event editing status:', editingError);
            });
          }

          

        });
      
    } catch (error: any) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error updating task status",
        description: error.message,
        variant: "destructive",
      });
      // Revert optimistic update
      loadTasks();
    }
  };

  useEffect(() => {
    // Only load tasks when we have user data
    if (user && profile) {
      loadTasks();
      if (isAdmin && currentFirmId) {
        loadEvents();
        loadStaffMembers();
      }
    }
  }, [user, profile, isAdmin, currentFirmId]); // ✅ Depend on user, not just profile

  return {
    tasks,
    events,
    staffMembers,
    loading,
    isAdmin,
    loadTasks,
    updateTaskStatus
  };
};
