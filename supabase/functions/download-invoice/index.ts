import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DOWNLOAD-INVOICE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    logStep("User authenticated", { userId: user.id, email: user.email });

    const { firmId, paymentId } = await req.json();
    
    if (!firmId) {
      throw new Error("Missing firmId");
    }

    // Verify user has access to this firm
    const { data: firm, error: firmFetchError } = await supabaseClient
      .from('firms')
      .select('id, name, created_by')
      .eq('id', firmId)
      .single();

    if (firmFetchError || !firm) {
      throw new Error('Firm not found');
    }

    if (firm.created_by !== user.id) {
      const { data: memberAccess } = await supabaseClient
        .from('firm_members')
        .select('firm_id')
        .eq('firm_id', firmId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!memberAccess) {
        throw new Error('User does not have access to this firm');
      }
    }

    logStep('Firm access verified', { firmName: firm.name });

    // Get payment details - if paymentId is provided, get specific payment, otherwise get latest
    let paymentQuery = supabaseClient
      .from('firm_payments')
      .select('*')
      .eq('firm_id', firmId)
      .eq('status', 'paid');

    if (paymentId) {
      paymentQuery = paymentQuery.eq('id', paymentId);
    } else {
      paymentQuery = paymentQuery.order('paid_at', { ascending: false }).limit(1);
    }

    const { data: payment, error: paymentError } = await paymentQuery.maybeSingle();

    if (paymentError || !payment) {
      throw new Error('Payment not found');
    }

    logStep('Payment found', { paymentId: payment.id, amount: payment.amount });

    // Generate invoice data that matches UnifiedSubscriptionInvoicePDF expectations
    const invoiceData = {
      invoiceNumber: `INV-${payment.id.slice(0, 8).toUpperCase()}`,
      invoiceDate: new Date(payment.paid_at).toLocaleDateString('en-IN'),
      firm: {
        name: firm.name,
        email: user.email,
      },
      payment: {
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_order_id: payment.razorpay_order_id,
        amount: payment.amount,
        currency: payment.currency || 'INR',
        plan_type: payment.plan_type,
        period_months: payment.period_months,
        paid_at: payment.paid_at,
      },
      razorpayDetails: {
        payment_id: payment.razorpay_payment_id,
        order_id: payment.razorpay_order_id,
        signature: payment.razorpay_signature || '',
        method: 'online',
      },
    };

    logStep('Invoice data generated', { invoiceNumber: invoiceData.invoiceNumber });

    return new Response(JSON.stringify(invoiceData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in download-invoice", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});