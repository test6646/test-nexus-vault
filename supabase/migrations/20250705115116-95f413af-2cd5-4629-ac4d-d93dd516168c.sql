
-- Create event_staff_assignments table for day-wise staff tracking
CREATE TABLE public.event_staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  role TEXT NOT NULL, -- 'Photographer', 'Videographer', 'Editor'
  day_number INTEGER NOT NULL DEFAULT 1,
  day_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  firm_id UUID
);

-- Add quotation source tracking to events table
ALTER TABLE public.events 
ADD COLUMN quotation_source_id UUID,
ADD COLUMN total_days INTEGER DEFAULT 1,
ADD COLUMN event_end_date DATE;

-- Enable RLS on event_staff_assignments
ALTER TABLE public.event_staff_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for event_staff_assignments
CREATE POLICY "Users can view event staff assignments in their firm"
ON public.event_staff_assignments
FOR SELECT
USING (firm_id IN (
  SELECT profiles.firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Users can insert event staff assignments in their firm"
ON public.event_staff_assignments
FOR INSERT
WITH CHECK (firm_id IN (
  SELECT profiles.firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Users can update event staff assignments in their firm"
ON public.event_staff_assignments
FOR UPDATE
USING (firm_id IN (
  SELECT profiles.firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_event_staff_assignments_updated_at
BEFORE UPDATE ON public.event_staff_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime support
ALTER TABLE public.event_staff_assignments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_staff_assignments;
