import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Edit, Upload } from 'lucide-react';

interface FAQ {
  id: string;
  title: string;
  description: string | null;
  target_audience: string;
  pdf_url: string | null;
  order_index: number;
}

export default function AdminFAQ() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_audience: 'ambos',
    order_index: 0,
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      console.error('Error loading FAQs:', error);
      toast.error('Erro ao carregar FAQs');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        setPdfFile(file);
      } else {
        toast.error('Por favor, selecione um arquivo PDF');
      }
    }
  };

  const uploadPDF = async (file: File): Promise<string | null> => {
    try {
      const fileExt = 'pdf';
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('faq-pdfs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('faq-pdfs')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast.error('Erro ao fazer upload do PDF');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let pdfUrl = editingFAQ?.pdf_url || null;

      if (pdfFile) {
        pdfUrl = await uploadPDF(pdfFile);
        if (!pdfUrl) {
          setUploading(false);
          return;
        }
      }

      const faqData = {
        ...formData,
        pdf_url: pdfUrl,
      };

      if (editingFAQ) {
        const { error } = await supabase
          .from('faqs')
          .update(faqData)
          .eq('id', editingFAQ.id);

        if (error) throw error;
        toast.success('FAQ atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('faqs')
          .insert([faqData]);

        if (error) throw error;
        toast.success('FAQ criado com sucesso');
      }

      resetForm();
      loadFAQs();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving FAQ:', error);
      toast.error('Erro ao salvar FAQ');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (faq: FAQ) => {
    setEditingFAQ(faq);
    setFormData({
      title: faq.title,
      description: faq.description || '',
      target_audience: faq.target_audience,
      order_index: faq.order_index,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, pdfUrl: string | null) => {
    if (!confirm('Tem certeza que deseja excluir este FAQ?')) return;

    try {
      if (pdfUrl) {
        const path = pdfUrl.split('/faq-pdfs/')[1];
        if (path) {
          await supabase.storage.from('faq-pdfs').remove([path]);
        }
      }

      const { error } = await supabase
        .from('faqs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('FAQ excluído com sucesso');
      loadFAQs();
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      toast.error('Erro ao excluir FAQ');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      target_audience: 'ambos',
      order_index: 0,
    });
    setPdfFile(null);
    setEditingFAQ(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Gerenciar FAQ</h1>
          <p className="text-muted-foreground">
            Crie e gerencie perguntas frequentes com PDFs
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo FAQ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingFAQ ? 'Editar FAQ' : 'Novo FAQ'}</DialogTitle>
              <DialogDescription>
                Preencha os dados do FAQ e faça upload do PDF
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Digite o título do FAQ"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Digite uma descrição (opcional)"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_audience">Público-alvo *</Label>
                <Select
                  value={formData.target_audience}
                  onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ambos">Ambos</SelectItem>
                    <SelectItem value="cliente">Clientes</SelectItem>
                    <SelectItem value="colaborador">Colaboradores</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order_index">Ordem de exibição</Label>
                <Input
                  id="order_index"
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                  min={0}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdf">PDF {!editingFAQ && '*'}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="pdf"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    required={!editingFAQ}
                  />
                  {pdfFile && (
                    <Upload className="w-5 h-5 text-green-500" />
                  )}
                </div>
                {editingFAQ?.pdf_url && (
                  <p className="text-sm text-muted-foreground">
                    PDF atual: <a href={editingFAQ.pdf_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver PDF</a>
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>FAQs Cadastrados</CardTitle>
          <CardDescription>Lista de todos os FAQs disponíveis</CardDescription>
        </CardHeader>
        <CardContent>
          {faqs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum FAQ cadastrado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Público-alvo</TableHead>
                  <TableHead>PDF</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faqs.map((faq) => (
                  <TableRow key={faq.id}>
                    <TableCell>{faq.order_index}</TableCell>
                    <TableCell className="font-medium">{faq.title}</TableCell>
                    <TableCell className="capitalize">{faq.target_audience}</TableCell>
                    <TableCell>
                      {faq.pdf_url ? (
                        <a
                          href={faq.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Ver PDF
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Sem PDF</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(faq)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(faq.id, faq.pdf_url)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
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
  );
}
