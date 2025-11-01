import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { CourseCard } from "@/components/course/CourseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "@supabase/supabase-js";

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
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
      const [coursesRes, lessonsRes, progressRes] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("lessons").select("*"),
        supabase.from("user_progress").select("*"),
      ]);

      if (coursesRes.data) setCourses(coursesRes.data);
      if (lessonsRes.data) setLessons(lessonsRes.data);
      if (progressRes.data) setProgress(progressRes.data);
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

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold mb-2">Meus Cursos</h1>
            <p className="text-muted-foreground">Continue seu aprendizado de onde parou</p>
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
              {courses.map((course, index) => {
                const stats = getCourseStats(course.id);
                return (
                  <div 
                    key={course.id} 
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CourseCard
                      id={course.id}
                      title={course.title}
                      description={course.description || ""}
                      thumbnailUrl={course.thumbnail_url || ""}
                      progress={stats.progress}
                      totalLessons={stats.totalLessons}
                      completedLessons={stats.completedLessons}
                      totalDuration={stats.totalDuration}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
