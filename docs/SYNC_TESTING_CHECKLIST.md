# 🧪 Google Sheets Sync Testing Checklist

## 🚨 CRITICAL ISSUES FIXED

### ✅ Task Status Sync Conflicts - RESOLVED
**Issue**: Freelancer task status updates from frontend not syncing to Google Sheets  
**Root Cause**: Multiple sync methods causing conflicts  
**Fix Applied**: Standardized all task updates to use centralized `googleSheetsSync` service  

## 📋 Manual Testing Protocol

### 1. **TASK STATUS UPDATES** (HIGH PRIORITY)

#### A. Freelancer Task Status via Dialog
1. **Login as Admin** → Navigate to `/tasks`
2. **Create a freelancer task**:
   - Title: "Test Freelancer Task Sync"
   - Assign to any freelancer
   - Status: "Waiting for Response"
3. **Click on task** → Select "Update Status"
4. **Change status**: "Waiting for Response" → "In Progress"
   - ✅ **Expected**: Status updates in UI immediately
   - ✅ **Expected**: Console shows: `🔄 Task [ID] status update synced to Google Sheets`
   - ✅ **Expected**: Google Sheets `Tasks` sheet shows updated status within 3 seconds
5. **Continue testing**: "In Progress" → "Completed"
   - ✅ **Expected**: Status syncs to Google Sheets
   - ✅ **Expected**: `completed_at` field populated in database

#### B. Staff Task Status via Card Actions
1. **Login as Staff Member** → Navigate to `/tasks`
2. **Find an assigned task** with status "Waiting for Response"
3. **Click "Accept"** button on task card
   - ✅ **Expected**: Status changes to "Accepted" in UI
   - ✅ **Expected**: Google Sheets updates within 3 seconds
4. **Click "Start Task"** → Status should become "In Progress"
   - ✅ **Expected**: Status syncs to Google Sheets
5. **Click "Complete Task"** → Status should become "Completed"
   - ✅ **Expected**: Status syncs to Google Sheets

### 2. **EVENT MANAGEMENT SYNC**

#### A. Event Creation & Staff Assignment
1. **Create new event**:
   - Client: Test Client
   - Event Type: Wedding
   - Date: Future date
   - Multi-day: Enable (2 days)
2. **Assign staff**:
   - Day 1: Photographer A, Cinematographer B
   - Day 2: Photographer C, Cinematographer D
3. **Check Google Sheets**:
   - ✅ **Expected**: 2 rows in `Master Events` (one per day)
   - ✅ **Expected**: 2 rows in `Wedding` sheet (if exists)
   - ✅ **Expected**: Day-specific staff assignments visible

#### B. Payment Integration
1. **Add payment** to the event (₹10,000)
2. **Check Google Sheets**:
   - ✅ **Expected**: Advance amount updates to ₹10,000
   - ✅ **Expected**: Balance amount decreases by ₹10,000
3. **Add second payment** (₹5,000)
4. **Check Google Sheets**:
   - ✅ **Expected**: Advance amount updates to ₹15,000
   - ✅ **Expected**: Balance reflects new total

### 3. **CLIENT & FREELANCER SYNC**

#### A. Client Management
1. **Create new client**:
   - Name: Test Sync Client
   - Mobile: +91-9876543210
   - Email: test@example.com
2. **Check Google Sheets**:
   - ✅ **Expected**: New row in `Clients` sheet
   - ✅ **Expected**: All data populated correctly
3. **Update client details**
4. **Check Google Sheets**:
   - ✅ **Expected**: Existing row updates (no duplicate)

#### B. Freelancer Management
1. **Create new freelancer**:
   - Name: Test Sync Freelancer
   - Role: Photographer
   - Rate: ₹5000
2. **Check Google Sheets**:
   - ✅ **Expected**: New row in `Freelancers` sheet
3. **Update freelancer details**
4. **Check Google Sheets**:
   - ✅ **Expected**: Existing row updates

### 4. **EXPENSE SYNC**

#### A. Manual Expense
1. **Create expense**:
   - Category: Equipment
   - Amount: ₹2000
   - Description: Camera lens
2. **Check Google Sheets**:
   - ✅ **Expected**: New row in `Expenses` sheet

#### B. Salary Payment Expense (Auto-created)
1. **Navigate to Salary** → Pay staff member
2. **Check Google Sheets**:
   - ✅ **Expected**: Auto-expense created in `Expenses` sheet
   - ✅ **Expected**: Vendor field shows staff name

## 🔍 Console Monitoring

### Expected Log Messages:
```
🔄 Queuing [item_type] [item_id] for background sync
📤 Syncing [item_type] [item_id] to Google Sheets  
✅ Successfully synced [item_type] [item_id]
✅ Updated existing record in [Sheet] at row [X] with Lexend font
```

### Error Log Patterns:
```
❌ Sync failed for [item_type] [item_id]: [error]
🔄 Retrying sync in [delay]ms (attempt [X])
💥 Final sync failure for [item_type] [item_id] after [X] retries
```

## ⚡ Performance Verification

### Sync Speed Expectations:
- **UI Updates**: Immediate (optimistic updates)
- **Database Updates**: < 1 second
- **Google Sheets Sync**: 1-3 seconds
- **Batch Processing**: 3-5 items every 500ms

### Queue Monitoring:
```javascript
// Run in browser console to check sync queue status
import('@/services/googleSheetsSync').then(({ googleSheetsSync }) => {
  console.log(googleSheetsSync.getQueueStatus());
});
```

## 🚨 Failure Scenarios to Test

### Network Issues:
1. **Disconnect internet** → Make task status change → **Reconnect**
   - ✅ **Expected**: Sync retries and succeeds
   - ✅ **Expected**: No duplicate entries

### Rapid Changes:
1. **Quickly change task status** multiple times (5+ changes in 10 seconds)
   - ✅ **Expected**: All changes queued and processed
   - ✅ **Expected**: Final state reflects in Google Sheets
   - ✅ **Expected**: No duplicate rows

### Concurrent Users:
1. **Multiple users** update different tasks simultaneously
   - ✅ **Expected**: All changes sync correctly
   - ✅ **Expected**: No conflicts or overwrites

## 📊 Google Sheets Verification

### Sheet Structure:
- `Clients` - Client data with headers
- `Master Events` - All events across types
- `[Event Type]` sheets - Type-specific events (Wedding, Pre-Wedding, etc.)
- `Tasks` - All task data
- `Expenses` - All expense data
- `Staff` - Staff member data
- `Freelancers` - Freelancer data

### Data Integrity Checks:
- ✅ No duplicate rows (same ID in multiple rows)
- ✅ Consistent font (Lexend, 10pt)
- ✅ Proper data formatting
- ✅ Hidden columns for internal IDs
- ✅ Multi-day events show as separate rows

## 🔧 Troubleshooting Steps

### If Sync Fails:
1. Check browser console for errors
2. Verify firm has `spreadsheet_id` configured
3. Test with "Sync All Data" button
4. Check Google API quotas/permissions
5. Verify edge function logs in Supabase

### If Duplicate Entries:
1. Check if existing record detection is working
2. Verify ID matching logic in sync functions
3. Consider manual cleanup of sheets
4. Test with fresh data

### If Partial Sync:
1. Check specific item exists in database
2. Verify firm association
3. Test individual item sync
4. Check edge function execution logs