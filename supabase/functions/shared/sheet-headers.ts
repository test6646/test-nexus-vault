// ============================================
// CENTRALIZED SHEET HEADER CONFIGURATIONS
// This file defines the EXACT header order for ALL sheets
// ============================================

export const SHEET_HEADERS = {
  // Master Events sheet headers (WITH EVENT ID AS PRIMARY)
  MASTER_EVENTS: [
    'Event ID',            // 0 - PRIMARY IDENTIFIER FOR MATCHING
    'Title',               // 1 - Event title (FIXED: was 'Client')
    'Type',                // 2 - Event type  
    'Date',                // 3 - Event date
    'Venue',               // 4 - Venue/Location
    'Storage',             // 5 - Storage disk
    'Size',                // 6 - Storage size
    'Photographers',       // 7 - Comma separated
    'Cinematographers',    // 8 - Comma separated
    'Drone',               // 9 - Drone pilot
    'Same Day Edit',       // 10 - Same day editor
    'Booking',             // 11 - Booking date
    'Advance',             // 12 - Advance amount
    'Collected',           // 13 - Total collected payments
    'Closed',              // 14 - Closed amount
    'Balance',             // 15 - Balance amount
    'Total',               // 16 - Total amount
    'Status',              // 17 - Payment status
    'Photos Edited?',      // 18 - Yes/No
    'Videos Edited?',      // 19 - Yes/No
    'Remarks'              // 20 - Notes/remarks
  ],

  // Clients sheet headers (WITH CLIENT ID)
  CLIENTS: [
    'Client ID',           // 0 - FOR MATCHING/COMPARING  
    'Name',                // 1 - Client name
    'Phone',               // 2 - Phone number
    'Email',               // 3 - Email address
    'Address',             // 4 - Address
    'Remarks'              // 5 - Notes
  ],

  // Tasks sheet headers (WITH TASK ID) - ADDED AMOUNT
  TASKS: [
    'Task ID',             // 0 - FOR MATCHING/COMPARING
    'Title',               // 1 - Task title
    'Assigned To',         // 2 - Who is assigned
    'Client',              // 3 - Client name
    'Event',               // 4 - Event title
    'Date',                // 5 - Event date
    'Type',                // 6 - Task type
    'Description',         // 7 - Task description
    'Due Date',            // 8 - Due date
    'Status',              // 9 - Task status
    'Priority',            // 10 - Priority level
    'Amount',              // 11 - CRITICAL: Added amount field
    'Updated',             // 12 - Last updated
    'Remarks'              // 13 - Notes
  ],

  // Staff sheet headers (WITH STAFF ID)
  STAFF: [
    'Staff ID',            // 0 - FOR MATCHING/COMPARING
    'Name',                // 1 - Full name
    'Role',                // 2 - Role/position
    'Mobile',              // 3 - Mobile number
    'Joined',              // 4 - Joining date
    'Remarks'              // 5 - Notes
  ],

  // Expenses sheet headers (WITH EXPENSE ID)
  EXPENSES: [
    'Expense ID',          // 0 - FOR MATCHING/COMPARING
    'Date',                // 1 - Expense date
    'Category',            // 2 - Expense category
    'Vendor',              // 3 - Vendor name
    'Description',         // 4 - Description
    'Amount',              // 5 - Amount
    'Payment Method',      // 6 - Payment method
    'Event',               // 7 - Related event
    'Receipt',             // 8 - Receipt URL
    'Remarks'              // 9 - Notes
  ],

  // Freelancers sheet headers (WITH FREELANCER ID)
  FREELANCERS: [
    'Freelancer ID',       // 0 - FOR MATCHING/COMPARING
    'Name',                // 1 - Full name
    'Role',                // 2 - Role/position
    'Phone',               // 3 - Phone number
    'Email',               // 4 - Email address
    'Rate',                // 5 - Default rate
    'Remarks'              // 6 - Notes (REMOVED Contact column as redundant)
  ],

  // Payments sheet headers (WITH PAYMENT ID)
  PAYMENTS: [
    'Payment ID',          // 0 - FOR MATCHING/COMPARING
    'Event',               // 1 - Event name
    'Client',              // 2 - Client name
    'Amount',              // 3 - Payment amount
    'Payment Method',      // 4 - Payment method
    'Payment Date',        // 5 - Payment date
    'Reference Number',    // 6 - Reference number
    'Notes',               // 7 - Notes
    'Created Date'         // 8 - Created timestamp
  ],

  // Accounting sheet headers (WITH ACCOUNTING ID)
  ACCOUNTING: [
    'Entry ID',            // 0 - FOR MATCHING/COMPARING
    'Entry Type',          // 1 - Credit/Debit
    'Category',            // 2 - Entry category
    'Subcategory',         // 3 - Entry subcategory
    'Title',               // 4 - Entry title
    'Description',         // 5 - Description
    'Amount',              // 6 - Amount
    'Entry Date',          // 7 - Entry date
    'Payment Method',      // 8 - Payment method
    'Document URL',        // 9 - Document URL
    'Reflect to Company',  // 10 - Company reflection
    'Created Date'         // 11 - Created timestamp
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
  {
    name: 'Freelancers',
    headers: SHEET_HEADERS.FREELANCERS
  },
  {
    name: 'Payments',
    headers: SHEET_HEADERS.PAYMENTS
  },
  {
    name: 'Accounting',
    headers: SHEET_HEADERS.ACCOUNTING
  },
  // Event type specific sheets
  ...EVENT_TYPE_SHEETS.map(sheetName => ({
    name: sheetName,
    headers: SHEET_HEADERS.MASTER_EVENTS // Same headers as master events
  }))
];
