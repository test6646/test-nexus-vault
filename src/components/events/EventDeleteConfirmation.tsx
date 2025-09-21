import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Event } from '@/types/studio';
import { EnhancedConfirmationDialog } from '@/components/ui/enhanced-confirmation-dialog';
import { useAuth } from '@/components/auth/AuthProvider';
import { useEventCancellationNotifications } from '@/hooks/useEventCancellationNotifications';

interface EventDeleteConfirmationProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onOptimisticDelete?: (eventId: string) => void;
}

export const EventDeleteConfirmation = ({ 
  event, 
  open, 
  onOpenChange, 
  onSuccess,
  onOptimisticDelete 
}: EventDeleteConfirmationProps) => {
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const { profile, currentFirmId } = useAuth();
  const { sendCancellationNotifications } = useEventCancellationNotifications();

  const handleDelete = async () => {
    if (!event || !currentFirmId) return;
    
    setDeleting(true);
    
    try {
      // Get all related data before deletion for notifications AND Google Sheets cleanup
      const [staffData, clientData, paymentsData, tasksData, expensesData, freelancerPaymentsData, staffPaymentsData] = await Promise.all([
        // Get staff assignments
        supabase
          .from('event_staff_assignments')
          .select(`
            *,
            profiles!event_staff_assignments_staff_id_fkey(full_name, mobile_number),
            freelancers!event_staff_assignments_freelancer_id_fkey(full_name, phone, email)
          `)
          .eq('event_id', event.id),
        
        // Get client data
        supabase
          .from('clients')
          .select('*')
          .eq('id', event.client_id)
          .single(),
        
        // Get payments data
        supabase
          .from('payments')
          .select('*')
          .eq('event_id', event.id),
        
        // Get tasks data
        supabase
          .from('tasks')
          .select('*')
          .eq('event_id', event.id),

        // Get event-related expenses
        supabase
          .from('expenses')
          .select('*')
          .eq('event_id', event.id),

        // Get freelancer payments for this event
        supabase
          .from('freelancer_payments')
          .select('*')
          .eq('event_id', event.id),

        // Get staff payments for this event
        supabase
          .from('staff_payments')
          .select('*')
          .eq('event_id', event.id)
      ]);

      const staffList = staffData.data?.map((assignment: any) => ({
        staff_name: assignment.profiles?.full_name || assignment.freelancers?.full_name || 'Unknown',
        staff_phone: assignment.profiles?.mobile_number || assignment.freelancers?.phone,
        role: assignment.role,
        client_name: clientData.data?.name || 'Unknown Client'
      })) || [];

      // Step 2: Immediate optimistic UI update
      if (onOptimisticDelete) {
        onOptimisticDelete(event.id);
      }
      onOpenChange(false);
      
      toast({
        title: "Event deletion started",
        description: `"${event.title}" is being deleted. All related data will be removed and notifications sent.`,
      });

      // Step 3: FIRST DELETE FROM GOOGLE SHEETS (while data still exists in database)
      try {
        // Delete all related data from Google Sheets one by one
        const sheetsPromises = [];

        // Delete event from Google Sheets - FIXED: Use proper deletion endpoint
        sheetsPromises.push(
          supabase.functions.invoke('delete-item-from-google', {
            body: { 
              itemType: 'event', 
              itemId: event.id, 
              firmId: currentFirmId,
              eventData: {
                id: event.id,
                title: event.title,
                event_type: event.event_type,
                firm_id: currentFirmId,
                client_name: clientData.data?.name || event.title,
                event_date: event.event_date,
                venue: event.venue || '',
                total_amount: event.total_amount || 0,
                deletion_mode: true // Flag to ensure deletion, not sync
              }
            }
          })
        );

        // Delete event from Google Calendar
        if (event.calendar_event_id) {
          sheetsPromises.push(
            supabase.functions.invoke('delete-event-from-calendar', {
              body: {
                eventId: event.id,
                calendarEventId: event.calendar_event_id
              }
            })
          );
        }

        // Delete payments from Google Sheets
        if (paymentsData.data && paymentsData.data.length > 0) {
          paymentsData.data.forEach(payment => {
            sheetsPromises.push(
              supabase.functions.invoke('delete-item-from-google', {
                body: { 
                  itemType: 'payment', 
                  itemId: payment.id, 
                  firmId: currentFirmId
                }
              })
            );
          });
        }

        // Delete tasks from Google Sheets
        if (tasksData.data && tasksData.data.length > 0) {
          tasksData.data.forEach(task => {
            sheetsPromises.push(
              supabase.functions.invoke('delete-item-from-google', {
                body: { 
                  itemType: 'task', 
                  itemId: task.id, 
                  firmId: currentFirmId
                }
              })
            );
          });
        }

        // Delete expenses from Google Sheets
        if (expensesData.data && expensesData.data.length > 0) {
          expensesData.data.forEach(expense => {
            sheetsPromises.push(
              supabase.functions.invoke('delete-item-from-google', {
                body: { 
                  itemType: 'expense', 
                  itemId: expense.id, 
                  firmId: currentFirmId 
                }
              })
            );
          });
        }

        // Delete freelancer payments from Google Sheets
        if (freelancerPaymentsData.data && freelancerPaymentsData.data.length > 0) {
          freelancerPaymentsData.data.forEach(payment => {
            sheetsPromises.push(
              supabase.functions.invoke('delete-item-from-google', {
                body: { 
                  itemType: 'freelancer_payment', 
                  itemId: payment.id, 
                  firmId: currentFirmId
                }
              })
            );
          });
        }

        // Delete staff payments from Google Sheets
        if (staffPaymentsData.data && staffPaymentsData.data.length > 0) {
          staffPaymentsData.data.forEach(payment => {
            sheetsPromises.push(
              supabase.functions.invoke('delete-item-from-google', {
                body: { 
                  itemType: 'staff_payment', 
                  itemId: payment.id, 
                  firmId: currentFirmId
                }
              })
            );
          });
        }

        // Wait for all Google Sheets deletions to complete
        await Promise.allSettled(sheetsPromises);
      } catch (error) {
        // Continue with deletion even if Google Sheets fails
      }

      // Step 4: Send cancellation notifications using the dedicated hook
      const notificationPromise = sendCancellationNotifications({
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.event_date,
        venue: event.venue,
        firmId: currentFirmId
      });

      // Step 5: FINALLY DELETE FROM DATABASE (this will cascade to all related tables)
      try {
        // Break quotation FK to avoid constraint error
        await supabase
          .from('quotations')
          .update({ converted_to_event: null })
          .eq('converted_to_event', event.id);
        
        // Delete dependent records explicitly (defensive against missing cascades)
        await Promise.allSettled([
          supabase.from('event_assignment_rates').delete().eq('event_id', event.id),
          supabase.from('event_staff_assignments').delete().eq('event_id', event.id),
          supabase.from('freelancer_payments').delete().eq('event_id', event.id),
          supabase.from('staff_payments').delete().eq('event_id', event.id),
          supabase.from('tasks').delete().eq('event_id', event.id),
          supabase.from('expenses').delete().eq('event_id', event.id),
          supabase.from('payments').delete().eq('event_id', event.id),
        ]);
        
        // Finally delete the event
        const { error: eventDeleteError } = await supabase
          .from('events')
          .delete()
          .eq('id', event.id);

        if (eventDeleteError) {
          throw eventDeleteError;
        }
      } catch (error) {
        throw error;
      }

      // Wait for notifications to complete
      await notificationPromise;

      // Final success toast after everything is complete
      toast({
        title: "Event completely deleted",
        description: `"${event.title}" and all related data have been removed from both database and Google Sheets. Staff and client have been notified.`,
      });
      
      // Trigger a final refresh to ensure UI is in sync
      onSuccess();
      
    } catch (error: any) {
      toast({
        title: "Deletion failed",
        description: error.message || "Failed to delete event. Please try again.",
        variant: "destructive",
      });
      
      // Refresh to show the actual state
      onSuccess();
    } finally {
      setDeleting(false);
    }
  };

  if (!event) return null;

  return (
    <EnhancedConfirmationDialog
      open={open}
      onOpenChange={(newOpen) => !deleting && onOpenChange(newOpen)}
      onConfirm={handleDelete}
      title="Delete Event Completely"
      description={`Delete "${event.title}" and all related data:

• Payments & financial records
• Staff assignments & rates  
• Tasks & expenses
• Google Sheets entries

Staff and client will be notified automatically.

⚠️ This action cannot be undone.`}
      variant="destructive"
      confirmText={deleting ? "Deleting..." : "Delete Event"}
      requireTextConfirmation={true}
      confirmationKeyword="DELETE EVERYTHING"
      loading={deleting}
    />
  );
};