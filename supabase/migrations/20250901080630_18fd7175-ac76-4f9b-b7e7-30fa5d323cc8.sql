-- Create partners table
CREATE TABLE public.partners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id uuid NOT NULL,
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  studio_name text,
  location text,
  address text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on partners
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for partners
CREATE POLICY "Users can manage partners in their firm" 
ON public.partners 
FOR ALL 
USING (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
));

-- Create projects table
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id uuid NOT NULL,
  title text NOT NULL,
  event_type event_type NOT NULL,
  partner_id uuid REFERENCES public.partners(id),
  camera_counts integer DEFAULT 1,
  project_date date NOT NULL DEFAULT CURRENT_DATE,
  total_amount numeric DEFAULT 0,
  description text,
  status text DEFAULT 'Active',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for projects
CREATE POLICY "Users can manage projects in their firm" 
ON public.projects 
FOR ALL 
USING (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
));

-- Create project_tasks table
CREATE TABLE public.project_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_name text NOT NULL,
  task_type text NOT NULL, -- 'Mandap', 'Garba Night', 'Jaan', 'Reels', etc.
  assigned_to uuid REFERENCES public.profiles(id),
  freelancer_id uuid REFERENCES public.freelancers(id),
  status task_status DEFAULT 'Waiting for Response',
  amount numeric DEFAULT 0,
  due_date date,
  completed_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT check_single_assignment CHECK (
    (assigned_to IS NOT NULL AND freelancer_id IS NULL) OR
    (assigned_to IS NULL AND freelancer_id IS NOT NULL) OR
    (assigned_to IS NULL AND freelancer_id IS NULL)
  )
);

-- Enable RLS on project_tasks
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for project_tasks
CREATE POLICY "Users can manage project tasks in their firm" 
ON public.project_tasks 
FOR ALL 
USING (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
));

-- Create project_invoices table
CREATE TABLE public.project_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on project_invoices
ALTER TABLE public.project_invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for project_invoices
CREATE POLICY "Users can manage project invoices in their firm" 
ON public.project_invoices 
FOR ALL 
USING (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
));

-- Add updated_at triggers
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_tasks_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_invoices_updated_at
  BEFORE UPDATE ON public.project_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();