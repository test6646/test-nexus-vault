-- Set default status to 'Waiting for Response' for new tasks
ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'Waiting for Response'::task_status;