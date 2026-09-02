import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  getPortalStudent,
  getPortalLessons,
  confirmPortalLesson,
  cancelPortalLesson,
  registerPortalDeviceToken,
} from '@/lib/portal.service';
import { pedirPermissaoNotificacaoPush } from '@/lib/firebase';
import { lessonTypeLabel } from '@/lib/constants';
import { Loader2, Waves, MapPin, User, Bell, Check, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const statusConfig = {
  Agendada: { variant: 'scheduled' as const, label: 'Agendada' },
  Confirmada: { variant: 'confirmed' as const, label: 'Confirmada' },
  Compareceu: { variant: 'attended' as const, label: 'Compareceu' },
  Faltou: { variant: 'missed' as const, label: 'Faltou' },
  Cancelada: { variant: 'cancelled' as const, label: 'Cancelada' },
};

const Portal: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: student,
    isLoading: isLoadingStudent,
    isError,
  } = useQuery({
    queryKey: ['portal-student', token],
    queryFn: () => getPortalStudent(token!),
    enabled: !!token,
    retry: false,
  });

  const { data: lessons = [], isLoading: isLoadingLessons } = useQuery({
    queryKey: ['portal-lessons', token],
    queryFn: () => getPortalLessons(token!),
    enabled: !!token && !isError,
  });

  const confirmMutation = useMutation({
    mutationFn: (lessonId: string) => confirmPortalLesson(token!, lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-lessons', token] });
      toast({ title: 'Presença confirmada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (lessonId: string) => cancelPortalLesson(token!, lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-lessons', token] });
      toast({ title: 'Aula cancelada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const handleAtivarNotificacoes = async () => {
    try {
      const fcmToken = await pedirPermissaoNotificacaoPush();
      if (fcmToken) {
        await registerPortalDeviceToken(token!, fcmToken);
        toast({ title: 'Notificações ativadas!' });
      } else {
        toast({
          title: 'Permissão não concedida',
          description: 'Autorize notificações nas configurações do navegador pra ativar.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: 'Erro ao ativar notificações', variant: 'destructive' });
    }
  };

  if (isLoadingStudent) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !student) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-2 text-center px-4">
        <h1 className="text-xl font-bold">Link inválido</h1>
        <p className="text-muted-foreground">
          Esse link não é mais válido. Fale com seu professor pra pegar um novo.
        </p>
      </div>
    );
  }

  const upcoming = lessons.filter((l) => !['Compareceu', 'Faltou', 'Cancelada'].includes(l.status));
  const past = lessons.filter((l) => ['Compareceu', 'Faltou', 'Cancelada'].includes(l.status));

  return (
    <div className="max-w-lg mx-auto space-y-6 p-4 animate-fade-in">
      <div className="text-center pt-4">
        <h1 className="text-2xl font-bold font-display">Olá, {student.nome.split(' ')[0]}! 🏄</h1>
        <p className="text-muted-foreground">
          {student.plano} — {student.aulas_restantes} aula{student.aulas_restantes === 1 ? '' : 's'} restante
          {student.aulas_restantes === 1 ? '' : 's'}
        </p>
      </div>

      <Button variant="outline" className="w-full" onClick={handleAtivarNotificacoes}>
        <Bell className="h-4 w-4" />
        Ativar notificações
      </Button>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold font-display flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Próximas aulas
        </h2>

        {isLoadingLessons && <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />}

        {!isLoadingLessons && upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma aula agendada.</p>
        )}

        {upcoming.map((lesson) => {
          const config = statusConfig[lesson.status] ?? { variant: 'default' as const, label: lesson.status };
          return (
            <Card key={lesson.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {format(new Date(`${lesson.data}T00:00:00`), 'dd/MM/yyyy')} às {lesson.hora}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Waves className="h-3.5 w-3.5" /> {lessonTypeLabel(lesson.tipo)}
                    </p>
                  </div>
                  <Badge variant={config.variant}>{config.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {lesson.local}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> {lesson.instrutor}
                </p>

                {lesson.status === 'Agendada' && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button
                      size="sm"
                      variant="success"
                      disabled={confirmMutation.isPending}
                      onClick={() => confirmMutation.mutate(lesson.id)}
                    >
                      <Check className="h-4 w-4" /> Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={cancelMutation.isPending}
                      onClick={() => cancelMutation.mutate(lesson.id)}
                    >
                      <X className="h-4 w-4" /> Cancelar
                    </Button>
                  </div>
                )}

                {lesson.status === 'Confirmada' && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={cancelMutation.isPending}
                      onClick={() => cancelMutation.mutate(lesson.id)}
                    >
                      <X className="h-4 w-4" /> Cancelar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold font-display">Histórico</h2>
          {past.map((lesson) => {
            const config = statusConfig[lesson.status] ?? { variant: 'default' as const, label: lesson.status };
            return (
              <Card key={lesson.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(`${lesson.data}T00:00:00`), 'dd/MM/yyyy')} às {lesson.hora}
                    </p>
                    <p className="text-xs text-muted-foreground">{lessonTypeLabel(lesson.tipo)}</p>
                  </div>
                  <Badge variant={config.variant}>{config.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Portal;
