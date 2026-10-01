import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeltaBadgeProps {
  pct: number | null;
  // true quando subir é ruim (despesas, cancelamentos)
  inverse?: boolean;
  label?: string;
}

export const DeltaBadge: React.FC<DeltaBadgeProps> = ({ pct, inverse = false, label = 'vs mês anterior' }) => {
  if (pct === null) {
    return <span className="text-xs text-muted-foreground">sem base de comparação</span>;
  }

  if (pct === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" /> estável {label}
      </span>
    );
  }

  const up = pct > 0;
  const good = up !== inverse;
  const Icon = up ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        good ? 'text-emerald-600' : 'text-destructive'
      )}
    >
      <Icon className="h-3 w-3" />
      {up ? '+' : ''}
      {pct.toLocaleString('pt-BR')}% <span className="font-normal text-muted-foreground">{label}</span>
    </span>
  );
};
