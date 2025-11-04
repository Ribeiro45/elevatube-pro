import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, BookOpen, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  title: string;
  youtube_url: string;
  duration_minutes: number;
  order_index: number;
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

interface ModuleAccordionProps {
  modules: Module[];
  completedLessons: Set<string>;
  currentLessonId: string | null;
  onSelectLesson: (lesson: Lesson) => void;
  onSelectModuleQuiz: (moduleId: string) => void;
}

export const ModuleAccordion = ({
  modules,
  completedLessons,
  currentLessonId,
  onSelectLesson,
  onSelectModuleQuiz,
}: ModuleAccordionProps) => {
  return (
    <Card>
      <Accordion type="single" collapsible className="w-full">
        {modules.map((module) => {
          const totalLessons = module.lessons.length;
          const completedCount = module.lessons.filter(l => completedLessons.has(l.id)).length;
          const moduleProgress = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;
          
          return (
            <AccordionItem key={module.id} value={module.id}>
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      moduleProgress === 100 
                        ? "bg-green-500/20 text-green-600 dark:text-green-400" 
                        : "bg-primary/10 text-primary"
                    )}>
                      {moduleProgress === 100 ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <BookOpen className="w-5 h-5" />
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">{module.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {completedCount} de {totalLessons} aulas concluídas
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "text-xs font-medium",
                    moduleProgress === 100 ? "text-green-600 dark:text-green-400" : "text-primary"
                  )}>
                    {Math.round(moduleProgress)}%
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {module.description && (
                  <p className="text-sm text-muted-foreground mb-4 px-2">
                    {module.description}
                  </p>
                )}
                <div className="space-y-2">
                  {module.lessons.map((lesson) => {
                    const isCompleted = completedLessons.has(lesson.id);
                    const isCurrent = currentLessonId === lesson.id;
                    
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => onSelectLesson(lesson)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3",
                          isCurrent 
                            ? "bg-primary/10 border-2 border-primary" 
                            : "hover:bg-muted border-2 border-transparent"
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium line-clamp-2">{lesson.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {lesson.duration_minutes} min
                          </p>
                        </div>
                      </button>
                    );
                  })}
                  
                  {module.hasQuiz && (
                    <button
                      onClick={() => onSelectModuleQuiz(module.id)}
                      className="w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3 bg-accent/10 hover:bg-accent/20 border-2 border-accent/30"
                    >
                      <FileCheck className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">Prova do Módulo</p>
                        <p className="text-sm text-muted-foreground">
                          Complete para avançar
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </Card>
  );
};