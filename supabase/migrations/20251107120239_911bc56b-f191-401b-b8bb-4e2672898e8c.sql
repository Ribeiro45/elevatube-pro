-- Add RLS policies for admin_master role

-- Admin masters can update any profile (for password changes)
CREATE POLICY "Admin masters can update any profile"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Admin masters can view all user roles
CREATE POLICY "Admin masters can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Admin masters can manage user roles
CREATE POLICY "Admin masters can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin masters can update roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin masters can delete roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin_master'::app_role));