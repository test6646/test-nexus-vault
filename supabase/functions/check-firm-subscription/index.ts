import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-FIRM-SUBSCRIPTION] ${step}${detailsStr}`);
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

    // Verify user has access to this firm (strict by firmId)
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

    // Get firm subscription details
    const { data: subscription, error: subscriptionError } = await supabaseClient
      .from('firm_subscriptions')
      .select('*')
      .eq('firm_id', firmId)
      .single();

    if (subscriptionError) {
      logStep("Subscription not found, creating trial", { error: subscriptionError });
      
      // Create a trial subscription if none exists
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 3);
      const graceUntil = new Date(trialEnd);
      graceUntil.setDate(graceUntil.getDate() + 2);

      const { data: newSubscription, error: createError } = await supabaseClient
        .from('firm_subscriptions')
        .insert({
          firm_id: firmId,
          status: 'trial',
          subscribed_once: false,
          trial_start_at: new Date().toISOString(),
          trial_end_at: trialEnd.toISOString(),
          grace_until: graceUntil.toISOString(),
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create trial subscription: ${createError.message}`);
      }

      return new Response(JSON.stringify({
        status: 'trial',
        planType: null,
        isActive: true,
        trialEndAt: trialEnd.toISOString(),
        graceUntil: graceUntil.toISOString(),
        subscriptionEndAt: null,
        subscribedOnce: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Subscription found", { status: subscription.status, planType: subscription.plan_type });

    const now = new Date();
    const trialEndAt = new Date(subscription.trial_end_at);
    const subscriptionEndAt = subscription.subscription_end_at ? new Date(subscription.subscription_end_at) : null;
    const graceUntil = new Date(subscription.grace_until);

    let isActive = false;
    let currentStatus = subscription.status;

    // Determine if subscription is currently active
    if (subscriptionEndAt && subscriptionEndAt > now) {
      // Paid subscription is active
      isActive = true;
      currentStatus = 'active';
    } else if (!subscription.subscribed_once && trialEndAt > now) {
      // Trial is active for users who haven't paid yet
      isActive = true;
      currentStatus = 'trial';
    } else {
      // Subscription expired or trial ended
      isActive = false;
      currentStatus = 'expired';
    }

    // Update status in database if it changed
    if (currentStatus !== subscription.status) {
      const { error: updateError } = await supabaseClient
        .from('firm_subscriptions')
        .update({ status: currentStatus })
        .eq('firm_id', firmId);

      if (updateError) {
        logStep("Failed to update subscription status", { error: updateError });
      } else {
        logStep("Subscription status updated", { newStatus: currentStatus });
      }
    }

    return new Response(JSON.stringify({
      status: currentStatus,
      planType: subscription.plan_type,
      isActive,
      trialEndAt: subscription.trial_end_at,
      graceUntil: subscription.grace_until,
      subscriptionEndAt: subscription.subscription_end_at,
      subscribedOnce: subscription.subscribed_once,
      lastPaymentAt: subscription.last_payment_at,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-firm-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});