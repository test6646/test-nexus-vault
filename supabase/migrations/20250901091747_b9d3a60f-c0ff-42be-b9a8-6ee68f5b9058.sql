-- Create partner_payments table for tracking payments to partners
CREATE TABLE public.partner_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL,
  partner_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.partner_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for partner payments
CREATE POLICY "Users can manage partner payments in their firm" 
ON public.partner_payments 
FOR ALL 
USING (firm_id IN ( 
  SELECT profiles.firm_id
  FROM profiles
  WHERE (profiles.user_id = auth.uid())
  UNION
  SELECT firms.id
  FROM firms
  WHERE (firms.created_by = auth.uid())
));

-- Create function to update timestamps
CREATE TRIGGER update_partner_payments_updated_at
BEFORE UPDATE ON public.partner_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();