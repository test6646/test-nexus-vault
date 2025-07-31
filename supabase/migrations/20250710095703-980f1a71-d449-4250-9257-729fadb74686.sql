-- Remove duplicate foreign key constraints that are causing relationship conflicts

-- Drop duplicate foreign keys for clients table
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_firm_id_fkey;

-- Drop duplicate foreign keys for events table  
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_client_id_fkey;
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_firm_id_fkey;

-- Drop duplicate foreign keys for quotations table
ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_client_id_fkey;
ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_firm_id_fkey;

-- Drop duplicate foreign keys for payments table (if any)
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_event_id_fkey;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_firm_id_fkey;

-- Drop duplicate foreign keys for expenses table (if any)
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_event_id_fkey;
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_firm_id_fkey;

-- Drop duplicate foreign keys for staff_payments table (if any)
ALTER TABLE public.staff_payments DROP CONSTRAINT IF EXISTS staff_payments_event_id_fkey;
ALTER TABLE public.staff_payments DROP CONSTRAINT IF EXISTS staff_payments_firm_id_fkey;
ALTER TABLE public.staff_payments DROP CONSTRAINT IF EXISTS staff_payments_staff_id_fkey;

-- Drop duplicate foreign keys for tasks table (if any)
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_event_id_fkey;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_firm_id_fkey;