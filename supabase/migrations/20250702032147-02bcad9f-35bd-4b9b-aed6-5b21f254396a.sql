-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('Admin', 'Photographer', 'Videographer', 'Editor', 'Other');

-- Create firms table
CREATE TABLE public.firms (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    spreadsheet_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create profiles table with firm association
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    mobile_number TEXT NOT NULL CHECK (LENGTH(mobile_number) = 10 AND mobile_number ~ '^[0-9]+$'),
    role user_role NOT NULL,
    firm_id UUID REFERENCES public.firms(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT non_admin_must_have_firm CHECK (
        (role = 'Admin' AND firm_id IS NULL) OR 
        (role != 'Admin' AND firm_id IS NOT NULL)
    )
);

-- Enable Row Level Security
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for firms
CREATE POLICY "Users can view their own firm" 
ON public.firms 
FOR SELECT 
USING (
    auth.uid() IN (
        SELECT user_id FROM public.profiles 
        WHERE firm_id = firms.id OR created_by = auth.uid()
    )
);

CREATE POLICY "Admins can create firms" 
ON public.firms 
FOR INSERT 
WITH CHECK (
    auth.uid() IN (
        SELECT user_id FROM public.profiles 
        WHERE role = 'Admin'
    ) OR created_by = auth.uid()
);

CREATE POLICY "Admins can update their firms" 
ON public.firms 
FOR UPDATE 
USING (created_by = auth.uid());

-- Create policies for profiles
CREATE POLICY "Users can view profiles in their firm" 
ON public.profiles 
FOR SELECT 
USING (
    user_id = auth.uid() OR 
    firm_id IN (
        SELECT firm_id FROM public.profiles 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_firms_updated_at
    BEFORE UPDATE ON public.firms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    -- Profile will be created manually through the auth form
    RETURN NEW;
END;
$$;