/**
 * Sync Coordinator Service
 * Prevents cascade sync loops and manages sync operations centrally
 */

import { googleSheetsSync } from './googleSheetsSync';

interface SyncOperation {
  type: 'payment' | 'event' | 'client' | 'task' | 'expense' | 'freelancer';
  id: string;
  firmId: string;
  operation: 'create' | 'update' | 'delete';
  source?: string; // Track what triggered the sync
}

class SyncCoordinator {
  private activeSyncs = new Set<string>();
  private syncQueue: SyncOperation[] = [];
  private isProcessing = false;
  
  /**
   * Queue a sync operation with deduplication and cascade prevention
   */
  async queueSync(operation: SyncOperation): Promise<void> {
    const syncKey = `${operation.type}-${operation.id}`;
    
    // Prevent duplicate syncs for the same item
    if (this.activeSyncs.has(syncKey)) {
      return;
    }
    
    // Add to queue with deduplication
    const existingIndex = this.syncQueue.findIndex(
      op => op.type === operation.type && op.id === operation.id
    );
    
    if (existingIndex >= 0) {
      // Update existing operation
      this.syncQueue[existingIndex] = operation;
    } else {
      // Add new operation
      this.syncQueue.push(operation);
    }
    
    // Process queue
    this.processQueue();
  }
  
  /**
   * Sync payment (no cascade to events)
   */
  async syncPayment(paymentId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update'): Promise<void> {
    await this.queueSync({
      type: 'payment',
      id: paymentId,
      firmId,
      operation,
      source: 'payment-direct'
    });
  }
  
  /**
   * Sync event with controlled cascade to prevent loops
   */
  async syncEvent(eventId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update', source = 'event-direct'): Promise<void> {
    await this.queueSync({
      type: 'event',
      id: eventId,
      firmId,
      operation,
      source
    });
  }
  
  /**
   * Sync client
   */
  async syncClient(clientId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update'): Promise<void> {
    await this.queueSync({
      type: 'client',
      id: clientId,
      firmId,
      operation,
      source: 'client-direct'
    });
  }
  
  /**
   * Sync task
   */
  async syncTask(taskId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update'): Promise<void> {
    await this.queueSync({
      type: 'task',
      id: taskId,
      firmId,
      operation,
      source: 'task-direct'
    });
  }
  
  /**
   * Sync expense
   */
  async syncExpense(expenseId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update'): Promise<void> {
    await this.queueSync({
      type: 'expense',
      id: expenseId,
      firmId,
      operation,
      source: 'expense-direct'
    });
  }
  
  /**
   * Sync freelancer
   */
  async syncFreelancer(freelancerId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update'): Promise<void> {
    await this.queueSync({
      type: 'freelancer',
      id: freelancerId,
      firmId,
      operation,
      source: 'freelancer-direct'
    });
  }
  
  /**
   * Process the sync queue with cascade prevention
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.syncQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      while (this.syncQueue.length > 0) {
        const operation = this.syncQueue.shift()!;
        const syncKey = `${operation.type}-${operation.id}`;
        
        // Skip if already syncing
        if (this.activeSyncs.has(syncKey)) {
          continue;
        }
        
        // Mark as active
        this.activeSyncs.add(syncKey);
        
        try {
          // Route to appropriate sync method
          await this.executeSyncOperation(operation);
          
        } catch (error) {
          console.error(`❌ Sync failed for ${syncKey}:`, error);
        } finally {
          // Always remove from active syncs
          this.activeSyncs.delete(syncKey);
        }
        
        // Small delay between operations to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Execute the actual sync operation
   */
  private async executeSyncOperation(operation: SyncOperation): Promise<void> {
    const itemTypeMap = {
      payment: 'payment',
      event: 'event',
      client: 'client',
      task: 'task',
      expense: 'expense',
      freelancer: 'freelancer'
    };
    
    const itemType = itemTypeMap[operation.type];
    if (!itemType) {
      throw new Error(`Unknown sync type: ${operation.type}`);
    }
    
    // Use the enhanced Google Sheets sync service
    await googleSheetsSync.syncInBackground({
      itemType: itemType as any,
      itemId: operation.id,
      firmId: operation.firmId,
      operation: operation.operation
    });
  }
  
  /**
   * Get current sync status for debugging
   */
  getStatus(): { activeSyncs: string[]; queueLength: number } {
    return {
      activeSyncs: Array.from(this.activeSyncs),
      queueLength: this.syncQueue.length
    };
  }
  
  /**
   * Clear all pending operations (for debugging/testing)
   */
  clearQueue(): void {
    this.syncQueue.length = 0;
    this.activeSyncs.clear();
  }
}

// Export singleton instance
export const syncCoordinator = new SyncCoordinator();

// Export convenience methods
export const syncPayment = (paymentId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update') =>
  syncCoordinator.syncPayment(paymentId, firmId, operation);

export const syncEvent = (eventId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update', source = 'event-direct') =>
  syncCoordinator.syncEvent(eventId, firmId, operation, source);

export const syncClient = (clientId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update') =>
  syncCoordinator.syncClient(clientId, firmId, operation);

export const syncTask = (taskId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update') =>
  syncCoordinator.syncTask(taskId, firmId, operation);

export const syncExpense = (expenseId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update') =>
  syncCoordinator.syncExpense(expenseId, firmId, operation);

export const syncFreelancer = (freelancerId: string, firmId: string, operation: 'create' | 'update' | 'delete' = 'update') =>
  syncCoordinator.syncFreelancer(freelancerId, firmId, operation);