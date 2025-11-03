import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { VideoPlayer } from "@/components/course/VideoPlayer";
import { QuizTaker } from "@/components/quiz/QuizTaker";
import { ModuleQuizTaker } from "@/components/course/ModuleQuizTaker";
import { FinalExamTaker } from "@/components/quiz/FinalExamTaker";
import { ModuleAccordion } from "@/components/course/ModuleAccordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { User } from "@supabase/supabase-js";

interface Lesson {
  id: string;
  title: string;
  youtube_url: string;
  order_index: number;
  duration_minutes: number;
  module_id: string | null;
}

interface Module {
  id: string;
  title: string;
  description: string;
  order_index: number;
  lessons: Lesson[];
  hasQuiz: boolean;
}

interface CourseData {
  title: string;
  description: string;
}

const Course = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [course, setCourse] = useState<CourseData | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentModuleQuiz, setCurrentModuleQuiz] = useState<string | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'lesson' | 'module-quiz' | 'final-exam'>('lesson');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user && id) {
      loadCourse();
    }
  }, [user, id]);

  const loadCourse = async () => {
    try {
      const [courseRes, modulesRes, lessonsRes, progressRes, quizzesRes] = await Promise.all([
        supabase.from("courses").select("*").eq("id", id).single(),
        supabase.from("modules").select("*").eq("course_id", id).order("order_index"),
        supabase.from("lessons").select("*").eq("course_id", id).order("order_index"),
        supabase.from("user_progress").select("*").eq("user_id", user?.id),
        supabase.from("quizzes").select("id, module_id").not("module_id", "is", null),
      ]);

      if (courseRes.data) setCourse(courseRes.data);
      
      if (lessonsRes.data) {
        setLessons(lessonsRes.data);
      }

      if (modulesRes.data && lessonsRes.data) {
        // Check which modules have quizzes
        const moduleQuizMap = new Map(
          quizzesRes.data?.map(q => [q.module_id, true]) || []
        );

        // Organize lessons by module
        const modulesWithLessons = modulesRes.data.map(module => ({
          ...module,
          lessons: lessonsRes.data
            .filter(l => l.module_id === module.id)
            .sort((a, b) => a.order_index - b.order_index),
          hasQuiz: moduleQuizMap.has(module.id),
        }));

        setModules(modulesWithLessons);

        // Set first lesson as current
        const firstModule = modulesWithLessons[0];
        if (firstModule?.lessons.length > 0) {
          setCurrentLesson(firstModule.lessons[0]);
        }
      }

      if (progressRes.data) {
        const completed = new Set(
          progressRes.data.filter(p => p.completed).map(p => p.lesson_id)
        );
        setCompletedLessons(completed);
      }
    } catch (error) {
      console.error("Error loading course:", error);
      toast.error("Erro ao carregar curso");
    } finally {
      setLoading(false);
    }
  };

  const toggleLessonComplete = async (lessonId: string) => {
    const isCompleted = completedLessons.has(lessonId);
    
    try {
      if (isCompleted) {
        await supabase
          .from("user_progress")
          .delete()
          .eq("user_id", user?.id)
          .eq("lesson_id", lessonId);
        
        setCompletedLessons(prev => {
          const next = new Set(prev);
          next.delete(lessonId);
          return next;
        });
      } else {
        await supabase
          .from("user_progress")
          .upsert({
            user_id: user?.id,
            lesson_id: lessonId,
            completed: true,
            completed_at: new Date().toISOString(),
          });
        
        setCompletedLessons(prev => new Set(prev).add(lessonId));
        toast.success("Aula marcada como concluída!");
        
        // Check if course is complete and issue certificate
        if (user?.id && id) {
          await supabase.rpc('check_and_issue_certificate', {
            p_user_id: user.id,
            p_course_id: id
          });
        }
      }
    } catch (error) {
      console.error("Error updating progress:", error);
      toast.error("Erro ao atualizar progresso");
    }
  };

  const progressPercent = lessons.length > 0 
    ? (completedLessons.size / lessons.length) * 100 
    : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <p className="text-muted-foreground">Carregando curso...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para cursos
          </Button>

          <div className="animate-fade-in">
            <h1 className="text-4xl font-bold mb-2">{course?.title}</h1>
            <p className="text-muted-foreground mb-4">{course?.description}</p>
            
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span>Progresso do curso</span>
                <span className="font-medium">{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {viewMode === 'lesson' && currentLesson && (
                <Tabs defaultValue="video" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="video">Vídeo</TabsTrigger>
                    <TabsTrigger value="quiz">Prova da Aula</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="video">
                    <div className="space-y-4">
                      <VideoPlayer 
                        youtubeUrl={currentLesson.youtube_url}
                        title={currentLesson.title}
                      />
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>{currentLesson.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Button
                            onClick={() => toggleLessonComplete(currentLesson.id)}
                            variant={completedLessons.has(currentLesson.id) ? "secondary" : "default"}
                            className="w-full"
                          >
                            {completedLessons.has(currentLesson.id) ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Marcar como não concluída
                              </>
                            ) : (
                              <>
                                <Circle className="w-4 h-4 mr-2" />
                                Marcar como concluída
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="quiz">
                    <QuizTaker 
                      lessonId={currentLesson.id} 
                      onComplete={() => {
                        toast.success("Prova da aula concluída!");
                        loadCourse();
                      }}
                    />
                  </TabsContent>
                </Tabs>
              )}

              {viewMode === 'module-quiz' && currentModuleQuiz && (
                <div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setViewMode('lesson');
                      setCurrentModuleQuiz(null);
                    }}
                    className="mb-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para aulas
                  </Button>
                  <ModuleQuizTaker
                    moduleId={currentModuleQuiz}
                    onComplete={() => {
                      toast.success("Prova do módulo concluída!");
                      setViewMode('lesson');
                      setCurrentModuleQuiz(null);
                      loadCourse();
                    }}
                  />
                </div>
              )}

              {viewMode === 'final-exam' && (
                <div>
                  <Button
                    variant="ghost"
                    onClick={() => setViewMode('lesson')}
                    className="mb-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para aulas
                  </Button>
                  <FinalExamTaker 
                    courseId={id!} 
                    courseTitle={course?.title || ""}
                    onComplete={() => {
                      toast.success("Prova final concluída!");
                      loadCourse();
                    }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <ModuleAccordion
                modules={modules}
                completedLessons={completedLessons}
                currentLessonId={currentLesson?.id || null}
                onSelectLesson={(lesson) => {
                  setCurrentLesson(lesson);
                  setViewMode('lesson');
                  setCurrentModuleQuiz(null);
                }}
                onSelectModuleQuiz={(moduleId) => {
                  setCurrentModuleQuiz(moduleId);
                  setViewMode('module-quiz');
                }}
              />

              <Button
                onClick={() => setViewMode('final-exam')}
                variant="outline"
                className="w-full border-2 border-primary hover:bg-primary/10"
              >
                Prova Final do Curso
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Course;
