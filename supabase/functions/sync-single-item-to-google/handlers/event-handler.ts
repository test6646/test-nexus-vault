/**
 * Event Sync Handler
 * Handles syncing event data to Google Sheets with multi-day support
 */

import { updateOrAppendToSheet, ensureSheetExists } from '../../_shared/google-sheets-helpers.ts';
import { SHEET_HEADERS } from '../../shared/sheet-headers.ts';

// Helper function to calculate payment status correctly
function getPaymentStatus(event: any, collectedAmount: number, closedAmount: number = 0): string {
  const totalAmount = event.total_amount || 0;
  const advanceAmount = event.advance_amount || 0;
  
  // Calculate pending correctly - Total - Advance - Collected - Closed
  const pendingAmount = totalAmount - advanceAmount - collectedAmount - closedAmount;
  
  // PAID: Pending amount is 0 or negative
  if (pendingAmount <= 0) return 'Paid';
  // PARTIAL: Some payment made but balance still exists
  if (collectedAmount > 0 || advanceAmount > 0) return 'Partial';
  // PENDING: No payment made
  return 'Pending';
}

export async function syncEventToSheet(
  supabase: any, 
  accessToken: string, 
  spreadsheetId: string, 
  eventId: string,
  operation: 'create' | 'update' | 'delete' = 'update'
) {
  // Ensure Master Events sheet exists with proper headers
  await ensureSheetExists(accessToken, spreadsheetId, 'Master Events', SHEET_HEADERS.MASTER_EVENTS);

  if (operation === 'delete') {
    // Handle delete operation
    const { deleteFromSheet } = await import('../../_shared/google-sheets-helpers.ts');
    await deleteFromSheet(accessToken, spreadsheetId, 'Master Events', eventId, 0);
    
    // Also delete from event-specific sheets - we'll need to check all possible event types
    const eventTypes = ['Ring-Ceremony', 'Pre-Wedding', 'Wedding', 'Maternity Photography', 'Others'];
    for (const eventType of eventTypes) {
      try {
        await deleteFromSheet(accessToken, spreadsheetId, eventType, eventId, 0);
      } catch (error) {
        // Ignore errors for non-existent sheets or records
        console.log(`Info: Could not delete from ${eventType} sheet: ${error.message}`);
      }
    }
    
    return { id: eventId, title: 'Deleted Event' };
  }

  const { data: event, error } = await supabase
    .from('events')
    .select(`
      *,
      clients(id, name)
    `)
    .eq('id', eventId)
    .single();

  if (error || !event) {
    throw new Error(`Event not found: ${error?.message}`);
  }

  // Fetch payments for this event to calculate collected amount
  const { data: payments, error: paymentError } = await supabase
    .from('payments')
    .select('amount')
    .eq('event_id', eventId)
    .eq('firm_id', event.firm_id);

  if (paymentError) {
    console.error('Error fetching payments:', paymentError);
  }

  // Fetch closing balances for this event
  const { data: closingBalances, error: closingError } = await supabase
    .from('event_closing_balances')
    .select('closing_amount')
    .eq('event_id', eventId)
    .eq('firm_id', event.firm_id);

  if (closingError) {
    console.error('Error fetching closing balances:', closingError);
  }

  // Calculate payment amounts correctly
  const paymentsOnlyTotal = payments?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;
  const advanceAmount = Number(event.advance_amount || 0);
  const collectedAmount = paymentsOnlyTotal;
  const closedAmount = closingBalances?.reduce((sum, closing) => sum + Number(closing.closing_amount || 0), 0) || 0;
  
  
  // Get staff assignments for this event
  const { data: staffAssignments } = await supabase
    .from('event_staff_assignments')
    .select('*')
    .eq('event_id', eventId);

  // Get staff and freelancer details separately
  let staffProfiles = [];
  let freelancerProfiles = [];
  
  if (staffAssignments && staffAssignments.length > 0) {
    const staffIds = staffAssignments.filter(a => a.staff_id).map(a => a.staff_id);
    const freelancerIds = staffAssignments.filter(a => a.freelancer_id).map(a => a.freelancer_id);
    
    if (staffIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', staffIds);
      staffProfiles = profiles || [];
    }
    
    if (freelancerIds.length > 0) {
      const { data: freelancers } = await supabase
        .from('freelancers')
        .select('id, full_name')
        .in('id', freelancerIds);
      freelancerProfiles = freelancers || [];
    }
  }

  // Group staff by role and day
  const photographersByDay: { [key: number]: string[] } = {};
  const cinematographersByDay: { [key: number]: string[] } = {};
  const dronePilotsByDay: { [key: number]: string[] } = {};
  const sameDayEditorsByDay: { [key: number]: string[] } = {};

  if (staffAssignments && staffAssignments.length > 0) {
    staffAssignments.forEach(assignment => {
      const day = assignment.day_number || 1;
      
      // Get staff name from either staff or freelancer
      let staffName = '';
      if (assignment.staff_type === 'staff' && assignment.staff_id) {
        const profile = staffProfiles.find(p => p.id === assignment.staff_id);
        staffName = profile?.full_name || 'Unknown Staff';
      } else if (assignment.staff_type === 'freelancer' && assignment.freelancer_id) {
        const freelancer = freelancerProfiles.find(f => f.id === assignment.freelancer_id);
        staffName = freelancer?.full_name || 'Unknown Freelancer';
      }
      
      console.log(`👤 Staff assignment - Day ${day}: ${assignment.role} -> ${staffName} (${assignment.staff_type})`);
      
      if (assignment.role === 'Photographer' && staffName) {
        if (!photographersByDay[day]) photographersByDay[day] = [];
        if (!photographersByDay[day].includes(staffName)) {
          photographersByDay[day].push(staffName);
        }
      } else if (assignment.role === 'Cinematographer' && staffName) {
        if (!cinematographersByDay[day]) cinematographersByDay[day] = [];
        if (!cinematographersByDay[day].includes(staffName)) {
          cinematographersByDay[day].push(staffName);
        }
      } else if (assignment.role === 'Drone Pilot' && staffName) {
        if (!dronePilotsByDay[day]) dronePilotsByDay[day] = [];
        if (!dronePilotsByDay[day].includes(staffName)) {
          dronePilotsByDay[day].push(staffName);
        }
      } else if (assignment.role === 'Same Day Editor' && staffName) {
        if (!sameDayEditorsByDay[day]) sameDayEditorsByDay[day] = [];
        if (!sameDayEditorsByDay[day].includes(staffName)) {
          sameDayEditorsByDay[day].push(staffName);
        }
      }
    });
  }

  // Calculate total days
  const totalDays = event.total_days || 1;
  const eventDate = new Date(event.event_date);
  
  // Create entries for each day
  for (let day = 1; day <= totalDays; day++) {
    // Calculate the date for this day
    const currentDate = new Date(eventDate);
    currentDate.setDate(eventDate.getDate() + (day - 1));
    const dayDateString = currentDate.toISOString().split('T')[0];
    
    // Get staff for this specific day
    const dayPhotographers = photographersByDay[day] || [];
    const dayCinematographers = cinematographersByDay[day] || [];
    const dayDronePilots = dronePilotsByDay[day] || [];
    const daySameDayEditors = sameDayEditorsByDay[day] || [];
    
    // Create comma-separated strings
    const photographersText = dayPhotographers.join(', ');
    const cinematographersText = dayCinematographers.join(', ');
    const droneText = dayDronePilots.join(', ');
    const sameDayEditorsText = daySameDayEditors.join(', ');
    
    console.log(`📅 Day ${day} - Photographers: ${photographersText || 'None'}`);
    console.log(`📅 Day ${day} - Cinematographers: ${cinematographersText || 'None'}`);

    // Create day-specific event title
    const dayTitle = totalDays > 1 
      ? `${event.title || event.clients?.name || 'Unknown Event'} - DAY ${day.toString().padStart(2, '0')}`
      : event.title || event.clients?.name || 'Unknown Event';

    // Create unique event key for this day
    const eventKey = totalDays > 1 ? `${event.id}-day${day}` : event.id;
    
    // Calculate balance correctly
    const balanceAmount = Math.max(0, (event.total_amount || 0) - advanceAmount - collectedAmount - closedAmount);
    
    const eventData = [
      eventKey,                                          // 0 - Event ID (PRIMARY IDENTIFIER) 
      dayTitle,                                          // 1 - Event Title
      event.event_type,                                  // 2 - Event Type
      dayDateString,                                     // 3 - Event Date
      event.venue || '',                                 // 4 - Location / Venue
      event.storage_disk || '',                          // 5 - Storage Disk
      event.storage_size ? event.storage_size.toString() : '', // 6 - Storage Size
      photographersText,                                 // 7 - Assigned Photographer(s)
      cinematographersText,                              // 8 - Assigned Cinematographer(s)
      droneText,                                         // 9 - Drone Pilot(s)
      sameDayEditorsText,                                // 10 - Same Day Editor(s)
      event.created_at.split('T')[0],                    // 11 - Booking Date
      Number(event.advance_amount || 0),                 // 12 - Advance Amount
      Number(collectedAmount),                           // 13 - Collected Amount
      Number(closedAmount),                              // 14 - Closed Amount
      Number(balanceAmount),                             // 15 - Balance Amount
      Number(event.total_amount || 0),                   // 16 - Total Amount
      getPaymentStatus(event, collectedAmount, closedAmount), // 17 - Payment Status
      event.photo_editing_status ? 'Yes' : 'No',        // 18 - Photos Edited
      event.video_editing_status ? 'Yes' : 'No',        // 19 - Videos Edited
      `Day ${day}/${totalDays}${event.description ? ` - ${event.description}` : ''}` // 20 - Remarks
    ];

    // Sync to Master Events sheet
    await updateOrAppendToSheet(accessToken, spreadsheetId, 'Master Events', eventData, 0);
    console.log(`✅ Synced event ${dayTitle} to Master Events sheet`);

    // Also sync to event-specific type sheet
    try {
      const sheetName = event.event_type;
      await ensureSheetExists(accessToken, spreadsheetId, sheetName, SHEET_HEADERS.MASTER_EVENTS);
      await updateOrAppendToSheet(accessToken, spreadsheetId, sheetName, eventData, 0);
      console.log(`✅ Also synced event to ${sheetName} sheet`);
    } catch (eventTypeError) {
      console.warn(`⚠️ Could not sync to event-specific sheet "${event.event_type}": ${eventTypeError.message}`);
    }
  }

  return event;
}