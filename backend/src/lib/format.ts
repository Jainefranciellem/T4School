export function formatDateBR(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function lessonTypeLabel(tipo: string): string {
  return tipo === 'SurfSkate' ? 'Surf Skate' : 'Aula de Surf';
}
