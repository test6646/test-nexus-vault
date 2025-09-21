import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TaskUpdateData {
  taskId: string;
  taskTitle: string;
  assignedTo?: string;
  freelancerId?: string;
  eventName?: string;
  firmId: string;
  updatedFields: string[];
}

export const useTaskUpdateNotifications = () => {
  const { toast } = useToast();

  const sendTaskUpdateNotification = async (data: TaskUpdateData) => {
    try {
      let staffDetails = null;
      let notificationData = {
        notificationType: 'task_update',
        taskTitle: data.taskTitle,
        eventName: data.eventName,
        firmId: data.firmId,
        updatedFields: data.updatedFields
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

      // Send notification - BACKGROUND Fire and forget
      if (staffDetails) {
        supabase.functions.invoke('send-staff-notification', {
          body: staffDetails
        }).then(() => {
          toast({
            title: "Task update notification sent",
            description: `Notification sent to ${staffDetails.staffName}`,
          });
          console.log('✅ Task update notification sent successfully');
        }).catch(error => {
          console.warn('⚠️ Failed to send task update notification:', error);
        });
        
        return { success: true };
      }
      return { success: false, error: 'No valid assignee found' };
    } catch (error) {
      console.warn('⚠️ Failed to send task update notification:', error);
      
      toast({
        title: "Notification error",
        description: "Failed to send task update notification",
        variant: "destructive",
      });
      
      return { success: false, error };
    }
  };

  return {
    sendTaskUpdateNotification
  };
};