import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StudentAlert } from '@/types';

interface Props {
  alert?: StudentAlert;
  className?: string;
}

export const StudentAlertBadges: React.FC<Props> = ({ alert, className }) => {
  if (!alert || (!alert.poucas_aulas && !alert.sem_aula)) return null;

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {alert.poucas_aulas && (
        <Badge variant="outline" className="border-transparent bg-amber-100 text-amber-700">
          {alert.restam === 1 ? 'Última aula' : `Restam ${alert.restam} aulas`}
        </Badge>
      )}
      {alert.sem_aula && (
        <Badge variant="outline" className="border-transparent bg-orange-100 text-orange-700">
          {alert.dias_sem_aula}d sem aula
        </Badge>
      )}
    </div>
  );
};
