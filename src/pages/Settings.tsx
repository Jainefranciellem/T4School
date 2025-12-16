import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Settings as SettingsIcon,
  Link,
  MessageCircle,
  Bell,
  Clock,
  Save,
  Loader2,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

const Settings: React.FC = () => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [integrations, setIntegrations] = useState({
    baserowApiUrl: '',
    n8nWebhookBase: '',
    whatsappPhoneId: '',
    whatsappToken: '',
  });

  const [notifications, setNotifications] = useState({
    sendReminders: true,
    reminderHours: 24,
    doubleReminder: true,
    doubleReminderHours: 1,
  });

  const [templates, setTemplates] = useState({
    reminder: `🏄‍♀️ Olá {{nome}}! Lembrete: sua aula de surf é hoje às {{hora}} no {{local}} com {{instrutor}}.
Responda 1 para confirmar ou 2 para informar que não irá.`,
    confirmed: '✅ Presença confirmada! Te esperamos na aula de hoje.',
    cancelled: 'Tudo bem — registramos sua ausência. Entre em contato para remarcar.',
  });

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // In production, this would save to the backend
    localStorage.setItem('T4School_settings', JSON.stringify({
      integrations,
      notifications,
      templates,
    }));

    toast({
      title: 'Configurações salvas!',
      description: 'Suas alterações foram aplicadas com sucesso.',
    });
    setIsSaving(false);
  };

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
            <Link className="h-5 w-5 text-primary" />
            Integrações
          </CardTitle>
          <CardDescription>
            Configure as URLs e tokens para conectar com Baserow, n8n e WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Modo de demonstração</p>
              <p className="text-muted-foreground">
                As integrações estão usando dados simulados. Configure as variáveis abaixo para
                conectar aos serviços reais.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baserow">Baserow API URL</Label>
              <Input
                id="baserow"
                placeholder="https://api.baserow.io/api/"
                value={integrations.baserowApiUrl}
                onChange={(e) =>
                  setIntegrations((prev) => ({ ...prev, baserowApiUrl: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                URL base da API do Baserow para armazenar dados
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="n8n">n8n Webhook Base URL</Label>
              <Input
                id="n8n"
                placeholder="https://n8n.example.com/webhook/"
                value={integrations.n8nWebhookBase}
                onChange={(e) =>
                  setIntegrations((prev) => ({ ...prev, n8nWebhookBase: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                URL base dos webhooks do n8n para automações
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp Phone ID</Label>
                <Input
                  id="phone"
                  placeholder="1234567890"
                  value={integrations.whatsappPhoneId}
                  onChange={(e) =>
                    setIntegrations((prev) => ({ ...prev, whatsappPhoneId: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token">WhatsApp Token</Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="••••••••••••"
                  value={integrations.whatsappToken}
                  onChange={(e) =>
                    setIntegrations((prev) => ({ ...prev, whatsappToken: e.target.value }))
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
          </div>
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
              checked={notifications.sendReminders}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, sendReminders: checked }))
              }
            />
          </div>

          {notifications.sendReminders && (
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
                  value={notifications.reminderHours}
                  onChange={(e) =>
                    setNotifications((prev) => ({
                      ...prev,
                      reminderHours: parseInt(e.target.value) || 24,
                    }))
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
                  checked={notifications.doubleReminder}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, doubleReminder: checked }))
                  }
                />
              </div>

              {notifications.doubleReminder && (
                <div className="space-y-2">
                  <Label htmlFor="hours2">Horas antes (segundo lembrete)</Label>
                  <Input
                    id="hours2"
                    type="number"
                    min="1"
                    max="24"
                    value={notifications.doubleReminderHours}
                    onChange={(e) =>
                      setNotifications((prev) => ({
                        ...prev,
                        doubleReminderHours: parseInt(e.target.value) || 1,
                      }))
                    }
                    className="w-32"
                  />
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
              value={templates.reminder}
              onChange={(e) =>
                setTemplates((prev) => ({ ...prev, reminder: e.target.value }))
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
              value={templates.confirmed}
              onChange={(e) =>
                setTemplates((prev) => ({ ...prev, confirmed: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancelled-template">Ausência informada</Label>
            <Textarea
              id="cancelled-template"
              rows={2}
              value={templates.cancelled}
              onChange={(e) =>
                setTemplates((prev) => ({ ...prev, cancelled: e.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? (
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
