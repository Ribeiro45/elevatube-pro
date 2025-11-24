import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/auth/AuthForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import logoNewStandard from '@/assets/logo-newstandard.png';

const Auth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we're in 2FA verification flow
    const is2FAFlow = sessionStorage.getItem('awaiting_2fa_verification') === 'true';
    
    if (!is2FAFlow) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          navigate("/dashboard");
        }
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const is2FAFlow = sessionStorage.getItem('awaiting_2fa_verification') === 'true';
      
      // Only auto-navigate if NOT in 2FA flow
      if (session && !is2FAFlow) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-glow to-accent relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-glow/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header with Logo */}
      <header className="relative z-10 p-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <img src={logoNewStandard} alt="NewWar" className="h-12 w-auto object-contain" />
      </header>

      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-88px)] p-4">
        <div className="w-full max-w-md">
          <AuthForm />
        </div>
      </div>
    </div>
  );
};

export default Auth;
