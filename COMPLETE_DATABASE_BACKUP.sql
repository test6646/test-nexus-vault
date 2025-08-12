-- ===============================================
-- COMPLETE DATABASE BACKUP - SUPABASE PROJECT
-- Project ID: tovnbcputrcfznsnccef
-- Generated: $(date)
-- ===============================================

-- ============ USER-DEFINED TYPES (ENUMS) ============

-- Event Status Enum
CREATE TYPE public.event_status AS ENUM (
    'Quotation',
    'Confirmed', 
    'Shooting',
    'Editing',
    'Delivered',
    'Cancelled'
);

-- Event Type Enum
CREATE TYPE public.event_type AS ENUM (
    'Ring-Ceremony',
    'Pre-Wedding',
    'Wedding',
    'Maternity Photography',
    'Others'
);

-- Expense Category Enum
CREATE TYPE public.expense_category AS ENUM (
    'Equipment',
    'Travel',
    'Accommodation',
    'Food',
    'Marketing',
    'Software',
    'Maintenance',
    'Salary',
    'Other'
);

-- Payment Method Enum
CREATE TYPE public.payment_method AS ENUM (
    'Cash',
    'Digital'
);

-- Payment Status Enum
CREATE TYPE public.payment_status AS ENUM (
    'Pending',
    'Paid',
    'Partial',
    'Overdue'
);

-- Task Priority Enum
CREATE TYPE public.task_priority AS ENUM (
    'Low',
    'Medium',
    'High',
    'Urgent'
);

-- Task Status Enum
CREATE TYPE public.task_status AS ENUM (
    'Pending',
    'In Progress',
    'Completed',
    'On Hold',
    'Waiting for Response',
    'Accepted',
    'Declined',
    'Under Review'
);

-- Task Type Enum
CREATE TYPE public.task_type AS ENUM (
    'Photo Editing',
    'Video Editing',
    'Other'
);

-- User Role Enum
CREATE TYPE public.user_role AS ENUM (
    'Admin',
    'Photographer',
    'Videographer',
    'Editor',
    'Other',
    'Cinematographer',
    'Drone Pilot'
);

-- ============ TABLE CREATION ============

-- Clients Table
CREATE TABLE public.clients (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    firm_id uuid,
    name text NOT NULL,
    email text,
    phone text NOT NULL,
    address text,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT clients_pkey PRIMARY KEY (id)
);

-- Event Assignment Rates Table
CREATE TABLE public.event_assignment_rates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    firm_id uuid NOT NULL,
    event_id uuid NOT NULL,
    day_number integer NOT NULL DEFAULT 1,
    role text NOT NULL,
    staff_id uuid,
    freelancer_id uuid,
    rate numeric NOT NULL,
    quantity numeric NOT NULL DEFAULT 1,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT event_assignment_rates_pkey PRIMARY KEY (id)
);

-- Event Staff Assignments Table
CREATE TABLE public.event_staff_assignments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL,
    staff_id uuid,
    role text NOT NULL,
    day_number integer NOT NULL DEFAULT 1,
    day_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    firm_id uuid,
    staff_type text,
    freelancer_id uuid,
    CONSTRAINT event_staff_assignments_pkey PRIMARY KEY (id)
);

-- Events Table
CREATE TABLE public.events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    firm_id uuid,
    client_id uuid,
    title text NOT NULL,
    event_type public.event_type NOT NULL,
    event_date date NOT NULL,
    venue text,
    event_end_date date,
    total_days integer DEFAULT 1,
    total_amount numeric DEFAULT 0,
    advance_amount numeric DEFAULT 0,
    balance_amount numeric DEFAULT 0,
    created_by uuid,
    storage_disk character varying,
    storage_size bigint,
    description text,
    photo_editing_status boolean DEFAULT false,
    video_editing_status boolean DEFAULT false,
    calendar_event_id text,
    advance_payment_method public.payment_method DEFAULT 'Cash'::payment_method,
    quotation_source_id uuid,
    same_day_editor boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT events_pkey PRIMARY KEY (id)
);

-- Expenses Table
CREATE TABLE public.expenses (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    firm_id uuid,
    description text NOT NULL,
    category public.expense_category NOT NULL,
    amount numeric NOT NULL,
    expense_date date NOT NULL DEFAULT CURRENT_DATE,
    payment_method public.payment_method NOT NULL DEFAULT 'Cash'::payment_method,
    notes text,
    receipt_url text,
    event_id uuid,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT expenses_pkey PRIMARY KEY (id)
);

-- Firm Members Table
CREATE TABLE public.firm_members (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    firm_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL DEFAULT 'Member'::text,
    joined_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT firm_members_pkey PRIMARY KEY (id),
    CONSTRAINT firm_members_firm_id_user_id_key UNIQUE (firm_id, user_id)
);

-- Firms Table
CREATE TABLE public.firms (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    logo_url text,
    created_by uuid,
    spreadsheet_id text,
    calendar_id text,
    header_left_content text DEFAULT 'Contact: +91 72850 72603\nEmail: pritphoto1985@gmail.com'::text,
    footer_content text DEFAULT 'PRIT PHOTO | Contact: +91 72850 72603 | Email: pritphoto1985@gmail.com\n#aJourneyOfLoveByPritPhoto | Your memories, our passion'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT firms_pkey PRIMARY KEY (id)
);

-- Freelancer Payments Table
CREATE TABLE public.freelancer_payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    firm_id uuid NOT NULL,
    freelancer_id uuid NOT NULL,
    amount numeric NOT NULL,
    payment_date date NOT NULL,
    payment_method text NOT NULL DEFAULT 'Cash'::text,
    description text,
    event_id uuid,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT freelancer_payments_pkey PRIMARY KEY (id)
);

-- Freelancers Table
CREATE TABLE public.freelancers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    firm_id uuid NOT NULL,
    full_name text NOT NULL,
    role public.user_role NOT NULL,
    phone text,
    email text,
    rate numeric DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT freelancers_pkey PRIMARY KEY (id)
);

-- Payments Table
CREATE TABLE public.payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    firm_id uuid,
    event_id uuid,
    amount numeric NOT NULL,
    payment_method public.payment_method NOT NULL DEFAULT 'Cash'::payment_method,
    payment_date date NOT NULL DEFAULT CURRENT_DATE,
    reference_number text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT payments_pkey PRIMARY KEY (id)
);

-- Profiles Table
CREATE TABLE public.profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    full_name text NOT NULL,
    mobile_number text NOT NULL,
    role public.user_role NOT NULL,
    firm_id uuid,
    current_firm_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_user_id_key UNIQUE (user_id)
);

-- Quotations Table
CREATE TABLE public.quotations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    firm_id uuid,
    client_id uuid,
    title text NOT NULL,
    event_type public.event_type NOT NULL,
    event_date date NOT NULL,
    venue text,
    amount numeric NOT NULL,
    discount_type text DEFAULT 'amount'::text,
    discount_value numeric DEFAULT 0,
    discount_amount numeric DEFAULT 0,
    description text,
    quotation_details jsonb,
    valid_until date,
    created_by uuid,
    converted_to_event uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT quotations_pkey PRIMARY KEY (id)
);

-- Staff Payments Table
CREATE TABLE public.staff_payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    firm_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    amount numeric NOT NULL,
    payment_date date NOT NULL,
    payment_method text NOT NULL,
    description text,
    event_id uuid,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT staff_payments_pkey PRIMARY KEY (id)
);

-- Sync Queue Table
CREATE TABLE public.sync_queue (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    item_type text NOT NULL,
    item_id uuid NOT NULL,
    action text NOT NULL,
    data jsonb,
    processed_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT sync_queue_pkey PRIMARY KEY (id)
);

-- Tasks Table
CREATE TABLE public.tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    firm_id uuid,
    title text NOT NULL,
    description text,
    status public.task_status NOT NULL DEFAULT 'Waiting for Response'::task_status,
    priority public.task_priority DEFAULT 'Medium'::task_priority,
    task_type public.task_type DEFAULT 'Other'::task_type,
    assigned_to uuid,
    freelancer_id uuid,
    event_id uuid,
    due_date date,
    completed_at timestamp with time zone,
    amount numeric,
    is_salary_based boolean DEFAULT false,
    salary_details jsonb,
    report_data jsonb,
    task_id uuid,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT tasks_pkey PRIMARY KEY (id)
);

-- WA Sessions Table
CREATE TABLE public.wa_sessions (
    id text NOT NULL,
    firm_id uuid NOT NULL,
    session_data jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT wa_sessions_pkey PRIMARY KEY (id)
);

-- ============ INDEXES ============

-- Clients Indexes
CREATE INDEX idx_clients_firm_id ON public.clients USING btree (firm_id);

-- Event Assignment Rates Indexes
CREATE UNIQUE INDEX ux_event_assignment_rate_freelancer ON public.event_assignment_rates USING btree (event_id, day_number, role, freelancer_id) WHERE (freelancer_id IS NOT NULL);
CREATE UNIQUE INDEX ux_event_assignment_rate_staff ON public.event_assignment_rates USING btree (event_id, day_number, role, staff_id) WHERE (staff_id IS NOT NULL);

-- Event Staff Assignments Indexes
CREATE INDEX idx_event_staff_assignments_freelancer_id ON public.event_staff_assignments USING btree (freelancer_id);
CREATE INDEX idx_event_staff_assignments_staff_type ON public.event_staff_assignments USING btree (staff_type);

-- Events Indexes
CREATE INDEX idx_events_firm_id ON public.events USING btree (firm_id);
CREATE UNIQUE INDEX unique_client_event_type ON public.events USING btree (client_id, event_type);

-- Firm Members Indexes
CREATE INDEX idx_firm_members_firm_id ON public.firm_members USING btree (firm_id);
CREATE INDEX idx_firm_members_user_id ON public.firm_members USING btree (user_id);

-- Payments Indexes
CREATE INDEX idx_payments_event_id ON public.payments USING btree (event_id);
CREATE INDEX idx_payments_firm_id ON public.payments USING btree (firm_id);
CREATE INDEX idx_payments_payment_date ON public.payments USING btree (payment_date);

-- Staff Payments Indexes
CREATE INDEX idx_staff_payments_firm_id ON public.staff_payments USING btree (firm_id);
CREATE INDEX idx_staff_payments_payment_date ON public.staff_payments USING btree (payment_date);
CREATE INDEX idx_staff_payments_staff_id ON public.staff_payments USING btree (staff_id);

-- Tasks Indexes
CREATE INDEX idx_tasks_assigned_to ON public.tasks USING btree (assigned_to);
CREATE INDEX idx_tasks_event_id ON public.tasks USING btree (event_id);
CREATE INDEX idx_tasks_firm_id ON public.tasks USING btree (firm_id);
CREATE INDEX idx_tasks_freelancer_id ON public.tasks USING btree (freelancer_id);
CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);

-- ============ FUNCTIONS ============

-- Update Updated At Column Function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Get Current User Role Function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Get Current User Firm ID Function
CREATE OR REPLACE FUNCTION public.get_current_user_firm_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT firm_id FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Get Current User Current Firm ID Function
CREATE OR REPLACE FUNCTION public.get_current_user_current_firm_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT current_firm_id FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Check Payment Limit Function
CREATE OR REPLACE FUNCTION public.check_payment_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    event_total NUMERIC;
    current_payments_total NUMERIC;
    proposed_total NUMERIC;
BEGIN
    -- Get the event total amount
    SELECT total_amount INTO event_total 
    FROM events 
    WHERE id = NEW.event_id;
    
    -- Calculate current total of all payments for this event (excluding the current payment if updating)
    SELECT COALESCE(SUM(amount), 0) INTO current_payments_total
    FROM payments 
    WHERE event_id = NEW.event_id 
    AND (TG_OP = 'INSERT' OR id != NEW.id);
    
    -- Calculate proposed total after this payment
    proposed_total := current_payments_total + NEW.amount;
    
    -- Check if proposed total exceeds event total
    IF proposed_total > event_total THEN
        RAISE EXCEPTION 'Payment rejected: Total payments (₹%) would exceed event total (₹%). Maximum allowed payment: ₹%', 
            proposed_total, event_total, (event_total - current_payments_total);
    END IF;
    
    -- Ensure payment amount is positive
    IF NEW.amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than ₹0';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Update Event Amounts on Payment Function
CREATE OR REPLACE FUNCTION public.update_event_amounts_on_payment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Calculate new amounts when payment is inserted, updated, or deleted
    IF TG_OP = 'DELETE' THEN
        -- Use OLD record for DELETE
        UPDATE events 
        SET 
            advance_amount = COALESCE((
                SELECT SUM(amount) 
                FROM payments 
                WHERE event_id = OLD.event_id
            ), 0),
            balance_amount = total_amount - COALESCE((
                SELECT SUM(amount) 
                FROM payments 
                WHERE event_id = OLD.event_id
            ), 0),
            updated_at = now()
        WHERE id = OLD.event_id;
        
        RETURN OLD;
    ELSE
        -- Use NEW record for INSERT and UPDATE
        UPDATE events 
        SET 
            advance_amount = COALESCE((
                SELECT SUM(amount) 
                FROM payments 
                WHERE event_id = NEW.event_id
            ), 0),
            balance_amount = total_amount - COALESCE((
                SELECT SUM(amount) 
                FROM payments 
                WHERE event_id = NEW.event_id
            ), 0),
            updated_at = now()
        WHERE id = NEW.event_id;
        
        RETURN NEW;
    END IF;
END;
$$;

-- Update Event Editing Status on Task Completion Function
CREATE OR REPLACE FUNCTION public.update_event_editing_status_on_task_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    -- Only process when task status changes to 'Completed'
    IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN
        -- Check if this is a photo editing task
        IF (NEW.task_type = 'Photo Editing' OR LOWER(NEW.title) LIKE '%photo%' OR LOWER(NEW.description) LIKE '%photo%') 
           AND NEW.event_id IS NOT NULL THEN
            UPDATE events 
            SET photo_editing_status = true,
                updated_at = now()
            WHERE id = NEW.event_id;
        END IF;
        
        -- Check if this is a video editing task
        IF (NEW.task_type = 'Video Editing' OR LOWER(NEW.title) LIKE '%video%' OR LOWER(NEW.description) LIKE '%video%') 
           AND NEW.event_id IS NOT NULL THEN
            UPDATE events 
            SET video_editing_status = true,
                updated_at = now()
            WHERE id = NEW.event_id;
        END IF;
    END IF;
    
    -- Reset status if task is uncompleted
    IF OLD.status = 'Completed' AND NEW.status != 'Completed' THEN
        -- Reset photo editing status
        IF (NEW.task_type = 'Photo Editing' OR LOWER(NEW.title) LIKE '%photo%' OR LOWER(NEW.description) LIKE '%photo%') 
           AND NEW.event_id IS NOT NULL THEN
            UPDATE events 
            SET photo_editing_status = false,
                updated_at = now()
            WHERE id = NEW.event_id;
        END IF;
        
        -- Reset video editing status
        IF (NEW.task_type = 'Video Editing' OR LOWER(NEW.title) LIKE '%video%' OR LOWER(NEW.description) LIKE '%video%') 
           AND NEW.event_id IS NOT NULL THEN
            UPDATE events 
            SET video_editing_status = false,
                updated_at = now()
            WHERE id = NEW.event_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Check Duplicate Event Type Function
CREATE OR REPLACE FUNCTION public.check_duplicate_event_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    -- Check if client already has an event of this type
    IF EXISTS (
        SELECT 1 FROM events 
        WHERE client_id = NEW.client_id 
        AND event_type = NEW.event_type 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
        RAISE EXCEPTION 'Client already has an event of type %. Use unique_client_event_type constraint.', NEW.event_type;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Handle New User Profile Function
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    -- Only create profile when email is confirmed
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        -- Check if profile already exists
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
            -- Create profile from user metadata
            INSERT INTO public.profiles (
                user_id,
                full_name,
                mobile_number,
                role,
                firm_id,
                current_firm_id
            ) VALUES (
                NEW.id,
                COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
                COALESCE(NEW.raw_user_meta_data->>'mobile_number', ''),
                COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'Other'::user_role),
                CASE 
                    WHEN NEW.raw_user_meta_data->>'role' = 'Admin' THEN NULL
                    ELSE (NEW.raw_user_meta_data->>'firm_id')::uuid
                END,
                CASE 
                    WHEN NEW.raw_user_meta_data->>'role' = 'Admin' THEN NULL
                    ELSE (NEW.raw_user_meta_data->>'firm_id')::uuid
                END
            );
            
            -- Create firm membership for non-admin users
            IF NEW.raw_user_meta_data->>'role' != 'Admin' AND NEW.raw_user_meta_data->>'firm_id' IS NOT NULL THEN
                INSERT INTO public.firm_members (
                    firm_id,
                    user_id,
                    role
                ) VALUES (
                    (NEW.raw_user_meta_data->>'firm_id')::uuid,
                    NEW.id,
                    NEW.raw_user_meta_data->>'role'
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Handle New User Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    -- Profile will be created manually through the auth form
    RETURN NEW;
END;
$$;

-- Log Staff Confirmation Function
CREATE OR REPLACE FUNCTION public.log_staff_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only log when email_confirmed_at changes from null to not null (user confirms email)
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        RAISE LOG 'Staff email confirmed for user: % (email: %)', NEW.id, NEW.email;
        -- Direct sync will be handled by the application layer
    END IF;
    
    RETURN NEW;
END;
$$;

-- Process Google Sheets Sync Queue Function
CREATE OR REPLACE FUNCTION public.process_google_sheets_sync_queue()
RETURNS TABLE(item_type text, item_id uuid, firm_id uuid, operation text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    -- This function can be enhanced later to maintain a sync queue
    -- For now, it's a placeholder for future queue management
    RETURN;
END;
$$;

-- Sync New Staff to Google Sheets Function
CREATE OR REPLACE FUNCTION public.sync_new_staff_to_google_sheets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    -- Only trigger when email_confirmed_at changes from null to not null (user confirms email)
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        RAISE LOG 'New staff sync needed for confirmed user: % (email: %)', NEW.id, NEW.email;
        
        -- Insert into a sync queue table that can be processed by the application
        INSERT INTO public.sync_queue (
            item_type,
            item_id,
            action,
            data,
            created_at
        ) VALUES (
            'new_staff',
            NEW.id,
            'sync_to_google_sheets',
            jsonb_build_object(
                'user_id', NEW.id,
                'email', NEW.email,
                'confirmed_at', NEW.email_confirmed_at
            ),
            NOW()
        );
        
        RAISE LOG 'Staff sync queued for user: %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Update WA Sessions Updated At Function
CREATE OR REPLACE FUNCTION public.update_wa_sessions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Update WhatsApp Updated At Column Function
CREATE OR REPLACE FUNCTION public.update_whatsapp_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_seen = now();
  RETURN NEW;
END;
$$;

-- Update WhatsApp Connection Updated At Function
CREATE OR REPLACE FUNCTION public.update_whatsapp_connection_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- ============ TRIGGERS ============

-- Update Updated At Triggers
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_event_assignment_rates_updated_at BEFORE UPDATE ON public.event_assignment_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_event_staff_assignments_updated_at BEFORE UPDATE ON public.event_staff_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_firms_updated_at BEFORE UPDATE ON public.firms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_freelancer_payments_updated_at BEFORE UPDATE ON public.freelancer_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_freelancers_updated_at BEFORE UPDATE ON public.freelancers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payment Related Triggers
CREATE TRIGGER check_payment_limit_insert BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.check_payment_limit();
CREATE TRIGGER check_payment_limit_update BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.check_payment_limit();
CREATE TRIGGER update_payment_balance_only AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_event_amounts_on_payment();

-- Task Related Triggers
CREATE TRIGGER update_editing_status_only AFTER UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_event_editing_status_on_task_completion();

-- WhatsApp Related Triggers
CREATE TRIGGER update_wa_sessions_updated_at BEFORE UPDATE ON public.wa_sessions FOR EACH ROW EXECUTE FUNCTION public.update_wa_sessions_updated_at();

-- ============ ROW LEVEL SECURITY (RLS) ============

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_assignment_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Clients
CREATE POLICY "Allow all operations on clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for Events
CREATE POLICY "Allow all operations on events" ON public.events FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for Event Staff Assignments
CREATE POLICY "Allow all operations on event_staff_assignments" ON public.event_staff_assignments FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for Expenses
CREATE POLICY "Allow all operations on expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for Firm Members
CREATE POLICY "Firm admins can manage memberships in their firms" ON public.firm_members FOR ALL USING ((firm_id IN ( SELECT f.id FROM firms f WHERE (f.created_by = auth.uid()))));
CREATE POLICY "Users can insert their own firm memberships" ON public.firm_members FOR INSERT WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can view their own firm memberships" ON public.firm_members FOR SELECT USING ((user_id = auth.uid()));

-- RLS Policies for Firms
CREATE POLICY "Admins can create firms" ON public.firms FOR INSERT WITH CHECK (((get_current_user_role() = 'Admin'::user_role) OR (created_by = auth.uid())));
CREATE POLICY "Admins can update their firms" ON public.firms FOR UPDATE USING ((created_by = auth.uid()));
CREATE POLICY "Users can view their own firm" ON public.firms FOR SELECT USING (((created_by = auth.uid()) OR (id = get_current_user_firm_id()) OR (id = get_current_user_current_firm_id())));

-- RLS Policies for Freelancer Payments
CREATE POLICY "Allow all operations on freelancer_payments" ON public.freelancer_payments FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for Freelancers
CREATE POLICY "Allow all operations on freelancers" ON public.freelancers FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for Payments
CREATE POLICY "Allow all operations on payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for Profiles
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((user_id = auth.uid()));
CREATE POLICY "Users can view profiles in their firm" ON public.profiles FOR SELECT USING (((user_id = auth.uid()) OR (firm_id = get_current_user_firm_id())));

-- RLS Policies for Quotations
CREATE POLICY "Allow all operations on quotations" ON public.quotations FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for Staff Payments
CREATE POLICY "delete_staff_payments" ON public.staff_payments FOR DELETE USING ((firm_id = get_current_user_current_firm_id()));
CREATE POLICY "insert_staff_payments" ON public.staff_payments FOR INSERT WITH CHECK ((firm_id = get_current_user_current_firm_id()));
CREATE POLICY "select_staff_payments" ON public.staff_payments FOR SELECT USING ((firm_id = get_current_user_current_firm_id()));
CREATE POLICY "update_staff_payments" ON public.staff_payments FOR UPDATE USING ((firm_id = get_current_user_current_firm_id())) WITH CHECK ((firm_id = get_current_user_current_firm_id()));

-- RLS Policies for Sync Queue
CREATE POLICY "Allow all operations on sync_queue" ON public.sync_queue FOR ALL USING (true);

-- RLS Policies for Tasks
CREATE POLICY "Allow all operations on tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for WA Sessions
CREATE POLICY "Allow all operations on wa_sessions" ON public.wa_sessions FOR ALL USING (true) WITH CHECK (true);

-- ============ END OF BACKUP ============