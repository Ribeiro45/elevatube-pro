import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, ChevronLeft, ChevronRight, X, Search, FileText, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [searchQuery, setSearchQuery] = useState('');

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
    const matchesAudience = faq.target_audience === userType || faq.target_audience === 'ambos';
    const matchesSearch = searchQuery === '' || 
      faq.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (faq.description && faq.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesAudience && matchesSearch;
  });

  const renderFAQItem = (subFaq: FAQ) => (
    <Card 
      key={subFaq.id} 
      className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 bg-card border-border/50 overflow-hidden h-full"
      onClick={() => setSelectedFaq(subFaq)}
    >
      <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full min-h-[160px]">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <h3 className="font-semibold text-sm line-clamp-2 mb-2">{subFaq.title}</h3>
        {subFaq.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{subFaq.description}</p>
        )}
      </CardContent>
    </Card>
  );

  const renderSection = (section: FAQ, level: number = 0): React.ReactNode => {
    const childSections = filteredFAQs.filter(f => f.is_section && f.parent_id === section.id);
    const childItems = filteredFAQs.filter(f => !f.is_section && f.parent_id === section.id);

    return (
      <div key={section.id} className={level > 0 ? 'mt-6' : ''}>
        <Accordion type="multiple" className="border-none">
          <AccordionItem value={section.id} className="border-none">
            <AccordionTrigger className="px-0 hover:no-underline group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Folder className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <div className={`font-semibold ${level === 0 ? 'text-lg' : 'text-base'}`}>
                    {section.title}
                  </div>
                  {section.description && (
                    <div className="text-sm font-normal text-muted-foreground">
                      {section.description}
                    </div>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-0 pt-4">
              <div className="space-y-6">
                {childItems.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {childItems.map(renderFAQItem)}
                  </div>
                )}
                
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
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto p-6 md:p-8">
          {/* Search Bar */}
          <div className="mb-8 flex items-center gap-4">
            <div className="relative flex-1 max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Pesquisar conteúdo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 bg-card border-border/50"
              />
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{pageTitle}</h1>
            <p className="text-muted-foreground">
              {pageDescription}
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8">
            {filteredFAQs.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Nenhum resultado encontrado.' : 'Nenhum conteúdo disponível no momento.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {topLevelSections.map(section => renderSection(section, 0))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={!!selectedFaq} onOpenChange={() => setSelectedFaq(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0 bg-card border-border">
          <DialogHeader className="p-6 pb-4 border-b border-border/50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold">{selectedFaq?.title}</DialogTitle>
                {selectedFaq?.description && (
                  <p className="text-muted-foreground mt-2 text-sm">{selectedFaq.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedFaq(null)}
                className="shrink-0 hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto p-6 bg-muted/30">
            {selectedFaq?.pdf_url && (
              <div className="space-y-6">
                <div className="border rounded-xl overflow-hidden bg-background shadow-sm">
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
                  <div className="flex items-center justify-center gap-4 pb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changePage(selectedFaq.id, -1)}
                      disabled={(pageNumbers[selectedFaq.id] || 1) <= 1}
                      className="gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </Button>
                    
                    <span className="text-sm font-medium px-4 py-2 bg-card rounded-lg border border-border/50">
                      Página {pageNumbers[selectedFaq.id] || 1} de {numPages[selectedFaq.id]}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changePage(selectedFaq.id, 1)}
                      disabled={(pageNumbers[selectedFaq.id] || 1) >= numPages[selectedFaq.id]}
                      className="gap-2"
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
