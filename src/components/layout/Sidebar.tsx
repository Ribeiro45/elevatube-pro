import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Award, Users, Settings, LogOut, Moon, Sun, Upload, Shield, Library } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import logoNewStandard from '@/assets/logo-newstandard.png';
import logoNewStandardDark from '@/assets/logo-newstandard-dark.png';

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userName, setUserName] = useState('Usuário');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAdmin();

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (profile?.full_name) {
        setUserName(profile.full_name);
      }
      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url);
      }
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate('/auth');
    }
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${user.id}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile, { upsert: true });

    if (uploadError) {
      toast({
        title: "Erro ao fazer upload",
        description: uploadError.message,
        variant: "destructive",
      });
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (updateError) {
      toast({
        title: "Erro ao atualizar perfil",
        description: updateError.message,
        variant: "destructive",
      });
    } else {
      setAvatarUrl(publicUrl);
      toast({
        title: "Sucesso",
        description: "Foto atualizada com sucesso!",
      });
      setShowSettings(false);
      setAvatarFile(null);
    }
  };

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Library, label: 'Meus Cursos', path: '/my-courses' },
    { icon: BookOpen, label: 'Cursos', path: '/courses' },
    { icon: Award, label: 'Certificados', path: '/certificates' },
  ];

  const adminMenuItems = [
    { icon: Shield, label: 'Painel Admin', path: '/admin/dashboard' },
    { icon: BookOpen, label: 'Gerenciar Cursos', path: '/admin/courses' },
    { icon: Users, label: 'Gerenciar Usuários', path: '/admin/users' },
  ];

  return (
    <>
      <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-sidebar-background border-r border-sidebar-border transition-all duration-300 flex flex-col`}>
        {/* Header with Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={isDarkMode ? logoNewStandardDark : logoNewStandard} 
                alt="New Standard" 
                className={`${collapsed ? 'h-12' : 'h-16'} object-contain`} 
              />
            </div>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-sidebar-foreground hover:text-sidebar-primary"
            >
              {collapsed ? '→' : '←'}
            </button>
          </div>
        </div>

        {/* User Info */}
        {!collapsed && (
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                <AvatarFallback className="bg-primary/10 text-primary">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-sidebar-foreground">
                <p className="font-medium">{userName}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
              >
                <Icon size={20} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="my-4 border-t border-sidebar-border" />
              {adminMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                    }`}
                  >
                    <Icon size={20} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Footer with Settings & Logout */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 w-full transition-colors"
          >
            <Settings size={20} />
            {!collapsed && <span>Configurações</span>}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-destructive hover:text-destructive-foreground w-full transition-colors"
          >
            <LogOut size={20} />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                Modo Escuro
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDarkMode}
              >
                {isDarkMode ? 'Desativar' : 'Ativar'}
              </Button>
            </div>

            {/* Avatar Upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Upload size={20} />
                Mudar Foto
              </Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              />
              {avatarFile && (
                <Button onClick={handleAvatarUpload} className="w-full">
                  Salvar Foto
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
