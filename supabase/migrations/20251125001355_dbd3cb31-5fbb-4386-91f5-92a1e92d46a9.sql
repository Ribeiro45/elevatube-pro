-- Remover a política problemática que causa recursão
DROP POLICY IF EXISTS "Users can view members of their own group" ON public.group_members;

-- Recriar a política sem recursão usando uma função auxiliar
CREATE OR REPLACE FUNCTION public.user_is_in_group(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE group_id = _group_id
      AND user_id = _user_id
  )
$$;

-- Criar nova política usando a função
CREATE POLICY "Users can view members of their own group"
ON public.group_members
FOR SELECT
USING (user_is_in_group(auth.uid(), group_id));