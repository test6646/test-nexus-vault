-- Create accounting_entries table for managing assets, capital, loans, depreciations etc
CREATE TABLE public.accounting_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Capital', 'Assets', 'Loans', 'Depreciation', 'Investments', 'Cash on Hand', 'Liabilities', 'Other')),
  subcategory TEXT,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('Credit', 'Debit')) DEFAULT 'Credit',
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for accounting entries
CREATE POLICY "Users can manage accounting entries in their firm"
ON public.accounting_entries
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
CREATE TRIGGER update_accounting_entries_updated_at
BEFORE UPDATE ON public.accounting_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_accounting_entries_firm_id ON public.accounting_entries(firm_id);
CREATE INDEX idx_accounting_entries_category ON public.accounting_entries(category);
CREATE INDEX idx_accounting_entries_entry_date ON public.accounting_entries(entry_date);