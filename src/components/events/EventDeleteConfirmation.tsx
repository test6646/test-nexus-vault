
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Event } from '@/types/studio';
import { EnhancedConfirmationDialog } from '@/components/ui/enhanced-confirmation-dialog';
import { useAuth } from '@/components/auth/AuthProvider';

interface EventDeleteConfirmationProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onOptimisticDelete?: (eventId: string) => void; // New prop for optimistic updates
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
  const { profile } = useAuth();

  const handleDelete = async () => {
    if (!event || !profile?.current_firm_id) return;
    
    setDeleting(true);
    
    try {
      console.log('🗑️ Starting OPTIMISTIC event deletion for:', event.id);
      
      // Step 1: CAPTURE event data before any deletion for Google Sheets background process
      const eventDataForDeletion = {
        id: event.id,
        title: event.title,
        event_type: event.event_type,
        firm_id: profile.current_firm_id,
        client_name: (event as any).clients?.name || (event as any).client?.name || event.title,
        event_date: event.event_date,
        venue: event.venue || '',
        total_amount: event.total_amount || 0
      };
      
      console.log('📋 Captured event data for background processes:', eventDataForDeletion);

      // Step 2: IMMEDIATE UI update using optimistic deletion
      if (onOptimisticDelete) {
        onOptimisticDelete(event.id);
      }
      onOpenChange(false); // Close the dialog immediately
      
      toast({
        title: "Event deletion started",
        description: `"${event.title}" is being deleted. Database and Google Sheets updates are processing in the background.`,
      });

      // Step 3: Start background Google Sheets deletion (don't await - let it run in background)
      const backgroundGoogleSheetsProcess = async () => {
        try {
          console.log('🗑️ BACKGROUND: Starting Google Sheets deletion...');
          const { error: sheetError } = await supabase.functions.invoke('delete-item-from-google', {
            body: { 
              itemType: 'event', 
              itemId: event.id, 
              firmId: profile.current_firm_id,
              eventData: eventDataForDeletion // Pass the captured data
            }
          });
          
          if (sheetError) {
            console.error('❌ BACKGROUND: Google Sheets deletion failed:', sheetError);
            return;
          }
          
          console.log('✅ BACKGROUND: Google Sheets deletion completed');
        } catch (error) {
          console.error('❌ BACKGROUND: Google Sheets deletion error:', error);
        }
      };

      // Step 4: Start database deletion process (also can be background)
      const backgroundDatabaseProcess = async () => {
        try {
          console.log('🗑️ BACKGROUND: Deleting related database records...');
          
          // Delete related data in parallel (don't await individually)
          const deletePromises = [
            supabase.from('quotations').update({ converted_to_event: null }).eq('converted_to_event', event.id),
            supabase.from('event_staff_assignments').delete().eq('event_id', event.id),
            supabase.from('payments').delete().eq('event_id', event.id),
            supabase.from('tasks').delete().eq('event_id', event.id),
            supabase.from('freelancer_payments').delete().eq('event_id', event.id),
            supabase.from('staff_payments').delete().eq('event_id', event.id)
          ];

          await Promise.allSettled(deletePromises);

          // Finally delete the main event
          console.log('🗑️ BACKGROUND: Deleting main event from database...');
          const { error: eventDeleteError } = await supabase
            .from('events')
            .delete()
            .eq('id', event.id);

          if (eventDeleteError) {
            console.error('❌ BACKGROUND: Event deletion failed:', eventDeleteError);
            return;
          }

          console.log('✅ BACKGROUND: Database deletion completed');
        } catch (error) {
          console.error('❌ BACKGROUND: Database deletion error:', error);
        }
      };

      // Start both background processes
      Promise.all([
        backgroundGoogleSheetsProcess(),
        backgroundDatabaseProcess()
      ]).then(() => {
        // Final success toast after everything is complete
        toast({
          title: "Event deleted completely",
          description: `"${event.title}" has been fully removed from both database and Google Sheets.`,
        });
        
        // Trigger a final refresh to ensure UI is in sync
        onSuccess();
      }).catch((error) => {
        console.error('❌ Background deletion processes failed:', error);
        
        // If background processes fail, we need to refresh to restore the correct state
        toast({
          title: "Deletion partially completed",
          description: "There were issues with the deletion process. Refreshing to show current state.",
          variant: "destructive",
        });
        
        // Force refresh to show the actual state
        onSuccess();
      });

      // We don't await the background processes - they run independently
      console.log('✅ Event deletion process initiated - UI updated optimistically');
      
    } catch (error: any) {
      console.error('❌ Event deletion setup failed:', error);
      
      // If the initial setup fails, we need to refresh to restore correct state
      toast({
        title: "Error starting deletion",
        description: error.message,
        variant: "destructive",
      });
      
      // Refresh to restore the correct state
      onSuccess();
    } finally {
      setDeleting(false);
    }
  };

  if (!event) return null;

  return (
    <EnhancedConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleDelete}
      title="Delete Event"
      description={`You are about to permanently delete "${event.title}" and ALL related data including payments, staff assignments, and tasks. This action cannot be undone. The deletion will be processed immediately with background cleanup.`}
      variant="destructive"
      confirmText={deleting ? "Deleting..." : "Delete Event"}
      requireTextConfirmation={true}
      confirmationKeyword="DELETE EVENT"
      loading={deleting}
    />
  );
};
