import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { OverallProgress } from "@/components/dashboard/OverallProgress";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Download } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
}

interface Certificate {
  id: string;
  certificate_number: string;
  issued_at: string;
  courses: {
    title: string;
  } | null;
}

interface Lesson {
  id: string;
  course_id: string;
  duration_minutes: number;
}

interface Progress {
  lesson_id: string;
  completed: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [certificatesCount, setCertificatesCount] = useState(0);
  const [studyTime, setStudyTime] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [enrollmentsRes, progressRes, certificatesRes] = await Promise.all([
        supabase.from("enrollments").select("course_id, courses(*)"),
        supabase.from("user_progress").select("*"),
        supabase.from("certificates").select(`
          id,
          certificate_number,
          issued_at,
          courses (
            title
          )
        `).order("issued_at", { ascending: false }).limit(3),
      ]);

      if (enrollmentsRes.data) {
        const enrolledCourses = enrollmentsRes.data
          .map((e: any) => e.courses)
          .filter((c: any) => c !== null) as Course[];
        setCourses(enrolledCourses);
        
        // Get only lessons from enrolled courses
        const courseIds = enrolledCourses.map(c => c.id);
        if (courseIds.length > 0) {
          const { data: lessonsData } = await supabase
            .from("lessons")
            .select("*")
            .in("course_id", courseIds);
          
          if (lessonsData) {
            setLessons(lessonsData);
            
            // Calculate total study time from completed lessons
            const completedLessonIds = progressRes.data?.filter(p => p.completed).map(p => p.lesson_id) || [];
            const totalMinutes = lessonsData
              .filter(l => completedLessonIds.includes(l.id))
              .reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
            setStudyTime(totalMinutes);
          }
        }
      }
      if (progressRes.data) setProgress(progressRes.data);
      if (certificatesRes.data) {
        setCertificates(certificatesRes.data);
        setCertificatesCount(certificatesRes.data.length);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCourseStats = (courseId: string) => {
    const courseLessons = lessons.filter(l => l.course_id === courseId);
    const completedLessons = courseLessons.filter(l => 
      progress.some(p => p.lesson_id === l.id && p.completed)
    );
    
    const totalDuration = courseLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
    const progressPercent = courseLessons.length > 0 
      ? (completedLessons.length / courseLessons.length) * 100 
      : 0;

    return {
      totalLessons: courseLessons.length,
      completedLessons: completedLessons.length,
      totalDuration,
      progress: progressPercent,
    };
  };

  const completedLessonsCount = progress.filter(p => p.completed).length;
  const completedCoursesCount = courses.filter(course => {
    const stats = getCourseStats(course.id);
    return stats.progress === 100;
  }).length;
  const enrolledCoursesCount = courses.length;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="animate-fade-in">
            <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Continue seu aprendizado de onde parou</p>
          </div>

          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Cursos Inscritos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">{enrolledCoursesCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total de cursos que você está fazendo</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Cursos Finalizados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">{completedCoursesCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">Cursos concluídos com 100%</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Taxa de Conclusão
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">
                      {enrolledCoursesCount > 0 ? Math.round((completedCoursesCount / enrolledCoursesCount) * 100) : 0}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Percentual de cursos finalizados</p>
                  </CardContent>
                </Card>
              </div>

              <OverallProgress
                totalCourses={courses.length}
                completedCourses={completedCoursesCount}
                totalLessons={lessons.length}
                completedLessons={completedLessonsCount}
                certificates={certificatesCount}
                studyTime={studyTime}
              />
            </>
          )}

          {certificates.length > 0 && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Award className="w-6 h-6 text-primary" />
                  Certificados Recentes
                </h2>
                <Button 
                  variant="outline"
                  onClick={() => navigate("/certificates")}
                >
                  Ver todos
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {certificates.map((cert, index) => (
                  <Card 
                    key={cert.id}
                    className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => navigate("/certificates")}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="h-2 bg-gradient-to-r from-primary to-accent" />
                    <CardHeader className="pb-3">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Award className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base line-clamp-2">
                            {cert.courses?.title || "Curso"}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(cert.issued_at), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        Certificado Nº {cert.certificate_number}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default Dashboard;
