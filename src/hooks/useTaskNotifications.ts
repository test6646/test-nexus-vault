import { supabase } from '@/integrations/supabase/client';

interface TaskNotificationData {
  taskId: string;
  taskTitle: string;
  assignedTo?: string;
  freelancerId?: string;
  eventName?: string;
  firmId: string;
  notificationType: 'task_assignment' | 'task_reported';
}

export const useTaskNotifications = () => {
  const sendTaskNotification = async (data: TaskNotificationData) => {
    try {
      let staffDetails = null;
      let notificationData = {
        notificationType: data.notificationType,
        taskTitle: data.taskTitle,
        eventName: data.eventName,
        firmId: data.firmId
      };

      if (data.freelancerId) {
        // Get freelancer details
        const { data: freelancer } = await supabase
          .from('freelancers')
          .select('full_name, phone')
          .eq('id', data.freelancerId)
          .single();

        if (freelancer) {
          staffDetails = {
            staffName: freelancer.full_name,
            staffPhone: freelancer.phone,
            ...notificationData
          };
        }
      } else if (data.assignedTo) {
        // Get staff details
        const { data: staff } = await supabase
          .from('profiles')
          .select('full_name, mobile_number')
          .eq('id', data.assignedTo)
          .single();

        if (staff) {
          staffDetails = {
            staffName: staff.full_name,
            staffPhone: staff.mobile_number,
            ...notificationData
          };
        }
      }

      // Send notification
      if (staffDetails) {
        await supabase.functions.invoke('send-staff-notification', {
          body: staffDetails
        });
        console.log('✅ Task notification sent successfully');
        return { success: true };
      }
      return { success: false, error: 'No valid assignee found' };
    } catch (error) {
      console.warn('⚠️ Failed to send task notification:', error);
      return { success: false, error };
    }
  };

  return {
    sendTaskNotification
  };
};