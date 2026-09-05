import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { listarPlanos, criarPlano, atualizarPlano, excluirPlano } from '@/lib/plans.service';
import { Plan } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, PackagePlus, Loader2 } from 'lucide-react';

const emptyForm = {
  nome: '',
  qtd_aulas: 4,
  validade_dias: 30,
  preco: 0,
};

const Plans: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: listarPlanos,
  });

  const createPlanMutation = useMutation({
    mutationFn: criarPlano,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast({ title: 'Plano criado!' });
      setIsModalOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar plano', description: error.message, variant: 'destructive' });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Plan, 'id'>> }) =>
      atualizarPlano(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast({ title: 'Plano atualizado!' });
      setIsModalOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar plano', description: error.message, variant: 'destructive' });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: excluirPlano,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast({ title: 'Plano excluído' });
      setIsDeleteModalOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir plano', description: error.message, variant: 'destructive' });
      setIsDeleteModalOpen(false);
    },
  });

  const handleOpenModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        nome: plan.nome,
        qtd_aulas: plan.qtd_aulas,
        validade_dias: plan.validade_dias,
        preco: Number(plan.preco),
      });
    } else {
      setEditingPlan(null);
      setFormData(emptyForm);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome || formData.qtd_aulas < 1 || formData.validade_dias < 1) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha nome, quantidade de aulas e validade.',
        variant: 'destructive',
      });
      return;
    }

    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, data: formData });
    } else {
      createPlanMutation.mutate(formData);
    }
  };

  const handleDeleteClick = (plan: Plan) => {
    setPlanToDelete(plan);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!planToDelete) return;
    deletePlanMutation.mutate(planToDelete.id);
    setPlanToDelete(null);
  };

  const isSaving = createPlanMutation.isPending || updatePlanMutation.isPending;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Planos</h1>
          <p className="text-muted-foreground mt-1">Gerencie os pacotes de aulas oferecidos pela escola</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <PackagePlus className="h-4 w-4" />
          Novo Plano
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Cards (mobile) */}
      {!isLoading && (
        <div className="space-y-3 md:hidden">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{plan.nome}</p>
                  <p className="font-semibold text-primary">R$ {Number(plan.preco).toFixed(2)}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {plan.qtd_aulas} aula{plan.qtd_aulas === 1 ? '' : 's'} — válido por {plan.validade_dias} dias
                </p>
                <div className="flex justify-end gap-1 pt-2 border-t border-border">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenModal(plan)} title="Editar">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDeleteClick(plan)}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {plans.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum plano cadastrado</p>
          )}
        </div>
      )}

      {/* Tabela (desktop) */}
      {!isLoading && (
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-center">Aulas</TableHead>
                  <TableHead className="text-center">Validade</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.nome}</TableCell>
                    <TableCell className="text-center">{plan.qtd_aulas}</TableCell>
                    <TableCell className="text-center">{plan.validade_dias} dias</TableCell>
                    <TableCell className="text-right">R$ {Number(plan.preco).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(plan)} title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteClick(plan)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {plans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum plano cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modal criar/editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
            <DialogDescription>
              {editingPlan ? 'Edite os dados do plano' : 'Preencha os dados para criar um novo plano'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan-nome">Nome</Label>
              <Input
                id="plan-nome"
                placeholder="Ex: Pacote 4 Aulas"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan-aulas">Qtd. de aulas</Label>
                <Input
                  id="plan-aulas"
                  type="number"
                  min={1}
                  value={formData.qtd_aulas}
                  onChange={(e) =>
                    setFormData({ ...formData, qtd_aulas: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-validade">Validade (dias)</Label>
                <Input
                  id="plan-validade"
                  type="number"
                  min={1}
                  value={formData.validade_dias}
                  onChange={(e) =>
                    setFormData({ ...formData, validade_dias: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-preco">Preço (R$)</Label>
              <Input
                id="plan-preco"
                type="number"
                min={0}
                step="0.01"
                value={formData.preco}
                onChange={(e) => setFormData({ ...formData, preco: Number(e.target.value) })}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : editingPlan ? (
                  'Salvar'
                ) : (
                  'Criar plano'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o plano <strong>{planToDelete?.nome}</strong>? Alunos que já
              usam esse nome de plano não são afetados, mas ele deixa de aparecer nas opções pra novos
              cadastros.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deletePlanMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletePlanMutation.isPending}
            >
              {deletePlanMutation.isPending ? (
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
    </div>
  );
};

export default Plans;
