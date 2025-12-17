import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { LessonCard } from '@/components/lessons/LessonCard';
import { CreateLessonModal } from '@/components/lessons/CreateLessonModal';
import {
  mockStudents,
  mockLessons,
  getTodaysLessons,
  getUpcomingLessons,
  Lesson,
} from '@/data/mockData';
import {
  Calendar,
  Users,
  Clock,
  Bell,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AulasService, Aula } from '@/lib/aulas.service';
import { useToast } from '@/hooks/use-toast';

const Dashboard: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const todaysLessons = getTodaysLessons();
  const upcomingLessons = getUpcomingLessons();
  const activeStudents = mockStudents.filter((s) => s.status === 'Ativo');
  const pendingNotifications = mockLessons.filter(
    (l) => l.status === 'Agendada' && !l.notificacao_enviada
  );

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

  const handleCreateLesson = (lessonData: Omit<Lesson, 'id'>) => {
    createLessonMutation.mutate(lessonData);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo de volta! Aqui está o resumo do dia.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link to="/alunos">
              <Users className="h-4 w-4" />
              Novo Aluno
            </Link>
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova Aula
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Aulas Hoje"
          value={todaysLessons.length}
          subtitle="agendadas para hoje"
          icon={Calendar}
          variant="primary"
        />
        <StatsCard
          title="Próximos 7 dias"
          value={upcomingLessons.length}
          subtitle="aulas na semana"
          icon={Clock}
          variant="secondary"
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Alunos Ativos"
          value={activeStudents.length}
          subtitle="matriculados"
          icon={Users}
          variant="accent"
        />
        <StatsCard
          title="Notificações"
          value={pendingNotifications.length}
          subtitle="pendentes de envio"
          icon={Bell}
          variant="default"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's lessons */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Aulas de Hoje
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/agenda">
                  Ver agenda
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {todaysLessons.length > 0 ? (
                todaysLessons.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    onEdit={() => console.log('Edit lesson', lesson.id)}
                    onConfirm={() => console.log('Confirm lesson', lesson.id)}
                    onCancel={() => console.log('Cancel lesson', lesson.id)}
                    onReschedule={() =>
                      console.log('Reschedule lesson', lesson.id)
                    }
                  />
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma aula agendada para hoje</p>
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={() => setIsModalOpen(true)}
                  >
                    Agendar nova aula
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick actions */}
          <Card variant="ocean" className="overflow-hidden">
            <CardContent className="p-6">
              <h3 className="font-display font-semibold text-lg mb-4">
                Ações Rápidas
              </h3>
              <div className="space-y-3">
                <Button
                  variant="glass"
                  className="w-full justify-start"
                  onClick={() => setIsModalOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Agendar aula
                </Button>
                <Button variant="glass" className="w-full justify-start" asChild>
                  <Link to="/alunos">
                    <Users className="h-4 w-4" />
                    Cadastrar aluno
                  </Link>
                </Button>
                <Button variant="glass" className="w-full justify-start" asChild>
                  <Link to="/relatorios">
                    <TrendingUp className="h-4 w-4" />
                    Ver relatórios
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Students needing attention */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alunos com Poucas Aulas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeStudents
                .filter((s) => s.aulas_restantes <= 3)
                .slice(0, 4)
                .map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {student.nome.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{student.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.plano}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold ${student.aulas_restantes === 0
                          ? 'text-destructive'
                          : student.aulas_restantes <= 2
                            ? 'text-warning'
                            : 'text-muted-foreground'
                        }`}
                    >
                      {student.aulas_restantes} aulas
                    </span>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create lesson modal */}
      <CreateLessonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateLesson}
      />
    </div>
  );
};

export default Dashboard;
