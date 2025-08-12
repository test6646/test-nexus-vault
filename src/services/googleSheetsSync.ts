/**
 * Centralized Google Sheets Background Sync Service
 * This service handles all Google Sheets synchronization in the background
 * without blocking the UI
 */

import { supabase } from '@/integrations/supabase/client';

interface SyncRequest {
  itemType: 'task' | 'event' | 'freelancer' | 'expense' | 'client' | 'payment' | 'staff_payment' | 'freelancer_payment';
  itemId: string;
  firmId: string;
  operation?: 'create' | 'update' | 'delete';
}

class GoogleSheetsSyncService {
  private syncQueue: SyncRequest[] = [];
  private isProcessing = false;
  private retryDelays = [1000, 2000, 5000]; // Retry delays in ms

  /**
   * Add sync request to background queue (non-blocking)
   */
  public async syncInBackground(request: SyncRequest): Promise<void> {
    console.log(`🔄 Queuing ${request.itemType} ${request.itemId} for background sync`);
    
    // Add to queue for batch processing
    this.syncQueue.push(request);
    
    // Process queue in background (don't await)
    this.processQueueInBackground();
  }

  /**
   * Process sync queue in background without blocking UI
   */
  private async processQueueInBackground(): Promise<void> {
    if (this.isProcessing || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process items in batches to avoid overwhelming the server
      const batchSize = 3;
      while (this.syncQueue.length > 0) {
        const batch = this.syncQueue.splice(0, batchSize);
        
        // Process batch in parallel
        const promises = batch.map(request => this.syncSingleItem(request));
        await Promise.allSettled(promises);
        
        // Small delay between batches
        if (this.syncQueue.length > 0) {
          await this.delay(500);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Sync single item with retry logic
   */
  private async syncSingleItem(request: SyncRequest, retryCount = 0): Promise<void> {
    try {
      console.log(`📤 Syncing ${request.itemType} ${request.itemId} to Google Sheets`);
      
      const { error } = await supabase.functions.invoke('sync-single-item-to-google', {
        body: {
          itemType: request.itemType,
          itemId: request.itemId,
          firmId: request.firmId
        }
      });

      if (error) {
        throw error;
      }

      console.log(`✅ Successfully synced ${request.itemType} ${request.itemId}`);
    } catch (error) {
      console.error(`❌ Sync failed for ${request.itemType} ${request.itemId}:`, error);
      
      // Retry logic
      if (retryCount < this.retryDelays.length) {
        const delay = this.retryDelays[retryCount];
        console.log(`🔄 Retrying sync in ${delay}ms (attempt ${retryCount + 1})`);
        
        await this.delay(delay);
        return this.syncSingleItem(request, retryCount + 1);
      } else {
        console.error(`💥 Final sync failure for ${request.itemType} ${request.itemId} after ${retryCount} retries`);
        // Could add to failed items list for manual retry later if needed
      }
    }
  }

  /**
   * Immediate sync for critical operations (use sparingly)
   */
  public async syncImmediate(request: SyncRequest): Promise<boolean> {
    try {
      await this.syncSingleItem(request);
      return true;
    } catch (error) {
      console.error(`❌ Immediate sync failed for ${request.itemType} ${request.itemId}:`, error);
      return false;
    }
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get sync queue status (for debugging)
   */
  public getQueueStatus(): { queueLength: number; isProcessing: boolean } {
    return {
      queueLength: this.syncQueue.length,
      isProcessing: this.isProcessing
    };
  }
}

// Export singleton instance
export const googleSheetsSync = new GoogleSheetsSyncService();

// Convenience functions for different item types
export const syncTaskInBackground = (taskId: string, firmId: string, operation: 'create' | 'update' = 'update') =>
  googleSheetsSync.syncInBackground({ itemType: 'task', itemId: taskId, firmId, operation });

export const syncEventInBackground = (eventId: string, firmId: string, operation: 'create' | 'update' = 'update') =>
  googleSheetsSync.syncInBackground({ itemType: 'event', itemId: eventId, firmId, operation });

export const syncFreelancerInBackground = (freelancerId: string, firmId: string, operation: 'create' | 'update' = 'update') =>
  googleSheetsSync.syncInBackground({ itemType: 'freelancer', itemId: freelancerId, firmId, operation });

export const syncExpenseInBackground = (expenseId: string, firmId: string, operation: 'create' | 'update' = 'update') =>
  googleSheetsSync.syncInBackground({ itemType: 'expense', itemId: expenseId, firmId, operation });

export const syncClientInBackground = (clientId: string, firmId: string, operation: 'create' | 'update' = 'update') =>
  googleSheetsSync.syncInBackground({ itemType: 'client', itemId: clientId, firmId, operation });

export const syncPaymentInBackground = (paymentId: string, firmId: string, operation: 'create' | 'update' = 'update') =>
  googleSheetsSync.syncInBackground({ itemType: 'payment', itemId: paymentId, firmId, operation });

export const syncStaffPaymentInBackground = (paymentId: string, firmId: string, operation: 'create' | 'update' = 'update') =>
  googleSheetsSync.syncInBackground({ itemType: 'staff_payment', itemId: paymentId, firmId, operation });

export const syncFreelancerPaymentInBackground = (paymentId: string, firmId: string, operation: 'create' | 'update' = 'update') =>
  googleSheetsSync.syncInBackground({ itemType: 'freelancer_payment', itemId: paymentId, firmId, operation });