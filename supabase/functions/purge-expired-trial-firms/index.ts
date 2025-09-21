import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getGoogleAccessToken, validateGoogleResponse } from "../_shared/google-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PURGE-EXPIRED-TRIAL-FIRMS] ${step}${detailsStr}`);
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
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // First, get all expired trial firms with their Google resources
    const { data: expiredFirms, error: fetchError } = await supabaseClient
      .from('firm_subscriptions')
      .select(`
        firm_id,
        firms:firm_id (
          id,
          name,
          spreadsheet_id,
          calendar_id
        )
      `)
      .eq('subscribed_once', false)
      .lt('grace_until', new Date().toISOString());

    if (fetchError) {
      logStep("Error fetching expired firms", { error: fetchError.message });
    } else if (expiredFirms?.length > 0) {
      logStep("Found expired trial firms", { count: expiredFirms.length });
      
      // Clean up Google resources for each firm before database purge
      for (const firmSub of expiredFirms) {
        const firm = firmSub.firms;
        if (firm) {
          logStep(`Cleaning up Google resources for firm: ${firm.name}`, { firmId: firm.id });
          
          // Clean up Google Sheets data if exists
          if (firm.spreadsheet_id) {
            await deleteGoogleSheetsData(firm.spreadsheet_id);
          }
          
          // Delete Google Calendar if exists
          if (firm.calendar_id) {
            await deleteGoogleCalendar(firm.calendar_id);
          }
        }
      }
    }

    // Handle auth user deletions for expired firms
    for (const firmSub of expiredFirms || []) {
      const firm = firmSub.firms;
      if (firm) {
        try {
          // Get firm owner's user_id to preserve their account
          const { data: firmData, error: firmError } = await supabaseClient
            .from('firms')
            .select('created_by')
            .eq('id', firm.id)
            .single();

          if (firmError) {
            logStep(`Error getting firm owner for ${firm.id}`, { error: firmError.message });
            continue;
          }

          const firmOwnerUserId = firmData.created_by;

          // Get all user_ids associated with this firm (excluding firm owner)
          const { data: staffProfiles, error: profilesError } = await supabaseClient
            .from('profiles')
            .select('user_id')
            .or(`firm_id.eq.${firm.id},current_firm_id.eq.${firm.id}`)
            .neq('user_id', firmOwnerUserId);

          if (profilesError) {
            logStep(`Warning: Could not fetch staff profiles for firm ${firm.id}`, { error: profilesError.message });
          } else if (staffProfiles?.length > 0) {
            const staffUserIds = staffProfiles.map(p => p.user_id);
            logStep(`Deleting ${staffUserIds.length} staff users from auth.users for firm ${firm.id}`, { staffUserIds });

            // Delete staff accounts from auth.users
            for (const staffUserId of staffUserIds) {
              try {
                const { error: authDeleteError } = await supabaseClient.auth.admin.deleteUser(staffUserId);
                if (authDeleteError) {
                  logStep(`Failed to delete auth.users for ${staffUserId}`, { error: authDeleteError.message });
                } else {
                  logStep(`Successfully deleted auth.users for ${staffUserId}`);
                }
              } catch (error) {
                logStep(`Error deleting auth.users for ${staffUserId}`, { error: error.message });
              }
            }
          }
        } catch (error) {
          logStep(`Error handling auth deletion for firm ${firm.id}`, { error: error.message });
        }
      }
    }

    // Now call the database function to purge expired trial firms
    const { data, error } = await supabaseClient.rpc('purge_expired_trial_firms');

    if (error) {
      logStep("Error calling purge function", { error: error.message });
      throw new Error(`Failed to purge expired trial firms: ${error.message}`);
    }

    logStep("Purge function completed successfully");

    // Get count of remaining trial firms that are expired but not yet purged
    const { data: expiredTrials, error: countError } = await supabaseClient
      .from('firm_subscriptions')
      .select('firm_id, grace_until')
      .eq('subscribed_once', false)
      .lt('grace_until', new Date().toISOString());

    if (countError) {
      logStep("Error getting expired trial count", { error: countError.message });
    } else {
      logStep("Expired trials remaining", { count: expiredTrials?.length || 0 });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Expired trial firms purged successfully",
      timestamp: new Date().toISOString(),
      expiredTrialsRemaining: expiredTrials?.length || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in purge-expired-trial-firms", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});