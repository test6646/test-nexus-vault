
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
  const [freelancers, setFreelancers] = useState<any[]>([]);
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
          assigned_staff:profiles!tasks_assigned_to_fkey(full_name, role),
          freelancer:freelancers!tasks_freelancer_id_fkey(full_name, role)
        `);

      if (isAdmin && currentFirmId) {
        // Admin sees all tasks for their firm
        query = query.eq('firm_id', currentFirmId);
      } else if (profile?.id) {
        // Staff/Freelancer only sees tasks assigned to them
        query = query.eq('assigned_to', profile.id);
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
      // Error loading tasks
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
      // Error loading events
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

      // Exclude Admins from staff assignment options
      const nonAdminProfiles = (profilesData.data || []).filter(p => p.role !== 'Admin');

      const allStaff = [
        ...nonAdminProfiles.map(p => ({
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
      setFreelancers(freelancersData.data || []);
    } catch (error: any) {
      // Error loading staff members
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
        }).catch(syncError => {
          // Failed to sync task status to Google Sheets
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
          // Check if this applies to BOTH staff and freelancer assignments
          if (status === 'Completed' && taskData.event_id) {
            // Check for photo editing tasks
            const isPhotoTask = taskData.task_type === 'Photo Editing' || 
                               (taskData.title && taskData.title.toLowerCase().includes('photo')) ||
                               (taskData.description && taskData.description.toLowerCase().includes('photo'));
            
            // Check for video editing tasks  
            const isVideoTask = taskData.task_type === 'Video Editing' ||
                               (taskData.title && taskData.title.toLowerCase().includes('video')) ||
                               (taskData.description && taskData.description.toLowerCase().includes('video'));

            if (isPhotoTask) {
              supabase.functions.invoke('update-event-editing-status', {
                body: {
                  eventId: taskData.event_id,
                  taskType: 'Photo Editing',
                  isCompleted: true
                }
              }).catch(() => {
                // Photo editing status update failed
              });
            }

            if (isVideoTask) {
              supabase.functions.invoke('update-event-editing-status', {
                body: {
                  eventId: taskData.event_id,
                  taskType: 'Video Editing',
                  isCompleted: true
                }
              }).catch(() => {
                // Video editing status update failed
              });
            }
          }

          // ✅ FIX: Send notification for task assignment and task reporting to freelancers
          if (taskData.freelancer_id) {
            import('@/hooks/useTaskNotifications').then(({ useTaskNotifications }) => {
              const { sendTaskNotification } = useTaskNotifications();
              
              if (status === 'Completed') {
                // Send task reporting notification
                sendTaskNotification({
                  taskId: taskId,
                  taskTitle: taskData.title,
                  freelancerId: taskData.freelancer_id,
                  eventName: taskData.event?.title,
                  firmId: currentFirmId,
                  notificationType: 'task_reported'
                });
              }
            }).catch(() => {});
          }

          

        });
      
    } catch (error: any) {
      // Error updating task status
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

  const deleteTask = async (taskId: string) => {
    // Get task data BEFORE deletion for notifications
    const { data: taskData, error: fetchError } = await supabase
      .from('tasks')
      .select(`
        *,
        event:events(title)
      `)
      .eq('id', taskId)
      .single();

    if (fetchError) {
      console.error('Error fetching task for deletion:', fetchError);
      throw fetchError;
    }

    // Delete the task
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Error deleting task:', error);
      throw error;
    }

    // Send deletion notification if task was assigned
    if (taskData && (taskData.assigned_to || taskData.freelancer_id)) {
      try {
        await supabase.functions.invoke('send-task-deletion-notifications', {
          body: {
            taskData: {
              ...taskData,
              event: taskData.event
            },
            firmId: currentFirmId
          }
        });
        console.log('✅ Task deletion notification sent');
      } catch (notificationError) {
        console.warn('⚠️ Failed to send task deletion notification:', notificationError);
        // Don't throw - deletion was successful, notification failure is not critical
      }
    }

    // Update local state
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));

    // Sync deletion to Google Sheets in background
    if (currentFirmId) {
      import('@/services/googleSheetsSync').then(({ syncTaskInBackground }) => {
        syncTaskInBackground(taskId, currentFirmId, 'delete');
      }).catch(syncError => {
        console.warn('Failed to sync task deletion to Google Sheets:', syncError);
      });
    }

    toast({
      title: "Task deleted",
      description: "Task has been permanently deleted and notifications sent.",
    });
  };

  return {
    tasks,
    events,
    staffMembers,
    freelancers,
    loading,
    isAdmin,
    loadTasks,
    updateTaskStatus,
    deleteTask
  };
};
