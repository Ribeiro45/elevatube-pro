import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Sidebar } from '@/components/layout/Sidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string>('colaborador');
  const [numPages, setNumPages] = useState<{ [key: string]: number }>({});
  const [pageNumbers, setPageNumbers] = useState<{ [key: string]: number }>({});
  const [selectedFaq, setSelectedFaq] = useState<FAQ | null>(null);

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

  const filteredFAQs = faqs.filter(faq => {
    return faq.target_audience === userType || faq.target_audience === 'ambos';
  });

  const renderFAQItem = (subFaq: FAQ) => (
    <Card 
      key={subFaq.id} 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => setSelectedFaq(subFaq)}
    >
      <CardHeader>
        <CardTitle className="text-base">{subFaq.title}</CardTitle>
        {subFaq.description && (
          <CardDescription className="line-clamp-2">{subFaq.description}</CardDescription>
        )}
      </CardHeader>
      {subFaq.pdf_url && (
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Clique para visualizar o conteúdo
          </div>
        </CardContent>
      )}
    </Card>
  );

  const renderSection = (section: FAQ, level: number = 0): React.ReactNode => {
    const childSections = filteredFAQs.filter(f => f.is_section && f.parent_id === section.id);
    const childItems = filteredFAQs.filter(f => !f.is_section && f.parent_id === section.id);

    return (
      <div key={section.id} className={level > 0 ? 'ml-6 mt-4' : ''}>
        <Accordion type="multiple" className="border rounded-lg">
          <AccordionItem value={section.id} className="border-none">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div>
                <div className={`text-left font-semibold ${level === 0 ? 'text-lg' : 'text-base'}`}>
                  {level > 0 && '↳ '}{section.title}
                </div>
                {section.description && (
                  <div className="text-sm font-normal text-muted-foreground text-left">
                    {section.description}
                  </div>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4">
              <div className="space-y-4 pt-2">
                {/* Render child items in grid */}
                {childItems.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {childItems.map(renderFAQItem)}
                  </div>
                )}
                
                {/* Render child sections recursively */}
                {childSections.map(childSection => renderSection(childSection, level + 1))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  };

  const topLevelSections = filteredFAQs.filter(f => f.is_section && !f.parent_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pageTitle = userType === 'cliente' ? 'FAQ' : 'Base de Conhecimento';
  const pageDescription = userType === 'cliente' 
    ? 'Perguntas frequentes'
    : 'Encontre respostas para as perguntas mais comuns';

  return (
    <div className="flex h-screen bg-muted/10">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{pageTitle}</h1>
            <p className="text-muted-foreground">
              {pageDescription}
            </p>
          </div>

          <div className="space-y-6">
            {filteredFAQs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Nenhum conteúdo disponível no momento.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {topLevelSections.map(section => renderSection(section, 0))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={!!selectedFaq} onOpenChange={() => setSelectedFaq(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-2xl">{selectedFaq?.title}</DialogTitle>
                {selectedFaq?.description && (
                  <p className="text-muted-foreground mt-2">{selectedFaq.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedFaq(null)}
                className="shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto p-6">
            {selectedFaq?.pdf_url && (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden bg-muted/20">
                  <Document
                    file={selectedFaq.pdf_url}
                    onLoadSuccess={(pdf) => onDocumentLoadSuccess(selectedFaq.id, pdf)}
                    loading={
                      <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pageNumbers[selectedFaq.id] || 1}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="mx-auto"
                      width={Math.min(window.innerWidth * 0.85, 1200)}
                    />
                  </Document>
                </div>
                
                {numPages[selectedFaq.id] && numPages[selectedFaq.id] > 1 && (
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changePage(selectedFaq.id, -1)}
                      disabled={(pageNumbers[selectedFaq.id] || 1) <= 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </Button>
                    
                    <span className="text-sm text-muted-foreground">
                      Página {pageNumbers[selectedFaq.id] || 1} de {numPages[selectedFaq.id]}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changePage(selectedFaq.id, 1)}
                      disabled={(pageNumbers[selectedFaq.id] || 1) >= numPages[selectedFaq.id]}
                    >
                      Próxima
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
