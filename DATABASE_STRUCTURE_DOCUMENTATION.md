# Database Structure Documentation

## Overview
This document provides a comprehensive overview of the Supabase database structure for the PRIT PHOTO project management system.

**Project ID:** tovnbcputrcfznsnccef  
**Generated:** $(date)

---

## User-Defined Types (Enums)

### event_status
**Values:** Quotation, Confirmed, Shooting, Editing, Delivered, Cancelled

### event_type  
**Values:** Ring-Ceremony, Pre-Wedding, Wedding, Maternity Photography, Others

### expense_category
**Values:** Equipment, Travel, Accommodation, Food, Marketing, Software, Maintenance, Salary, Other

### payment_method
**Values:** Cash, Digital

### payment_status
**Values:** Pending, Paid, Partial, Overdue

### task_priority
**Values:** Low, Medium, High, Urgent

### task_status
**Values:** Pending, In Progress, Completed, On Hold, Waiting for Response, Accepted, Declined, Under Review

### task_type
**Values:** Photo Editing, Video Editing, Other

### user_role
**Values:** Admin, Photographer, Videographer, Editor, Other, Cinematographer, Drone Pilot

---

## Tables

### 1. clients
**Description:** Stores client information for each firm

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| firm_id | uuid | YES | NULL | Associated firm |
| name | text | NO | - | Client name |
| email | text | YES | NULL | Client email |
| phone | text | NO | - | Client phone number |
| address | text | YES | NULL | Client address |
| notes | text | YES | NULL | Additional notes |
| created_at | timestamp | NO | now() | Creation timestamp |
| updated_at | timestamp | NO | now() | Last update timestamp |

**Indexes:**
- Primary Key: clients_pkey (id)
- Index: idx_clients_firm_id (firm_id)

**RLS Policies:**
- Allow all operations on clients (ALL: true)

---

### 2. event_assignment_rates
**Description:** Stores assignment rates for events with staff/freelancers

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| firm_id | uuid | NO | - | Associated firm |
| event_id | uuid | NO | - | Associated event |
| day_number | integer | NO | 1 | Day number |
| role | text | NO | - | Role assigned |
| staff_id | uuid | YES | NULL | Staff member ID |
| freelancer_id | uuid | YES | NULL | Freelancer ID |
| rate | numeric | NO | - | Rate amount |
| quantity | numeric | NO | 1 | Quantity |
| notes | text | YES | NULL | Additional notes |
| created_at | timestamp | NO | now() | Creation timestamp |
| updated_at | timestamp | NO | now() | Last update timestamp |

**Indexes:**
- Primary Key: event_assignment_rates_pkey (id)
- Unique: ux_event_assignment_rate_freelancer (event_id, day_number, role, freelancer_id) WHERE freelancer_id IS NOT NULL
- Unique: ux_event_assignment_rate_staff (event_id, day_number, role, staff_id) WHERE staff_id IS NOT NULL

---

### 3. event_staff_assignments
**Description:** Manages staff assignments to events

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| event_id | uuid | NO | - | Associated event |
| staff_id | uuid | YES | NULL | Staff member ID |
| role | text | NO | - | Role assigned |
| day_number | integer | NO | 1 | Day number |
| day_date | date | YES | NULL | Specific date |
| created_at | timestamp | YES | now() | Creation timestamp |
| updated_at | timestamp | YES | now() | Last update timestamp |
| firm_id | uuid | YES | NULL | Associated firm |
| staff_type | text | YES | NULL | Type of staff |
| freelancer_id | uuid | YES | NULL | Freelancer ID |

**Indexes:**
- Primary Key: event_staff_assignments_pkey (id)
- Index: idx_event_staff_assignments_freelancer_id (freelancer_id)
- Index: idx_event_staff_assignments_staff_type (staff_type)

**RLS Policies:**
- Allow all operations on event_staff_assignments (ALL: true)

---

### 4. events
**Description:** Main events table storing event information

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| firm_id | uuid | YES | NULL | Associated firm |
| client_id | uuid | YES | NULL | Associated client |
| title | text | NO | - | Event title |
| event_type | event_type | NO | - | Type of event |
| event_date | date | NO | - | Event date |
| venue | text | YES | NULL | Event venue |
| event_end_date | date | YES | NULL | Event end date |
| total_days | integer | YES | 1 | Total days |
| total_amount | numeric | YES | 0 | Total amount |
| advance_amount | numeric | YES | 0 | Advance amount paid |
| balance_amount | numeric | YES | 0 | Balance amount |
| created_by | uuid | YES | NULL | Creator user ID |
| storage_disk | varchar | YES | NULL | Storage disk info |
| storage_size | bigint | YES | NULL | Storage size |
| description | text | YES | NULL | Event description |
| photo_editing_status | boolean | YES | false | Photo editing completed |
| video_editing_status | boolean | YES | false | Video editing completed |
| calendar_event_id | text | YES | NULL | Google Calendar event ID |
| advance_payment_method | payment_method | YES | 'Cash' | Payment method for advance |
| quotation_source_id | uuid | YES | NULL | Source quotation ID |
| same_day_editor | boolean | YES | false | Same day editor flag |
| created_at | timestamp | NO | now() | Creation timestamp |
| updated_at | timestamp | NO | now() | Last update timestamp |

**Indexes:**
- Primary Key: events_pkey (id)
- Index: idx_events_firm_id (firm_id)
- Unique: unique_client_event_type (client_id, event_type)

**RLS Policies:**
- Allow all operations on events (ALL: true)

---

### 5. expenses
**Description:** Tracks business expenses

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| firm_id | uuid | YES | NULL | Associated firm |
| description | text | NO | - | Expense description |
| category | expense_category | NO | - | Expense category |
| amount | numeric | NO | - | Expense amount |
| expense_date | date | NO | CURRENT_DATE | Date of expense |
| payment_method | payment_method | NO | 'Cash' | Payment method |
| notes | text | YES | NULL | Additional notes |
| receipt_url | text | YES | NULL | Receipt URL |
| event_id | uuid | YES | NULL | Associated event |
| created_by | uuid | YES | NULL | Creator user ID |
| created_at | timestamp | NO | now() | Creation timestamp |
| updated_at | timestamp | NO | now() | Last update timestamp |

**Indexes:**
- Primary Key: expenses_pkey (id)

**RLS Policies:**
- Allow all operations on expenses (ALL: true)

---

### 6. firm_members
**Description:** Manages firm membership relationships

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| firm_id | uuid | NO | - | Associated firm |
| user_id | uuid | NO | - | User ID |
| role | text | NO | 'Member' | Member role |
| joined_at | timestamp | NO | now() | Join timestamp |

**Indexes:**
- Primary Key: firm_members_pkey (id)
- Unique: firm_members_firm_id_user_id_key (firm_id, user_id)
- Index: idx_firm_members_firm_id (firm_id)
- Index: idx_firm_members_user_id (user_id)

**RLS Policies:**
- Firm admins can manage memberships in their firms (ALL)
- Users can insert their own firm memberships (INSERT)
- Users can view their own firm memberships (SELECT)

---

### 7. firms
**Description:** Stores firm/company information

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Firm name |
| description | text | YES | NULL | Firm description |
| logo_url | text | YES | NULL | Logo URL |
| created_by | uuid | YES | NULL | Creator user ID |
| spreadsheet_id | text | YES | NULL | Google Sheets ID |
| calendar_id | text | YES | NULL | Google Calendar ID |
| header_left_content | text | YES | Default contact info | Header content |
| footer_content | text | YES | Default footer | Footer content |
| created_at | timestamp | NO | now() | Creation timestamp |
| updated_at | timestamp | NO | now() | Last update timestamp |

**Indexes:**
- Primary Key: firms_pkey (id)

**RLS Policies:**
- Admins can create firms (INSERT)
- Admins can update their firms (UPDATE)
- Users can view their own firm (SELECT)

---

### 8. freelancer_payments
**Description:** Tracks payments made to freelancers

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| firm_id | uuid | NO | - | Associated firm |
| freelancer_id | uuid | NO | - | Freelancer ID |
| amount | numeric | NO | - | Payment amount |
| payment_date | date | NO | - | Payment date |
| payment_method | text | NO | 'Cash' | Payment method |
| description | text | YES | NULL | Payment description |
| event_id | uuid | YES | NULL | Associated event |
| created_by | uuid | YES | NULL | Creator user ID |
| created_at | timestamp | NO | now() | Creation timestamp |
| updated_at | timestamp | NO | now() | Last update timestamp |

**Indexes:**
- Primary Key: freelancer_payments_pkey (id)

**RLS Policies:**
- Allow all operations on freelancer_payments (ALL: true)

---

### 9. freelancers
**Description:** Stores freelancer information

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| firm_id | uuid | NO | - | Associated firm |
| full_name | text | NO | - | Freelancer name |
| role | user_role | NO | - | Freelancer role |
| phone | text | YES | NULL | Phone number |
| email | text | YES | NULL | Email address |
| rate | numeric | YES | 0 | Default rate |
| created_at | timestamp | NO | now() | Creation timestamp |
| updated_at | timestamp | NO | now() | Last update timestamp |

**Indexes:**
- Primary Key: freelancers_pkey (id)

**RLS Policies:**
- Allow all operations on freelancers (ALL: true)

---

### 10. payments
**Description:** Tracks event payments from clients

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| firm_id | uuid | YES | NULL | Associated firm |
| event_id | uuid | YES | NULL | Associated event |
| amount | numeric | NO | - | Payment amount |
| payment_method | payment_method | NO | 'Cash' | Payment method |
| payment_date | date | NO | CURRENT_DATE | Payment date |
| reference_number | text | YES | NULL | Reference number |
| notes | text | YES | NULL | Payment notes |
| created_by | uuid | YES | NULL | Creator user ID |
| created_at | timestamp | NO | now() | Creation timestamp |
| updated_at | timestamp | NO | now() | Last update timestamp |

**Indexes:**
- Primary Key: payments_pkey (id)
- Index: idx_payments_event_id (event_id)
- Index: idx_payments_firm_id (firm_id)
- Index: idx_payments_payment_date (payment_date)

**RLS Policies:**
- Allow all operations on payments (ALL: true)

---

### 11. profiles
**Description:** User profile information

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | - | Auth user ID |
| full_name | text | NO | - | User full name |
| mobile_number | text | NO | - | Mobile number |
| role | user_role | NO | - | User role |
| firm_id | uuid | YES | NULL | Associated firm |
| current_firm_id | uuid | YES | NULL | Currently selected firm |
| created_at | timestamp | NO | now() | Creation timestamp |
| updated_at | timestamp | NO | now() | Last update timestamp |

**Indexes:**
- Primary Key: profiles_pkey (id)
- Unique: profiles_user_id_key (user_id)

**RLS Policies:**
- Users can create their own profile (INSERT)
- Users can update their own profile (UPDATE)
- Users can view profiles in their firm (SELECT)

---

### 12. quotations
**Description:** Stores client quotations

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| firm_id | uuid | YES | NULL | Associated firm |
| client_id | uuid | YES | NULL | Associated client |
| title | text | NO | - | Quotation title |
| event_type | event_type | NO | - | Event type |
| event_date | date | NO | - | Event date |
| venue | text | YES | NULL | Event venue |
| amount | numeric | NO | - | Quotation amount |
| discount_type | text | YES | 'amount' | Discount type |
| discount_value | numeric | YES | 0 | Discount value |
| discount_amount | numeric | YES | 0 | Discount amount |
| description | text | YES | NULL | Description |
| quotation_details | jsonb | YES | NULL | Detailed breakdown |
| valid_until | date | YES | NULL | Validity date |
| created_by | uuid | YES | NULL | Creator user ID |
| converted_to_event | uuid | YES | NULL | Converted event ID |
| created_at | timestamp | NO | now() | Creation timestamp |
| updated_at | timestamp | NO | now() | Last update timestamp |

**Indexes:**
- Primary Key: quotations_pkey (id)

**RLS Policies:**
- Allow all operations on quotations (ALL: true)

---

### 13. staff_payments
**Description:** Tracks payments made to staff members

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| firm_id | uuid | NO | - | Associated firm |
| staff_id | uuid | NO | - | Staff member ID |
| amount | numeric | NO | - | Payment amount |
| payment_date | date | NO | - | Payment date |
| payment_method | text | NO | - | Payment method |
| description | text | YES | NULL | Payment description |
| event_id | uuid | YES | NULL | Associated event |
| created_by | uuid | YES | NULL | Creator user ID |
| created_at | timestamp | NO | now() | Creation timestamp |
| updated_at | timestamp | NO | now() | Last update timestamp |

**Indexes:**
- Primary Key: staff_payments_pkey (id)
- Index: idx_staff_payments_firm_id (firm_id)
- Index: idx_staff_payments_payment_date (payment_date)
- Index: idx_staff_payments_staff_id (staff_id)

**RLS Policies:**
- delete_staff_payments (DELETE)
- insert_staff_payments (INSERT)  
- select_staff_payments (SELECT)
- update_staff_payments (UPDATE)

---

### 14. sync_queue
**Description:** Queue for Google Sheets synchronization

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| item_type | text | NO | - | Type of item to sync |
| item_id | uuid | NO | - | Item ID |
| action | text | NO | - | Sync action |
| data | jsonb | YES | NULL | Sync data |
| processed_at | timestamp | YES | NULL | Processing timestamp |
| error_message | text | YES | NULL | Error message |
| created_at | timestamp | NO | now() | Creation timestamp |

**Indexes:**
- Primary Key: sync_queue_pkey (id)

**RLS Policies:**
- Allow all operations on sync_queue (ALL: true)

---

### 15. tasks
**Description:** Task management system

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| firm_id | uuid | YES | NULL | Associated firm |
| title | text | NO | - | Task title |
| description | text | YES | NULL | Task description |
| status | task_status | NO | 'Waiting for Response' | Task status |
| priority | task_priority | YES | 'Medium' | Task priority |
| task_type | task_type | YES | 'Other' | Task type |
| assigned_to | uuid | YES | NULL | Assigned user ID |
| freelancer_id | uuid | YES | NULL | Assigned freelancer |
| event_id | uuid | YES | NULL | Associated event |
| due_date | date | YES | NULL | Due date |
| completed_at | timestamp | YES | NULL | Completion timestamp |
| amount | numeric | YES | NULL | Task amount |
| is_salary_based | boolean | YES | false | Salary-based flag |
| salary_details | jsonb | YES | NULL | Salary details |
| report_data | jsonb | YES | NULL | Report data |
| task_id | uuid | YES | NULL | Parent task ID |
| created_by | uuid | YES | NULL | Creator user ID |
| created_at | timestamp | NO | now() | Creation timestamp |
| updated_at | timestamp | NO | now() | Last update timestamp |

**Indexes:**
- Primary Key: tasks_pkey (id)
- Index: idx_tasks_assigned_to (assigned_to)
- Index: idx_tasks_event_id (event_id)
- Index: idx_tasks_firm_id (firm_id)
- Index: idx_tasks_freelancer_id (freelancer_id)
- Index: idx_tasks_status (status)

**RLS Policies:**
- Allow all operations on tasks (ALL: true)

---

### 16. wa_sessions
**Description:** WhatsApp session management

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | text | NO | - | Primary key |
| firm_id | uuid | NO | - | Associated firm |
| session_data | jsonb | YES | NULL | Session data |
| updated_at | timestamp | YES | now() | Last update timestamp |

**Indexes:**
- Primary Key: wa_sessions_pkey (id)

**RLS Policies:**
- Allow all operations on wa_sessions (ALL: true)

---

## Functions

### Core Functions

1. **update_updated_at_column()** - Updates the updated_at column
2. **get_current_user_role()** - Returns current user's role
3. **get_current_user_firm_id()** - Returns current user's firm ID
4. **get_current_user_current_firm_id()** - Returns current user's current firm ID

### Business Logic Functions

5. **check_payment_limit()** - Validates payment limits against event totals
6. **update_event_amounts_on_payment()** - Updates event amounts when payments change
7. **update_event_editing_status_on_task_completion()** - Updates editing status based on task completion
8. **check_duplicate_event_type()** - Prevents duplicate event types for clients

### Authentication Functions

9. **handle_new_user_profile()** - Creates profiles when users confirm emails
10. **handle_new_user()** - Basic user handling
11. **log_staff_confirmation()** - Logs staff email confirmations

### Sync Functions

12. **process_google_sheets_sync_queue()** - Processes sync queue
13. **sync_new_staff_to_google_sheets()** - Syncs new staff to Google Sheets

### WhatsApp Functions

14. **update_wa_sessions_updated_at()** - Updates WhatsApp session timestamps
15. **update_whatsapp_updated_at_column()** - Updates WhatsApp timestamps
16. **update_whatsapp_connection_updated_at()** - Updates connection timestamps

---

## Triggers

### Update Triggers (BEFORE UPDATE)
- All tables have `update_<table>_updated_at` triggers that update the `updated_at` column

### Business Logic Triggers

#### Payments Table
- `check_payment_limit_insert` - Validates payment limits on INSERT
- `check_payment_limit_update` - Validates payment limits on UPDATE  
- `update_payment_balance_only` - Updates event balances AFTER payment changes

#### Tasks Table
- `update_editing_status_only` - Updates event editing status AFTER task updates

#### WhatsApp Table
- `update_wa_sessions_updated_at` - Updates session timestamps

---

## Storage Buckets

### firm-logos
- **Public:** Yes
- **Purpose:** Stores firm logo images

---

## Security Notes

1. **Row Level Security (RLS)** is enabled on all tables
2. Most tables have permissive "Allow all operations" policies 
3. Some tables like `firms`, `profiles`, and `staff_payments` have specific access controls
4. Security functions use `SECURITY DEFINER` to access data safely
5. Authentication is handled through Supabase Auth with custom profile management

---

## Backup Instructions

1. **Full Restore:** Execute the SQL backup file in order
2. **Partial Restore:** Use individual CREATE statements for specific components
3. **Data Migration:** Export data separately before structure changes
4. **Testing:** Always test restoration in a development environment first

---

*Generated automatically from database schema inspection*