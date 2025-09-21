/**
 * Optimized Google Sheets Sync Service
 * This service handles individual item synchronization using the single
 * sync-single-item-to-google edge function with shared headers
 */

import { supabase } from '@/integrations/supabase/client';

interface SyncRequest {
  itemType: 'task' | 'event' | 'freelancer' | 'expense' | 'client' | 'payment' | 'staff_payment' | 'freelancer_payment' | 'accounting' | 'staff';
  itemId: string;
  firmId: string;
  operation?: 'create' | 'update' | 'delete';
}

interface SyncStats {
  totalSynced: number;
  totalErrors: number;
  lastSyncTime?: Date;
}

class GoogleSheetsSyncService {
  private syncQueue: SyncRequest[] = [];
  private isProcessing = false;
  private retryDelays = [1000, 3000, 8000]; // Progressive retry delays in ms
  private stats: SyncStats = { totalSynced: 0, totalErrors: 0 };
  private readonly requestTimeout = 30000; // 30 second timeout

  /**
   * Add sync request to background queue with deduplication (non-blocking)
   */
  public async syncInBackground(request: SyncRequest): Promise<void> {
      console.log(`Queuing sync: ${request.itemType} ${request.itemId} (${request.operation || 'update'})`);
    
    // Deduplication: Remove existing requests for the same item
    this.syncQueue = this.syncQueue.filter(
      existing => !(existing.itemType === request.itemType && existing.itemId === request.itemId)
    );
    
    // Add to queue for batch processing
    this.syncQueue.push(request);
    
    // Process queue in background (don't await)
    this.processQueueInBackground();
  }

  /**
   * Process sync queue in background without blocking UI with enhanced batching
   */
  private async processQueueInBackground(): Promise<void> {
    if (this.isProcessing || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`Processing ${this.syncQueue.length} sync requests`);

    try {
      // Enhanced batching with adaptive size based on queue length
      const batchSize = Math.min(5, Math.max(2, Math.ceil(this.syncQueue.length / 4)));
      
      while (this.syncQueue.length > 0) {
        const batch = this.syncQueue.splice(0, batchSize);
        console.log(`Processing batch of ${batch.length} items`);
        
        // Process batch with proper error isolation
        const results = await Promise.allSettled(
          batch.map(request => this.syncSingleItem(request))
        );
        
        // Log batch results
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        if (successful > 0) {
          console.log(`Batch completed: ${successful} successful, ${failed} failed`);
          this.stats.totalSynced += successful;
        }
        
        if (failed > 0) {
          this.stats.totalErrors += failed;
          console.warn(`Batch had ${failed} failures`);
        }
        
        // Dynamic delay based on results
        if (this.syncQueue.length > 0) {
          const delay = failed > 0 ? 1000 : 300; // Longer delay if errors occurred
          await this.delay(delay);
        }
      }
      
      this.stats.lastSyncTime = new Date();
      console.log(`Sync queue processed successfully`);
      
    } catch (error) {
      console.error(`Critical error in sync queue processing:`, error);
      this.stats.totalErrors++;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Sync single item using the optimized sync-single-item-to-google function with timeout protection
   */
  private async syncSingleItem(request: SyncRequest, retryCount = 0): Promise<void> {
    const identifier = `${request.itemType}-${request.itemId}`;
    
    try {
      console.log(`Syncing ${identifier} (attempt ${retryCount + 1})`);
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), this.requestTimeout);
      });
      
      // Race between the actual request and timeout
      const syncPromise = supabase.functions.invoke('sync-single-item-to-google', {
        body: {
          itemType: request.itemType,
          itemId: request.itemId,
          firmId: request.firmId,
          operation: request.operation || 'update'
        }
      });
      
      const { data, error } = await Promise.race([syncPromise, timeoutPromise]) as any;

      if (error) {
        throw new Error(`Sync failed: ${error.message || 'Unknown error'}`);
      }

      console.log(`Successfully synced ${identifier}`);
      
    } catch (error: any) {
      console.error(`Sync failed for ${identifier} (attempt ${retryCount + 1}):`, error.message);
      
      // Enhanced retry logic with exponential backoff
      if (retryCount < this.retryDelays.length) {
        const delay = this.retryDelays[retryCount];
        console.log(`Retrying ${identifier} in ${delay}ms`);
        
        await this.delay(delay);
        return this.syncSingleItem(request, retryCount + 1);
      } else {
        console.error(`Final retry failed for ${identifier}:`, error.message);
        throw error; // Re-throw for caller to handle
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
   * Get comprehensive sync status (for debugging and monitoring)
   */
  public getQueueStatus(): { 
    queueLength: number; 
    isProcessing: boolean; 
    stats: SyncStats;
    upcomingItems: string[];
  } {
    return {
      queueLength: this.syncQueue.length,
      isProcessing: this.isProcessing,
      stats: { ...this.stats },
      upcomingItems: this.syncQueue.slice(0, 5).map(r => `${r.itemType}-${r.itemId}`)
    };
  }
  
  /**
   * Clear queue and reset stats (for testing/debugging)
   */
  public clearQueue(): void {
    this.syncQueue.length = 0;
    this.stats = { totalSynced: 0, totalErrors: 0 };
  }
  
  /**
   * Cleanup method to prevent memory leaks
   */
  public cleanup(): void {
    this.clearQueue();
    this.isProcessing = false;
    console.log('Sync service cleaned up');
  }
}

// Export singleton instance
export const googleSheetsSync = new GoogleSheetsSyncService();

// Convenience functions for different item types
export const syncTaskInBackground = (taskId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update') =>
  googleSheetsSync.syncInBackground({ itemType: 'task', itemId: taskId, firmId, operation });

export const syncEventInBackground = (eventId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update') =>
  googleSheetsSync.syncInBackground({ itemType: 'event', itemId: eventId, firmId, operation });

export const syncFreelancerInBackground = (freelancerId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update') =>
  googleSheetsSync.syncInBackground({ itemType: 'freelancer', itemId: freelancerId, firmId, operation });

export const syncExpenseInBackground = (expenseId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update') =>
  googleSheetsSync.syncInBackground({ itemType: 'expense', itemId: expenseId, firmId, operation });

export const syncClientInBackground = (clientId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update') =>
  googleSheetsSync.syncInBackground({ itemType: 'client', itemId: clientId, firmId, operation });

export const syncPaymentInBackground = (paymentId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update') =>
  googleSheetsSync.syncInBackground({ itemType: 'payment', itemId: paymentId, firmId, operation });

export const syncStaffPaymentInBackground = (paymentId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update') =>
  googleSheetsSync.syncInBackground({ itemType: 'staff_payment', itemId: paymentId, firmId, operation });

export const syncFreelancerPaymentInBackground = (paymentId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update') =>
  googleSheetsSync.syncInBackground({ itemType: 'freelancer_payment', itemId: paymentId, firmId, operation });

export const syncAccountingInBackground = (entryId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update') =>
  googleSheetsSync.syncInBackground({ itemType: 'accounting', itemId: entryId, firmId, operation });