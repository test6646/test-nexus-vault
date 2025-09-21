-- Add back essential foreign key constraints that are needed for application functionality

-- Add foreign key constraint from expenses to events (needed for expense-event relationship)
ALTER TABLE public.expenses 
ADD CONSTRAINT fk_expenses_event_id 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;

-- Add foreign key constraint from tasks to events (needed for task-event relationship)
ALTER TABLE public.tasks 
ADD CONSTRAINT fk_tasks_event_id 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;