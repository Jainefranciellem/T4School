import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { listarAlunos, criarAluno, atualizarAluno, excluirAluno } from '@/lib/students.service';
import { listarPlanos } from '@/lib/plans.service';
import { Student } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Edit,
  Trash2,
  Calendar,
  MessageCircle,
  Link as LinkIcon,
  Phone,
  Mail,
  Filter,
  UserPlus,
  Loader2,
} from 'lucide-react';

/* =======================
   COMPONENTE
======================= */

const Students: React.FC = () => {
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<'all' | 'Ativo' | 'Inativo'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Delete confirmation state
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    plano: '',
    aulas_restantes: 0,
    status: 'Ativo' as 'Ativo' | 'Inativo',
  });

  /* =======================
     REACT QUERY
  ======================= */

  const queryClient = useQueryClient();

  const { data: students = [], isLoading, isError } = useQuery({
    queryKey: ['alunos'],
    queryFn: listarAlunos,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: listarPlanos,
  });

  const handlePlanoChange = (nome: string) => {
    const plan = plans.find((p) => p.nome === nome);
    setFormData((prev) => ({
      ...prev,
      plano: nome,
      aulas_restantes: plan ? plan.qtd_aulas : prev.aulas_restantes,
    }));
  };

  const createStudentMutation = useMutation({
    mutationFn: (data: any) => criarAluno({ ...data, status: 'Ativo' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alunos'] });
      toast({ title: 'Aluno cadastrado!', description: 'Aluno foi cadastrado com sucesso.' });
      setIsModalOpen(false);
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao cadastrar aluno', variant: 'destructive' });
    }
  });

  const updateStudentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => atualizarAluno(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alunos'] });
      toast({ title: 'Aluno atualizado!', description: 'Aluno foi atualizado com sucesso.' });
      setIsModalOpen(false);
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao atualizar aluno', variant: 'destructive' });
    }
  });

  const deleteStudentMutation = useMutation({
    mutationFn: excluirAluno,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alunos'] });
      toast({ title: 'Aluno excluído', description: 'O aluno foi removido com sucesso.' });
      setIsDeleteModalOpen(false);
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao excluir aluno.', variant: 'destructive' });
    }
  });

  /* =======================
     FILTROS
  ======================= */

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.telefone.includes(searchQuery) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || student.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  /* =======================
     MODAL
  ======================= */

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        nome: student.nome,
        telefone: student.telefone,
        email: student.email,
        plano: student.plano,
        aulas_restantes: student.aulas_restantes ?? 4,
        status: student.status,
      });
    } else {
      setEditingStudent(null);
      setFormData({
        nome: '',
        telefone: '',
        email: '',
        plano: '',
        aulas_restantes: 0,
        status: 'Ativo',
      });
    }

    setIsModalOpen(true);
  };

  /* =======================
     SUBMIT
  ======================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome || !formData.telefone || !formData.email || !formData.plano) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }

    if (editingStudent) {
      updateStudentMutation.mutate({ id: editingStudent.id, data: formData });
    } else {
      createStudentMutation.mutate(formData);
    }
  };

  const handleDeleteClick = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!studentToDelete) return;
    deleteStudentMutation.mutate(studentToDelete.id);
    setStudentToDelete(null);
  };

  /* =======================
     WHATSAPP
  ======================= */

  const handleSendWhatsApp = (student: Student) => {
    window.open(`https://wa.me/${student.telefone}`, '_blank');
  };

  const handleCopyPortalLink = async (student: Student) => {
    if (!student.access_token) return;
    const link = `${window.location.origin}/portal/${student.access_token}`;
    await navigator.clipboard.writeText(link);
    toast({ title: 'Link copiado!', description: 'Manda esse link pro aluno pelo WhatsApp.' });
  };

  /* =======================
     RENDER
  ======================= */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Alunos</h1>
          <p className="text-muted-foreground">
            Gerencie todos os alunos cadastrados
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Aluno
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v) =>
              setStatusFilter(v as 'all' | 'Ativo' | 'Inativo')
            }
          >
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Ativo">Ativos</SelectItem>
              <SelectItem value="Inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead className="text-center">Aulas</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.nome}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {student.telefone}
                      </p>
                      <p className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" /> {student.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{student.plano}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {student.aulas_restantes}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        student.status === 'Ativo'
                          ? 'success'
                          : 'destructive'
                      }
                    >
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSendWhatsApp(student)}
                        title="Enviar WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyPortalLink(student)}
                        title="Copiar link do portal do aluno"
                      >
                        <LinkIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenModal(student)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteClick(student)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStudent ? 'Editar Aluno' : 'Novo Aluno'}</DialogTitle>
            <DialogDescription>
              {editingStudent ? 'Edite os dados do aluno' : 'Preencha os dados para cadastrar um aluno'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Nome"
              value={formData.nome}
              onChange={(e) =>
                setFormData({ ...formData, nome: e.target.value })
              }
            />
            <Input
              placeholder="Telefone"
              value={formData.telefone}
              onChange={(e) =>
                setFormData({ ...formData, telefone: e.target.value })
              }
            />
            <Input
              placeholder="Email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      status: value as 'Ativo' | 'Inativo',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={formData.plano} onValueChange={handlePlanoChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.nome}>
                        {plan.nome} — R$ {Number(plan.preco).toFixed(2)}
                      </SelectItem>
                    ))}
                    {plans.length === 0 && (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Nenhum plano cadastrado
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={createStudentMutation.isPending || updateStudentMutation.isPending}>
                {createStudentMutation.isPending || updateStudentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  editingStudent ? 'Salvar' : 'Cadastrar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o aluno <strong>{studentToDelete?.nome}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleteStudentMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteStudentMutation.isPending}
            >
              {deleteStudentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default Students;