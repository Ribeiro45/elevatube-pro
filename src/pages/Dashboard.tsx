import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { OverallProgress } from "@/components/dashboard/OverallProgress";
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
      const [enrollmentsRes, lessonsRes, progressRes, certificatesRes] = await Promise.all([
        supabase.from("enrollments").select("course_id, courses(*)"),
        supabase.from("lessons").select("*"),
        supabase.from("user_progress").select("*"),
        supabase.from("certificates").select("id", { count: 'exact' }),
      ]);

      if (enrollmentsRes.data) {
        const enrolledCourses = enrollmentsRes.data
          .map((e: any) => e.courses)
          .filter((c: any) => c !== null) as Course[];
        setCourses(enrolledCourses);
      }
      if (lessonsRes.data) {
        setLessons(lessonsRes.data);
        
        // Calculate total study time from completed lessons
        const completedLessonIds = progressRes.data?.filter(p => p.completed).map(p => p.lesson_id) || [];
        const totalMinutes = lessonsRes.data
          .filter(l => completedLessonIds.includes(l.id))
          .reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
        setStudyTime(totalMinutes);
      }
      if (progressRes.data) setProgress(progressRes.data);
      if (certificatesRes.count !== null) setCertificatesCount(certificatesRes.count);
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
            <OverallProgress
              totalCourses={courses.length}
              completedCourses={completedCoursesCount}
              totalLessons={lessons.length}
              completedLessons={completedLessonsCount}
              certificates={certificatesCount}
              studyTime={studyTime}
            />
          )}

        </div>
      </main>
    </div>
  );
};

export default Dashboard;
