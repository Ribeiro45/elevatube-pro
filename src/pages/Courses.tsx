import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  duration: string;
  total_modules: number;
  total_lessons: number;
  course_target: string;
}

interface Enrollment {
  course_id: string;
}

const Courses = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
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
      // Get user profile to check user_type
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", user?.id)
        .single();

      const userType = profile?.user_type || 'colaborador';

      // Fetch all courses and course access
      const [coursesRes, enrollmentsRes, courseAccessRes] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("enrollments").select("course_id"),
        supabase.from("course_access").select("*"),
      ]);

      if (coursesRes.data && courseAccessRes.data) {
        // Filter courses based on user type and course access
        const accessibleCourses = coursesRes.data.filter(course => {
          // Check if course has specific access rules
          const accessRules = courseAccessRes.data.filter(a => a.course_id === course.id);
          
          // If no access rules, check course_target
          if (accessRules.length === 0) {
            return course.course_target === 'both' || course.course_target === userType;
          }
          
          // If has access rules, check if user type is allowed
          return accessRules.some(rule => rule.user_type === userType || rule.user_type === 'both');
        });
        
        setCourses(accessibleCourses);
      }
      if (enrollmentsRes.data) setEnrollments(enrollmentsRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const isEnrolled = (courseId: string) => {
    return enrollments.some(e => e.course_id === courseId);
  };

  const handleEnroll = async (courseId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("enrollments")
        .insert({ user_id: user.id, course_id: courseId });

      if (error) throw error;

      toast.success("Inscrito no curso com sucesso!");
      loadData();
    } catch (error) {
      console.error("Error enrolling:", error);
      toast.error("Erro ao se inscrever no curso");
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="animate-fade-in">
            <h1 className="text-4xl font-bold mb-2">Cursos Disponíveis</h1>
            <p className="text-muted-foreground">Inscreva-se nos cursos e comece a aprender</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course, index) => (
                <Card 
                  key={course.id} 
                  className="animate-fade-in overflow-hidden"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={course.thumbnail_url || "/placeholder.svg"}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle>{course.title}</CardTitle>
                    <CardDescription>
                      <div className="space-y-2">
                        <p>{course.description}</p>
                        <div className="flex gap-4 text-sm pt-2">
                          {course.total_modules && (
                            <span>{course.total_modules} módulos</span>
                          )}
                          {course.total_lessons && (
                            <span>{course.total_lessons} aulas</span>
                          )}
                          {course.duration && (
                            <span>{course.duration}</span>
                          )}
                        </div>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    {isEnrolled(course.id) ? (
                      <Button 
                        className="w-full" 
                        onClick={() => navigate(`/course/${course.id}`)}
                      >
                        Acessar Curso
                      </Button>
                    ) : (
                      <Button 
                        className="w-full" 
                        onClick={() => handleEnroll(course.id)}
                      >
                        Inscrever-se
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Courses;
