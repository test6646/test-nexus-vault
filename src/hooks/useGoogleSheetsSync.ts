import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

export const useGoogleSheetsSync = () => {
  const { profile } = useAuth();
  const { toast } = useToast();

  // Set up automatic sync monitoring on component mount
  useEffect(() => {
    if (!profile?.current_firm_id) return;

    // Create a single channel for all sync operations
    const channel = supabase
      .channel(`google-sync-${profile.current_firm_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'clients',
          filter: `firm_id=eq.${profile.current_firm_id}`
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
          filter: `firm_id=eq.${profile.current_firm_id}`
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
          filter: `firm_id=eq.${profile.current_firm_id}`
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
          filter: `firm_id=eq.${profile.current_firm_id}`
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
          filter: `firm_id=eq.${profile.current_firm_id}`
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
          filter: `firm_id=eq.${profile.current_firm_id}`
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
          filter: `firm_id=eq.${profile.current_firm_id}`
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
          filter: `firm_id=eq.${profile.current_firm_id}`
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
          filter: `firm_id=eq.${profile.current_firm_id}`
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
          filter: `firm_id=eq.${profile.current_firm_id}`
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
          filter: `firm_id=eq.${profile.current_firm_id}`
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
          filter: `firm_id=eq.${profile.current_firm_id}`
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
          filter: `firm_id=eq.${profile.current_firm_id}`
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
          filter: `firm_id=eq.${profile.current_firm_id}`
        },
        async (payload) => {
          if (payload.old?.event_id) {
            // Re-sync the event when payments are deleted to update amounts in Google Sheets
            await autoSyncItem('event', payload.old.event_id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles',
          filter: `firm_id=eq.${profile.current_firm_id}`
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
          filter: `firm_id=eq.${profile.current_firm_id}`
        },
        async (payload) => {
          if (payload.new?.id) {
            setTimeout(() => autoSyncItem('staff', payload.new.id), 1000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.current_firm_id]);

  // Auto-sync function for calendar events
  const autoSyncEventToCalendar = async (eventId: string) => {
    if (!profile?.current_firm_id) {
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

  // Enhanced auto-sync function with error handling and duplicate prevention
  const autoSyncItem = async (itemType: 'client' | 'event' | 'task' | 'expense' | 'staff', itemId: string) => {
    if (!profile?.current_firm_id) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('sync-single-item-to-google', {
        body: {
          itemType,
          itemId,
          firmId: profile.current_firm_id
        }
      });

      if (error) {
        console.error(`❌ Auto-sync failed for ${itemType}:`, error);
        return;
      }

      if (data?.success) {
        
      } else {
        console.error(`❌ Auto-sync returned non-success for ${itemType}:`, data);
      }
      return data;
    } catch (error) {
      console.error(`❌ Auto-sync error for ${itemType}:`, error);
    }
  };

  const syncItemToSheets = async (itemType: 'client' | 'event' | 'task' | 'expense' | 'staff', itemId: string) => {
    if (!profile?.current_firm_id) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('sync-single-item-to-google', {
        body: {
          itemType,
          itemId,
          firmId: profile.current_firm_id
        }
      });

      if (error) {
        console.error(`❌ Failed to sync ${itemType} to Google Sheets:`, error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`❌ Error syncing ${itemType} to Google Sheets:`, error);
    }
  };

  const syncEventToCalendar = async (eventId: string) => {
    if (!profile?.current_firm_id) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('sync-event-to-calendar', {
        body: {
          eventId
        }
      });

      if (error) {
        console.error('❌ Failed to sync event to Google Calendar:', error);
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
      console.error('❌ Error syncing event to Google Calendar:', error);
    }
  };

  const syncAllData = async () => {
    if (!profile?.current_firm_id) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('sync-all-data-to-google', {
        body: {
          firmId: profile.current_firm_id
        }
      });

      if (error) {
        console.error('❌ Failed to sync all data to Google Sheets:', error);
        toast({
          title: "Sync Error",
          description: "Failed to sync data to Google Sheets. Please try again.",
          variant: "destructive",
        });
        throw error;
      }

      toast({
        title: "Sync Complete",
        description: "All data has been synced to Google Sheets successfully.",
      });
      
      return data;
    } catch (error) {
      console.error('❌ Error during full sync:', error);
    }
  };

  const clearSheetsData = async () => {
    if (!profile?.current_firm_id) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('clean-sheets-data', {
        body: {
          firmId: profile.current_firm_id
        }
      });

      if (error) {
        console.error('❌ Failed to clear Google Sheets data:', error);
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
      console.error('❌ Error during clear:', error);
    }
  };

  return {
    syncItemToSheets,
    syncEventToCalendar,
    syncAllData,
    clearSheetsData
  };
};
