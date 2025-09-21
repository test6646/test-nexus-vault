-- Create the missing sync_queue table that's referenced in the database triggers
CREATE TABLE IF NOT EXISTS public.sync_queue (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    item_type TEXT NOT NULL,
    item_id UUID NOT NULL,
    action TEXT NOT NULL,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Enable RLS
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- Create policy for sync queue access
CREATE POLICY "Allow all operations on sync_queue" 
ON public.sync_queue 
FOR ALL 
USING (true);