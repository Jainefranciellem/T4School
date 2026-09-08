// Espelha src/lib/constants.ts do frontend — precisa existir aqui também
// porque o backend é quem valida de verdade se um horário de auto-agendamento
// é legítimo (o frontend só usa isso pra popular o select, não é confiável
// como única fonte de validação).

export const DEFAULT_INSTRUCTOR = 'Torquato';
export const DEFAULT_LOCATIONS = ['Cinelandia', 'Bomba', 'Cara de Sapo', 'Sementeira'];

// weekday como string ('0'..'6', igual Date.getDay()) -> lista de horários
// naquele dia. Dia sem entrada = sem aula/treino nesse dia.
export type WeeklyScheduleByType = Record<string, string[]>;
export type WeeklySchedule = Partial<Record<'Surf' | 'SurfSkate', WeeklyScheduleByType>>;

// Grade usada enquanto o instrutor nunca customizou a própria agenda em
// Configurações (Settings.weekly_schedule ainda null).
export const DEFAULT_WEEKLY_SCHEDULE: Required<WeeklySchedule> = {
  Surf: {
    '0': ['06:00', '07:30', '09:00', '10:30'], // Domingo
    '2': ['06:00', '07:30', '15:00'], // Terça
    '3': ['06:00', '07:30', '15:00'], // Quarta
    '4': ['06:00', '07:30', '15:00'], // Quinta
    '5': ['06:00', '07:30', '09:00', '10:30'], // Sexta
  },
  SurfSkate: {
    '2': ['19:00', '20:00'], // Terça
    '3': ['19:00', '20:00'], // Quarta
    '4': ['19:00', '20:00'], // Quinta
  },
};

export function getScheduledTimes(
  tipo: string,
  dateStr: string,
  weeklySchedule?: WeeklySchedule | null
): string[] {
  const weekday = new Date(`${dateStr}T00:00:00`).getDay();
  const key = tipo === 'SurfSkate' ? 'SurfSkate' : 'Surf';
  const schedule = weeklySchedule?.[key] ?? DEFAULT_WEEKLY_SCHEDULE[key];
  return schedule[String(weekday)] ?? [];
}

export function minutesUntilLesson(data: string, hora: string, now: Date = new Date()): number {
  const lessonDateTime = new Date(`${data}T${hora}:00`);
  return (lessonDateTime.getTime() - now.getTime()) / (1000 * 60);
}
