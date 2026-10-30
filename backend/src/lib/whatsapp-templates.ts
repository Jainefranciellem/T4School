import { formatDateBR } from './format.js';

export interface WhatsAppTemplateMessage {
  template: string;
  params: string[];
}

interface LessonVars {
  nome: string;
  data: string;
  hora: string;
  local: string;
  instrutor: string;
}

// Nomes e ordem dos parâmetros precisam bater com os templates criados no
// WhatsApp Manager (textos em docs/whatsapp-templates.md). Mudar aqui exige
// mudar lá, e vice-versa.
export const whatsappTemplates = {
  reminder: (v: LessonVars): WhatsAppTemplateMessage => ({
    template: 'lembrete_aula',
    params: [v.nome, formatDateBR(v.data), v.hora, v.local, v.instrutor],
  }),
  confirmed: (v: LessonVars): WhatsAppTemplateMessage => ({
    template: 'aula_confirmada',
    params: [v.nome, formatDateBR(v.data), v.hora],
  }),
  cancelled: (v: LessonVars): WhatsAppTemplateMessage => ({
    template: 'aula_cancelada',
    params: [v.nome, formatDateBR(v.data), v.hora],
  }),
  rescheduled: (v: LessonVars): WhatsAppTemplateMessage => ({
    template: 'aula_remarcada',
    params: [v.nome, formatDateBR(v.data), v.hora, v.local, v.instrutor],
  }),
};
