import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Award, TrendingUp, Users, ChevronRight, Play, Moon, Sun } from "lucide-react";
import logoN from "@/assets/logo-n.png";
import { removeBackground, loadImage } from "@/utils/removeBackground";

const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [logoWithoutBg, setLogoWithoutBg] = useState<string | null>(null);
  const [processingLogo, setProcessingLogo] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      } else {
        setIsLoading(false);
      }
    });

    // Check initial dark mode state
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);

    // Process logo to remove background
    processLogo();
  }, [navigate]);

  const processLogo = async () => {
    try {
      setProcessingLogo(true);
      const response = await fetch(logoN);
      const blob = await response.blob();
      const image = await loadImage(blob);
      const processedBlob = await removeBackground(image);
      const url = URL.createObjectURL(processedBlob);
      setLogoWithoutBg(url);
    } catch (error) {
      console.error('Error processing logo:', error);
      // Fallback to original logo
      setLogoWithoutBg(logoN);
    } finally {
      setProcessingLogo(false);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle('dark');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const features = [
    {
      icon: BookOpen,
      title: "Cursos Completos",
      description: "Acesse uma biblioteca completa de cursos em vídeo"
    },
    {
      icon: TrendingUp,
      title: "Acompanhe seu Progresso",
      description: "Monitore seu desenvolvimento em tempo real"
    },
    {
      icon: Award,
      title: "Certificados",
      description: "Receba certificados ao concluir os cursos"
    },
    {
      icon: Users,
      title: "Aprendizado Colaborativo",
      description: "Aprenda junto com outros colaboradores"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {processingLogo ? (
              <div className="h-8 w-8 bg-muted animate-pulse rounded" />
            ) : (
              <img 
                src={logoWithoutBg || logoN} 
                alt="New Academy" 
                className="h-8 w-8 object-contain" 
              />
            )}
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              New Academy
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button onClick={() => navigate("/auth")} size="lg">
              Entrar
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="inline-block">
              <span className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                New Academy - Plataforma de Aprendizado
              </span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              Transforme seu
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Conhecimento
              </span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Acesse cursos de alta qualidade, acompanhe seu progresso e obtenha certificados reconhecidos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => navigate("/auth")} 
                size="lg"
                className="text-lg px-8 py-6 group"
              >
                Começar Agora
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="text-lg px-8 py-6"
                onClick={() => navigate("/auth")}
              >
                <Play className="w-5 h-5 mr-2" />
                Ver Demo
              </Button>
            </div>
          </div>

          <div className="relative animate-scale-in">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl"></div>
            <Card className="relative border-2 border-border/50 backdrop-blur-sm bg-card/50 overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-video relative group">
                  <iframe
                    className="w-full h-full rounded-lg"
                    src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                    title="Vídeo Demonstração"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg" />
                </div>
                <div className="p-6 space-y-2">
                  <h3 className="text-xl font-semibold">Veja como funciona</h3>
                  <p className="text-muted-foreground">Conheça todos os recursos da nossa plataforma em apenas alguns minutos</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl font-bold">Por que escolher nossa plataforma?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Recursos poderosos para acelerar seu aprendizado
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary-glow/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card className="relative overflow-hidden border-2 border-border/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary-glow/10"></div>
          <CardContent className="relative p-12 text-center space-y-6">
            <h2 className="text-4xl font-bold">Pronto para começar?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Junte-se a centenas de colaboradores que já estão transformando suas carreiras
            </p>
            <Button 
              onClick={() => navigate("/auth")}
              size="lg"
              className="text-lg px-10 py-6"
            >
              Criar Conta Grátis
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {processingLogo ? (
                <div className="h-6 w-6 bg-muted animate-pulse rounded" />
              ) : (
                <img 
                  src={logoWithoutBg || logoN} 
                  alt="New Academy" 
                  className="h-6 w-6 object-contain" 
                />
              )}
              <span className="font-semibold">New Academy</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 New Academy. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
