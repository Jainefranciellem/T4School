import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings } from '@/lib/settings.service';
import { listBlockedDates, createBlockedDate, deleteBlockedDate } from '@/lib/blocked-dates.service';
import { AppSettings } from '@/types';
import { WEEKDAYS, DEFAULT_WEEKLY_SCHEDULE, lessonTypeLabel } from '@/lib/constants';
import { format } from 'date-fns';
import { pedirPermissaoNotificacaoPush } from '@/lib/firebase';
import { salvarDispositivoProfessor } from '@/lib/professor.service';
import {
  MessageCircle,
  Mail,
  Bell,
  Clock,
  Save,
  Loader2,
  ExternalLink,
  MapPin,
  User,
  Plus,
  X,
  CalendarClock,
  CalendarOff,
  Smartphone,
} from 'lucide-react';

const Settings: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  const [form, setForm] = useState<AppSettings | null>(null);
  const [newLocation, setNewLocation] = useState('');
  const [newTimeInputs, setNewTimeInputs] = useState<Record<string, string>>({});
  const [newBlockedDate, setNewBlockedDate] = useState<Date | undefined>();
  const [newBlockedMotivo, setNewBlockedMotivo] = useState('');
  const [activatingPush, setActivatingPush] = useState(false);

  const handleActivatePush = async () => {
    setActivatingPush(true);
    try {
      const token = await pedirPermissaoNotificacaoPush();
      if (!token) {
        toast({
          title: 'Permissão não concedida',
          description: 'Permita notificações no navegador/celular pra receber os avisos aqui.',
          variant: 'destructive',
        });
        return;
      }
      await salvarDispositivoProfessor(token);
      toast({
        title: 'Notificações ativadas!',
        description: 'Esse aparelho vai receber os avisos do sistema a partir de agora.',
      });
    } catch (error) {
      toast({
        title: 'Não foi possível ativar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setActivatingPush(false);
    }
  };

  const { data: blockedDates = [] } = useQuery({
    queryKey: ['blocked-dates'],
    queryFn: listBlockedDates,
  });

  const createBlockedDateMutation = useMutation({
    mutationFn: createBlockedDate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-dates'] });
      toast({
        title: 'Dia fechado',
        description: 'Alunos não vão conseguir agendar aula nessa data pelo portal.',
      });
      setNewBlockedDate(undefined);
      setNewBlockedMotivo('');
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível fechar essa data.',
        variant: 'destructive',
      });
    },
  });

  const deleteBlockedDateMutation = useMutation({
    mutationFn: deleteBlockedDate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-dates'] });
      toast({ title: 'Dia reaberto', description: 'Alunos já podem agendar aula nessa data de novo.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível reabrir essa data.', variant: 'destructive' });
    },
  });

  const handleBlockDate = () => {
    if (!newBlockedDate) return;
    createBlockedDateMutation.mutate({
      data: format(newBlockedDate, 'yyyy-MM-dd'),
      motivo: newBlockedMotivo.trim() || undefined,
    });
  };

  const handleAddTime = (tipo: 'Surf' | 'SurfSkate', weekday: string) => {
    const inputKey = `${tipo}-${weekday}`;
    const value = (newTimeInputs[inputKey] || '').trim();
    if (!/^\d{2}:\d{2}$/.test(value)) {
      toast({
        title: 'Horário inválido',
        description: 'Use o formato HH:mm, por exemplo 07:30.',
        variant: 'destructive',
      });
      return;
    }
    setForm((prev) => {
      if (!prev) return prev;
      const schedule = prev.weekly_schedule ?? {};
      const tipoSchedule = schedule[tipo] ?? {};
      const dayTimes = tipoSchedule[weekday] ?? [];
      if (dayTimes.includes(value)) return prev;
      return {
        ...prev,
        weekly_schedule: {
          ...schedule,
          [tipo]: { ...tipoSchedule, [weekday]: [...dayTimes, value].sort() },
        },
      };
    });
    setNewTimeInputs((prev) => ({ ...prev, [inputKey]: '' }));
  };

  const handleRemoveTime = (tipo: 'Surf' | 'SurfSkate', weekday: string, time: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const schedule = prev.weekly_schedule ?? {};
      const tipoSchedule = schedule[tipo] ?? {};
      return {
        ...prev,
        weekly_schedule: {
          ...schedule,
          [tipo]: { ...tipoSchedule, [weekday]: (tipoSchedule[weekday] ?? []).filter((t) => t !== time) },
        },
      };
    });
  };

  const handleAddLocation = () => {
    const value = newLocation.trim();
    if (!value) return;
    setForm((prev) => {
      if (!prev || prev.locations.includes(value)) return prev;
      return { ...prev, locations: [...prev.locations, value] };
    });
    setNewLocation('');
  };

  const handleRemoveLocation = (location: string) => {
    setForm((prev) => prev && { ...prev, locations: prev.locations.filter((l) => l !== location) });
  };

  useEffect(() => {
    if (settings) {
      setForm({
        ...settings,
        // Pré-preenche com a grade real atual em vez de deixar em branco —
        // salvar do zero um formulário vazio fecharia a escola inteira.
        weekly_schedule: settings.weekly_schedule ?? DEFAULT_WEEKLY_SCHEDULE,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<AppSettings>) => updateSettings(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['settings'], updated);
      toast({
        title: 'Configurações salvas!',
        description: 'Suas alterações foram aplicadas com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    if (!form) return;
    const { id, ...data } = form;
    saveMutation.mutate(data);
  };

  if (isLoading || !form) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-display text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Configure integrações e preferências do sistema
        </p>
      </div>

      {/* Integration settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            WhatsApp
          </CardTitle>
          <CardDescription>
            Credenciais do WhatsApp Business Cloud API usadas para enviar lembretes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp Phone ID</Label>
              <Input
                id="phone"
                placeholder="1234567890"
                value={form.whatsapp_phone_id ?? ''}
                onChange={(e) =>
                  setForm((prev) => prev && { ...prev, whatsapp_phone_id: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">WhatsApp Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="••••••••••••"
                value={form.whatsapp_token ?? ''}
                onChange={(e) =>
                  setForm((prev) => prev && { ...prev, whatsapp_token: e.target.value })
                }
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Credenciais do WhatsApp Business Cloud API{' '}
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Documentação <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </CardContent>
      </Card>

      {/* Email settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Email
          </CardTitle>
          <CardDescription>
            Alternativa ou complemento ao WhatsApp — envia o mesmo lembrete por email via Resend
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resend-key">Resend API Key</Label>
              <Input
                id="resend-key"
                type="password"
                placeholder="re_••••••••••••"
                value={form.resend_api_key ?? ''}
                onChange={(e) =>
                  setForm((prev) => prev && { ...prev, resend_api_key: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-from">Remetente</Label>
              <Input
                id="email-from"
                placeholder="aulas@seudominio.com"
                value={form.email_from ?? ''}
                onChange={(e) =>
                  setForm((prev) => prev && { ...prev, email_from: e.target.value })
                }
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Crie uma conta gratuita em{' '}
            <a
              href="https://resend.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              resend.com <ExternalLink className="h-3 w-3" />
            </a>{' '}
            para gerar a API Key. Sem verificar domínio próprio, use{' '}
            <code className="text-foreground">onboarding@resend.dev</code> como remetente.
          </p>
        </CardContent>
      </Card>

      {/* Notification settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notificações
          </CardTitle>
          <CardDescription>
            Configure quando e como os lembretes são enviados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reminders">Enviar lembretes automáticos</Label>
              <p className="text-sm text-muted-foreground">
                Enviar lembretes por WhatsApp antes das aulas
              </p>
            </div>
            <Switch
              id="reminders"
              checked={form.send_reminders}
              onCheckedChange={(checked) =>
                setForm((prev) => prev && { ...prev, send_reminders: checked })
              }
            />
          </div>

          {form.send_reminders && (
            <>
              <div className="space-y-2">
                <Label htmlFor="hours" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Horas antes da aula (primeiro lembrete)
                </Label>
                <Input
                  id="hours"
                  type="number"
                  min="1"
                  max="72"
                  value={form.reminder_hours}
                  onChange={(e) =>
                    setForm((prev) =>
                      prev && { ...prev, reminder_hours: parseInt(e.target.value) || 24 }
                    )
                  }
                  className="w-32"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="double">Duplo lembrete</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar um segundo lembrete mais próximo da aula
                  </p>
                </div>
                <Switch
                  id="double"
                  checked={form.double_reminder}
                  onCheckedChange={(checked) =>
                    setForm((prev) => prev && { ...prev, double_reminder: checked })
                  }
                />
              </div>

              {form.double_reminder && (
                <div className="space-y-2">
                  <Label htmlFor="minutes2">Minutos antes (segundo lembrete)</Label>
                  <Input
                    id="minutes2"
                    type="number"
                    min="1"
                    max="180"
                    value={form.double_reminder_minutes}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev && { ...prev, double_reminder_minutes: parseInt(e.target.value) || 15 }
                      )
                    }
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nesse momento o aluno recebe outro WhatsApp e o professor recebe uma notificação push.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Push notifications for this device */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Notificações neste aparelho
          </CardTitle>
          <CardDescription>
            Como o login é compartilhado, cada pessoa precisa ativar as notificações no próprio
            celular/navegador. Se você parou de receber avisos, troque de aparelho, ou nunca ativou,
            clique abaixo neste dispositivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={handleActivatePush} disabled={activatingPush}>
            {activatingPush ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Ativando...
              </>
            ) : (
              <>
                <Smartphone className="h-4 w-4" />
                Ativar notificações neste aparelho
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Instructor and locations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Instrutor e Locais
          </CardTitle>
          <CardDescription>
            Usados na agenda e no auto-agendamento do aluno pelo portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="instructor-name">Instrutor</Label>
            <Input
              id="instructor-name"
              value={form.instructor_name}
              onChange={(e) =>
                setForm((prev) => prev && { ...prev, instructor_name: e.target.value })
              }
              className="max-w-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Locais das aulas
            </Label>
            <div className="flex flex-wrap gap-2">
              {form.locations.map((location) => (
                <span
                  key={location}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
                >
                  {location}
                  <button
                    type="button"
                    onClick={() => handleRemoveLocation(location)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Remover local"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {form.locations.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum local cadastrado</p>
              )}
            </div>
            <div className="flex gap-2 max-w-sm">
              <Input
                placeholder="Novo local"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLocation();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddLocation}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Minha Agenda
          </CardTitle>
          <CardDescription>
            Defina os dias e horários em que você dá aula. Alunos só conseguem agendar pelo portal
            dentro dessa grade — o que você tirar daqui deixa de aparecer pra eles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {(['Surf', 'SurfSkate'] as const).map((tipo) => (
            <div key={tipo} className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground mb-2">{lessonTypeLabel(tipo)}</h4>
              {WEEKDAYS.map((day) => {
                const times = form.weekly_schedule?.[tipo]?.[day.value] ?? [];
                const inputKey = `${tipo}-${day.value}`;
                return (
                  <div
                    key={day.value}
                    className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 border-b border-border py-3 last:border-0"
                  >
                    <span className="w-24 shrink-0 text-sm font-medium text-foreground pt-1.5">
                      {day.label}
                    </span>
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {times.map((time) => (
                          <span
                            key={time}
                            className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
                          >
                            {time}
                            <button
                              type="button"
                              onClick={() => handleRemoveTime(tipo, day.value, time)}
                              className="text-muted-foreground hover:text-destructive"
                              title="Remover horário"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        {times.length === 0 && (
                          <p className="text-sm text-muted-foreground">Sem aula nesse dia</p>
                        )}
                      </div>
                      <div className="flex gap-2 max-w-[180px]">
                        <Input
                          placeholder="HH:mm"
                          value={newTimeInputs[inputKey] ?? ''}
                          onChange={(e) =>
                            setNewTimeInputs((prev) => ({ ...prev, [inputKey]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTime(tipo, day.value);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleAddTime(tipo, day.value)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Blocked dates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5 text-primary" />
            Dias Fechados
          </CardTitle>
          <CardDescription>
            Bloqueie datas específicas — feriado, viagem, imprevisto. Alunos não conseguem agendar
            aula nelas pelo portal, mesmo que o horário esteja livre na grade semanal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Calendar
              mode="single"
              selected={newBlockedDate}
              onSelect={setNewBlockedDate}
              disabled={{ before: new Date() }}
              className="rounded-md border w-fit"
            />
            <div className="flex-1 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="blocked-motivo">Motivo (opcional)</Label>
                <Input
                  id="blocked-motivo"
                  placeholder="Ex: feriado, viagem..."
                  value={newBlockedMotivo}
                  onChange={(e) => setNewBlockedMotivo(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Button
                type="button"
                onClick={handleBlockDate}
                disabled={!newBlockedDate || createBlockedDateMutation.isPending}
              >
                {createBlockedDateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Fechando...
                  </>
                ) : (
                  <>
                    <CalendarOff className="h-4 w-4" />
                    Fechar esse dia
                  </>
                )}
              </Button>

              <div className="space-y-2 pt-2">
                <Label>Datas fechadas</Label>
                <div className="flex flex-wrap gap-2">
                  {blockedDates.map((bd) => (
                    <span
                      key={bd.id}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
                    >
                      {format(new Date(`${bd.data}T00:00:00`), 'dd/MM/yyyy')}
                      {bd.motivo && <span className="text-muted-foreground">— {bd.motivo}</span>}
                      <button
                        type="button"
                        onClick={() => deleteBlockedDateMutation.mutate(bd.id)}
                        className="text-muted-foreground hover:text-destructive"
                        title="Reabrir esse dia"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {blockedDates.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum dia fechado</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Templates de Mensagem
          </CardTitle>
          <CardDescription>
            Personalize as mensagens enviadas por WhatsApp. Use {'{{variável}}'} para dados dinâmicos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="reminder-template">Lembrete de aula</Label>
            <Textarea
              id="reminder-template"
              rows={4}
              value={form.template_reminder}
              onChange={(e) =>
                setForm((prev) => prev && { ...prev, template_reminder: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Variáveis: {'{{nome}}'}, {'{{hora}}'}, {'{{local}}'}, {'{{instrutor}}'}, {'{{data}}'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmed-template">Confirmação de presença</Label>
            <Textarea
              id="confirmed-template"
              rows={2}
              value={form.template_confirmed}
              onChange={(e) =>
                setForm((prev) => prev && { ...prev, template_confirmed: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancelled-template">Ausência informada</Label>
            <Textarea
              id="cancelled-template"
              rows={2}
              value={form.template_cancelled}
              onChange={(e) =>
                setForm((prev) => prev && { ...prev, template_cancelled: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rescheduled-template">Aula remarcada</Label>
            <Textarea
              id="rescheduled-template"
              rows={2}
              value={form.template_rescheduled}
              onChange={(e) =>
                setForm((prev) => prev && { ...prev, template_rescheduled: e.target.value })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending} size="lg">
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
