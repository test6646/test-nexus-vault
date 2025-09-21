import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
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

    const { firmId } = await req.json();
    
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

    // Get subscription details
    const { data: subscription, error: subscriptionError } = await supabaseClient
      .from('firm_subscriptions')
      .select('*')
      .eq('firm_id', firmId)
      .single();

    if (subscriptionError || !subscription) {
      throw new Error('No subscription found');
    }

    // Get latest payment details
    const { data: latestPayment, error: paymentError } = await supabaseClient
      .from('firm_payments')
      .select('*')
      .eq('firm_id', firmId)
      .eq('status', 'paid')
      .order('paid_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    logStep('Subscription and payment data retrieved', { 
      status: subscription.status, 
      planType: subscription.plan_type,
      hasPayment: !!latestPayment 
    });

    // Get available plans from database
    const { data: plans, error: plansError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (plansError) {
      throw new Error(`Failed to fetch plans: ${plansError.message}`);
    }

    // Return subscription management portal data
    const portalData = {
      subscription: {
        status: subscription.status,
        planType: subscription.plan_type,
        subscriptionEndAt: subscription.subscription_end_at,
        trialEndAt: subscription.trial_end_at,
        subscribedOnce: subscription.subscribed_once,
      },
      latestPayment: latestPayment ? {
        id: latestPayment.id,
        amount: latestPayment.amount,
        planType: latestPayment.plan_type,
        paidAt: latestPayment.paid_at,
        periodMonths: latestPayment.period_months,
        razorpayPaymentId: latestPayment.razorpay_payment_id,
      } : null,
      availablePlans: plans?.map(plan => ({
        id: plan.plan_id,
        name: plan.display_name,
        price: plan.price,
        duration: `${plan.duration_months} month${plan.duration_months > 1 ? 's' : ''}`,
        features: plan.features || []
      })) || []
    };

    return new Response(JSON.stringify(portalData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in customer-portal", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});