import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EventUpdateData {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  venue?: string;
  firmId: string;
  updatedFields: string[];
}

export const useEventUpdateNotifications = () => {
  const { toast } = useToast();

  const sendEventUpdateNotifications = async (eventData: EventUpdateData) => {
    try {
      console.log('📧 Starting event update notifications for:', eventData.eventTitle);

      // Get all staff assignments and client data
      const [staffData, clientData] = await Promise.all([
        // Get staff assignments with profile/freelancer details
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

      console.log('📧 Client data fetch result:', { 
        error: clientData.error, 
        data: clientData.data,
        hasClient: !!clientData.data?.clients,
        clientPhone: clientData.data?.clients?.phone 
      });

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
            dayNumber: assignment.day_number,
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

      // Send notifications using the staff notification function
      const notificationPromises = [];

      // Notify staff members (but exclude client's phone to prevent conflicts)
      const clientPhone = clientData.data?.clients?.phone;
      if (staffList.length > 0) {
        for (const staff of staffList) {
          if (staff.staff_phone && staff.staff_phone !== clientPhone) {
            console.log('📧 Sending staff notification to:', staff.staff_name, staff.staff_phone);
            notificationPromises.push(
              supabase.functions.invoke('send-staff-notification', {
                body: {
                  notificationType: 'staff_event_update', // Use separate staff template
                  eventName: eventData.eventTitle,
                  eventDate: eventData.eventDate,
                  venue: eventData.venue || '~',
                  firmId: eventData.firmId,
                  staffName: staff.staff_name,
                  staffPhone: staff.staff_phone,
                  role: staff.role,
                  dayNumber: staff.dayNumber
                }
              })
            );
          } else if (staff.staff_phone === clientPhone) {
            console.log('📧 Skipping staff notification to client phone:', staff.staff_phone);
          }
        }
      }

      // Notify client with proper update notification
      if (clientData.data?.clients?.phone) {
        console.log('📧 Sending client update notification to:', clientData.data.clients.name, clientData.data.clients.phone);
        notificationPromises.push(
          supabase.functions.invoke('send-event-confirmation', {
            body: {
              clientName: clientData.data.clients.name,
              clientPhone: clientData.data.clients.phone,
              eventName: eventData.eventTitle,
              eventDate: eventData.eventDate,
              venue: eventData.venue || '~',
              totalAmount: 0, // Not needed for update notification
              firmId: eventData.firmId,
              totalDays: 1, // Not needed for update notification
              eventEndDate: null,
              isUpdate: true,
              updatedFields: eventData.updatedFields
            }
          })
        );
      } else {
        console.log('📧 No client phone found for notification');
      }

      const results = await Promise.allSettled(notificationPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      console.log('✅ Event update notifications sent successfully:', successCount);

      // Show success toast with notification details
      const totalRecipients = staffList.length + (clientData.data?.clients ? 1 : 0);
      toast({
        title: "Update notifications sent",
        description: `${successCount}/${totalRecipients} notification(s) sent for "${eventData.eventTitle}" update.`,
      });

      return { 
        success: true, 
        message: `Notifications sent to ${successCount} recipient(s)`,
        results 
      };

    } catch (error: any) {
      console.error('💥 Error in event update notifications:', error);
      
      toast({
        title: "Notification error",
        description: `Failed to send update notifications: ${error.message}`,
        variant: "destructive",
      });

      return { 
        success: false, 
        error: error.message 
      };
    }
  };

  return {
    sendEventUpdateNotifications
  };
};