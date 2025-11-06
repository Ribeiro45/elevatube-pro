import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

export default function AdminDemo() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    title: '',
    subtitle: '',
    video_url: '',
    video_title: '',
    step1_title: '',
    step1_description: '',
    step2_title: '',
    step2_description: '',
    step3_title: '',
    step3_description: '',
    step4_title: '',
    step4_description: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'demo_page')
      .maybeSingle();

    if (data?.setting_value) {
      setSettings(data.setting_value as any);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          setting_key: 'demo_page',
          setting_value: settings,
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;

      toast.success('Configurações da página de demonstração salvas com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar configurações: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Editor da Página de Demonstração</h1>
              <p className="text-muted-foreground">Configure o conteúdo da página de tutorial</p>
            </div>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Seção Principal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título Principal</Label>
                <Input
                  id="title"
                  value={settings.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Como Funciona a Plataforma"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtítulo</Label>
                <Input
                  id="subtitle"
                  value={settings.subtitle}
                  onChange={(e) => handleChange('subtitle', e.target.value)}
                  placeholder="Um overview completo da New Academy"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vídeo Tutorial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="video_title">Título do Vídeo</Label>
                <Input
                  id="video_title"
                  value={settings.video_title}
                  onChange={(e) => handleChange('video_title', e.target.value)}
                  placeholder="Tutorial Completo da Plataforma"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="video_url">URL do Vídeo (YouTube Embed)</Label>
                <Input
                  id="video_url"
                  value={settings.video_url}
                  onChange={(e) => handleChange('video_url', e.target.value)}
                  placeholder="https://www.youtube.com/embed/..."
                />
              </div>
            </CardContent>
          </Card>

          {[1, 2, 3, 4].map((num) => (
            <Card key={num}>
              <CardHeader>
                <CardTitle>Passo {num}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`step${num}_title`}>Título</Label>
                  <Input
                    id={`step${num}_title`}
                    value={settings[`step${num}_title` as keyof typeof settings]}
                    onChange={(e) => handleChange(`step${num}_title`, e.target.value)}
                    placeholder={`${num}. Título do Passo`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`step${num}_description`}>Descrição</Label>
                  <Textarea
                    id={`step${num}_description`}
                    value={settings[`step${num}_description` as keyof typeof settings]}
                    onChange={(e) => handleChange(`step${num}_description`, e.target.value)}
                    placeholder="Descrição detalhada do passo"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
