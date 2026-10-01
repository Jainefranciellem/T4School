import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatBRL = (value: number) => brl.format(value);

export function currentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

export function shiftMonth(mes: string, delta: number): string {
  const [y, m] = mes.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

export function monthLabel(mes: string, style: 'long' | 'short' = 'long'): string {
  const [y, m] = mes.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  const label =
    style === 'long' ? format(date, "MMMM 'de' yyyy", { locale: ptBR }) : format(date, 'MMM/yy', { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDateBR(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}
