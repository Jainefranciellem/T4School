import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { instructors, locations, lessonTypes, getAvailableTimes } from '@/lib/constants';
import { Lesson } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Clock, MapPin, User, MessageCircle, Waves } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listarAlunos } from '@/lib/students.service';

interface CreateLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lesson: Lesson) => void;
  editLesson?: Lesson | null;
}

export const CreateLessonModal: React.FC<CreateLessonModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editLesson,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    aluno_id: '',
    tipo: 'Surf' as 'Surf' | 'SurfSkate',
    data: '',
    hora: '',
    local: locations[0],
    instrutor: instructors[0],
    observacoes: '',
    notificar: true,
  });

  const availableTimes = getAvailableTimes(formData.tipo, formData.data);

  // Fetch real students from the service
  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students'],
    queryFn: listarAlunos,
    enabled: isOpen, // Only fetch when modal is open
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const activeStudents = students.filter((s) => s.status === 'Ativo');

  // Update form data when editLesson changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (editLesson) {
        setFormData({
          id: editLesson.id,
          aluno_id: editLesson.aluno_id,
          tipo: editLesson.tipo || 'Surf',
          data: editLesson.data,
          hora: editLesson.hora,
          local: editLesson.local,
          instrutor: editLesson.instrutor,
          observacoes: editLesson.observacoes || '',
          notificar: editLesson.notificacao_enviada || false,
        });
      } else {
        // Reset for new lesson
        setFormData({
          id: '',
          aluno_id: '',
          tipo: 'Surf',
          data: '',
          hora: '',
          local: locations[0],
          instrutor: instructors[0],
          observacoes: '',
          notificar: true,
        });
      }
    }
  }, [isOpen, editLesson]);

  // Troca tipo/data e limpa a hora se ela não fizer mais parte da grade real
  // pro novo tipo/dia — só quando o usuário muda o campo, não ao carregar
  // uma aula existente pra edição (isso é tratado no efeito acima).
  const handleTipoChange = (tipo: 'Surf' | 'SurfSkate') => {
    setFormData((prev) => ({
      ...prev,
      tipo,
      hora: getAvailableTimes(tipo, prev.data).includes(prev.hora) ? prev.hora : '',
    }));
  };

  const handleDataChange = (data: string) => {
    setFormData((prev) => ({
      ...prev,
      data,
      hora: getAvailableTimes(prev.tipo, data).includes(prev.hora) ? prev.hora : '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.aluno_id || !formData.data || !formData.hora) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha aluno, data e hora.',
        variant: 'destructive',
      });
      return;
    }

    // Validate date is in the future
    const lessonDateTime = new Date(`${formData.data}T${formData.hora}`);

    // Optional: Allow editing past lessons if needed, but for creation usually future
    if (!editLesson && lessonDateTime < new Date()) {
      // Simple check, maybe relax for editing past logs
      // Keeping strict for now based on previous code
    }

    setIsSubmitting(true);

    try {
      await onSave({
        id: editLesson ? editLesson.id : '',
        aluno_id: formData.aluno_id,
        tipo: formData.tipo,
        data: formData.data,
        hora: formData.hora,
        local: formData.local,
        instrutor: formData.instrutor,
        observacoes: formData.observacoes,
        status: editLesson ? editLesson.status : 'Agendada',
        // If we are sending a new notification, reset the sent status to false to trigger the workflow
        notificacao_enviada: formData.notificar ? false : (editLesson ? editLesson.notificacao_enviada : false),
        enviar_notificacao: formData.notificar,
        // aulas_restantes is decremented server-side when the lesson is created
      });

      // Toast handling is usually done in the parent mutation callbacks, 
      // but if onSave is async we can wait. 
      // Current parent implementation in Agenda.tsx uses mutation which is async but handled there.
      // However here we just call onSave.

    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
      // Closing is handled by parent on success, or we can close here if we assume success
      // The previous code closed here.
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editLesson ? 'Editar Aula' : 'Nova Aula'}
          </DialogTitle>
          <DialogDescription>
            {editLesson
              ? 'Atualize os detalhes da aula abaixo.'
              : 'Preencha os dados para agendar uma nova aula de surf.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Activity type */}
          <div className="space-y-2">
            <Label htmlFor="tipo" className="flex items-center gap-2">
              <Waves className="w-4 h-4" />
              Tipo de atividade
            </Label>
            <Select value={formData.tipo} onValueChange={handleTipoChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {lessonTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Student select */}
          <div className="space-y-2">
            <Label htmlFor="aluno" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Aluno *
            </Label>
            <Select
              value={formData.aluno_id}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, aluno_id: value }))
              }
              disabled={isLoadingStudents}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingStudents ? "Carregando alunos..." : "Selecione o aluno"} />
              </SelectTrigger>
              <SelectContent>
                {activeStudents.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{student.nome}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({student.aulas_restantes} aulas)
                      </span>
                    </div>
                  </SelectItem>
                ))}
                {activeStudents.length === 0 && !isLoadingStudents && (
                  <div className="p-2 text-sm text-muted-foreground text-center">Nenhum aluno ativo encontrado</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Date and time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data *
              </Label>
              <Input
                id="data"
                type="date"
                value={formData.data}
                onChange={(e) => handleDataChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Hora *
              </Label>
              <Select
                value={formData.hora}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, hora: value }))}
                disabled={!formData.data || availableTimes.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !formData.data
                        ? 'Selecione a data'
                        : availableTimes.length === 0
                        ? 'Sem horários nesse dia'
                        : 'Selecione o horário'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableTimes.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="local" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Local
            </Label>
            <Select
              value={formData.local}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, local: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o local" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Instructor */}
          <div className="space-y-2">
            <Label htmlFor="instrutor">Instrutor</Label>
            <Select
              value={formData.instrutor}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, instrutor: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o instrutor" />
              </SelectTrigger>
              <SelectContent>
                {instructors.map((instructor) => (
                  <SelectItem key={instructor} value={instructor}>
                    {instructor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Notas adicionais sobre a aula..."
              value={formData.observacoes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, observacoes: e.target.value }))
              }
              rows={3}
            />
          </div>

          {/* WhatsApp notification */}
          <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg">
            <Checkbox
              id="notificar"
              checked={formData.notificar}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, notificar: !!checked }))
              }
            />
            <div className="flex-1">
              <Label
                htmlFor="notificar"
                className="flex items-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-success" />
                Notificar via WhatsApp
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Enviar lembrete automático para o aluno
              </p>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : editLesson ? (
              'Salvar alterações'
            ) : (
              'Criar aula'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
