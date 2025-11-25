-- Criar tabela de grupos
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  leader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de membros de grupo
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Criar função para verificar se o usuário é líder de um grupo
CREATE OR REPLACE FUNCTION public.is_group_leader(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups
    WHERE id = _group_id
      AND leader_id = _user_id
  )
$$;

-- Criar função para obter o grupo do usuário como líder
CREATE OR REPLACE FUNCTION public.get_user_led_group(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.groups
  WHERE leader_id = _user_id
  LIMIT 1
$$;

-- RLS Policies para groups
CREATE POLICY "Admins can manage all groups"
ON public.groups
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Leaders can view their own group"
ON public.groups
FOR SELECT
USING (
  has_role(auth.uid(), 'lider'::app_role) 
  AND leader_id = auth.uid()
);

CREATE POLICY "Users can view their own group"
ON public.groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
  )
);

-- RLS Policies para group_members
CREATE POLICY "Admins can manage all group members"
ON public.group_members
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Leaders can view their group members"
ON public.group_members
FOR SELECT
USING (
  has_role(auth.uid(), 'lider'::app_role)
  AND is_group_leader(auth.uid(), group_id)
);

CREATE POLICY "Users can view members of their own group"
ON public.group_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
  )
);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Atualizar a policy de profiles para que líderes possam ver membros do seu grupo
CREATE POLICY "Leaders can view their group members profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'lider'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.group_members gm
    JOIN public.groups g ON gm.group_id = g.id
    WHERE g.leader_id = auth.uid()
      AND gm.user_id = profiles.id
  )
);