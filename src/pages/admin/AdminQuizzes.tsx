import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const quizSchema = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  passing_score: z.number().min(0).max(100),
  lesson_id: z.string().nullable().optional(),
  module_id: z.string().nullable().optional(),
  course_id: z.string().nullable().optional(),
  is_final_exam: z.boolean().default(false),
});

const questionSchema = z.object({
  question: z.string().min(5, 'Questão deve ter no mínimo 5 caracteres'),
  order_index: z.number().min(0),
});

const answerSchema = z.object({
  answer: z.string().min(1, 'Resposta não pode estar vazia'),
  is_correct: z.boolean(),
});

export default function AdminQuizzes() {
  const [courses, setCourses] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [answerDialogOpen, setAnswerDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);

  const quizForm = useForm<z.infer<typeof quizSchema>>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: '',
      passing_score: 70,
      is_final_exam: false,
      course_id: null,
      module_id: null,
      lesson_id: null,
    },
  });

  const questionForm = useForm({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      question: '',
      order_index: 0,
    },
  });

  const answerForm = useForm({
    resolver: zodResolver(answerSchema),
    defaultValues: {
      answer: '',
      is_correct: false,
    },
  });

  useEffect(() => {
    fetchCourses();
    fetchQuizzes();
  }, []);

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('*').order('title');
    setCourses(data || []);
  };

  const fetchModules = async (courseId: string) => {
    const { data } = await supabase
      .from('modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index');
    setModules(data || []);
  };

  const fetchLessons = async (moduleId: string) => {
    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('module_id', moduleId)
      .order('order_index');
    setLessons(data || []);
  };

  const fetchQuizzes = async () => {
    const { data } = await supabase.from('quizzes').select('*').order('title');
    setQuizzes(data || []);
  };

  const fetchQuestions = async (quizId: string) => {
    const { data: questionsData } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index');

    const questionsWithAnswers = await Promise.all(
      (questionsData || []).map(async (q) => {
        const { data: answers } = await supabase
          .from('quiz_answers')
          .select('*')
          .eq('question_id', q.id);
        return { ...q, answers: answers || [] };
      })
    );

    setQuestions(questionsWithAnswers);
  };

  const onSubmitQuiz = async (values: any) => {
    const { error } = await supabase.from('quizzes').insert([values]);
    if (error) {
      toast.error('Erro ao criar prova');
    } else {
      toast.success('Prova criada com sucesso!');
      fetchQuizzes();
      setDialogOpen(false);
      quizForm.reset();
    }
  };

  const deleteQuiz = async (id: string) => {
    const { error } = await supabase.from('quizzes').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao deletar prova');
    } else {
      toast.success('Prova deletada!');
      fetchQuizzes();
      if (selectedQuiz?.id === id) {
        setSelectedQuiz(null);
        setQuestions([]);
      }
    }
  };

  const onSubmitQuestion = async (values: any) => {
    const { error } = await supabase.from('quiz_questions').insert([
      {
        quiz_id: selectedQuiz.id,
        ...values,
      },
    ]);
    if (error) {
      toast.error('Erro ao criar questão');
    } else {
      toast.success('Questão criada!');
      fetchQuestions(selectedQuiz.id);
      setQuestionDialogOpen(false);
      questionForm.reset();
    }
  };

  const deleteQuestion = async (id: string) => {
    const { error } = await supabase.from('quiz_questions').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao deletar questão');
    } else {
      toast.success('Questão deletada!');
      fetchQuestions(selectedQuiz.id);
    }
  };

  const onSubmitAnswer = async (values: any) => {
    const { error } = await supabase.from('quiz_answers').insert([
      {
        question_id: selectedQuestion.id,
        ...values,
      },
    ]);
    if (error) {
      toast.error('Erro ao criar resposta');
    } else {
      toast.success('Resposta criada!');
      fetchQuestions(selectedQuiz.id);
      setAnswerDialogOpen(false);
      answerForm.reset();
    }
  };

  const deleteAnswer = async (id: string) => {
    const { error } = await supabase.from('quiz_answers').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao deletar resposta');
    } else {
      toast.success('Resposta deletada!');
      fetchQuestions(selectedQuiz.id);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold">Gerenciar Provas</h1>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Prova
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Prova</DialogTitle>
                </DialogHeader>
                <form onSubmit={quizForm.handleSubmit(onSubmitQuiz)} className="space-y-4">
                  <div>
                    <Label>Título</Label>
                    <Input {...quizForm.register('title')} />
                  </div>
                  <div>
                    <Label>Nota Mínima (%)</Label>
                    <Input
                      type="number"
                      {...quizForm.register('passing_score', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      onValueChange={(val) => {
                        quizForm.setValue('is_final_exam', val === 'final');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lesson">Prova de Aula</SelectItem>
                        <SelectItem value="module">Prova de Módulo</SelectItem>
                        <SelectItem value="final">Prova Final</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Curso</Label>
                    <Select
                      onValueChange={(val) => {
                        quizForm.setValue('course_id', val);
                        fetchModules(val);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o curso" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">
                    Criar Prova
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Provas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => {
                      setSelectedQuiz(quiz);
                      fetchQuestions(quiz.id);
                    }}
                  >
                    <span className="font-medium">{quiz.title}</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteQuiz(quiz.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {selectedQuiz && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Questões - {selectedQuiz.title}</span>
                    <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Nova Questão</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={questionForm.handleSubmit(onSubmitQuestion)} className="space-y-4">
                          <div>
                            <Label>Questão</Label>
                            <Input {...questionForm.register('question')} />
                          </div>
                          <div>
                            <Label>Ordem</Label>
                            <Input
                              type="number"
                              {...questionForm.register('order_index', { valueAsNumber: true })}
                            />
                          </div>
                          <Button type="submit" className="w-full">
                            Criar Questão
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {questions.map((q) => (
                    <div key={q.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <p className="font-medium">{q.question}</p>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteQuestion(q.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="pl-4 space-y-1">
                        {q.answers?.map((a: any) => (
                          <div
                            key={a.id}
                            className={`flex justify-between items-center p-2 rounded ${
                              a.is_correct ? 'bg-green-50 dark:bg-green-900/20' : 'bg-muted'
                            }`}
                          >
                            <span className="text-sm">{a.answer}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteAnswer(a.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        <Dialog open={answerDialogOpen} onOpenChange={setAnswerDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full mt-2"
                              onClick={() => setSelectedQuestion(q)}
                            >
                              <Plus className="w-3 h-3 mr-2" />
                              Adicionar Resposta
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Nova Resposta</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={answerForm.handleSubmit(onSubmitAnswer)} className="space-y-4">
                              <div>
                                <Label>Resposta</Label>
                                <Input {...answerForm.register('answer')} />
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  {...answerForm.register('is_correct')}
                                  className="w-4 h-4"
                                />
                                <Label>Resposta Correta</Label>
                              </div>
                              <Button type="submit" className="w-full">
                                Criar Resposta
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
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
