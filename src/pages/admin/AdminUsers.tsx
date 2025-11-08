import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldOff, Key, Search, Edit, Trash2, Award } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  user_type: string | null;
  created_at: string;
  is_admin: boolean;
  is_editor: boolean;
  is_admin_master: boolean;
  completed_lessons: number;
  total_certificates: number;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [userPasswordDialogOpen, setUserPasswordDialogOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserWithRole | null>(null);
  const [userNewPassword, setUserNewPassword] = useState("");
  const [userConfirmPassword, setUserConfirmPassword] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles (admin and editor)
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Get progress count for each user
      const { data: progressData } = await supabase
        .from("user_progress")
        .select("user_id, completed");

      // Get certificates count
      const { data: certificatesData } = await supabase
        .from("certificates")
        .select("user_id");

      const adminIds = new Set(roles?.filter(r => r.role === 'admin').map((r) => r.user_id) || []);
      const editorIds = new Set(roles?.filter(r => r.role === 'editor').map((r) => r.user_id) || []);
      const adminMasterIds = new Set(roles?.filter(r => r.role === 'admin_master').map((r) => r.user_id) || []);

      const usersWithRoles: UserWithRole[] = profiles?.map((profile) => {
        const userProgress = progressData?.filter(p => p.user_id === profile.id && p.completed) || [];
        const userCerts = certificatesData?.filter(c => c.user_id === profile.id) || [];
        
        return {
          id: profile.id,
          email: profile.id,
          full_name: profile.full_name,
          user_type: profile.user_type,
          created_at: profile.created_at,
          is_admin: adminIds.has(profile.id),
          is_editor: editorIds.has(profile.id),
          is_admin_master: adminMasterIds.has(profile.id),
          completed_lessons: userProgress.length,
          total_certificates: userCerts.length,
        };
      }) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Erro ao carregar usuários",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      // Remove all existing roles
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Add new role if not 'user'
      if (newRole !== "user") {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole as "admin" | "editor" | "user" });

        if (error) throw error;
      }

      toast({
        title: "Permissão atualizada",
        description: `Usuário agora tem permissão de ${newRole}.`,
      });

      fetchUsers();
    } catch (error) {
      console.error("Error changing role:", error);
      toast({
        title: "Erro ao alterar permissão",
        description: "Não foi possível alterar a permissão do usuário.",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = (user: UserWithRole) => {
    setSelectedUser(user);
    setEditName(user.full_name || "");
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editName })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast({
        title: "Usuário atualizado",
        description: "Dados do usuário foram atualizados com sucesso.",
      });

      setEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o usuário.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userToDelete.id);

      if (error) throw error;

      toast({
        title: "Usuário deletado",
        description: "O usuário foi removido com sucesso.",
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Erro ao deletar",
        description: "Não foi possível deletar o usuário.",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "Por favor, verifique se as senhas são iguais.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso.",
      });

      setChangePasswordOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error changing password:", error);
      toast({
        title: "Erro ao alterar senha",
        description: "Não foi possível alterar sua senha.",
        variant: "destructive",
      });
    }
  };

  const handleChangeUserPassword = async () => {
    if (!selectedUserForPassword) return;

    if (userNewPassword !== userConfirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "Por favor, verifique se as senhas são iguais.",
        variant: "destructive",
      });
      return;
    }

    if (userNewPassword.length < 8) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 8 caracteres.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.admin.updateUserById(
        selectedUserForPassword.id,
        { password: userNewPassword }
      );

      if (error) throw error;

      toast({
        title: "Senha alterada",
        description: `Senha de ${selectedUserForPassword.full_name} foi alterada com sucesso.`,
      });

      setUserPasswordDialogOpen(false);
      setSelectedUserForPassword(null);
      setUserNewPassword("");
      setUserConfirmPassword("");
    } catch (error) {
      console.error("Error changing user password:", error);
      toast({
        title: "Erro ao alterar senha",
        description: "Não foi possível alterar a senha do usuário.",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-muted/10">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Painel de Administração</h1>
              <p className="text-muted-foreground">
                Controle total sobre usuários e permissões
              </p>
            </div>
            <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Key className="w-4 h-4" />
                  Trocar Minha Senha
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Trocar Senha</DialogTitle>
                  <DialogDescription>
                    Digite sua nova senha abaixo
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova Senha</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Senha</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Digite a senha novamente"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setChangePasswordOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleChangePassword}>Alterar Senha</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Usuários</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead className="text-center">Aulas</TableHead>
                      <TableHead className="text-center">Certificados</TableHead>
                      <TableHead>Cadastrado</TableHead>
                      <TableHead>Permissão</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.full_name || "Sem nome"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.user_type === 'cliente' ? 'default' : 'secondary'}>
                            {user.user_type === 'cliente' ? 'Cliente' : 'Colaborador New'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {user.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{user.completed_lessons}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1">
                            <Award className="h-4 w-4 text-yellow-500" />
                            {user.total_certificates}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.is_admin_master ? "admin_master" : user.is_admin ? "admin" : user.is_editor ? "editor" : "user"}
                            onValueChange={(value) => handleRoleChange(user.id, value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">
                                <div className="flex items-center gap-2">
                                  <ShieldOff className="w-3 h-3" />
                                  Usuário
                                </div>
                              </SelectItem>
                              <SelectItem value="editor">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-3 h-3" />
                                  Editor
                                </div>
                              </SelectItem>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-3 h-3" />
                                  Admin
                                </div>
                              </SelectItem>
                              <SelectItem value="admin_master">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-3 h-3 text-primary" />
                                  Admin Master
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUserForPassword(user);
                                setUserPasswordDialogOpen(true);
                              }}
                              title="Trocar senha"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUserToDelete(user);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Modifique as informações do usuário abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome Completo</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do usuário"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá permanentemente deletar o usuário{' '}
              <strong>{userToDelete?.full_name}</strong> e todos os seus dados associados 
              (progresso, certificados, etc).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change User Password Dialog */}
      <Dialog open={userPasswordDialogOpen} onOpenChange={setUserPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar Senha do Usuário</DialogTitle>
            <DialogDescription>
              Alterar senha de {selectedUserForPassword?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-new-password">Nova Senha</Label>
              <Input
                id="user-new-password"
                type="password"
                value={userNewPassword}
                onChange={(e) => setUserNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-confirm-password">Confirmar Senha</Label>
              <Input
                id="user-confirm-password"
                type="password"
                value={userConfirmPassword}
                onChange={(e) => setUserConfirmPassword(e.target.value)}
                placeholder="Digite a senha novamente"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUserPasswordDialogOpen(false);
                setSelectedUserForPassword(null);
                setUserNewPassword("");
                setUserConfirmPassword("");
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleChangeUserPassword}>Alterar Senha</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
