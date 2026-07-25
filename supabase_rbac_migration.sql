-- 1. Create the `profiles` table to store extended user info
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT CHECK (role IN ('Super Admin', 'Admin', 'Coach')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Allow Super Admins to read all profiles
CREATE POLICY "Super Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Super Admin'
  )
);

-- Allow Super Admins to insert/update profiles
CREATE POLICY "Super Admins can insert profiles" 
ON public.profiles FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Super Admin'
  )
);

CREATE POLICY "Super Admins can update profiles" 
ON public.profiles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Super Admin'
  )
);

-- Allow users to update their own profile (e.g. for password/phone changes, if we allow)
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 2. Create the `permissions` table
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  role TEXT CHECK (role IN ('Super Admin', 'Admin', 'Coach')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  can_access BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure that either role OR user_id is set, but not both or neither
  CONSTRAINT role_or_user CHECK (
    (role IS NOT NULL AND user_id IS NULL) OR 
    (role IS NULL AND user_id IS NOT NULL)
  )
);

-- Default permissions for Admin and Coach (Super Admin always has access to everything implicitly)
-- You can run these or let the Super Admin configure it later from the UI.
-- INSERT INTO public.permissions (role, section, can_access) VALUES ('Admin', 'dashboard', true);
-- INSERT INTO public.permissions (role, section, can_access) VALUES ('Coach', 'joueurs', true);

-- Turn on RLS for permissions
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read permissions to determine their own access
CREATE POLICY "Authenticated users can read permissions" 
ON public.permissions FOR SELECT 
USING (auth.role() = 'authenticated');

-- Only Super Admin can manage permissions
CREATE POLICY "Super Admins can manage permissions" 
ON public.permissions FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Super Admin'
  )
);
