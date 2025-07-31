
import { useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

export const useRealTimeSync = () => {
  const { currentFirmId, profile } = useAuth();

  const handleDatabaseChange = useCallback(async (
    payload: any,
    sheetType: 'clients' | 'events' | 'tasks' | 'expenses' | 'staff'
  ) => {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      
      
      // Only sync for INSERT and UPDATE operations, not DELETE
      if (eventType === 'INSERT' && newRecord) {
        
        
        // Call the auto-sync function for this item
        try {
          const { error: syncError } = await supabase.functions.invoke('auto-sync-google-sheets', {
            body: {
              itemType: sheetType === 'staff' ? 'profile' : sheetType.slice(0, -1), // Remove 's' from plural
              itemId: newRecord.id,
              firmId: currentFirmId
            }
          });

          if (syncError) {
            console.error(`❌ Auto-sync failed for ${sheetType}:`, syncError);
          } else {
            
          }
        } catch (error) {
          console.error(`💥 Error calling auto-sync for ${sheetType}:`, error);
        }
      } else if (eventType === 'UPDATE' && newRecord) {
        
        
        // Call the auto-sync function for this item
        try {
          const { error: syncError } = await supabase.functions.invoke('auto-sync-google-sheets', {
            body: {
              itemType: sheetType === 'staff' ? 'profile' : sheetType.slice(0, -1), // Remove 's' from plural
              itemId: newRecord.id,
              firmId: currentFirmId
            }
          });

          if (syncError) {
            console.error(`❌ Auto-sync failed for ${sheetType}:`, syncError);
          } else {
            
          }
        } catch (error) {
          console.error(`💥 Error calling auto-sync for ${sheetType}:`, error);
        }
      }
    } catch (error) {
      console.error(`❌ Error handling ${sheetType} change:`, error);
    }
  }, [currentFirmId]);

  useEffect(() => {
    if (!currentFirmId || !profile) {
      
      return;
    }

    

    // Set up real-time subscriptions for each table
    const clientsSubscription = supabase
      .channel('clients-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
          filter: `firm_id=eq.${currentFirmId}`
        },
        (payload) => {
          
          handleDatabaseChange(payload, 'clients');
        }
      )
      .subscribe();

    const eventsSubscription = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `firm_id=eq.${currentFirmId}`
        },
        (payload) => {
          
          handleDatabaseChange(payload, 'events');
        }
      )
      .subscribe();

    const tasksSubscription = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `firm_id=eq.${currentFirmId}`
        },
        (payload) => {
          
          handleDatabaseChange(payload, 'tasks');
        }
      )
      .subscribe();

    const expensesSubscription = supabase
      .channel('expenses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `firm_id=eq.${currentFirmId}`
        },
        (payload) => {
          
          handleDatabaseChange(payload, 'expenses');
        }
      )
      .subscribe();

    

    return () => {
      
      supabase.removeChannel(clientsSubscription);
      supabase.removeChannel(eventsSubscription);
      supabase.removeChannel(tasksSubscription);
      supabase.removeChannel(expensesSubscription);
    };
  }, [currentFirmId, profile, handleDatabaseChange]);

  return {};
};
