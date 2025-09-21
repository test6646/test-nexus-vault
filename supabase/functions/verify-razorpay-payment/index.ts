import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-RAZORPAY-PAYMENT] ${step}${detailsStr}`);
};

// Helper function to verify Razorpay signature
function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  const crypto = globalThis.crypto;
  const encoder = new TextEncoder();
  const data = encoder.encode(`${orderId}|${paymentId}`);
  const key = encoder.encode(secret);
  
  return crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  ).then(cryptoKey => 
    crypto.subtle.sign("HMAC", cryptoKey, data)
  ).then(signatureArrayBuffer => {
    const signatureArray = new Uint8Array(signatureArrayBuffer);
    const signatureHex = Array.from(signatureArray)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
    return signatureHex === signature;
  }).catch(() => false);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!razorpayKeySecret) {
      throw new Error("Razorpay secret key not configured");
    }

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

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = await req.json();
    
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new Error("Missing payment verification data");
    }

    logStep("Payment verification data received", { orderId: razorpayOrderId, paymentId: razorpayPaymentId });

    // Verify signature
    const isValidSignature = await verifySignature(
      razorpayOrderId,
      razorpayPaymentId, 
      razorpaySignature,
      razorpayKeySecret
    );

    if (!isValidSignature) {
      logStep("Invalid signature verification");
      throw new Error("Payment signature verification failed");
    }

    logStep("Signature verified successfully");

    // Find the payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from('firm_payments')
      .select('*')
      .eq('razorpay_order_id', razorpayOrderId)
      .single();

    if (paymentError || !payment) {
      logStep("Payment record not found", { error: paymentError });
      throw new Error("Payment record not found");
    }

    logStep("Payment record found", { paymentId: payment.id, firmId: payment.firm_id });

    // Verify user has access to this firm
    const { data: firm, error: firmFetchError } = await supabaseClient
      .from('firms')
      .select('id, name, created_by')
      .eq('id', payment.firm_id)
      .single();

    if (firmFetchError || !firm) {
      throw new Error('Firm not found');
    }

    // If not owner, verify membership
    if (firm.created_by !== user.id) {
      const { data: memberAccess } = await supabaseClient
        .from('firm_members')
        .select('firm_id')
        .eq('firm_id', payment.firm_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!memberAccess) {
        throw new Error('User does not have access to this firm');
      }
    }

    logStep('Firm access verified', { firmName: firm.name });

    // Update payment record as paid
    const paidAt = new Date().toISOString();
    const { error: updatePaymentError } = await supabaseClient
      .from('firm_payments')
      .update({
        status: 'paid',
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        paid_at: paidAt,
        receipt_url: `https://dashboard.razorpay.com/app/payments/${razorpayPaymentId}`,
      })
      .eq('id', payment.id);

    if (updatePaymentError) {
      logStep("Failed to update payment record", { error: updatePaymentError });
      throw new Error(`Failed to update payment record: ${updatePaymentError.message}`);
    }

    logStep("Payment record updated as paid");

    // Calculate subscription dates
    const subscriptionStart = new Date();
    const subscriptionEnd = new Date(subscriptionStart);
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + payment.period_months);

    // Update firm subscription
    const { error: subscriptionError } = await supabaseClient
      .from('firm_subscriptions')
      .upsert({
        firm_id: payment.firm_id,
        status: 'active',
        plan_type: payment.plan_type,
        subscribed_once: true,
        trial_end_at: subscriptionStart.toISOString(), // Trial ends when subscription starts
        grace_until: subscriptionStart.toISOString(), // No grace period needed for paid subscription
        subscription_start_at: subscriptionStart.toISOString(),
        subscription_end_at: subscriptionEnd.toISOString(),
        last_payment_at: paidAt,
      }, { onConflict: 'firm_id' });

    if (subscriptionError) {
      logStep("Failed to update subscription", { error: subscriptionError });
      throw new Error(`Failed to update subscription: ${subscriptionError.message}`);
    }

    logStep("Subscription updated successfully", { 
      firmId: payment.firm_id, 
      planType: payment.plan_type,
      subscriptionEnd: subscriptionEnd.toISOString()
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Payment verified and subscription activated",
      subscription: {
        planType: payment.plan_type,
        subscriptionEnd: subscriptionEnd.toISOString(),
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-razorpay-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});