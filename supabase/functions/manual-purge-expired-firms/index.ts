import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getGoogleAccessToken, validateGoogleResponse } from "../_shared/google-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANUAL-PURGE-EXPIRED-FIRMS] ${step}${detailsStr}`);
};

/**
 * Delete individual sheets from Google Spreadsheet (created during firm setup)
 */
async function deleteGoogleSheetsData(spreadsheetId: string): Promise<void> {
  try {
    logStep(`Cleaning up Google Sheets data from: ${spreadsheetId}`);
    const accessToken = await getGoogleAccessToken();
    
    // EXACT list of sheets created during firm setup (from create-firm-with-sheets function)
    const firmSheets = [
      'Clients', 'Master Events', 'Ring-Ceremony', 'Pre-Wedding', 'Wedding', 
      'Maternity Photography', 'Others', 'Staff', 'Tasks', 'Expenses', 
      'Freelancers', 'Payments', 'Accounting', 'Reports', 'Master Events Backup'
    ];
    
    // Get spreadsheet metadata to find existing sheets
    const metadataResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!metadataResponse.ok) {
      logStep(`Could not access spreadsheet metadata: ${spreadsheetId}`);
      return;
    }

    const metadata = await metadataResponse.json();
    const existingSheets = metadata.sheets || [];
    
    // Find sheets to delete (only firm-created ones)
    const sheetsToDelete = existingSheets.filter((sheet: any) => 
      firmSheets.includes(sheet.properties.title)
    );

    if (sheetsToDelete.length === 0) {
      logStep(`No firm-specific sheets found to delete in: ${spreadsheetId}`);
      return;
    }

    logStep(`Found ${sheetsToDelete.length} firm sheets to delete from: ${spreadsheetId}`);

    // Delete sheets one by one to avoid batch size limits and handle errors individually
    let deletedCount = 0;
    for (const sheet of sheetsToDelete) {
      try {
        const deleteResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: [{
                deleteSheet: {
                  sheetId: sheet.properties.sheetId
                }
              }]
            })
          }
        );

        if (deleteResponse.ok) {
          deletedCount++;
          logStep(`Successfully deleted sheet: ${sheet.properties.title} (ID: ${sheet.properties.sheetId})`);
        } else {
          const errorText = await deleteResponse.text();
          logStep(`Failed to delete sheet: ${sheet.properties.title}`, { error: errorText });
        }
      } catch (error) {
        logStep(`Error deleting sheet: ${sheet.properties.title}`, { error: error.message });
      }
    }
    
    logStep(`Completed deletion: ${deletedCount}/${sheetsToDelete.length} sheets deleted from: ${spreadsheetId}`);
    
  } catch (error) {
    logStep(`Error cleaning up sheets: ${spreadsheetId}`, { error: error.message });
    // Don't throw - continue with cleanup even if Google deletion fails
  }
}

/**
 * Delete Google Calendar
 */
async function deleteGoogleCalendar(calendarId: string): Promise<void> {
  try {
    logStep(`Deleting Google Calendar: ${calendarId}`);
    const accessToken = await getGoogleAccessToken();
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (response.ok) {
      logStep(`Successfully deleted calendar: ${calendarId}`);
    } else if (response.status === 404) {
      logStep(`Calendar not found (already deleted): ${calendarId}`);
    } else {
      const errorText = await response.text();
      logStep(`Failed to delete calendar: ${calendarId}`, { status: response.status, error: errorText });
    }
  } catch (error) {
    logStep(`Error deleting calendar: ${calendarId}`, { error: error.message });
    // Don't throw - continue with cleanup even if Google deletion fails
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Manual purge function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get expired trial firms first
    const { data: expiredFirms, error: fetchError } = await supabaseClient
      .from('firm_subscriptions')
      .select(`
        firm_id,
        grace_until,
        subscribed_once,
        firms:firm_id (
          id,
          name,
          spreadsheet_id,
          calendar_id,
          created_at
        )
      `)
      .eq('subscribed_once', false)
      .lt('grace_until', new Date().toISOString());

    if (fetchError) {
      logStep("Error fetching expired firms", { error: fetchError.message });
      throw new Error(`Failed to fetch expired firms: ${fetchError.message}`);
    }

    logStep("Found expired trial firms", { count: expiredFirms?.length || 0, firms: expiredFirms });

    // Manual deletion process for each expired firm
    let purgedCount = 0;
    let errors = [];

    for (const firmSub of expiredFirms || []) {
      const firmId = firmSub.firm_id;
      const firm = firmSub.firms;
      const firmName = firm?.name || 'Unknown';
      
      try {
        logStep(`Starting manual purge for firm: ${firmName}`, { firmId });

        // First, clean up Google resources if they exist
        if (firm) {
          logStep(`Cleaning up Google resources for firm: ${firmName}`, { firmId });
          
          // Clean up Google Sheets data if exists
          if (firm.spreadsheet_id) {
            await deleteGoogleSheetsData(firm.spreadsheet_id);
          }
          
          // Delete Google Calendar if exists
          if (firm.calendar_id) {
            await deleteGoogleCalendar(firm.calendar_id);
          }
        }

        // Get firm owner's user_id to preserve their account
        const { data: firmData, error: firmError } = await supabaseClient
          .from('firms')
          .select('created_by')
          .eq('id', firmId)
          .single();

        if (firmError) {
          throw new Error(`Failed to get firm owner: ${firmError.message}`);
        }

        const firmOwnerUserId = firmData.created_by;
        logStep(`Firm owner user_id: ${firmOwnerUserId}`, { firmId });

        // Get all user_ids associated with this firm (excluding firm owner)
        const { data: staffProfiles, error: profilesError } = await supabaseClient
          .from('profiles')
          .select('user_id')
          .or(`firm_id.eq.${firmId},current_firm_id.eq.${firmId}`)
          .neq('user_id', firmOwnerUserId);

        if (profilesError) {
          logStep(`Warning: Could not fetch staff profiles: ${profilesError.message}`);
        } else if (staffProfiles?.length > 0) {
          const staffUserIds = staffProfiles.map(p => p.user_id);
          logStep(`Found ${staffUserIds.length} staff users to delete from auth.users`, { staffUserIds });

          // Delete staff accounts from auth.users
          for (const staffUserId of staffUserIds) {
            try {
              const { error: authDeleteError } = await supabaseClient.auth.admin.deleteUser(staffUserId);
              if (authDeleteError) {
                logStep(`Failed to delete auth.users for ${staffUserId}: ${authDeleteError.message}`);
              } else {
                logStep(`Successfully deleted auth.users for ${staffUserId}`);
              }
            } catch (error) {
              logStep(`Error deleting auth.users for ${staffUserId}`, { error: error.message });
            }
          }
        }

        // Delete all related data manually in correct order to avoid foreign key constraints
        
        // First, get all profile IDs and event IDs to delete related assignments
        const { data: profileIds } = await supabaseClient
          .from('profiles')
          .select('id')
          .or(`firm_id.eq.${firmId},current_firm_id.eq.${firmId}`);

        const { data: eventIds } = await supabaseClient
          .from('events')
          .select('id')
          .eq('firm_id', firmId);

        const { data: freelancerIds } = await supabaseClient
          .from('freelancers')
          .select('id')
          .eq('firm_id', firmId);

        // Delete assignment rates and staff assignments that reference profiles/events/freelancers
        if (eventIds?.length > 0) {
          const eventIdList = eventIds.map(e => e.id);
          await supabaseClient.from('event_assignment_rates').delete().in('event_id', eventIdList);
          await supabaseClient.from('event_staff_assignments').delete().in('event_id', eventIdList);
        }

        if (profileIds?.length > 0) {
          const profileIdList = profileIds.map(p => p.id);
          await supabaseClient.from('event_staff_assignments').delete().in('staff_id', profileIdList);
        }

        if (freelancerIds?.length > 0) {
          const freelancerIdList = freelancerIds.map(f => f.id);
          await supabaseClient.from('event_staff_assignments').delete().in('freelancer_id', freelancerIdList);
        }

        // Delete by firm_id for remaining assignments
        await supabaseClient.from('event_assignment_rates').delete().eq('firm_id', firmId);
        await supabaseClient.from('event_staff_assignments').delete().eq('firm_id', firmId);
        await supabaseClient.from('staff_payments').delete().eq('firm_id', firmId);
        await supabaseClient.from('freelancer_payments').delete().eq('firm_id', firmId);
        await supabaseClient.from('accounting_entries').delete().eq('firm_id', firmId);
        await supabaseClient.from('expenses').delete().eq('firm_id', firmId);
        await supabaseClient.from('tasks').delete().eq('firm_id', firmId);
        await supabaseClient.from('payments').delete().eq('firm_id', firmId);
        await supabaseClient.from('quotations').delete().eq('firm_id', firmId);
        await supabaseClient.from('pricing_config').delete().eq('firm_id', firmId);
        await supabaseClient.from('event_closing_balances').delete().eq('firm_id', firmId);
        await supabaseClient.from('freelancers').delete().eq('firm_id', firmId);
        await supabaseClient.from('clients').delete().eq('firm_id', firmId);
        await supabaseClient.from('wa_sessions').delete().eq('firm_id', firmId);
        await supabaseClient.from('events').delete().eq('firm_id', firmId);
        await supabaseClient.from('firm_payments').delete().eq('firm_id', firmId);
        await supabaseClient.from('firm_members').delete().eq('firm_id', firmId);
        
        // Delete profiles associated with this firm
        await supabaseClient.from('profiles').delete().or(`firm_id.eq.${firmId},current_firm_id.eq.${firmId}`);
        
        await supabaseClient.from('firm_subscriptions').delete().eq('firm_id', firmId);
        
        // Delete firm last
        await supabaseClient.from('firms').delete().eq('id', firmId);
        
        purgedCount++;
        logStep(`Successfully purged firm: ${firmName}`, { firmId });
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logStep(`Error purging firm: ${firmName}`, { firmId, error: errorMsg });
        errors.push({ firmId, firmName, error: errorMsg });
      }
    }

    const response = {
      success: true,
      message: "Manual purge completed",
      timestamp: new Date().toISOString(),
      totalExpiredFirms: expiredFirms?.length || 0,
      purgedCount,
      errors: errors.length > 0 ? errors : undefined,
    };

    logStep("Manual purge completed", response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in manual-purge-expired-firms", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});