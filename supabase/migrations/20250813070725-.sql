-- Create event_closing_balances table to track amounts that won't be collected
CREATE TABLE public.event_closing_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    firm_id UUID NOT NULL,
    total_bill NUMERIC NOT NULL,
    collected_amount NUMERIC NOT NULL,
    closing_amount NUMERIC NOT NULL, -- Amount no longer expected
    closing_reason TEXT,             -- Reason for closing (optional)
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.event_closing_balances ENABLE ROW LEVEL SECURITY;

-- Create policies for event closing balances
CREATE POLICY "Users can manage closing balances in their firm" 
ON public.event_closing_balances 
FOR ALL 
USING (firm_id IN ( 
    SELECT profiles.firm_id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
    UNION
    SELECT firms.id
    FROM firms
    WHERE firms.created_by = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_event_closing_balances_updated_at
BEFORE UPDATE ON public.event_closing_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();