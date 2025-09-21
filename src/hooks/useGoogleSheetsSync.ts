import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

export const useGoogleSheetsSync = () => {
  const { profile, currentFirmId } = useAuth();
  const { toast } = useToast();

  // Set up automatic sync monitoring on component mount
  useEffect(() => {
    if (!currentFirmId) return;

    // Create a single channel for all sync operations
    const channel = supabase
      .channel(`google-sync-${currentFirmId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'clients',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.new?.id) {
            await autoSyncItem('client', payload.new.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clients',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.new?.id) {
            await autoSyncItem('client', payload.new.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.new?.id) {
            try {
              await autoSyncItem('event', payload.new.id);
              await autoSyncEventToCalendar(payload.new.id);
            } catch (error) {
              console.error('❌ Failed to sync new event:', error);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.new?.id) {
            try {
              await autoSyncItem('event', payload.new.id);
              await autoSyncEventToCalendar(payload.new.id);
            } catch (error) {
              console.error('❌ Failed to sync updated event:', error);
            }
          }
        }
      )
      // ENHANCED: Listen for staff assignment changes to re-sync events
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_staff_assignments',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.new?.event_id) {
            // Re-sync the event when staff assignments change
            await autoSyncItem('event', payload.new.event_id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_staff_assignments',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.new?.event_id) {
            // Re-sync the event when staff assignments change
            await autoSyncItem('event', payload.new.event_id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'event_staff_assignments',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.old?.event_id) {
            // Re-sync the event when staff assignments are removed
            await autoSyncItem('event', payload.old.event_id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.new?.id) {
            await autoSyncItem('task', payload.new.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.new?.id) {
            await autoSyncItem('task', payload.new.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'expenses',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.new?.id) {
            await autoSyncItem('expense', payload.new.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'expenses',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.new?.id) {
            await autoSyncItem('expense', payload.new.id);
          }
        }
      )
      // CRITICAL: Listen for payment changes to re-sync events with updated amounts
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.new?.event_id) {
            // Re-sync the event when payments are made to update amounts in Google Sheets
            await autoSyncItem('event', payload.new.event_id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.new?.event_id) {
            // Re-sync the event when payments are updated to update amounts in Google Sheets
            await autoSyncItem('event', payload.new.event_id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'payments',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.old?.event_id) {
            // Re-sync the event when payments are deleted to update amounts in Google Sheets
            await autoSyncItem('event', payload.old.event_id);
          }
        }
      )
      // ACCOUNTING ENTRIES sync listeners
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'accounting_entries',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.new?.id) {
            await autoSyncItem('accounting', payload.new.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'accounting_entries',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.new?.id) {
            await autoSyncItem('accounting', payload.new.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'accounting_entries',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.old?.id) {
            await autoSyncItem('accounting', payload.old.id);
          }
        }
      )
       .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'staff_payments',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          console.log('Staff payment created, triggering expense sync');
          // Staff payments create automatic expense entries, no direct sync needed
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'freelancer_payments',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          console.log('Freelancer payment created, triggering expense sync');
          // Freelancer payments create automatic expense entries, no direct sync needed
        }
      )
      // FREELANCERS sync listeners
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'freelancers',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.new?.id) {
            await autoSyncItem('freelancer', payload.new.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'freelancers',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.new?.id) {
            await autoSyncItem('freelancer', payload.new.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'freelancers',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.old?.id) {
            await autoSyncItem('freelancer', payload.old.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.new?.id) {
            setTimeout(() => autoSyncItem('staff', payload.new.id), 1000);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `firm_id=eq.${currentFirmId}`
        },
        async (payload) => {
          if (payload.new?.id) {
            setTimeout(() => autoSyncItem('staff', payload.new.id), 1000);
          }
        }
      )
      .subscribe();

    // Cleanup function to prevent memory leaks
    return () => {
      supabase.removeChannel(channel);
      // Cleanup sync service to prevent memory leaks
      import('@/services/googleSheetsSync').then(({ googleSheetsSync }) => {
        googleSheetsSync.cleanup();
      });
    };
  }, [currentFirmId]);

  // Auto-sync function for calendar events
  const autoSyncEventToCalendar = async (eventId: string) => {
    if (!currentFirmId) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('sync-event-to-calendar', {
        body: { eventId }
      });

      if (error) {
        console.error('❌ Calendar sync error:', error);
        toast({
          title: "Calendar Sync Failed",
          description: `Failed to sync event to Google Calendar: ${error.message || 'Unknown error'}`,
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        toast({
          title: "Calendar Synced",
          description: "Event successfully added to Google Calendar",
        });
      }
    } catch (error) {
      console.error('❌ Failed to sync event to Google Calendar:', error);
      toast({
        title: "Calendar Sync Error",
        description: "Failed to sync event to Google Calendar",
        variant: "destructive",
      });
    }
  };

  // ✅ ENHANCED auto-sync function using centralized background service
  const autoSyncItem = async (itemType: 'client' | 'event' | 'task' | 'expense' | 'staff' | 'freelancer' | 'accounting', itemId: string) => {
    if (!currentFirmId) {
      return;
    }

    try {
      // Use centralized background sync service for better performance
      const { googleSheetsSync } = await import('@/services/googleSheetsSync');
      await googleSheetsSync.syncInBackground({
        itemType: itemType as any,
        itemId,
        firmId: currentFirmId,
        operation: 'update'
      });
      console.log(`Auto-sync queued for ${itemType} ${itemId}`);
    } catch (error) {
      console.error(`Auto-sync error for ${itemType}:`, error);
    }
  };

  const syncItemToSheets = async (itemType: 'client' | 'event' | 'task' | 'expense' | 'staff' | 'freelancer' | 'accounting', itemId: string) => {
    if (!currentFirmId) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('sync-single-item-to-google', {
        body: {
          itemType,
          itemId,
          firmId: currentFirmId
        }
      });

      if (error) {
        console.error(`Failed to sync ${itemType} to Google Sheets:`, error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`Error syncing ${itemType} to Google Sheets:`, error);
    }
  };

  const syncEventToCalendar = async (eventId: string) => {
    if (!currentFirmId) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('sync-event-to-calendar', {
        body: {
          eventId
        }
      });

      if (error) {
        console.error('Failed to sync event to Google Calendar:', error);
        toast({
          title: "Calendar Sync Error",
          description: "Failed to sync event to Google Calendar. Please try again.",
          variant: "destructive",
        });
        throw error;
      }

      toast({
        title: "Calendar Sync Complete",
        description: "Event has been synced to Google Calendar successfully.",
      });
      
      return data;
    } catch (error) {
      console.error('Error syncing event to Google Calendar:', error);
    }
  };

  const syncAllData = async () => {
    if (!currentFirmId) {
      return;
    }

    try {
      // Since we removed bulk sync, we'll use individual sync for all items
      console.log('Bulk sync is no longer available. Use individual item sync instead.');
      toast({
        title: "Bulk Sync Unavailable",
        description: "Bulk sync has been removed. Items sync individually in the background.",
        variant: "destructive",
      });
      return false;
    } catch (error) {
      console.error('Error during sync operation:', error);
    }
  };

  const clearSheetsData = async () => {
    if (!currentFirmId) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('clean-sheets-data', {
        body: {
          firmId: currentFirmId
        }
      });

      if (error) {
        console.error('Failed to clear Google Sheets data:', error);
        toast({
          title: "Clear Error",
          description: "Failed to clear Google Sheets data. Please try again.",
          variant: "destructive",
        });
        throw error;
      }

      toast({
        title: "Sheets Cleared",
        description: "All test data has been removed from Google Sheets. Only headers remain.",
      });
      
      return data;
    } catch (error) {
      console.error('Error during clear:', error);
    }
  };

  return {
    syncItemToSheets,
    syncEventToCalendar,
    syncAllData,
    clearSheetsData
  };
};
