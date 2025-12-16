import React, { useEffect, useState } from 'react';
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
import { listarAlunos, criarAluno } from '@/lib/students.service';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Edit,
  Calendar,
  MessageCircle,
  Phone,
  Mail,
  Filter,
  UserPlus,
  Loader2,
} from 'lucide-react';

/* =======================
   TIPAGEM
======================= */

export interface Student {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  plano: 'mensal' | 'trimestral' | 'avulso';
  aulas_restantes: number;
  status: 'Ativo' | 'Inativo';
}

/* =======================
   COMPONENTE
======================= */

const Students: React.FC = () => {
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<'all' | 'Ativo' | 'Inativo'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    plano: 'mensal' as 'mensal' | 'trimestral' | 'avulso',
    aulas_restantes: 4,
  });

  /* =======================
     LOAD ALUNOS
  ======================= */

  const carregarAlunos = async () => {
    try {
      const data = await listarAlunos();
      setStudents(data);
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar alunos',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    carregarAlunos();
  }, []);

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

  /* =======================
     SUBMIT
  ======================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome || !formData.telefone || !formData.email) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      await criarAluno({
        ...formData,
        status: 'Ativo',
      });

      toast({
        title: 'Aluno cadastrado!',
        description: `${formData.nome} foi cadastrado com sucesso.`,
      });

      await carregarAlunos();
      setIsModalOpen(false);
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar aluno',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =======================
     WHATSAPP
  ======================= */

  const handleSendWhatsApp = (student: Student) => {
    window.open(`https://wa.me/${student.telefone}`, '_blank');
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSendWhatsApp(student)}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
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
            <DialogTitle>Novo Aluno</DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar um aluno
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

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  'Cadastrar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Students;