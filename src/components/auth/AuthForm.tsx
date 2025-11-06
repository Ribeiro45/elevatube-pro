import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, ArrowRight, Shield, Building } from "lucide-react";
import { z } from "zod";
import logoNWhite from "@/assets/logo-n-white.png";

const authSchema = z.object({
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .email("Email inválido")
    .max(255, "Email muito longo"),
  password: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .max(100, "Senha muito longa")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
  fullName: z
    .string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(100, "Nome muito longo")
    .optional(),
});

export const AuthForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [userType, setUserType] = useState<"colaborador" | "cliente">("colaborador");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [show2FAChallenge, setShow2FAChallenge] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = authSchema.parse({ email: email.trim(), password });
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toast.error('Por favor, confirme seu email antes de fazer login.');
          return;
        }
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos');
          return;
        }
        throw error;
      }

      // Check if 2FA is required
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.find(f => f.status === 'verified');

      if (totpFactor && data.session) {
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: totpFactor.id,
        });

        if (challengeError) throw challengeError;

        setFactorId(totpFactor.id);
        setShow2FAChallenge(true);
        toast.info('Digite o código do seu autenticador');
        return;
      }

      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Erro ao fazer login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMFAVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (mfaCode.length !== 6) {
        toast.error('O código deve ter 6 dígitos');
        return;
      }

      setLoading(true);

      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: factorId,
        code: mfaCode,
      });

      if (error) {
        toast.error('Código inválido. Tente novamente.');
        return;
      }

      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erro ao verificar código");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate confirm password
      if (password !== confirmPassword) {
        toast.error("As senhas não coincidem");
        return;
      }

      // Validate based on user type
      if (userType === 'cliente' && (!companyName || !cnpj)) {
        toast.error("Preencha todos os campos da empresa");
        return;
      }

      const validatedData = authSchema.parse({ 
        email: email.trim(), 
        password, 
        fullName: fullName.trim() 
      });
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          data: {
            full_name: validatedData.fullName,
            user_type: userType,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast.error('Este email já está cadastrado.');
          return;
        }
        throw error;
      }

      // If client type, save company data
      if (userType === 'cliente' && data.user) {
        const { error: companyError } = await supabase
          .from('company_profiles')
          .insert({
            user_id: data.user.id,
            company_name: companyName,
            cnpj: cnpj,
          });

        if (companyError) {
          console.error('Erro ao salvar dados da empresa:', companyError);
        }
      }

      if (data.user) {
        toast.success(
          "Conta criada! Verifique seu email para confirmar o cadastro.",
          { duration: 6000 }
        );
        setActiveTab("login");
        setPassword("");
        setConfirmPassword("");
        setFullName("");
        setCompanyName("");
        setCnpj("");
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Erro ao criar conta");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!email) {
        toast.error("Por favor, informe seu email");
        return;
      }

      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;
      toast.success("Link de recuperação enviado!");
      setShowForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 animate-scale-in">
      <div className="text-center space-y-2 animate-fade-in">
        <div className="inline-flex items-center justify-center mb-4">
          <img src={logoNWhite} alt="New Academy" className="w-24 h-24 object-contain" />
        </div>
        <h1 className="text-3xl font-bold text-white">New Academy</h1>
        <p className="text-white/80">Entre ou crie sua conta para começar</p>
      </div>

      <Card className="border-2 backdrop-blur-sm bg-card/50 shadow-xl">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl text-center">
            {showForgotPassword ? "Recuperar Senha" : "Acessar Plataforma"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Email
                </Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={loading} size="lg">
                  {loading ? "Enviando..." : "Enviar Link de Recuperação"}
                </Button>
                <Button 
                  type="button"
                  variant="ghost"
                  className="w-full" 
                  onClick={() => setShowForgotPassword(false)}
                >
                  Voltar ao Login
                </Button>
              </div>
            </form>
          ) : show2FAChallenge ? (
            <form onSubmit={handleMFAVerify} className="space-y-4 animate-fade-in">
              <div className="text-center space-y-2 mb-6">
                <Shield className="w-12 h-12 mx-auto text-primary" />
                <h3 className="text-lg font-semibold">Autenticação de Dois Fatores</h3>
                <p className="text-sm text-muted-foreground">
                  Digite o código de 6 dígitos do seu aplicativo
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mfa-code">Código de Verificação</Label>
                <Input
                  id="mfa-code"
                  type="text"
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || mfaCode.length !== 6}
                  size="lg"
                >
                  {loading ? "Verificando..." : "Verificar Código"}
                </Button>
                <Button 
                  type="button"
                  variant="ghost"
                  className="w-full" 
                  onClick={() => {
                    setShow2FAChallenge(false);
                    setMfaCode('');
                    setFactorId('');
                  }}
                >
                  Voltar ao Login
                </Button>
              </div>
            </form>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 animate-fade-in">
                <div className="space-y-3 mb-4">
                  <Label>Tipo de Usuário</Label>
                  <RadioGroup value={userType} onValueChange={(v) => setUserType(v as any)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="colaborador" id="login-colaborador" />
                      <Label htmlFor="login-colaborador" className="cursor-pointer">Entrar como Colaborador</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cliente" id="login-cliente" />
                      <Label htmlFor="login-cliente" className="cursor-pointer">Entrar como Cliente</Label>
                    </div>
                  </RadioGroup>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      Senha
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? "Entrando..." : "Entrar"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  <Button 
                    type="button"
                    variant="link"
                    className="w-full text-sm" 
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Esqueci minha senha
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 animate-fade-in">
                <div className="space-y-3 mb-4">
                  <Label>Tipo de Cadastro</Label>
                  <RadioGroup value={userType} onValueChange={(v) => setUserType(v as any)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="colaborador" id="signup-colaborador" />
                      <Label htmlFor="signup-colaborador" className="cursor-pointer">Cadastro de Colaborador</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cliente" id="signup-cliente" />
                      <Label htmlFor="signup-cliente" className="cursor-pointer">Cadastro de Cliente (Empresa)</Label>
                    </div>
                  </RadioGroup>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      {userType === 'cliente' ? 'Nome do Responsável' : 'Nome Completo'}
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder={userType === 'cliente' ? "Nome do responsável" : "Seu nome completo"}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  {userType === 'cliente' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="company-name" className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-primary" />
                          Nome da Empresa
                        </Label>
                        <Input
                          id="company-name"
                          type="text"
                          placeholder="Razão social da empresa"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cnpj" className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-primary" />
                          CNPJ
                        </Label>
                        <Input
                          id="cnpj"
                          type="text"
                          placeholder="00.000.000/0000-00"
                          value={cnpj}
                          onChange={(e) => setCnpj(e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      Senha
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-muted-foreground">
                      Mínimo de 8 caracteres com letras maiúsculas, minúsculas e números
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      Confirmar Senha
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? "Criando conta..." : "Criar Conta"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-sm text-white/60">
        Ao continuar, você concorda com nossos Termos de Uso
      </p>
    </div>
  );
};
