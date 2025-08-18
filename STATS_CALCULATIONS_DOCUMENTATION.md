# STATS CALCULATIONS DOCUMENTATION

## CRITICAL FIXES IMPLEMENTED:
- ✅ Fixed double-counting in Finance page Payment Out calculation
- ✅ Fixed pending amount calculation to show actual balances
- ✅ Fixed Payment In to include advance amounts + additional payments

## 📊 FINANCE PAGE (/finance)
**Location:** `src/components/finance/FinanceStats.tsx` + `src/components/finance/hooks/useEnhancedFinanceStats.ts`

### Stats Cards:
1. **Payment In** = `advance_amount` from events + `amount` from payments table
   - Breakdown: Cash vs Digital payments
   - Sources: events.advance_amount + payments.amount

2. **Payment Out** = expenses.amount + staff_payments.amount + freelancer_payments.amount
   - Breakdown: Cash vs Digital payments
   - Sources: expenses + staff_payments + freelancer_payments (NO double counting)

3. **Net Profit** = Payment In - Payment Out
   - Breakdown: Cash vs Digital difference

4. **Pending Amount** = Sum of positive balances only
   - Calculation: `Math.max(0, event.total_amount - (event.advance_amount + additional_payments_for_event))`

---

## 🎯 EVENTS PAGE (/events)
**Location:** `src/components/events/EventStats.tsx`

### Stats Cards:
1. **Total Revenue** = Sum of `events.total_amount`
   - Breakdown: Cash vs Digital from payments table by event_id

2. **Total Events** = Count of all events
   - Breakdown: Completed vs Active events

3. **Completed Events** = Events where `event_date <= today`

4. **Confirmed Events** = Events where `total_amount > 0`

---

## 💰 SALARY PAGE (/salary)
**Location:** `src/components/salary/SalaryStats.tsx`

### Stats Cards:
1. **Total Earnings** = `stats.totalEarnings` (calculated elsewhere)

2. **Total Paid** = Sum from `staff_payments.amount`
   - Breakdown: Cash vs Digital from staff_payments.payment_method

3. **Total Tasks Paid** = `stats.taskPaymentsTotal`

4. **Total Assignments Paid** = `stats.assignmentRatesTotal`

---

## 📋 TASKS PAGE (/tasks)
**Location:** `src/components/tasks/TaskStatsCards.tsx`

### Stats Cards:
1. **Total Tasks** = Count of all tasks

2. **Completed** = Count where `tasks.status = 'Completed'`

3. **In Progress** = Count where `tasks.status = 'In Progress'`

---

## 💸 EXPENSES PAGE (/expenses)
**Location:** `src/components/expenses/ExpenseStats.tsx`

### Stats Cards:
1. **Total Expenses** = Sum of `expenses.amount`
   - Breakdown: Cash vs Digital from expenses.payment_method

2. **Monthly Total** = Sum of expenses where `expense_date` matches current month

3. **Yearly Total** = Sum of expenses where `expense_date` matches current year

4. **Average Expense** = Total expenses / count of expenses

---

## 📄 QUOTATIONS PAGE (/quotations)
**Location:** `src/components/quotations/QuotationStats.tsx`

### Stats Cards:
1. **Active Quotations** = Count where `converted_to_event` is null

2. **Pending** = Active quotations where `valid_until >= today`

3. **Expired** = Active quotations where `valid_until < today`

4. **Total Quotations** = Count of all quotations

---

## 💳 PAYMENTS PAGE (/payments)
**Location:** `src/components/payments/PaymentManagement.tsx` (uses `lib/payment-calculator.ts`)

### Stats Cards (using calculatePaymentStats):
1. **Total Events** = Count of events

2. **Total Revenue** = Sum of `events.total_amount`

3. **Total Paid** = Sum of all payments (advance + additional)

4. **Total Pending** = Sum of positive balances

5. **Paid Events** = Events with balance <= 0

6. **Partial Events** = Events with balance > 0 but some payments made

7. **Unpaid Events** = Events with no payments made

8. **Cash/Digital breakdowns** = Based on payment_method

---

## 🔧 COMMON ISSUES FIXED:

### 1. Double Counting in Payment Out:
- **BEFORE:** Payment Out = expenses + staff_payments + freelancer_payments (where salary was also in expenses)
- **AFTER:** Payment Out = non-salary expenses + staff_payments + freelancer_payments

### 2. Incorrect Pending Amount:
- **BEFORE:** Used `events.balance_amount` directly (could be stale)
- **AFTER:** Calculate real-time: `Math.max(0, total_amount - (advance_amount + additional_payments))`

### 3. Missing event_id in Payments Query:
- **BEFORE:** Could not correlate payments to events properly
- **AFTER:** Include `event_id` in payments query for accurate filtering

### 4. Payment In Calculation:
- **BEFORE:** Inconsistent inclusion of advance amounts
- **AFTER:** Payment In = advance_amount + additional_payments (no double counting)

---

## 📝 NOTES:
- All amount values are stored as `numeric` in database
- Payment methods are either "Cash" or other (treated as "Digital")
- Date filtering respects timezone and uses ISO format
- Stats are recalculated real-time when data changes