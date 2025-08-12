# 📊 Google Sheets Sync - Comprehensive List

## 🔄 What Gets Synced Automatically

### 1. **CLIENTS** 
- **Triggers**: Create, Update, Delete
- **Sheet**: `Clients`
- **Data Synced**:
  - Client ID
  - Name
  - Mobile Number
  - Email
  - Address/City
  - Notes/Remarks
- **Sync Method**: Real-time via database triggers + Background service

### 2. **EVENTS**
- **Triggers**: Create, Update, Delete, Staff Assignment Changes, Payment Changes
- **Sheets**: `Master Events` + Event Type specific sheets (e.g., `Wedding`, `Pre-Wedding`)
- **Data Synced**:
  - Event ID
  - Client Name
  - Event Type
  - Event Date
  - Venue
  - Photographers (by day, comma-separated)
  - Cinematographers (by day, comma-separated)
  - Total Amount
  - Advance Paid
  - Balance Due
  - Status
  - Notes
- **Multi-day Support**: ✅ Each day gets separate row with `DAY XX` suffix
- **Staff Assignment Integration**: ✅ Auto-updates when staff/freelancers assigned
- **Payment Integration**: ✅ Auto-updates amounts when payments made
- **Sync Method**: Real-time via database triggers + Background service

### 3. **TASKS**
- **Triggers**: Create, Update, Status Change, Assignment Change
- **Sheet**: `Tasks`
- **Data Synced**:
  - Task ID
  - Title
  - Assigned To (with STAFF/FREELANCER indicator)
  - Client
  - Event
  - Date
  - Type
  - Description
  - Due Date
  - **Status** ⚠️ (CRITICAL - Fixed sync conflicts)
  - Priority
  - Amount
  - Updated Date
  - Remarks
- **Status Sync**: ✅ Now properly syncs all manual status updates from frontend
- **Freelancer Tasks**: ✅ Fixed sync conflicts for freelancer task status updates
- **Sync Method**: Real-time via database triggers + Background service

### 4. **EXPENSES**
- **Triggers**: Create, Update, Delete
- **Sheet**: `Expenses`
- **Data Synced**:
  - Expense ID
  - Date
  - Category
  - Vendor (extracted from salary descriptions)
  - Description
  - Amount
  - Payment Method
  - Event
  - Receipt (Yes/No)
  - Remarks
- **Salary Integration**: ✅ Auto-creates expenses for staff/freelancer payments
- **Sync Method**: Real-time via database triggers + Background service

### 5. **STAFF**
- **Triggers**: Create, Update, Email Confirmation
- **Sheet**: `Staff`
- **Data Synced**:
  - Staff ID
  - Full Name
  - Role
  - Mobile Number
  - Join Date
  - Remarks
- **Sync Method**: Manual trigger + Background service

### 6. **FREELANCERS**
- **Triggers**: Create, Update
- **Sheet**: `Freelancers`
- **Data Synced**:
  - Freelancer ID
  - Full Name
  - Role
  - Phone Number
  - Email
  - Rate
  - Contact Info
  - Notes
- **Sync Method**: Real-time via database triggers + Background service

### 7. **PAYMENTS**
- **Triggers**: Create, Update, Delete
- **Impact**: Re-syncs related Events with updated amounts
- **Data**: Updates Event advance/balance amounts in Master Events sheet
- **Sync Method**: Cascading sync via event updates

### 8. **STAFF ASSIGNMENTS**
- **Triggers**: Create, Update, Delete
- **Impact**: Re-syncs related Events with updated staff lists
- **Data**: Updates photographer/cinematographer columns in Events sheets
- **Sync Method**: Cascading sync via event updates

## 🎯 Recent Fixes Applied

### ✅ Task Status Sync Conflicts - RESOLVED
- **Issue**: Freelancer task status updates from frontend not syncing to Google Sheets
- **Root Cause**: `FreelancerTaskStatusDialog` was updating database directly without triggering sync
- **Fix Applied**: 
  - Added Google Sheets sync trigger to `FreelancerTaskStatusDialog`
  - Standardized all task status updates to use centralized sync service
  - Replaced direct edge function calls with background sync service

### ✅ Duplicate Sync Prevention
- **Implementation**: All sync functions check for existing records by ID before creating new ones
- **Benefit**: Prevents duplicate entries in Google Sheets

### ✅ Font Consistency
- **Applied**: All synced data uses Lexend font at 10pt size
- **Scope**: Headers and data cells across all sheets

### ✅ Multi-day Event Support
- **Feature**: Events with multiple days create separate rows with "DAY XX" indicators
- **Staff Mapping**: Correctly maps photographers/cinematographers by day

## 🔍 Manual Testing Checklist

### Task Status Updates (PRIORITY)
- [ ] Create a freelancer task
- [ ] Change status from "Waiting for Response" to "In Progress" via frontend
- [ ] Verify status updates in Google Sheets `Tasks` sheet
- [ ] Change status to "Completed" 
- [ ] Verify completion sync in Google Sheets

### Event Management
- [ ] Create new event
- [ ] Assign staff/freelancers to different days
- [ ] Add payment
- [ ] Verify all data syncs to both Master Events and event-type specific sheets

### Payment Flow
- [ ] Add payment to existing event
- [ ] Verify event amounts update in Google Sheets
- [ ] Delete payment
- [ ] Verify amounts revert in Google Sheets

### Client & Freelancer Management
- [ ] Create new client
- [ ] Update client details
- [ ] Create new freelancer
- [ ] Update freelancer details
- [ ] Verify all changes sync to respective sheets

## 🚨 Known Limitations

1. **Google API Rate Limits**: Batch processing with 500ms delays between batches
2. **Real-time Delay**: Background sync may take 1-3 seconds to appear in sheets
3. **Manual Override**: Users can manually edit Google Sheets, but changes won't sync back to database
4. **Network Dependencies**: Sync requires stable internet connection

## 🔧 Troubleshooting

### If Sync Stops Working:
1. Check console logs for sync errors
2. Verify firm has `spreadsheet_id` configured
3. Check Google Service Account permissions
4. Restart background sync service if needed

### For Missing Data:
1. Use "Sync All Data" button in settings
2. Check if item exists in database
3. Verify firm association is correct
4. Check Google Sheets for manual overwrites