/**
 * REFACTORED Google Sheets Sync Service
 * Modular, maintainable, and reliable sync service for all entity types
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { getGoogleAccessToken } from '../_shared/google-auth.ts';

// Import modular handlers
import { syncClientToSheet } from './handlers/client-handler.ts';
import { syncEventToSheet } from './handlers/event-handler.ts';
import { syncTaskToSheet } from './handlers/task-handler.ts';
import { 
  syncPaymentToSheet, 
  syncStaffPaymentToSheet, 
  syncFreelancerPaymentToSheet 
} from './handlers/payment-handler.ts';
import { 
  syncExpenseToSheet, 
  syncStaffToSheet, 
  syncFreelancerToSheet, 
  syncAccountingToSheet 
} from './handlers/other-handlers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const { itemType, itemId, firmId, operation = 'update' } = await req.json();
    
    if (!itemType || !itemId || !firmId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'itemType, itemId, and firmId are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate operation parameter
    if (!['create', 'update', 'delete'].includes(operation)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'operation must be create, update, or delete'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Server configuration error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get firm details
    const { data: firm, error: firmError } = await supabase
      .from('firms')
      .select('*')
      .eq('id', firmId)
      .single();

    if (firmError || !firm || !firm.spreadsheet_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Firm not found or no Google Spreadsheet configured'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get Google authentication with timeout and retry
    let accessToken: string;
    try {
      accessToken = await getGoogleAccessToken({ timeout: 20000, maxRetries: 2 });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: `Google authentication failed: ${error.message}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let syncedItem;
    let message = '';

    // Dispatch to appropriate handler based on item type
    try {
      switch (itemType) {
        case 'client':
          syncedItem = await syncClientToSheet(supabase, accessToken, firm.spreadsheet_id, itemId, operation);
          message = `Client "${syncedItem.name}" ${operation}d successfully`;
          break;
        
        case 'event':
          syncedItem = await syncEventToSheet(supabase, accessToken, firm.spreadsheet_id, itemId, operation);
          message = `Event "${syncedItem.title || syncedItem.clients?.name || 'Unknown'}" ${operation}d successfully`;
          break;
        
        case 'task':
          syncedItem = await syncTaskToSheet(supabase, accessToken, firm.spreadsheet_id, itemId, operation);
          message = `Task "${syncedItem.title}" ${operation}d successfully`;
          break;
        
        case 'expense':
          syncedItem = await syncExpenseToSheet(supabase, accessToken, firm.spreadsheet_id, itemId, operation);
          message = `Expense "${syncedItem.description}" ${operation}d successfully`;
          break;
        
        case 'staff':
          syncedItem = await syncStaffToSheet(supabase, accessToken, firm.spreadsheet_id, itemId, operation);
          message = `Staff "${syncedItem.full_name}" ${operation}d successfully`;
          break;
        
        case 'freelancer':
          syncedItem = await syncFreelancerToSheet(supabase, accessToken, firm.spreadsheet_id, itemId, operation);
          message = `Freelancer "${syncedItem.full_name}" ${operation}d successfully`;
          break;
        
        case 'payment':
          syncedItem = await syncPaymentToSheet(supabase, accessToken, firm.spreadsheet_id, itemId, operation);
          message = `Payment ₹${syncedItem.amount} ${operation}d successfully`;
          break;
        
        case 'staff_payment':
          syncedItem = await syncStaffPaymentToSheet(supabase, accessToken, firm.spreadsheet_id, itemId, operation);
          message = `Staff payment ₹${syncedItem.amount} ${operation}d successfully`;
          break;
        
        case 'freelancer_payment':
          syncedItem = await syncFreelancerPaymentToSheet(supabase, accessToken, firm.spreadsheet_id, itemId, operation);
          message = `Freelancer payment ₹${syncedItem.amount} ${operation}d successfully`;
          break;
        
        case 'accounting':
          syncedItem = await syncAccountingToSheet(supabase, accessToken, firm.spreadsheet_id, itemId, operation);
          message = `Accounting entry "${syncedItem.title}" ${operation}d successfully`;
          break;
        
        default:
          throw new Error(`Unsupported item type: ${itemType}`);
      }
    } catch (syncError) {
      throw new Error(`Failed to sync ${itemType}: ${syncError.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message,
      syncedItem,
      operation,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${firm.spreadsheet_id}/edit`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    
    // Provide more detailed error information
    const errorDetails = {
      message: error.message,
      itemType: req.json?.()?.itemType || 'unknown',
      itemId: req.json?.()?.itemId || 'unknown',
      operation: req.json?.()?.operation || 'unknown',
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Google Sheets sync failed',
      details: errorDetails
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});