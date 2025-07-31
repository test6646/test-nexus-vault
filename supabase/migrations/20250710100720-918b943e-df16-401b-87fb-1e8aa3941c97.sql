-- Add back essential foreign key constraints that are needed for application functionality
-- Only add constraints that don't already exist

-- Add foreign key constraint from expenses to events (needed for expense-event relationship)
ALTER TABLE public.expenses 
ADD CONSTRAINT fk_expenses_event_id 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;