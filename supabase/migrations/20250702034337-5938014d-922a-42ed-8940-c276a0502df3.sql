-- Create enums for better type safety
CREATE TYPE public.event_status AS ENUM ('Quotation', 'Confirmed', 'Shooting', 'Editing', 'Delivered', 'Cancelled');
CREATE TYPE public.event_type AS ENUM ('Wedding', 'Pre-Wedding', 'Birthday', 'Corporate', 'Product', 'Portrait', 'Other');
CREATE TYPE public.task_status AS ENUM ('Pending', 'In Progress', 'Completed', 'On Hold');
CREATE TYPE public.task_type AS ENUM ('Photography', 'Videography', 'Photo Editing', 'Video Editing', 'Delivery', 'Client Meeting', 'Other');
CREATE TYPE public.payment_method AS ENUM ('Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque');
CREATE TYPE public.payment_status AS ENUM ('Pending', 'Paid', 'Partial', 'Overdue');
CREATE TYPE public.expense_category AS ENUM ('Equipment', 'Travel', 'Accommodation', 'Food', 'Marketing', 'Software', 'Maintenance', 'Salary', 'Other');
CREATE TYPE public.notification_type AS ENUM ('Task_Assigned', 'Task_Updated', 'Payment_Received', 'Event_Updated', 'Deadline_Reminder', 'System_Alert');

-- Create clients table
CREATE TABLE public.clients (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create events table (main business entity)
CREATE TABLE public.events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    event_type event_type NOT NULL,
    event_date DATE NOT NULL,
    venue TEXT,
    description TEXT,
    status event_status NOT NULL DEFAULT 'Quotation',
    total_amount DECIMAL(10,2) DEFAULT 0,
    advance_amount DECIMAL(10,2) DEFAULT 0,
    balance_amount DECIMAL(10,2) DEFAULT 0,
    photographer_id UUID REFERENCES public.profiles(id),
    videographer_id UUID REFERENCES public.profiles(id),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quotations table
CREATE TABLE public.quotations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    event_type event_type NOT NULL,
    event_date DATE NOT NULL,
    venue TEXT,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    valid_until DATE,
    created_by UUID REFERENCES public.profiles(id),
    converted_to_event UUID REFERENCES public.events(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    task_type task_type NOT NULL,
    status task_status NOT NULL DEFAULT 'Pending',
    priority INTEGER DEFAULT 1,
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method payment_method NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expenses table
CREATE TABLE public.expenses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id), -- Optional, can be event-specific or general
    category expense_category NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_url TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create staff_payments table
CREATE TABLE public.staff_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id), -- Optional, can be event-specific or salary
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method payment_method NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    related_id UUID, -- Can reference events, tasks, etc.
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients
CREATE POLICY "Users can view clients in their firm" ON public.clients
FOR SELECT USING (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert clients in their firm" ON public.clients
FOR INSERT WITH CHECK (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update clients in their firm" ON public.clients
FOR UPDATE USING (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

-- Create RLS policies for events
CREATE POLICY "Users can view events in their firm" ON public.events
FOR SELECT USING (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert events in their firm" ON public.events
FOR INSERT WITH CHECK (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update events in their firm" ON public.events
FOR UPDATE USING (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

-- Create RLS policies for quotations
CREATE POLICY "Users can view quotations in their firm" ON public.quotations
FOR SELECT USING (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert quotations in their firm" ON public.quotations
FOR INSERT WITH CHECK (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update quotations in their firm" ON public.quotations
FOR UPDATE USING (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

-- Create RLS policies for tasks
CREATE POLICY "Users can view tasks in their firm" ON public.tasks
FOR SELECT USING (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert tasks in their firm" ON public.tasks
FOR INSERT WITH CHECK (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update tasks in their firm" ON public.tasks
FOR UPDATE USING (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

-- Create RLS policies for payments
CREATE POLICY "Users can view payments in their firm" ON public.payments
FOR SELECT USING (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert payments in their firm" ON public.payments
FOR INSERT WITH CHECK (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update payments in their firm" ON public.payments
FOR UPDATE USING (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

-- Create RLS policies for expenses
CREATE POLICY "Users can view expenses in their firm" ON public.expenses
FOR SELECT USING (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert expenses in their firm" ON public.expenses
FOR INSERT WITH CHECK (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update expenses in their firm" ON public.expenses
FOR UPDATE USING (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

-- Create RLS policies for staff_payments
CREATE POLICY "Users can view staff payments in their firm" ON public.staff_payments
FOR SELECT USING (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert staff payments in their firm" ON public.staff_payments
FOR INSERT WITH CHECK (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update staff payments in their firm" ON public.staff_payments
FOR UPDATE USING (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

-- Create RLS policies for notifications
CREATE POLICY "Users can view their notifications" ON public.notifications
FOR SELECT USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert notifications in their firm" ON public.notifications
FOR INSERT WITH CHECK (firm_id IN (SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their notifications" ON public.notifications
FOR UPDATE USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quotations_updated_at
    BEFORE UPDATE ON public.quotations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_payments_updated_at
    BEFORE UPDATE ON public.staff_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-update event balance
CREATE OR REPLACE FUNCTION public.update_event_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the event balance whenever payments are modified
    UPDATE public.events
    SET 
        advance_amount = COALESCE((
            SELECT SUM(amount) 
            FROM public.payments 
            WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)
        ), 0),
        balance_amount = total_amount - COALESCE((
            SELECT SUM(amount) 
            FROM public.payments 
            WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)
        ), 0),
        updated_at = now()
    WHERE id = COALESCE(NEW.event_id, OLD.event_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic balance calculation
CREATE TRIGGER update_event_balance_on_payment_insert
    AFTER INSERT ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_event_balance();

CREATE TRIGGER update_event_balance_on_payment_update
    AFTER UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_event_balance();

CREATE TRIGGER update_event_balance_on_payment_delete
    AFTER DELETE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_event_balance();