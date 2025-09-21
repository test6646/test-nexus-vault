
-- Add missing fields to events table for enhanced event management
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS editor_id uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS storage_disk text,
ADD COLUMN IF NOT EXISTS storage_size numeric;

-- Add comment for clarity
COMMENT ON COLUMN public.events.editor_id IS 'Reference to profile assigned as editor';
COMMENT ON COLUMN public.events.storage_disk IS 'Storage disk identifier (Disk-A to Disk-Z)';
COMMENT ON COLUMN public.events.storage_size IS 'Storage size in GB';
