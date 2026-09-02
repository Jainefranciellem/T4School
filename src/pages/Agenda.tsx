import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LessonCard } from '@/components/lessons/LessonCard';
import { CreateLessonModal } from '@/components/lessons/CreateLessonModal';
import { Lesson } from '@/types';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  List,
  Grid3X3,
  Loader2
} from 'lucide-react';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AulasService } from '@/lib/aulas.service';
import { Aula } from '@/types';
import { listarAlunos } from '@/lib/students.service';
import { useToast } from '@/hooks/use-toast';

type ViewMode = 'day' | 'week' | 'month';

const Agenda: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Fetch Lessons
  const { data: lessons = [], isLoading, isError } = useQuery({
    queryKey: ['aulas'],
    queryFn: AulasService.listarAulas,
  });

  // Fetch Students
  const { data: students = [] } = useQuery({
    queryKey: ['alunos'],
    queryFn: listarAlunos,
  });

  // Mutations
  const createLessonMutation = useMutation({
    mutationFn: AulasService.criarAula,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aulas'] });
      toast({ title: 'Sucesso', description: 'Aula agendada com sucesso!' });
      setIsModalOpen(false);
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao agendar aula.', variant: 'destructive' });
    }
  });

  const updateLessonMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Aula> }) =>
      AulasService.atualizarAula(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aulas'] });
      toast({ title: 'Sucesso', description: 'Aula atualizada com sucesso!' });
      setIsModalOpen(false);
      setSelectedLesson(null);
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao atualizar aula.', variant: 'destructive' });
    }
  });

  const getLessonsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    // Ensure we handle date comparison correctly regardless of time
    return lessons.filter((l) => l.data === dateString);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) =>
      direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleEditLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setIsModalOpen(true);
  };

  const handleSaveLesson = (lessonData: Lesson) => {
    if (selectedLesson) {
      updateLessonMutation.mutate({ id: selectedLesson.id, data: lessonData });
    } else {
      createLessonMutation.mutate(lessonData);
    }
  };

  const handleConfirmLesson = (lesson: Lesson) => {
    updateLessonMutation.mutate(
      {
        id: lesson.id,
        data: {
          status: 'Confirmada',
          notificacao_enviada: true
        }
      },
      {
        onSuccess: () => {
          toast({
            title: 'Aula Confirmada',
            description: 'Status atualizado e notificação enviada ao aluno.',
            className: 'bg-green-50 border-green-200'
          });
        }
      }
    );
  };

  const handleCancelLesson = (lesson: Lesson) => {
    updateLessonMutation.mutate(
      {
        id: lesson.id,
        data: {
          status: 'Cancelada',
          notificacao_enviada: false,
          enviar_notificacao: true
        }
      },
      {
        onSuccess: () => {
          toast({
            title: 'Aula Cancelada',
            description: 'Status atualizado e aluno notificado.',
            variant: 'destructive'
          });
        }
      }
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Agenda</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todas as aulas agendadas
          </p>
        </div>
        <Button onClick={() => { setSelectedLesson(null); setIsModalOpen(true); }}>
          <Plus className="h-4 w-4" />
          Nova Aula
        </Button>
      </div>

      {/* Navigation and view controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col items-center sm:flex-row sm:justify-between gap-4">
            {/* Date navigation */}
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={goToToday}>
                Hoje
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateWeek('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold font-display ml-2">
                {format(weekStart, "d 'de' MMM", { locale: ptBR })} -{' '}
                {format(weekEnd, "d 'de' MMM, yyyy", { locale: ptBR })}
              </span>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
              <Button
                variant={viewMode === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('day')}
              >
                <List className="h-4 w-4 mr-1" />
                Dia
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                <Grid3X3 className="h-4 w-4 mr-1" />
                Semana
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                <CalendarIcon className="h-4 w-4 mr-1" />
                Mês
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="text-center p-12 text-destructive">
          <p>Erro ao carregar aulas. Tente novamente mais tarde.</p>
        </div>
      )}

      {/* Calendar grid - Week view */}
      {!isLoading && !isError && viewMode === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const dayLessons = getLessonsForDate(day);
            const isCurrentDay = isToday(day);

            return (
              <Card
                key={day.toISOString()}
                className={cn(
                  'min-h-[200px]',
                  isCurrentDay && 'ring-2 ring-primary ring-offset-2'
                )}
              >
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span
                      className={cn(
                        'capitalize',
                        isCurrentDay && 'text-primary font-bold'
                      )}
                    >
                      {format(day, 'EEE', { locale: ptBR })}
                    </span>
                    <span
                      className={cn(
                        'w-7 h-7 flex items-center justify-center rounded-full text-sm',
                        isCurrentDay
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  {dayLessons.length > 0 ? (
                    dayLessons.map((lesson) => (
                      <LessonCard
                        key={lesson.id}
                        lesson={lesson}
                        student={students.find((s) => s.id === lesson.aluno_id)}
                        compact
                        onEdit={handleEditLesson}
                        onConfirm={handleConfirmLesson}
                        onCancel={handleCancelLesson}
                        onReschedule={handleEditLesson}
                      />
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Sem aulas
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Day view */}
      {!isLoading && !isError && viewMode === 'day' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Day selector */}
          <Card className="lg:col-span-2">
            <CardContent className="p-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {weekDays.map((day) => (
                  <Button
                    key={day.toISOString()}
                    variant={isSameDay(day, currentDate) ? 'default' : 'outline'}
                    className="flex-shrink-0"
                    onClick={() => setCurrentDate(day)}
                  >
                    <div className="text-center">
                      <div className="text-xs uppercase">
                        {format(day, 'EEE', { locale: ptBR })}
                      </div>
                      <div className="text-lg font-bold">{format(day, 'd')}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lessons for selected day */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold font-display">
              {format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h2>
            {getLessonsForDate(currentDate).length > 0 ? (
              getLessonsForDate(currentDate).map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  student={students.find((s) => s.id === lesson.aluno_id)}
                  onEdit={handleEditLesson}
                  onConfirm={handleConfirmLesson}
                  onCancel={handleCancelLesson}
                  onReschedule={handleEditLesson}
                />
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma aula agendada para este dia</p>
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={() => setIsModalOpen(true)}
                  >
                    Agendar nova aula
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Month view placeholder */}
      {viewMode === 'month' && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Visualização mensal</p>
            <p>Em breve disponível</p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit lesson modal */}
      <CreateLessonModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedLesson(null);
        }}
        onSave={handleSaveLesson}
        editLesson={selectedLesson}
      />
    </div>
  );
};

export default Agenda;
