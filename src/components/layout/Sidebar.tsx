import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Award, Users, LogOut, Moon, Sun, Shield, Library, User, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAdmin } from '@/hooks/useAdmin';
import { useEditor } from '@/hooks/useEditor';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import logoNewStandard from '@/assets/logo-newstandard.png';
import logoNewStandardDark from '@/assets/logo-newstandard-dark.png';

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState('Usuário');
  const [avatarUrl, setAvatarUrl] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAdmin();
  const { isEditor } = useEditor();
  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
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


  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Library, label: 'Meus Cursos', path: '/my-courses' },
    { icon: BookOpen, label: 'Cursos', path: '/courses' },
    { icon: Award, label: 'Certificados', path: '/certificates' },
    { icon: HelpCircle, label: 'FAQ', path: '/faq' },
    { icon: User, label: 'Meu Perfil', path: '/profile' },
  ];

  const adminMenuItems = [
    { icon: Shield, label: 'Painel Admin', path: '/admin/dashboard' },
    { icon: BookOpen, label: 'Gerenciar Cursos', path: '/admin/courses' },
    { icon: Users, label: 'Gerenciar Usuários', path: '/admin/users' },
    { icon: Shield, label: 'Acesso aos Cursos', path: '/admin/course-access' },
    { icon: HelpCircle, label: 'Gerenciar FAQ', path: '/admin/faq' },
    { icon: BookOpen, label: 'Editor de Demo', path: '/admin/demo' },
    { icon: BookOpen, label: 'Configurações do Site', path: '/admin/settings' },
  ];

  const editorMenuItems = [
    { icon: Award, label: 'Gerenciar Provas', path: '/admin/quizzes' },
  ];

  return (
    <>
      <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-sidebar-background border-r border-sidebar-border transition-all duration-300 flex flex-col`}>
        {/* Header with Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-3">
              <img 
                src={isDarkMode ? logoNewStandardDark : logoNewStandard} 
                alt="New Standard" 
                className={`${collapsed ? 'h-12' : 'h-16'} object-contain cursor-pointer hover:opacity-80 transition-opacity`} 
              />
            </Link>
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
            <Link to="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Avatar className="h-10 w-10">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                <AvatarFallback className="bg-primary/10 text-primary">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-sidebar-foreground">
                <p className="font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">Ver perfil</p>
              </div>
            </Link>
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

          {(isAdmin || isEditor) && (
            <>
              <div className="my-4 border-t border-sidebar-border" />
              {isAdmin && adminMenuItems.map((item) => {
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
              {isEditor && editorMenuItems.map((item) => {
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

        {/* Footer with Theme Toggle & Logout */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 w-full transition-colors"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            {!collapsed && <span>{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>}
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
    </>
  );
};
