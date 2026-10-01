import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type {
  FinanceCategories,
  FinancialStatus,
  FinancialTransaction,
  FinancialTransactionInput,
  FinancialType,
} from '@/types/finance';
import type { Plan, Student } from '@/types';

const NONE = '__none__';

interface FormState {
  descricao: string;
  valor: string;
  data: string;
  categoria: string;
  status: FinancialStatus;
  aluno_id: string;
  plano_id: string;
  observacoes: string;
}

const emptyForm = (categories: string[]): FormState => ({
  descricao: '',
  valor: '',
  data: format(new Date(), 'yyyy-MM-dd'),
  categoria: categories[0] ?? '',
  status: 'Pendente',
  aluno_id: NONE,
  plano_id: NONE,
  observacoes: '',
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: FinancialType;
  editing: FinancialTransaction | null;
  categories: FinanceCategories | undefined;
  plans: Plan[];
  students: Student[];
  isSaving: boolean;
  onSubmit: (data: FinancialTransactionInput) => void;
}

export const TransactionFormModal: React.FC<Props> = ({
  open,
  onOpenChange,
  tipo,
  editing,
  categories,
  plans,
  students,
  isSaving,
  onSubmit,
}) => {
  const tipoCategories = categories?.[tipo] ?? [];
  const [form, setForm] = useState<FormState>(emptyForm(tipoCategories));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setForm({
        descricao: editing.descricao,
        valor: String(editing.valor),
        data: editing.data,
        categoria: editing.categoria,
        status: editing.status,
        aluno_id: editing.aluno_id ?? NONE,
        plano_id: editing.plano_id ?? NONE,
        observacoes: editing.observacoes ?? '',
      });
    } else {
      setForm(emptyForm(categories?.[tipo] ?? []));
    }
  }, [open, editing, tipo, categories]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Escolher um plano numa receita sugere o preço de tabela (editável) — só
  // quando o valor ainda está vazio, pra nunca sobrescrever o que foi digitado.
  const handlePlan = (planoId: string) => {
    set('plano_id', planoId);
    const plan = plans.find((p) => p.id === planoId);
    if (plan && !form.valor) setForm((prev) => ({ ...prev, plano_id: planoId, valor: String(Number(plan.preco)) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valor = Number(form.valor.replace(',', '.'));

    if (!form.descricao.trim()) return setError('Informe a descrição.');
    if (!Number.isFinite(valor) || valor <= 0) return setError('O valor deve ser maior que zero.');
    if (!form.data) return setError('Informe a data.');
    if (!form.categoria) return setError('Escolha a categoria.');

    setError(null);
    onSubmit({
      tipo,
      descricao: form.descricao.trim(),
      valor,
      data: form.data,
      categoria: form.categoria,
      status: form.status,
      aluno_id: tipo === 'Receita' && form.aluno_id !== NONE ? form.aluno_id : null,
      plano_id: tipo === 'Receita' && form.plano_id !== NONE ? form.plano_id : null,
      observacoes: form.observacoes.trim() || null,
    });
  };

  const noun = tipo === 'Receita' ? 'receita' : 'despesa';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Editar ${noun}` : `Nova ${noun}`}</DialogTitle>
          <DialogDescription>
            O mês de referência é definido pela data do lançamento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fin-desc">Descrição</Label>
            <Input
              id="fin-desc"
              value={form.descricao}
              maxLength={200}
              placeholder={tipo === 'Receita' ? 'Ex: Pacote 4 aulas — Maria' : 'Ex: Anúncios Instagram'}
              onChange={(e) => set('descricao', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fin-valor">Valor (R$)</Label>
              <Input
                id="fin-valor"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={form.valor}
                onChange={(e) => set('valor', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fin-data">Data</Label>
              <Input id="fin-data" type="date" value={form.data} onChange={(e) => set('data', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => set('categoria', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {tipoCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v as FinancialStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Pago">{tipo === 'Receita' ? 'Recebido' : 'Pago'}</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {tipo === 'Receita' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Aluno (opcional)</Label>
                <Select value={form.aluno_id} onValueChange={(v) => set('aluno_id', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhum</SelectItem>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plano (opcional)</Label>
                <Select value={form.plano_id} onValueChange={handlePlan}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhum</SelectItem>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fin-obs">Observação</Label>
            <Textarea
              id="fin-obs"
              rows={2}
              maxLength={1000}
              value={form.observacoes}
              onChange={(e) => set('observacoes', e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
