-- Create table to store per-day rates for event staff/freelancer assignments
CREATE TABLE IF NOT EXISTS public.event_assignment_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  event_id uuid NOT NULL,
  day_number integer NOT NULL DEFAULT 1,
  role text NOT NULL,
  staff_id uuid NULL,
  freelancer_id uuid NULL,
  rate numeric NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_one_person_assigned CHECK (
    ((staff_id IS NOT NULL)::int + (freelancer_id IS NOT NULL)::int) = 1
  )
);

-- Enable RLS
ALTER TABLE public.event_assignment_rates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage assignment rates for their firm
DROP POLICY IF EXISTS "Users can manage assignment rates for their firm" ON public.event_assignment_rates;
CREATE POLICY "Users can manage assignment rates for their firm"
ON public.event_assignment_rates
FOR ALL
USING (
  firm_id IN (
    SELECT profiles.current_firm_id FROM public.profiles WHERE profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  firm_id IN (
    SELECT profiles.current_firm_id FROM public.profiles WHERE profiles.user_id = auth.uid()
  )
);

-- Update trigger
DROP TRIGGER IF EXISTS update_event_assignment_rates_updated_at ON public.event_assignment_rates;
CREATE TRIGGER update_event_assignment_rates_updated_at
BEFORE UPDATE ON public.event_assignment_rates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helpful unique indexes to prevent duplicate rate rows per assignment day
-- One unique row per (event, day, role, staff)
DROP INDEX IF EXISTS ux_event_assignment_rate_staff;
CREATE UNIQUE INDEX ux_event_assignment_rate_staff
ON public.event_assignment_rates(event_id, day_number, role, staff_id)
WHERE staff_id IS NOT NULL;

-- One unique row per (event, day, role, freelancer)
DROP INDEX IF EXISTS ux_event_assignment_rate_freelancer;
CREATE UNIQUE INDEX ux_event_assignment_rate_freelancer
ON public.event_assignment_rates(event_id, day_number, role, freelancer_id)
WHERE freelancer_id IS NOT NULL;