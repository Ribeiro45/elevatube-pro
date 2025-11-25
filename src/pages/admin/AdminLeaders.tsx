import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { UserCheck, UserX, Shield } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

type User = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type Leader = User & {
  group_name?: string;
};

export default function AdminLeaders() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([loadLeaders(), loadAvailableUsers()]);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLeaders = async () => {
    try {
      // Get all users with leader role
      const { data: leaderRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'lider');

      if (rolesError) throw rolesError;

      if (!leaderRoles || leaderRoles.length === 0) {
        setLeaders([]);
        return;
      }

      const leaderIds = leaderRoles.map(r => r.user_id);

      // Get profiles for leaders
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', leaderIds);

      if (profilesError) throw profilesError;

      // Get group names for each leader
      const leadersWithGroups = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: group } = await supabase
            .from('groups')
            .select('name')
            .eq('leader_id', profile.id)
            .single();

          return {
            ...profile,
            group_name: group?.name,
          };
        })
      );

      setLeaders(leadersWithGroups);
    } catch (error: any) {
      console.error('Error loading leaders:', error);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      // Get all users who are NOT leaders
      const { data: leaderRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'lider');

      const leaderIds = leaderRoles?.map(r => r.user_id) || [];

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .not('id', 'in', `(${leaderIds.join(',')})`)
        .order('full_name');

      if (error) throw error;

      setAvailableUsers(profiles || []);
    } catch (error: any) {
      console.error('Error loading available users:', error);
    }
  };

  const handleAddLeader = async () => {
    if (!selectedUserId) {
      toast({
        title: 'Erro',
        description: 'Selecione um usuário para promover a líder.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Add leader role
      const { error } = await supabase.from('user_roles').insert({
        user_id: selectedUserId,
        role: 'lider',
      });

      if (error) throw error;

      toast({
        title: 'Líder adicionado',
        description: 'O usuário foi promovido a líder com sucesso.',
      });

      setSelectedUserId('');
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar líder',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveLeader = async (userId: string) => {
    // Check if leader has a group
    const { data: group } = await supabase
      .from('groups')
      .select('id, name')
      .eq('leader_id', userId)
      .single();

    if (group) {
      toast({
        title: 'Não é possível remover',
        description: `Este líder está vinculado ao grupo "${group.name}". Primeiro remova o grupo ou altere o líder do grupo.`,
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('Tem certeza que deseja remover este líder?')) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'lider');

      if (error) throw error;

      toast({
        title: 'Líder removido',
        description: 'O usuário não é mais um líder.',
      });

      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover líder',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Gerenciar Líderes</h1>
        <p className="text-muted-foreground">
          Promova usuários para a função de líder ou remova essa permissão
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Adicionar Novo Líder</CardTitle>
          <CardDescription>
            Selecione um usuário para promover a líder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddLeader}>
              <UserCheck className="mr-2 h-4 w-4" />
              Promover a Líder
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4">
        <h2 className="text-2xl font-bold">Líderes Atuais ({leaders.length})</h2>
      </div>

      {leaders.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">
              Nenhum líder cadastrado ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {leaders.map((leader) => (
            <Card key={leader.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      {leader.avatar_url && (
                        <AvatarImage src={leader.avatar_url} alt={leader.full_name || ''} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Shield className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {leader.full_name || 'Sem nome'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {leader.email}
                      </p>
                    </div>
                  </div>
                </div>
                
                {leader.group_name ? (
                  <Badge variant="secondary" className="mb-3">
                    Grupo: {leader.group_name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="mb-3">
                    Sem grupo atribuído
                  </Badge>
                )}

                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => handleRemoveLeader(leader.id)}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Remover Líder
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
