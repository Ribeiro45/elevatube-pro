import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface FAQ {
  id: string;
  title: string;
  description: string | null;
  target_audience: string;
  pdf_url: string | null;
  pdf_pages: any;
  parent_id: string | null;
  is_section: boolean;
}

export default function FAQ() {
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string>('colaborador');
  const [numPages, setNumPages] = useState<{ [key: string]: number }>({});
  const [pageNumbers, setPageNumbers] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadUserType();
    loadFAQs();
  }, []);

  const loadUserType = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserType(profile.user_type || 'colaborador');
        }
      }
    } catch (error) {
      console.error('Error loading user type:', error);
    }
  };

  const loadFAQs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('faqs' as any)
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      setFaqs(data as any || []);
      
      // Initialize page numbers
      const initialPages: { [key: string]: number } = {};
      if (data) {
        (data as any[]).forEach((faq: any) => {
          initialPages[faq.id] = 1;
        });
      }
      setPageNumbers(initialPages);
    } catch (error) {
      console.error('Error loading FAQs:', error);
      toast.error('Erro ao carregar FAQs');
    } finally {
      setLoading(false);
    }
  };

  const onDocumentLoadSuccess = (faqId: string, { numPages }: { numPages: number }) => {
    setNumPages(prev => ({ ...prev, [faqId]: numPages }));
  };

  const changePage = (faqId: string, offset: number) => {
    setPageNumbers(prev => ({
      ...prev,
      [faqId]: (prev[faqId] || 1) + offset
    }));
  };

  const filteredFAQs = (audience: string) => {
    return faqs.filter(faq => {
      if (faq.target_audience === 'ambos') return true;
      if (audience === 'cliente' && faq.target_audience === 'cliente') return true;
      if (audience === 'colaborador' && faq.target_audience === 'colaborador') return true;
      return false;
    });
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
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Dashboard
        </Button>
        <h1 className="text-4xl font-bold mb-2">FAQ - Perguntas Frequentes</h1>
        <p className="text-muted-foreground">
          Encontre respostas para as perguntas mais comuns
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="cliente">Clientes</TabsTrigger>
          <TabsTrigger value="colaborador">Colaboradores</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {filteredFAQs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhum FAQ disponível no momento.</p>
              </CardContent>
            </Card>
          ) : (
            filteredFAQs.map((faq) => (
              <Card key={faq.id}>
                <CardHeader>
                  <CardTitle>{faq.title}</CardTitle>
                  {faq.description && (
                    <CardDescription>{faq.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {faq.pdf_url && (
                    <div className="space-y-4">
                      <div className="border rounded-lg overflow-hidden bg-muted/20">
                        <Document
                          file={faq.pdf_url}
                          onLoadSuccess={(pdf) => onDocumentLoadSuccess(faq.id, pdf)}
                          loading={
                            <div className="flex items-center justify-center p-12">
                              <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                          }
                        >
                          <Page
                            pageNumber={pageNumbers[faq.id] || 1}
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            className="mx-auto"
                          />
                        </Document>
                      </div>
                      
                      {numPages[faq.id] && numPages[faq.id] > 1 && (
                        <div className="flex items-center justify-center gap-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => changePage(faq.id, -1)}
                            disabled={(pageNumbers[faq.id] || 1) <= 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Anterior
                          </Button>
                          
                          <span className="text-sm text-muted-foreground">
                            Página {pageNumbers[faq.id] || 1} de {numPages[faq.id]}
                          </span>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => changePage(faq.id, 1)}
                            disabled={(pageNumbers[faq.id] || 1) >= numPages[faq.id]}
                          >
                            Próxima
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="cliente" className="space-y-6">
          {filteredFAQs.filter(f => f.target_audience === 'cliente' || f.target_audience === 'ambos').map((faq) => (
            <Card key={faq.id}>
              <CardHeader>
                <CardTitle>{faq.title}</CardTitle>
                {faq.description && (
                  <CardDescription>{faq.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {faq.pdf_url && (
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden bg-muted/20">
                      <Document
                        file={faq.pdf_url}
                        onLoadSuccess={(pdf) => onDocumentLoadSuccess(faq.id, pdf)}
                        loading={
                          <div className="flex items-center justify-center p-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          </div>
                        }
                      >
                        <Page
                          pageNumber={pageNumbers[faq.id] || 1}
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                          className="mx-auto"
                        />
                      </Document>
                    </div>
                    
                    {numPages[faq.id] && numPages[faq.id] > 1 && (
                      <div className="flex items-center justify-center gap-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => changePage(faq.id, -1)}
                          disabled={(pageNumbers[faq.id] || 1) <= 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Anterior
                        </Button>
                        
                        <span className="text-sm text-muted-foreground">
                          Página {pageNumbers[faq.id] || 1} de {numPages[faq.id]}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => changePage(faq.id, 1)}
                          disabled={(pageNumbers[faq.id] || 1) >= numPages[faq.id]}
                        >
                          Próxima
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="colaborador" className="space-y-6">
          {filteredFAQs.filter(f => f.target_audience === 'colaborador' || f.target_audience === 'ambos').map((faq) => (
            <Card key={faq.id}>
              <CardHeader>
                <CardTitle>{faq.title}</CardTitle>
                {faq.description && (
                  <CardDescription>{faq.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {faq.pdf_url && (
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden bg-muted/20">
                      <Document
                        file={faq.pdf_url}
                        onLoadSuccess={(pdf) => onDocumentLoadSuccess(faq.id, pdf)}
                        loading={
                          <div className="flex items-center justify-center p-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          </div>
                        }
                      >
                        <Page
                          pageNumber={pageNumbers[faq.id] || 1}
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                          className="mx-auto"
                        />
                      </Document>
                    </div>
                    
                    {numPages[faq.id] && numPages[faq.id] > 1 && (
                      <div className="flex items-center justify-center gap-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => changePage(faq.id, -1)}
                          disabled={(pageNumbers[faq.id] || 1) <= 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Anterior
                        </Button>
                        
                        <span className="text-sm text-muted-foreground">
                          Página {pageNumbers[faq.id] || 1} de {numPages[faq.id]}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => changePage(faq.id, 1)}
                          disabled={(pageNumbers[faq.id] || 1) >= numPages[faq.id]}
                        >
                          Próxima
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
