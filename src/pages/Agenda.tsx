import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LessonCard } from '@/components/lessons/LessonCard';
import { CreateLessonModal } from '@/components/lessons/CreateLessonModal';
import { mockLessons, getStudentById, Lesson } from '@/data/mockData';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  List,
  Grid3X3,
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ViewMode = 'day' | 'week' | 'month';

const Agenda: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getLessonsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return mockLessons.filter((l) => l.data === dateString);
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

  const handleCreateLesson = (lessonData: Omit<Lesson, 'id'>) => {
    console.log('Creating/updating lesson:', lessonData);
    setSelectedLesson(null);
  };

  const todayLessons = getLessonsForDate(currentDate);

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
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova Aula
        </Button>
      </div>

      {/* Navigation and view controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Date navigation */}
            <div className="flex items-center gap-2">
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

      {/* Calendar grid - Week view */}
      {viewMode === 'week' && (
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
                        compact
                        onEdit={handleEditLesson}
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
      {viewMode === 'day' && (
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
            {todayLessons.length > 0 ? (
              todayLessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  onEdit={handleEditLesson}
                  onConfirm={() => console.log('Confirm', lesson.id)}
                  onCancel={() => console.log('Cancel', lesson.id)}
                  onReschedule={() => console.log('Reschedule', lesson.id)}
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
        onSave={handleCreateLesson}
        editLesson={selectedLesson}
      />
    </div>
  );
};

export default Agenda;
