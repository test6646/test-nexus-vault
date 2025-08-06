
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { handleError } from '@/lib/error-handler';
import { Task, TaskFromDB, convertDbTaskToTask } from '@/types/studio';

export const useTaskService = (firmId?: string, userId?: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadTasks = useCallback(async (): Promise<Task[]> => {
    if (!firmId) {
      return [];
    }

    try {
      setLoading(true);
      setError(null);

      

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey (id, full_name),
          creator:profiles!tasks_created_by_fkey (id, full_name),
          freelancer:freelancers!tasks_freelancer_id_fkey (id, full_name),
          event:events (
            id, 
            title, 
            event_date, 
            firm_id,
            client_id,
            event_type,
            total_amount,
            advance_amount,
            balance_amount,
            photo_editing_status,
            video_editing_status,
            storage_disk,
            storage_size,
            created_by,
            created_at,
            updated_at,
            client:clients(name)
          )
        `)
        .eq('firm_id', firmId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading tasks:', error);
        throw error;
      }

      
      
      // Convert database tasks to application tasks
      const tasks = (data || []).map((dbTask: any) => convertDbTaskToTask(dbTask as TaskFromDB));
      return tasks;
    } catch (error: any) {
      console.error('💥 Error in loadTasks:', error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  const createTask = useCallback(async (taskData: Partial<Task>): Promise<Task> => {
    if (!firmId || !userId) {
      throw new Error('Missing firm or user information');
    }

    try {
      setLoading(true);
      setError(null);

      

      // Check if assigned_to is a freelancer or staff member
      let assignedTo = null;
      let freelancerId = null;
      
      if (taskData.assigned_to) {
        // Check if this is a freelancer by looking for freelancer_ prefix
        if (taskData.assigned_to.startsWith('freelancer_')) {
          freelancerId = taskData.assigned_to.replace('freelancer_', '');
          console.log('🔍 Freelancer assignment detected:', taskData.assigned_to, '-> ID:', freelancerId);
        } else {
          assignedTo = taskData.assigned_to;
          console.log('🔍 Staff assignment detected:', assignedTo);
        }
      }

      const data = {
        title: taskData.title,
        description: taskData.description,
        status: (taskData.status || 'Waiting for Response') as any,
        priority: taskData.priority || 'Medium',
        task_type: taskData.task_type || 'Other',
        amount: taskData.amount ? Number(taskData.amount) : null,
        due_date: taskData.due_date,
        assigned_to: assignedTo,
        freelancer_id: freelancerId,
        event_id: taskData.event_id,
        firm_id: firmId,
        created_by: userId,
        is_salary_based: Boolean(taskData.is_salary_based),
        salary_details: taskData.salary_details
      };

      const { data: result, error } = await supabase
        .from('tasks')
        .insert(data)
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey (id, full_name),
          creator:profiles!tasks_created_by_fkey (id, full_name),
          freelancer:freelancers!tasks_freelancer_id_fkey (id, full_name),
          event:events (
            id, 
            title, 
            event_date, 
            firm_id,
            client_id,
            event_type,
            total_amount,
            advance_amount,
            balance_amount,
            photo_editing_status,
            video_editing_status,
            storage_disk,
            storage_size,
            created_by,
            created_at,
            updated_at,
            client:clients(name)
          )
        `)
        .single();

      if (error) {
        console.error('❌ Error creating task:', error);
        throw error;
      }

      
      
      // ✅ BACKGROUND GOOGLE SHEETS SYNC - Non-blocking
      import('@/services/googleSheetsSync').then(({ syncTaskInBackground }) => {
        syncTaskInBackground(result.id, firmId, 'create');
      }).catch(console.error);

      toast({
        title: "Task created",
        description: "Task has been created successfully.",
      });

      // Convert database task to application task
      return convertDbTaskToTask(result as TaskFromDB);
    } catch (error: any) {
      console.error('💥 Error in createTask:', error);
      setError(error.message);
      toast({
        title: "Error creating task",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [firmId, userId, toast]);

  const updateTask = useCallback(async (taskId: string, updates: any) => {
    if (!firmId) {
      throw new Error('Missing firm information');
    }

    try {
      setLoading(true);
      setError(null);

      

      // First get the current task data to have task_type and event_id if not provided
      const { data: currentTask, error: fetchError } = await supabase
        .from('tasks')
        .select('task_type, event_id')
        .eq('id', taskId)
        .eq('firm_id', firmId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching current task:', fetchError);
        throw fetchError;
      }

      // Prepare update payload with proper data types
      const updatePayload: any = {};
      
      if (updates.title !== undefined) updatePayload.title = updates.title;
      if (updates.description !== undefined) updatePayload.description = updates.description;
      if (updates.status !== undefined) updatePayload.status = updates.status;
      if (updates.priority !== undefined) updatePayload.priority = updates.priority;
      if (updates.task_type !== undefined) updatePayload.task_type = updates.task_type;
      if (updates.amount !== undefined) updatePayload.amount = updates.amount ? Number(updates.amount) : null;
      if (updates.due_date !== undefined) updatePayload.due_date = updates.due_date;
      
      // Handle assignment to staff vs freelancers
      if (updates.assigned_to !== undefined) {
        if (updates.assigned_to && updates.assigned_to.startsWith('freelancer_')) {
          updatePayload.assigned_to = null;
          updatePayload.freelancer_id = updates.assigned_to.replace('freelancer_', '');
          console.log('🔍 Updating freelancer assignment:', updates.assigned_to, '-> ID:', updatePayload.freelancer_id);
        } else {
          updatePayload.assigned_to = updates.assigned_to;
          updatePayload.freelancer_id = null;
          console.log('🔍 Updating staff assignment:', updates.assigned_to);
        }
      }
      
      if (updates.event_id !== undefined) updatePayload.event_id = updates.event_id;
      if (updates.is_salary_based !== undefined) updatePayload.is_salary_based = Boolean(updates.is_salary_based);
      if (updates.salary_details !== undefined) updatePayload.salary_details = updates.salary_details;
      
      // Set completed_at when status changes to Completed
      if (updates.status === 'Completed') {
        updatePayload.completed_at = new Date().toISOString();
        
        // Use current task data for task_type and event_id if not in updates
        const taskType = updatePayload.task_type || currentTask.task_type;
        const eventId = updatePayload.event_id || currentTask.event_id;
        
        // Call edge function to update event editing status
        if (taskType && (taskType === 'Photo Editing' || taskType === 'Video Editing') && eventId) {
          try {
            const { error: functionError } = await supabase.functions.invoke('update-event-editing-status', {
              body: {
                eventId: eventId,
                taskType: taskType,
                isCompleted: true
              }
            });
            
            if (functionError) {
              console.error('Error updating event editing status:', functionError);
            } else {
              
            }
          } catch (error) {
            console.error('Error calling update-event-editing-status function:', error);
          }
        }
      } else if (updates.status && updates.status !== 'Completed') {
        updatePayload.completed_at = null;
        
        // Use current task data for task_type and event_id if not in updates
        const taskType = updatePayload.task_type || currentTask.task_type;
        const eventId = updatePayload.event_id || currentTask.event_id;
        
        // Reset event editing status if task is uncompleted
        if (taskType && (taskType === 'Photo Editing' || taskType === 'Video Editing') && eventId) {
          try {
            const { error: functionError } = await supabase.functions.invoke('update-event-editing-status', {
              body: {
                eventId: eventId,
                taskType: taskType,
                isCompleted: false
              }
            });
            
            if (functionError) {
              console.error('Error resetting event editing status:', functionError);
            }
          } catch (error) {
            console.error('Error calling update-event-editing-status function:', error);
          }
        }
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updatePayload)
        .eq('id', taskId)
        .eq('firm_id', firmId) // Ensure firm access
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating task:', error);
        throw error;
      }

      // ✅ BACKGROUND GOOGLE SHEETS SYNC - Non-blocking
      import('@/services/googleSheetsSync').then(({ syncTaskInBackground }) => {
        syncTaskInBackground(taskId, firmId, 'update');
      }).catch(console.error);
      
      toast({
        title: "Task updated",
        description: "Task has been updated successfully.",
      });

      // Trigger real-time update for salary calculations
      if (updatePayload.amount !== undefined || updatePayload.status !== undefined) {
        console.log('🔄 Task amount/status updated, triggering salary refresh...');
      }

      return data;
    } catch (error: any) {
      console.error('💥 Error in updateTask:', error);
      setError(error.message);
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [firmId, toast]);

  const updateTaskStatus = useCallback(async (taskId: string, status: string) => {
    return updateTask(taskId, { status });
  }, [updateTask]);

  return {
    loadTasks,
    createTask,
    updateTask,
    updateTaskStatus,
    loading,
    error
  };
};
