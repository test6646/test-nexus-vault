// ============================================
// CENTRALIZED SHEET HEADER CONFIGURATIONS
// This file defines the EXACT header order for ALL sheets
// ============================================

export const SHEET_HEADERS = {
  // Master Events sheet headers (WITH CLIENT ID)
  MASTER_EVENTS: [
    'Client ID',           // 0 - FOR MATCHING/COMPARING
    'Client Name',         // 1
    'Event Type',          // 2  
    'Event Date',          // 3
    'Location / Venue',    // 4
    'Storage Disk',        // 5
    'Storage Size',        // 6
    'Assigned Photographer(s)', // 7
    'Assigned Videographer(s)', // 8
    'Booking Date',        // 9
    'Advance Amount',      // 10
    'Balance Amount',      // 11
    'Total Amount',        // 12
    'Payment Status',      // 13
    'Photos Edited',       // 14
    'Videos Edited',       // 15
    'Remarks / Notes'      // 16
  ],

  // Clients sheet headers (WITH CLIENT ID)
  CLIENTS: [
    'Client ID',           // 0 - FOR MATCHING/COMPARING  
    'Client Name',         // 1
    'Phone Number',        // 2
    'Email',               // 3
    'Address / City',      // 4
    'Remarks / Notes'      // 5
  ],

  // Tasks sheet headers (WITH TASK ID)
  TASKS: [
    'Task ID',             // 0 - FOR MATCHING/COMPARING
    'Task Title',          // 1
    'Assigned To',         // 2
    'Related Client ID / Name', // 3
    'Related Event',       // 4
    'Event Date',          // 5
    'Task Type',           // 6
    'Task Description / Notes', // 7
    'Due Date',            // 8
    'Status',              // 9
    'Priority',            // 10
    'Last Updated',        // 11
    'Remarks'              // 12
  ],

  // Staff sheet headers (WITH STAFF ID)
  STAFF: [
    'Staff ID',            // 0 - FOR MATCHING/COMPARING
    'Full Name',           // 1
    'Role',                // 2
    'Mobile Number',       // 3
    'Join Date',           // 4
    'Remarks'              // 5
  ],

  // Expenses sheet headers (WITH EXPENSE ID)
  EXPENSES: [
    'Expense ID',          // 0 - FOR MATCHING/COMPARING
    'Date',                // 1
    'Category',            // 2
    'Paid To / Vendor',    // 3
    'Description',         // 4
    'Amount',              // 5
    'Payment Mode',        // 6
    'Event Linked',        // 7
    'Receipt Available',   // 8
    'Remarks / Notes'      // 9
  ]
};

// Event type specific sheets (same as master events) - using exact EventType values
export const EVENT_TYPE_SHEETS = [
  'Ring-Ceremony',
  'Pre-Wedding', 
  'Wedding',
  'Maternity Photography',
  'Others'
];

// No mapping needed - sheet names now match EventType values exactly

// All sheets that should be created
export const ALL_SHEETS = [
  {
    name: 'Master Events',
    headers: SHEET_HEADERS.MASTER_EVENTS
  },
  {
    name: 'Clients', 
    headers: SHEET_HEADERS.CLIENTS
  },
  {
    name: 'Tasks',
    headers: SHEET_HEADERS.TASKS
  },
  {
    name: 'Staff',
    headers: SHEET_HEADERS.STAFF
  },
  {
    name: 'Expenses',
    headers: SHEET_HEADERS.EXPENSES
  },
  // Event type specific sheets
  ...EVENT_TYPE_SHEETS.map(sheetName => ({
    name: sheetName,
    headers: SHEET_HEADERS.MASTER_EVENTS // Same headers as master events
  }))
];