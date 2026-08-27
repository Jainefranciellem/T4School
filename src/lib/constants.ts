export const instructors = ['Torquato'];

export const locations = [
  'Cinelandia',
  'Bomba',
  'Cara de Sapo',
  'Sementeira',
];

export const lessonTypes = [
  { value: 'Surf' as const, label: 'Aula de Surf' },
  { value: 'SurfSkate' as const, label: 'Surf Skate' },
];

export function lessonTypeLabel(tipo?: string): string {
  return lessonTypes.find((t) => t.value === tipo)?.label ?? 'Aula de Surf';
}

// Grade real de horários (weekday: 0=Domingo ... 6=Sábado, igual Date.getDay()).
// Dias sem entrada = sem aula/treino nesse dia.
const SURF_SCHEDULE: Record<number, string[]> = {
  0: ['06:00', '07:30', '09:00', '10:30'], // Domingo
  2: ['06:00', '07:30', '15:00'], // Terça
  3: ['06:00', '07:30', '15:00'], // Quarta
  4: ['06:00', '07:30', '15:00'], // Quinta
  5: ['06:00', '07:30', '09:00', '10:30'], // Sexta
};

const SURF_SKATE_SCHEDULE: Record<number, string[]> = {
  2: ['19:00', '20:00'], // Terça
  3: ['19:00', '20:00'], // Quarta
  4: ['19:00', '20:00'], // Quinta
};

export function getAvailableTimes(tipo: string, dateStr: string): string[] {
  if (!dateStr) return [];
  const weekday = new Date(`${dateStr}T00:00:00`).getDay();
  const schedule = tipo === 'SurfSkate' ? SURF_SKATE_SCHEDULE : SURF_SCHEDULE;
  return schedule[weekday] ?? [];
}
