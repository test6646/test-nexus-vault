/**
 * Task Sync Handler
 * Handles syncing task data to Google Sheets
 */

import { updateOrAppendToSheet, ensureSheetExists, deleteFromSheet } from '../../_shared/google-sheets-helpers.ts';
import { SHEET_HEADERS } from '../../shared/sheet-headers.ts';

export async function syncTaskToSheet(
  supabase: any, 
  accessToken: string, 
  spreadsheetId: string, 
  taskId: string,
  operation: 'create' | 'update' | 'delete' = 'update'
) {
  // Ensure Tasks sheet exists with proper headers
  await ensureSheetExists(accessToken, spreadsheetId, 'Tasks', SHEET_HEADERS.TASKS);

  if (operation === 'delete') {
    await deleteFromSheet(accessToken, spreadsheetId, 'Tasks', taskId, 0);
    return { id: taskId, title: 'Deleted Task' };
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assigned_profile:profiles!tasks_assigned_to_fkey(full_name),
      freelancer:freelancers!tasks_freelancer_id_fkey(full_name),
      event:events(title, event_date, clients(id, name))
    `)
    .eq('id', taskId)
    .single();

  if (error || !task) {
    throw new Error(`Task not found: ${error?.message}`);
  }

  // Determine assignment with proper brackets
  let assignedTo = 'Unassigned';
  if (task.assigned_profile?.full_name) {
    assignedTo = `${task.assigned_profile.full_name} (STAFF)`;
  } else if (task.freelancer?.full_name) {
    assignedTo = `${task.freelancer.full_name} (FREELANCER)`;
  }

  // Task data to match EXACT CENTRALIZED headers
  const taskData = [
    task.id,                                           // Task ID
    task.title,                                        // Title
    assignedTo,                                        // Assigned To
    task.event?.clients?.name || '',                   // Client
    task.event?.title || '',                           // Event
    task.event?.event_date || '',                      // Date
    task.task_type || 'Other',                         // Type
    task.description || '',                            // Description
    task.due_date || '',                               // Due Date
    task.status,                                       // Status
    task.priority || 'Medium',                         // Priority
    task.amount || '',                                 // Amount
    task.updated_at.split('T')[0],                     // Updated
    ''                                                 // Remarks
  ];

  await updateOrAppendToSheet(accessToken, spreadsheetId, 'Tasks', taskData, 0);
  return task;
}