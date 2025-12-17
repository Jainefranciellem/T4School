import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lesson, getStudentById } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Clock, MapPin, User, Check, X, RotateCcw, MessageCircle } from 'lucide-react';

interface LessonCardProps {
  lesson: Lesson;
  onEdit?: (lesson: Lesson) => void;
  onConfirm?: (lesson: Lesson) => void;
  onCancel?: (lesson: Lesson) => void;
  onReschedule?: (lesson: Lesson) => void;
  compact?: boolean;
}

const statusConfig = {
  Agendada: { variant: 'scheduled' as const, label: 'Agendada' },
  Confirmada: { variant: 'confirmed' as const, label: 'Confirmada' },
  Compareceu: { variant: 'attended' as const, label: 'Compareceu' },
  Faltou: { variant: 'missed' as const, label: 'Faltou' },
  Cancelada: { variant: 'cancelled' as const, label: 'Cancelada' },
};

export const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  onEdit,
  onConfirm,
  onCancel,
  onReschedule,
  compact = false,
}) => {
  const student = getStudentById(lesson.aluno_id);
  const config = statusConfig[lesson.status] || { variant: 'default' as const, label: lesson.status };

  const isPast = new Date(lesson.data) < new Date(new Date().toDateString());
  const canModify = !['Compareceu', 'Faltou', 'Cancelada'].includes(lesson.status);

  if (compact) {
    return (
      <div
        className={cn(
          'p-3 rounded-lg border bg-card hover:shadow-md transition-all duration-200 cursor-pointer',
          lesson.status === 'Confirmada' && 'border-l-4 border-l-success',
          lesson.status === 'Agendada' && 'border-l-4 border-l-secondary'
        )}
        onClick={() => onEdit?.(lesson)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-primary">{lesson.hora}</span>
            <span className="text-sm text-foreground truncate">
              {student?.nome || 'Aluno'}
            </span>
          </div>
          <Badge variant={config.variant} className="text-xs shrink-0">
            {config.label}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
      <CardContent className="p-0">
        <div className="flex">
          {/* Time column */}
          <div className="w-20 flex-shrink-0 gradient-ocean p-4 flex flex-col items-center justify-center text-primary-foreground">
            <span className="text-2xl font-bold font-display">{lesson.hora.split(':')[0]}</span>
            <span className="text-sm opacity-80">:{lesson.hora.split(':')[1]}</span>
          </div>

          {/* Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <h4 className="font-semibold text-foreground">
                  {student?.nome || 'Aluno não encontrado'}
                </h4>
                <p className="text-sm text-muted-foreground">{student?.plano}</p>
              </div>
              <Badge variant={config.variant}>{config.label}</Badge>
            </div>

            <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{lesson.local}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>Instrutor: {lesson.instrutor}</span>
              </div>
              {lesson.notificacao_enviada && (
                <div className="flex items-center gap-2 text-success">
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp enviado</span>
                </div>
              )}
            </div>

            {lesson.observacoes && (
              <p className="text-sm text-muted-foreground bg-muted p-2 rounded-md mb-3">
                {lesson.observacoes}
              </p>
            )}

            {canModify && !isPast && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                {lesson.status === 'Agendada' && (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => onConfirm?.(lesson)}
                  >
                    <Check className="w-4 h-4" />
                    Confirmar
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReschedule?.(lesson)}
                >
                  <RotateCcw className="w-4 h-4" />
                  Remarcar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onCancel?.(lesson)}
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
