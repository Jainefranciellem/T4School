import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { mockStudents, mockLessons, Student } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Plus,
  Edit,
  Calendar,
  MessageCircle,
  Phone,
  Mail,
  Filter,
  UserPlus,
  Loader2,
} from 'lucide-react';

const Students: React.FC = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Ativo' | 'Inativo'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    plano: 'mensal' as 'trimestral' | 'mensal' | 'avulso',
    aulas_restantes: 4,
  });

  const filteredStudents = mockStudents.filter((student) => {
    const matchesSearch =
      student.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.telefone.includes(searchQuery) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus =
      statusFilter === 'all' || student.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStudentLessonsCount = (studentId: string) => {
    return mockLessons.filter((l) => l.aluno_id === studentId).length;
  };

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        nome: student.nome,
        telefone: student.telefone,
        email: student.email,
        plano: student.plano,
        aulas_restantes: student.aulas_restantes,
      });
    } else {
      setEditingStudent(null);
      setFormData({
        nome: '',
        telefone: '',
        email: '',
        plano: 'mensal',
        aulas_restantes: 4,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.telefone || !formData.email) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    toast({
      title: editingStudent ? 'Aluno atualizado!' : 'Aluno cadastrado!',
      description: `${formData.nome} foi ${editingStudent ? 'atualizado' : 'cadastrado'} com sucesso.`,
    });

    setIsSubmitting(false);
    setIsModalOpen(false);
  };

  const handleSendWhatsApp = (student: Student) => {
    toast({
      title: 'WhatsApp',
      description: `Abrindo conversa com ${student.nome}...`,
    });
    // In production, this would trigger n8n webhook
    window.open(`https://wa.me/${student.telefone}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Alunos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os alunos cadastrados
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <UserPlus className="h-4 w-4" />
          Novo Aluno
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as 'all' | 'Ativo' | 'Inativo')
              }
            >
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Ativo">Ativos</SelectItem>
                <SelectItem value="Inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-center">Aulas Restantes</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-semibold">
                            {student.nome.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{student.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {getStudentLessonsCount(student.id)} aulas realizadas
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {student.telefone.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4')}
                        </p>
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {student.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {student.plano}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`font-bold ${
                          student.aulas_restantes === 0
                            ? 'text-destructive'
                            : student.aulas_restantes <= 2
                            ? 'text-warning'
                            : 'text-foreground'
                        }`}
                      >
                        {student.aulas_restantes}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={student.status === 'Ativo' ? 'success' : 'cancelled'}
                      >
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleOpenModal(student)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm">
                          <Calendar className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-success"
                          onClick={() => handleSendWhatsApp(student)}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredStudents.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum aluno encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit student modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingStudent ? 'Editar Aluno' : 'Novo Aluno'}
            </DialogTitle>
            <DialogDescription>
              {editingStudent
                ? 'Atualize os dados do aluno.'
                : 'Preencha os dados para cadastrar um novo aluno.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nome: e.target.value }))
                }
                placeholder="João Silva"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, telefone: e.target.value }))
                  }
                  placeholder="5584999999999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plano">Plano</Label>
                <Select
                  value={formData.plano}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      plano: value as 'trimestral' | 'mensal' | 'avulso',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avulso">Avulso (1 aula)</SelectItem>
                    <SelectItem value="mensal">Mensal (4 aulas)</SelectItem>
                    <SelectItem value="trimestral">Trimestral (12 aulas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="aulas">Aulas restantes</Label>
                <Input
                  id="aulas"
                  type="number"
                  min="0"
                  value={formData.aulas_restantes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      aulas_restantes: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
          </form>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : editingStudent ? (
                'Salvar alterações'
              ) : (
                'Cadastrar aluno'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Students;
