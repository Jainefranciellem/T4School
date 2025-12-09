import React, { useState } from 'react';
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
import { mockStudents, instructors, locations, Lesson } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Clock, MapPin, User, MessageCircle } from 'lucide-react';

interface CreateLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lesson: Omit<Lesson, 'id'>) => void;
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
    aluno_id: editLesson?.aluno_id || '',
    data: editLesson?.data || '',
    hora: editLesson?.hora || '',
    local: editLesson?.local || locations[0],
    instrutor: editLesson?.instrutor || instructors[0],
    observacoes: editLesson?.observacoes || '',
    notificar: true,
  });

  const activeStudents = mockStudents.filter((s) => s.status === 'Ativo');

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
    if (lessonDateTime < new Date()) {
      toast({
        title: 'Data inválida',
        description: 'A data da aula deve ser no futuro.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    onSave({
      aluno_id: formData.aluno_id,
      data: formData.data,
      hora: formData.hora,
      local: formData.local,
      instrutor: formData.instrutor,
      observacoes: formData.observacoes,
      status: 'Agendada',
      notificacao_enviada: formData.notificar,
    });

    toast({
      title: editLesson ? 'Aula atualizada! 🏄' : 'Aula criada! 🏄',
      description: formData.notificar
        ? 'Notificação será enviada via WhatsApp.'
        : 'Aula agendada com sucesso.',
    });

    setIsSubmitting(false);
    onClose();
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
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o aluno" />
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
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, data: e.target.value }))
                }
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Hora *
              </Label>
              <Input
                id="hora"
                type="time"
                value={formData.hora}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, hora: e.target.value }))
                }
              />
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
