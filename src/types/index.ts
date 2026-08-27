export interface Student {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  plano: string;
  aulas_restantes?: number;
  status: 'Ativo' | 'Inativo';
  avatar?: string;
}

export interface Lesson {
  id: string;
  aluno_id: string;
  data: string;
  hora: string;
  local: string;
  instrutor: string;
  tipo?: 'Surf' | 'SurfSkate';
  status: 'Agendada' | 'Confirmada' | 'Compareceu' | 'Faltou' | 'Cancelada';
  observacoes?: string;
  notificacao_enviada?: boolean;
  enviar_notificacao?: boolean;
  aulas_restantes?: number;
}

// Renomeado para Aula opcionalmente, mas mantendo a equivalência
export interface Aula extends Lesson {}

export interface Plan {
  id: string;
  nome: string;
  qtd_aulas: number;
  validade_dias: number;
  preco: number;
}

export interface AppSettings {
  id: string;
  whatsapp_phone_id?: string | null;
  whatsapp_token?: string | null;
  resend_api_key?: string | null;
  email_from?: string | null;
  send_reminders: boolean;
  reminder_hours: number;
  double_reminder: boolean;
  double_reminder_minutes: number;
  template_reminder: string;
  template_confirmed: string;
  template_cancelled: string;
}
