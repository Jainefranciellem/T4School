import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  getPortalStudent,
  getPortalLessons,
  confirmPortalLesson,
  cancelPortalLesson,
  registerPortalDeviceToken,
  getPortalAvailableSlots,
  createPortalLesson,
} from '@/lib/portal.service';
import { pedirPermissaoNotificacaoPush } from '@/lib/firebase';
import { lessonTypeLabel, lessonTypes, locations } from '@/lib/constants';
import { Loader2, Waves, MapPin, User, Bell, Check, X, Calendar, CalendarPlus } from 'lucide-react';
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

  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingTipo, setBookingTipo] = useState<'Surf' | 'SurfSkate'>('Surf');
  const [bookingData, setBookingData] = useState('');
  const [bookingHora, setBookingHora] = useState('');
  const [bookingLocal, setBookingLocal] = useState(locations[0]);

  // O manifest.json tem start_url "/" (a tela de login do professor). No
  // iOS, "Adicionar à Tela de Início" usa o start_url do manifest em vez
  // da URL atual quando existe um <link rel="manifest">, então o ícone do
  // aluno abriria sempre no login. Removendo o link aqui, o iOS cai no
  // comportamento antigo e usa a URL da própria página do portal.
  useEffect(() => {
    document.querySelector('link[rel="manifest"]')?.remove();
  }, []);

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

  const { data: availableSlots, isLoading: isLoadingSlots } = useQuery({
    queryKey: ['portal-available-slots', token, bookingTipo, bookingData],
    queryFn: () => getPortalAvailableSlots(token!, bookingTipo, bookingData),
    enabled: !!token && showBookingForm && !!bookingData,
  });

  const bookingMutation = useMutation({
    mutationFn: () =>
      createPortalLesson(token!, {
        tipo: bookingTipo,
        data: bookingData,
        hora: bookingHora,
        local: bookingLocal,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-lessons', token] });
      queryClient.invalidateQueries({ queryKey: ['portal-student', token] });
      queryClient.invalidateQueries({ queryKey: ['portal-available-slots', token] });
      toast({ title: 'Aula agendada!' });
      setShowBookingForm(false);
      setBookingData('');
      setBookingHora('');
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao agendar', description: error.message, variant: 'destructive' });
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
    } catch (error) {
      toast({
        title: 'Erro ao ativar notificações',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
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

      <Card>
        <CardContent className="p-4 space-y-3">
          {!showBookingForm ? (
            <Button
              className="w-full"
              disabled={student.aulas_restantes <= 0}
              onClick={() => setShowBookingForm(true)}
            >
              <CalendarPlus className="h-4 w-4" />
              Agendar aula
            </Button>
          ) : (
            <>
              <h2 className="text-lg font-semibold font-display flex items-center gap-2">
                <CalendarPlus className="h-5 w-5 text-primary" />
                Agendar aula
              </h2>

              <div className="space-y-2">
                <Label htmlFor="booking-tipo" className="flex items-center gap-2">
                  <Waves className="h-4 w-4" /> Tipo de atividade
                </Label>
                <Select
                  value={bookingTipo}
                  onValueChange={(value: 'Surf' | 'SurfSkate') => {
                    setBookingTipo(value);
                    setBookingHora('');
                  }}
                >
                  <SelectTrigger id="booking-tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {lessonTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking-data" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Data
                </Label>
                <Input
                  id="booking-data"
                  type="date"
                  min={format(new Date(), 'yyyy-MM-dd')}
                  value={bookingData}
                  onChange={(e) => {
                    setBookingData(e.target.value);
                    setBookingHora('');
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking-hora">Horário</Label>
                <Select
                  value={bookingHora}
                  onValueChange={setBookingHora}
                  disabled={!bookingData || isLoadingSlots || (availableSlots?.horarios.length ?? 0) === 0}
                >
                  <SelectTrigger id="booking-hora">
                    <SelectValue
                      placeholder={
                        !bookingData
                          ? 'Selecione a data'
                          : isLoadingSlots
                          ? 'Carregando horários...'
                          : (availableSlots?.horarios.length ?? 0) === 0
                          ? 'Sem horários disponíveis nesse dia'
                          : 'Selecione o horário'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSlots?.horarios.map((hora) => (
                      <SelectItem key={hora} value={hora}>
                        {hora}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking-local" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Local
                </Label>
                <Select value={bookingLocal} onValueChange={setBookingLocal}>
                  <SelectTrigger id="booking-local">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowBookingForm(false)}
                  disabled={bookingMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  disabled={!bookingData || !bookingHora || bookingMutation.isPending}
                  onClick={() => bookingMutation.mutate()}
                >
                  {bookingMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Confirmar agendamento'
                  )}
                </Button>
              </div>
            </>
          )}

          {student.aulas_restantes <= 0 && !showBookingForm && (
            <p className="text-xs text-muted-foreground text-center">
              Você não tem aulas disponíveis no seu plano. Fale com seu professor.
            </p>
          )}
        </CardContent>
      </Card>

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
