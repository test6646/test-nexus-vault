-- Add same_day_editor field to events table
ALTER TABLE public.events 
ADD COLUMN same_day_editor boolean DEFAULT false;

-- Add same_day_editor_id field to events table for assigning same day editor
ALTER TABLE public.events 
ADD COLUMN same_day_editor_id uuid REFERENCES public.profiles(id);

-- Update updated_at trigger to include new columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';