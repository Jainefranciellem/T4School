import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings } from '@/lib/settings.service';
import { AppSettings } from '@/types';
import {
  MessageCircle,
  Mail,
  Bell,
  Clock,
  Save,
  Loader2,
  ExternalLink,
} from 'lucide-react';

const Settings: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  const [form, setForm] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (settings) setForm(settings);
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
