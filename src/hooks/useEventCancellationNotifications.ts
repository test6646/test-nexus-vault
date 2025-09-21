import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EventCancellationData {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  venue?: string;
  firmId: string;
}

export const useEventCancellationNotifications = () => {
  const { toast } = useToast();

  const sendCancellationNotifications = async (eventData: EventCancellationData) => {
    try {
      console.log('📧 Starting cancellation notifications for:', eventData.eventTitle);

      // Get all staff assignments and client data
      const [staffData, clientData] = await Promise.all([
        // Get staff assignments with profile/freelancer details - using manual joins
        supabase
          .from('event_staff_assignments')
          .select('*')
          .eq('event_id', eventData.eventId),
        
        // Get client data via events table
        supabase
          .from('events')
          .select(`
            client_id,
            clients(name, phone, email)
          `)
          .eq('id', eventData.eventId)
          .single()
      ]);

      if (staffData.error) {
        console.error('❌ Error fetching staff data:', staffData.error);
        throw staffData.error;
      }

      if (clientData.error) {
        console.error('❌ Error fetching client data:', clientData.error);
        // Don't throw here, continue with staff notifications
      }

      // Manually fetch profile and freelancer data for each assignment
      const staffList = await Promise.all(
        (staffData.data || []).map(async (assignment: any) => {
          let staff_name = 'Unknown';
          let staff_phone = '';

          if (assignment.staff_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, mobile_number')
              .eq('id', assignment.staff_id)
              .single();
            
            if (profile) {
              staff_name = profile.full_name;
              staff_phone = profile.mobile_number;
            }
          } else if (assignment.freelancer_id) {
            const { data: freelancer } = await supabase
              .from('freelancers')
              .select('full_name, phone')
              .eq('id', assignment.freelancer_id)
              .single();
            
            if (freelancer) {
              staff_name = freelancer.full_name;
              staff_phone = freelancer.phone;
            }
          }

          return {
            staff_name,
            staff_phone,
            role: assignment.role,
            client_name: clientData.data?.clients?.name || 'Unknown Client'
          };
        })
      );

      console.log('📧 Found staff to notify:', staffList.length);
      console.log('📧 Client data:', clientData.data?.clients);

      if (staffList.length === 0 && !clientData.data?.clients) {
        console.log('📧 No staff or client to notify');
        return { success: true, message: 'No notifications needed' };
      }

      // Send notifications using the dedicated cancellation notification function
      const { data: notificationResult, error: notificationError } = await supabase.functions.invoke('send-event-deletion-notifications', {
        body: {
          eventData: {
            id: eventData.eventId,
            title: eventData.eventTitle,
            event_date: eventData.eventDate,
            venue: eventData.venue,
            firm_id: eventData.firmId,
            firm_name: 'Studio Management'
          },
          staffList: staffList,
          clientData: clientData.data?.clients || null
        }
      });

      if (notificationError) {
        console.error('❌ Error sending cancellation notifications:', notificationError);
        throw notificationError;
      }

      console.log('✅ Cancellation notifications sent successfully:', notificationResult);

      // Show success toast with notification details
      const notifiedCount = staffList.length + (clientData.data?.clients ? 1 : 0);
      toast({
        title: "Cancellation notifications sent",
        description: `${notifiedCount} notification(s) sent for "${eventData.eventTitle}" cancellation.`,
      });

      return { 
        success: true, 
        message: `Notifications sent to ${notifiedCount} recipient(s)`,
        results: notificationResult?.results 
      };

    } catch (error: any) {
      console.error('💥 Error in cancellation notifications:', error);
      
      toast({
        title: "Notification error",
        description: `Failed to send cancellation notifications: ${error.message}`,
        variant: "destructive",
      });

      return { 
        success: false, 
        error: error.message 
      };
    }
  };

  return {
    sendCancellationNotifications
  };
};