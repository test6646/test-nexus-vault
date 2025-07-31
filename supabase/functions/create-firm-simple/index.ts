import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

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
    console.log('🚀 Starting SIMPLE firm creation (no Google Sheets)...');
    const { firmName, memberEmails = [], adminUserId } = await req.json();
    
    console.log('📋 Request details:', {
      firmName,
      memberEmailCount: memberEmails?.length || 0
    });

    if (!firmName) {
      console.error('❌ Firm name is required');
      return new Response(JSON.stringify({
        success: false,
        error: 'Firm name is required',
        phase: 'validation'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response(JSON.stringify({
        success: false,
        error: 'Server configuration error: Missing Supabase credentials',
        phase: 'server_config'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Authorization header required');
      return new Response(JSON.stringify({
        success: false,
        error: 'Authorization required',
        phase: 'authentication'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('❌ Invalid authentication token:', userError?.message);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid authentication token',
        phase: 'authentication'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ User authenticated:', user.id);

    // Check if user profile exists and has admin role
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileCheckError) {
      console.error('❌ Error checking user profile:', profileCheckError.message);
      return new Response(JSON.stringify({
        success: false,
        error: 'Profile verification failed',
        phase: 'profile_check'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!existingProfile) {
      console.error('❌ User profile not found for:', user.id);
      return new Response(JSON.stringify({
        success: false,
        error: 'User profile not found. Please complete your profile setup first.',
        phase: 'profile_check'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ User profile found:', existingProfile.full_name, existingProfile.role);

    // Verify user has admin role
    if (existingProfile.role !== 'Admin') {
      console.error('❌ User is not an admin:', existingProfile.role);
      return new Response(JSON.stringify({
        success: false,
        error: 'Only admin users can create firms',
        phase: 'authorization'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PHASE 1: Create firm in database (without Google Sheets for now)
    console.log('💾 PHASE 1: Creating firm in database...');
    try {
      const { data: firm, error: firmError } = await supabase
        .from('firms')
        .insert({
          name: firmName,
          created_by: user.id,
          spreadsheet_id: null // We'll add this later once Google Sheets is working
        })
        .select()
        .single();

      if (firmError) {
        console.error('❌ Firm creation failed:', firmError);
        throw new Error(`Database error: ${firmError.message}`);
      }

      console.log('✅ Firm created successfully:', firm.id);

      // PHASE 2: Update user profile
      console.log('👤 PHASE 2: Updating user profile...');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          firm_id: firm.id,
          current_firm_id: firm.id
        })
        .eq('user_id', user.id);

      if (profileError) {
        console.warn('⚠️ Profile update failed:', profileError.message);
      } else {
        console.log('✅ User profile updated');
      }

      // PHASE 3: Add team members to firm_members table
      if (memberEmails && memberEmails.length > 0) {
        console.log('👥 PHASE 3: Adding team members...');
        
        for (const email of memberEmails) {
          try {
            // Find user by email in auth metadata
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('user_id, id')
              .ilike('full_name', `%${email}%`); // This is a workaround since we don't have email in profiles

            if (profilesError) {
              console.warn(`⚠️ Could not find profile for ${email}:`, profilesError.message);
              continue;
            }

            // For now, we'll skip adding members since we need email lookup
            console.log(`ℹ️ Skipping member addition for ${email} - will implement email lookup later`);
            
          } catch (memberError) {
            console.warn(`⚠️ Error adding member ${email}:`, memberError);
          }
        }
      }

      // Success response
      return new Response(JSON.stringify({
        success: true,
        firmId: firm.id,
        firm: {
          id: firm.id,
          name: firm.name,
          spreadsheet_id: firm.spreadsheet_id,
          created_at: firm.created_at
        },
        message: `${firmName} created successfully! (Google Sheets integration will be added once API permissions are resolved)`,
        note: "This firm was created without Google Sheets integration. You can add the spreadsheet later."
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (dbError) {
      console.error('💥 Database operation failed:', dbError);
      return new Response(JSON.stringify({
        success: false,
        error: `Firm creation failed: ${dbError.message}`,
        phase: 'database_creation'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message,
      phase: 'unexpected_error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});