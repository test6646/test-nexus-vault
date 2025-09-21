import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncSalaryRequest {
  paymentType: 'staff' | 'freelancer';
  paymentId: string;
  firmId: string;
  operation?: 'create' | 'update' | 'delete';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { paymentType, paymentId, firmId, operation = 'create' }: SyncSalaryRequest = await req.json();

    if (!paymentId || !firmId || !paymentType) {
      throw new Error('Missing required parameters: paymentType, paymentId, or firmId');
    }

    // Get firm's spreadsheet ID
    const { data: firm, error: firmError } = await supabaseClient
      .from('firms')
      .select('spreadsheet_id')
      .eq('id', firmId)
      .single();

    if (firmError) {
      throw firmError;
    }

    if (!firm?.spreadsheet_id) {
      return new Response(
        JSON.stringify({ success: true, message: 'No spreadsheet configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Handle deletion operation
    if (operation === 'delete') {
        // For deletion, we don't need the payment details since they may already be deleted
        // Just try to delete from Google Sheets if spreadsheet exists
        try {
        await supabaseClient.functions.invoke('delete-item-from-google', {
          body: {
            itemType: paymentType === 'staff' ? 'staff_payment' : 'freelancer_payment',
            itemId: paymentId,
            firmId: firmId
          }
        });
        } catch (error) {
          // Warning only
        }

      return new Response(
        JSON.stringify({
          success: true,
          message: `${paymentType} payment deletion processed`,
          paymentId,
          operation
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get payment details for create/update operations
    const tableName = paymentType === 'staff' ? 'staff_payments' : 'freelancer_payments';
    const { data: payment, error: paymentError } = await supabaseClient
      .from(tableName)
      .select(`
        *,
        ${paymentType === 'staff' ? 'staff_id' : 'freelancer_id'}
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError) {
      throw paymentError;
    }

    // Get person details (staff or freelancer)
    const personId = paymentType === 'staff' ? payment.staff_id : payment.freelancer_id;
    const personTable = paymentType === 'staff' ? 'profiles' : 'freelancers';
    
    const { data: person, error: personError } = await supabaseClient
      .from(personTable)
      .select('full_name, role')
      .eq('id', personId)
      .single();

    if (personError) {
      throw personError;
    }

    // Verify and create expense entry for this salary payment
    const expenseDescription = `${paymentType === 'staff' ? 'Staff' : 'Freelancer'} payment to ${person.full_name}`;
    
    // Check if expense entry already exists
    const { data: existingExpense } = await supabaseClient
      .from('expenses')
      .select('id')
      .eq('firm_id', firmId)
      .eq('category', 'Salary')
      .eq('amount', payment.amount)
      .eq('expense_date', payment.payment_date)
      .ilike('description', `%${person.full_name}%`)
      .single();

    let expenseId = existingExpense?.id;

        // Create expense entry if it doesn't exist
        if (!existingExpense && operation === 'create') {
      const { data: newExpense, error: expenseError } = await supabaseClient
        .from('expenses')
        .insert({
          firm_id: firmId,
          category: 'Salary',
          description: expenseDescription,
          amount: payment.amount,
          expense_date: payment.payment_date,
          payment_method: payment.payment_method,
          notes: `Auto-generated from ${paymentType} payment: ${payment.description || 'Salary payment to ' + person.full_name}`,
          created_by: payment.created_by,
        })
        .select('id')
        .single();

        if (expenseError) {
          // Continue with sync even if expense creation fails
        } else {
          expenseId = newExpense.id;
        }
    }

    // Now sync the expense to Google Sheets if we have an expense ID
    if (expenseId) {
      const { error: syncError } = await supabaseClient.functions.invoke('sync-single-item-to-google', {
        body: {
          itemType: 'expense',
          itemId: expenseId,
          firmId: firmId
        }
      });

        if (syncError) {
          // Don't throw here, as the main operation succeeded
        }
    }

    const result = {
      success: true,
      message: `${paymentType} payment processed and synced`,
      paymentId,
      expenseId,
      operation
    };

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});