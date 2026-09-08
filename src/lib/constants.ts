import { WeeklySchedule } from '@/types';

export const lessonTypes = [
  { value: 'Surf' as const, label: 'Aula de Surf' },
  { value: 'SurfSkate' as const, label: 'Surf Skate' },
];

export function lessonTypeLabel(tipo?: string): string {
  return lessonTypes.find((t) => t.value === tipo)?.label ?? 'Aula de Surf';
}

export const WEEKDAYS = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Segunda' },
  { value: '2', label: 'Terça' },
  { value: '3', label: 'Quarta' },
  { value: '4', label: 'Quinta' },
  { value: '5', label: 'Sexta' },
  { value: '6', label: 'Sábado' },
];

// Grade usada enquanto o instrutor nunca customizou a própria agenda em
// Configurações (weekly_schedule ainda null). weekday: 0=Domingo ...
// 6=Sábado, igual Date.getDay(). Dias sem entrada = sem aula/treino nesse dia.
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

export function getAvailableTimes(
  tipo: string,
  dateStr: string,
  weeklySchedule?: WeeklySchedule | null,
  blockedDates?: Set<string>
): string[] {
  if (!dateStr) return [];
  if (blockedDates?.has(dateStr)) return [];
  const weekday = new Date(`${dateStr}T00:00:00`).getDay();
  const key = tipo === 'SurfSkate' ? 'SurfSkate' : 'Surf';
  const schedule = weeklySchedule?.[key] ?? DEFAULT_WEEKLY_SCHEDULE[key];
  return schedule[String(weekday)] ?? [];
}
