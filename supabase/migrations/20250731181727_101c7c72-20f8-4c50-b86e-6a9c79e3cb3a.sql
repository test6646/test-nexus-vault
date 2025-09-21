-- Create freelancers table
CREATE TABLE public.freelancers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID NOT NULL,
    full_name TEXT NOT NULL,
    role USER_ROLE NOT NULL,
    contact_info TEXT,
    phone TEXT,
    email TEXT,
    rate NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.freelancers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for freelancers
CREATE POLICY "Allow all operations on freelancers" 
ON public.freelancers 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_freelancers_updated_at
BEFORE UPDATE ON public.freelancers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for Google Sheets sync
CREATE TRIGGER trigger_freelancers_sync
AFTER INSERT OR UPDATE OR DELETE ON public.freelancers
FOR EACH ROW
EXECUTE FUNCTION public.trigger_google_sheets_sync();

-- Create freelancer_payments table for salary tracking
CREATE TABLE public.freelancer_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID NOT NULL,
    freelancer_id UUID NOT NULL,
    event_id UUID,
    amount NUMERIC NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    description TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for freelancer_payments
ALTER TABLE public.freelancer_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for freelancer_payments
CREATE POLICY "Allow all operations on freelancer_payments" 
ON public.freelancer_payments 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger for freelancer_payments timestamp updates
CREATE TRIGGER update_freelancer_payments_updated_at
BEFORE UPDATE ON public.freelancer_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();