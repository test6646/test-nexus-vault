import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-RAZORPAY-ORDER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    
    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error("Razorpay credentials not configured");
    }
    
    logStep("Razorpay credentials verified");

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

    const { planType, firmId } = await req.json();
    
    if (!planType || !firmId) {
      throw new Error("Missing planType or firmId");
    }

    if (!['monthly', 'quarterly', 'yearly'].includes(planType)) {
      throw new Error("Invalid plan type. Must be 'monthly', 'quarterly', or 'yearly'");
    }

    logStep("Request data validated", { planType, firmId });

    // Verify user has access to this firm
    const { data: firm, error: firmFetchError } = await supabaseClient
      .from('firms')
      .select('id, name, created_by')
      .eq('id', firmId)
      .single();

    if (firmFetchError || !firm) {
      throw new Error('Firm not found');
    }

    // If not owner, verify membership
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

    // Get plan details from database
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('plan_id', planType)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      throw new Error(`Plan not found: ${planType}`);
    }

    logStep("Plan details fetched", { planId: plan.plan_id, price: plan.price });

    // Calculate amount based on plan
    const amount = plan.price * 100; // Convert to paise
    const periodMonths = plan.duration_months;

    // Create Razorpay order
    const orderData = {
      amount: amount,
      currency: 'INR',
      // Keep receipt under 40 chars per Razorpay API
      receipt: `rcpt_${firmId.substring(0, 8)}_${Date.now()}`,
      notes: {
        firm_id: firmId,
        plan_type: planType,
        user_email: user.email
      }
    };

    logStep("Creating Razorpay order", orderData);

    const authString = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      logStep("Razorpay order creation failed", { status: razorpayResponse.status, error: errorText });
      throw new Error(`Failed to create Razorpay order: ${errorText}`);
    }

    const razorpayOrder = await razorpayResponse.json();
    logStep("Razorpay order created", { orderId: razorpayOrder.id });

    // Store payment record in database
    const { data: payment, error: paymentError } = await supabaseClient
      .from('firm_payments')
      .insert({
        firm_id: firmId,
        plan_type: planType,
        subscription_plan_id: plan.plan_id,
        amount: plan.price, // Store in rupees
        period_months: periodMonths,
        status: 'created',
        currency: 'INR',
        razorpay_order_id: razorpayOrder.id,
        notes: `${plan.display_name} subscription for ${firm.name}`,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentError) {
      logStep("Failed to store payment record", { error: paymentError });
      throw new Error(`Failed to store payment record: ${paymentError.message}`);
    }

    logStep("Payment record stored", { paymentId: payment.id });

    return new Response(JSON.stringify({
      orderId: razorpayOrder.id,
      amount: amount,
      currency: 'INR',
      keyId: razorpayKeyId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-razorpay-order", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
