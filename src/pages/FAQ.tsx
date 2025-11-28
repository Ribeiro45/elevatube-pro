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
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

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

  // Get all sections (topics)
  const allSections = filteredFAQs.filter(f => f.is_section);
  
  // Get recent documents (items with PDF)
  const recentDocs = filteredFAQs
    .filter(f => !f.is_section && f.pdf_url)
    .sort((a, b) => {
      // Assuming FAQs have a created_at or updated_at field
      const dateA = new Date((a as any).created_at || (a as any).updated_at || 0);
      const dateB = new Date((b as any).created_at || (b as any).updated_at || 0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 5);

  // Get items for selected section
  const getItemsForSection = (sectionId: string): FAQ[] => {
    const items: FAQ[] = [];
    const collectItems = (parentId: string) => {
      const directItems = filteredFAQs.filter(f => !f.is_section && f.parent_id === parentId);
      items.push(...directItems);
      
      const childSections = filteredFAQs.filter(f => f.is_section && f.parent_id === parentId);
      childSections.forEach(section => collectItems(section.id));
    };
    collectItems(sectionId);
    return items;
  };

  const selectedSectionItems = selectedSection ? getItemsForSection(selectedSection) : [];
  const selectedSectionData = allSections.find(s => s.id === selectedSection);

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
        <div className="max-w-[1600px] mx-auto p-6 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{pageTitle}</h1>
            <p className="text-muted-foreground">{pageDescription}</p>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-2xl">
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

          {/* Main Layout: Topics (Left) + Recent Docs (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Topics Section - Left Side */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-primary" />
                    Todos os Tópicos
                  </CardTitle>
                  <CardDescription>Selecione um tópico para ver os documentos</CardDescription>
                </CardHeader>
                <CardContent>
                  {allSections.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum tópico disponível
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {allSections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => setSelectedSection(section.id === selectedSection ? null : section.id)}
                          className={`text-left p-4 rounded-lg border transition-all hover:shadow-md ${
                            selectedSection === section.id
                              ? 'bg-primary/10 border-primary'
                              : 'bg-card border-border/50 hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                              selectedSection === section.id ? 'bg-primary/20' : 'bg-muted'
                            }`}>
                              <Folder className={`w-5 h-5 ${
                                selectedSection === section.id ? 'text-primary' : 'text-muted-foreground'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm mb-1 line-clamp-2">{section.title}</h3>
                              {section.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">{section.description}</p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Selected Topic Documents */}
              {selectedSection && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      {selectedSectionData?.title}
                    </CardTitle>
                    <CardDescription>
                      {selectedSectionItems.length} {selectedSectionItems.length === 1 ? 'documento' : 'documentos'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedSectionItems.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum documento neste tópico
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedSectionItems.map((item) => (
                          <Card
                            key={item.id}
                            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 bg-card border-border/50"
                            onClick={() => setSelectedFaq(item)}
                          >
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full min-h-[140px]">
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                <FileText className="w-6 h-6 text-primary" />
                              </div>
                              <h3 className="font-semibold text-sm line-clamp-2 mb-2">{item.title}</h3>
                              {item.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Recent Documents - Right Side */}
            <div className="lg:col-span-1">
              <Card className="border-border/50 sticky top-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Documentos Recentes
                  </CardTitle>
                  <CardDescription>Últimos documentos adicionados</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentDocs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      Nenhum documento recente
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {recentDocs.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => setSelectedFaq(doc)}
                          className="w-full text-left p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/50 hover:border-primary/50 transition-all group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                              <FileText className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm mb-1 line-clamp-2">{doc.title}</h4>
                              {doc.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">{doc.description}</p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
