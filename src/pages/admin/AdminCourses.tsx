import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, Trash2, Edit } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const courseSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  thumbnail_url: z.string().url('URL inválida').optional().or(z.literal('')),
  duration: z.string().optional(),
  total_modules: z.number().min(0).optional(),
  total_lessons: z.number().min(0).optional(),
});

const lessonSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  youtube_url: z.string().url('URL do YouTube inválida'),
  duration_minutes: z.number().min(1, 'Duração deve ser maior que 0').optional(),
});

export default function AdminCourses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);

  const courseForm = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: { 
      title: '', 
      description: '', 
      thumbnail_url: '',
      duration: '',
      total_modules: 0,
      total_lessons: 0
    },
  });

  const lessonForm = useForm({
    resolver: zodResolver(lessonSchema),
    defaultValues: { title: '', youtube_url: '', duration_minutes: 0 },
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchLessons(selectedCourse.id);
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    setCourses(data || []);
  };

  const fetchLessons = async (courseId: string) => {
    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
    setLessons(data || []);
  };

  const onSubmitCourse = async (values: z.infer<typeof courseSchema>) => {
    const { error } = await supabase.from('courses').insert([{
      title: values.title,
      description: values.description || null,
      thumbnail_url: values.thumbnail_url || null,
      duration: values.duration || null,
      total_modules: values.total_modules || null,
      total_lessons: values.total_lessons || null,
    }]);
    
    if (error) {
      toast.error('Erro ao criar curso');
    } else {
      toast.success('Curso criado com sucesso!');
      setDialogOpen(false);
      courseForm.reset();
      fetchCourses();
    }
  };

  const onSubmitLesson = async (values: z.infer<typeof lessonSchema>) => {
    if (!selectedCourse) return;

    if (editingLesson) {
      // Update existing lesson
      const { error } = await supabase
        .from('lessons')
        .update({
          title: values.title,
          youtube_url: values.youtube_url,
          duration_minutes: values.duration_minutes || null,
        })
        .eq('id', editingLesson.id);
      
      if (error) {
        toast.error('Erro ao atualizar aula');
      } else {
        toast.success('Aula atualizada com sucesso!');
        setLessonDialogOpen(false);
        setEditingLesson(null);
        lessonForm.reset();
        fetchLessons(selectedCourse.id);
      }
    } else {
      // Insert new lesson
      const { error } = await supabase.from('lessons').insert([{
        title: values.title,
        youtube_url: values.youtube_url,
        duration_minutes: values.duration_minutes || null,
        course_id: selectedCourse.id,
        order_index: lessons.length,
      }]);
      
      if (error) {
        toast.error('Erro ao adicionar aula');
      } else {
        toast.success('Aula adicionada com sucesso!');
        setLessonDialogOpen(false);
        lessonForm.reset();
        fetchLessons(selectedCourse.id);
      }
    }
  };

  const deleteCourse = async (id: string) => {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    
    if (error) {
      toast.error('Erro ao deletar curso');
    } else {
      toast.success('Curso deletado com sucesso!');
      fetchCourses();
      if (selectedCourse?.id === id) {
        setSelectedCourse(null);
      }
    }
  };

  const deleteLesson = async (id: string) => {
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    
    if (error) {
      toast.error('Erro ao deletar aula');
    } else {
      toast.success('Aula deletada com sucesso!');
      fetchLessons(selectedCourse.id);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Gerenciar Cursos</h1>
              <p className="text-muted-foreground">Adicione e gerencie cursos e aulas</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Curso
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Curso</DialogTitle>
                </DialogHeader>
                <Form {...courseForm}>
                  <form onSubmit={courseForm.handleSubmit(onSubmitCourse)} className="space-y-4">
                    <FormField
                      control={courseForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={courseForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={courseForm.control}
                      name="thumbnail_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL da Thumbnail</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={courseForm.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duração (ex: 8 horas)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="8 horas" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={courseForm.control}
                        name="total_modules"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Módulos</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={courseForm.control}
                        name="total_lessons"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Aulas</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit" className="w-full">Criar Curso</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Cursos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedCourse?.id === course.id ? 'bg-accent' : 'hover:bg-accent/50'
                    }`}
                    onClick={() => setSelectedCourse(course)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold">{course.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{course.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCourse(course.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {selectedCourse && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Aulas - {selectedCourse.title}</CardTitle>
                    <Dialog 
                      open={lessonDialogOpen} 
                      onOpenChange={(open) => {
                        setLessonDialogOpen(open);
                        if (!open) {
                          setEditingLesson(null);
                          lessonForm.reset();
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Aula
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{editingLesson ? 'Editar Aula' : 'Adicionar Nova Aula'}</DialogTitle>
                        </DialogHeader>
                        <Form {...lessonForm}>
                          <form onSubmit={lessonForm.handleSubmit(onSubmitLesson)} className="space-y-4">
                            <FormField
                              control={lessonForm.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Título</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={lessonForm.control}
                              name="youtube_url"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>URL do YouTube</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="https://www.youtube.com/watch?v=..." />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={lessonForm.control}
                              name="duration_minutes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Duração (minutos)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button type="submit" className="w-full">Adicionar Aula</Button>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {lessons.map((lesson) => (
                    <div key={lesson.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{lesson.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {lesson.duration_minutes} minutos
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingLesson(lesson);
                              lessonForm.reset({
                                title: lesson.title,
                                youtube_url: lesson.youtube_url,
                                duration_minutes: lesson.duration_minutes || 0,
                              });
                              setLessonDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteLesson(lesson.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
