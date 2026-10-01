import React, { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { DeltaBadge } from '@/components/finance/DeltaBadge';
import { TransactionList } from '@/components/finance/TransactionList';
import { TransactionFormModal } from '@/components/finance/TransactionFormModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FinanceService } from '@/lib/finance.service';
import { currentMonth, formatBRL, monthLabel, shiftMonth } from '@/lib/finance-format';
import { listarPlanos } from '@/lib/plans.service';
import { listarAlunos } from '@/lib/students.service';
import type {
  DistributionItem,
  FinanceFilters,
  FinancialStatus,
  EffectiveStatus,
  FinancialTransaction,
  FinancialTransactionInput,
  FinancialType,
} from '@/types/finance';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PiggyBank,
  Plus,
  TrendingDown,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';

const ALL = '__all__';

const moneyConfig = {
  receita: { label: 'Receita recebida', color: 'hsl(var(--primary))' },
  despesas: { label: 'Despesas', color: 'hsl(var(--destructive))' },
  resultado: { label: 'Resultado', color: 'hsl(var(--secondary))' },
} satisfies ChartConfig;

const planConfig = {
  ativos: { label: 'Planos ativos', color: 'hsl(var(--primary))' },
} satisfies ChartConfig;

const flowConfig = {
  novos: { label: 'Novos', color: 'hsl(var(--secondary))' },
  cancelados: { label: 'Cancelados', color: 'hsl(var(--destructive))' },
} satisfies ChartConfig;

const brlAxis = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v));

const Distribution: React.FC<{ title: string; items: DistributionItem[] }> = ({ title, items }) => {
  const total = items.reduce((sum, i) => sum + i.valor, 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && <p className="text-sm text-muted-foreground">Sem dados no mês.</p>}
        {items.map((item) => (
          <div key={item.nome} className="space-y-1">
            <div className="flex justify-between gap-2 text-sm">
              <span className="truncate">{item.nome}</span>
              <span className="font-medium whitespace-nowrap">{formatBRL(item.valor)}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${total > 0 ? (item.valor / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const Financeiro: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [mes, setMes] = useState(currentMonth());
  const [historyMonths, setHistoryMonths] = useState(12);
  const [categoria, setCategoria] = useState(ALL);
  const [planoId, setPlanoId] = useState(ALL);
  const [alunoId, setAlunoId] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);

  const [formTipo, setFormTipo] = useState<FinancialType>('Receita');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialTransaction | null>(null);
  const [toDelete, setToDelete] = useState<FinancialTransaction | null>(null);

  const filters: FinanceFilters = useMemo(
    () => ({
      categoria: categoria === ALL ? undefined : categoria,
      plano_id: planoId === ALL ? undefined : planoId,
      aluno_id: alunoId === ALL ? undefined : alunoId,
    }),
    [categoria, planoId, alunoId]
  );

  const isAdmin = user?.role === 'admin';

  const { data: categories } = useQuery({ queryKey: ['finance', 'categories'], queryFn: FinanceService.categorias, enabled: isAdmin });
  const { data: plans = [] } = useQuery({ queryKey: ['plans'], queryFn: listarPlanos, enabled: isAdmin });
  const { data: students = [] } = useQuery({ queryKey: ['alunos'], queryFn: listarAlunos, enabled: isAdmin });

  const summaryQ = useQuery({
    queryKey: ['finance', 'summary', mes, filters],
    queryFn: () => FinanceService.resumo(mes, filters),
    enabled: isAdmin,
  });
  const historyQ = useQuery({
    queryKey: ['finance', 'history', mes, historyMonths, filters],
    queryFn: () => FinanceService.historico(mes, historyMonths, filters),
    enabled: isAdmin,
  });

  const listParams = (tipo: FinancialType) => ({
    ...filters,
    mes,
    tipo,
    status: statusFilter === ALL ? undefined : (statusFilter as FinancialStatus | EffectiveStatus),
  });
  const receitasQ = useQuery({
    queryKey: ['finance', 'tx', 'Receita', mes, filters, statusFilter],
    queryFn: () => FinanceService.listarLancamentos(listParams('Receita')),
    enabled: isAdmin,
  });
  const despesasQ = useQuery({
    queryKey: ['finance', 'tx', 'Despesa', mes, filters, statusFilter],
    queryFn: () => FinanceService.listarLancamentos(listParams('Despesa')),
    enabled: isAdmin,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['finance'] });
  const markPaidMutation = useMutation({
    mutationFn: (tx: FinancialTransaction) => FinanceService.atualizar(tx.id, { status: 'Pago' }),
    onSuccess: (tx) => {
      invalidate();
      toast({ title: tx.tipo === 'Receita' ? 'Marcado como recebido' : 'Marcado como pago' });
    },
    onError: (error: Error) => toast({ title: 'Erro ao atualizar lançamento', description: error.message, variant: 'destructive' }),
  });
  const onError = (title: string) => (error: Error) =>
    toast({ title, description: error.message, variant: 'destructive' });

  const saveMutation = useMutation({
    mutationFn: (data: FinancialTransactionInput) =>
      editing ? FinanceService.atualizar(editing.id, data) : FinanceService.criar(data),
    onSuccess: () => {
      invalidate();
      toast({ title: editing ? 'Lançamento atualizado!' : 'Lançamento criado!' });
      setFormOpen(false);
    },
    onError: onError('Erro ao salvar lançamento'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => FinanceService.excluir(id),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Lançamento excluído' });
    },
    onError: onError('Erro ao excluir lançamento'),
  });

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const openForm = (tipo: FinancialType, tx: FinancialTransaction | null = null) => {
    setFormTipo(tipo);
    setEditing(tx);
    setFormOpen(true);
  };

  const summary = summaryQ.data;
  const history = historyQ.data ?? [];
  const chartData = history.map((row) => ({
    mes: monthLabel(row.mes, 'short'),
    receita: row.receita_recebida,
    despesas: row.despesas_total,
    resultado: row.resultado,
    ativos: row.ativos,
    novos: row.novos,
    cancelados: row.cancelados,
  }));

  const allCategories = [...new Set([...(categories?.Receita ?? []), ...(categories?.Despesa ?? [])])];
  const hasFilters = categoria !== ALL || planoId !== ALL || alunoId !== ALL;
  const a = summary?.atual;
  const v = summary?.variacao;

  const renderMonthTable = (items: FinancialTransaction[] | undefined, loading: boolean, tipo: FinancialType) => {
    const live = (items ?? []).filter((tx) => tx.status !== 'Cancelado');
    const total = live.reduce((sum, tx) => sum + Math.round(tx.valor * 100), 0) / 100;
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {live.length} lançamento{live.length === 1 ? '' : 's'} ativo{live.length === 1 ? '' : 's'} ·{' '}
            <span className="font-semibold text-foreground">{formatBRL(total)}</span> (sem cancelados)
          </p>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os status</SelectItem>
                <SelectItem value="Pago">{tipo === 'Receita' ? 'Recebido' : 'Pago'}</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Atrasado">Atrasado</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => openForm(tipo)}>
              <Plus className="h-4 w-4" />
              {tipo === 'Receita' ? 'Nova receita' : 'Nova despesa'}
            </Button>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <TransactionList
            items={items ?? []}
            onEdit={(tx) => openForm(tx.tipo, tx)}
            onDelete={setToDelete}
            onMarkPaid={(tx) => markPaidMutation.mutate(tx)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Financeiro</h1>
          <p className="text-muted-foreground mt-1">{monthLabel(mes)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" title="Mês anterior" onClick={() => setMes(shiftMonth(mes, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="month"
            aria-label="Mês de referência"
            className="w-[170px]"
            value={mes}
            onChange={(e) => e.target.value && setMes(e.target.value)}
          />
          <Button variant="outline" size="icon" title="Próximo mês" onClick={() => setMes(shiftMonth(mes, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setMes(currentMonth())} disabled={mes === currentMonth()}>
            Hoje
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas</SelectItem>
                  {allCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={planoId} onValueChange={setPlanoId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Aluno</Label>
              <Select value={alunoId} onValueChange={setAlunoId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              disabled={!hasFilters}
              onClick={() => {
                setCategoria(ALL);
                setPlanoId(ALL);
                setAlunoId(ALL);
              }}
            >
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex">
          <TabsTrigger value="geral">Visão geral</TabsTrigger>
          <TabsTrigger value="receitas">Receitas</TabsTrigger>
          <TabsTrigger value="despesas">Despesas</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* Visão geral */}
        <TabsContent value="geral" className="space-y-6">
          {summaryQ.isLoading && (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {summaryQ.isError && (
            <p className="text-destructive">Não foi possível carregar o resumo: {(summaryQ.error as Error).message}</p>
          )}

          {summary && a && v && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
                <StatsCard
                  title="Receita recebida"
                  value={formatBRL(a.receita_recebida)}
                  icon={Wallet}
                  variant="primary"
                  subtitle={
                    <div className="space-y-1">
                      <DeltaBadge pct={v.receita_recebida} />
                      <p>
                        Prevista {formatBRL(a.receita_prevista)} · pendente {formatBRL(a.receita_pendente)}
                      </p>
                    </div>
                  }
                />
                <StatsCard
                  title="Despesas"
                  value={formatBRL(a.despesas_total)}
                  icon={TrendingDown}
                  variant="default"
                  subtitle={
                    <div className="space-y-1">
                      <DeltaBadge pct={v.despesas_total} inverse />
                      <p>
                        Pagas {formatBRL(a.despesas_pagas)} · a pagar {formatBRL(a.despesas_pendentes)}
                      </p>
                    </div>
                  }
                />
                <StatsCard
                  title="Resultado"
                  value={formatBRL(a.resultado)}
                  icon={PiggyBank}
                  variant="secondary"
                  subtitle={
                    <div className="space-y-1">
                      <DeltaBadge pct={v.resultado} />
                      <p>{a.margem === null ? 'Margem indisponível (sem receita)' : `Margem ${a.margem.toLocaleString('pt-BR')}%`}</p>
                    </div>
                  }
                />
                <StatsCard
                  title="Em atraso"
                  value={formatBRL(a.receita_atrasada)}
                  icon={AlertTriangle}
                  variant="default"
                  subtitle={`${a.clientes.inadimplentes} aluno${a.clientes.inadimplentes === 1 ? '' : 's'} inadimplente${a.clientes.inadimplentes === 1 ? '' : 's'}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
                <StatsCard
                  title="Novos planos"
                  value={a.planos.novos}
                  icon={UserPlus}
                  variant="secondary"
                  subtitle={<DeltaBadge pct={v.novos} />}
                />
                <StatsCard
                  title="Cancelamentos"
                  value={a.planos.cancelados}
                  icon={UserMinus}
                  subtitle={<DeltaBadge pct={v.cancelados} inverse />}
                />
                <StatsCard
                  title="Planos ativos"
                  value={a.planos.ativos}
                  icon={Users}
                  variant="primary"
                  subtitle={
                    <div className="space-y-1">
                      <DeltaBadge pct={v.ativos} />
                      <p>
                        Saldo do mês {a.planos.saldo_liquido > 0 ? '+' : ''}
                        {a.planos.saldo_liquido}
                      </p>
                    </div>
                  }
                />
                <StatsCard
                  title="Ticket médio"
                  value={a.ticket_medio === null ? '—' : formatBRL(a.ticket_medio)}
                  icon={TrendingUp}
                  subtitle={`${a.qtd_receitas_pagas} recebimento${a.qtd_receitas_pagas === 1 ? '' : 's'} no mês`}
                />
              </div>

              {(a.estimativa_planos.qtd > 0 || a.estimativa_planos.sem_preco > 0) && (
                <Card className="border-dashed">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Estimativa pelos planos adquiridos</p>
                      <p className="text-2xl font-bold font-display">{formatBRL(a.estimativa_planos.valor)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground sm:max-w-md">
                      {a.estimativa_planos.qtd} aluno{a.estimativa_planos.qtd === 1 ? '' : 's'} cadastrado
                      {a.estimativa_planos.qtd === 1 ? '' : 's'} no mês sem receita de plano lançada, pelo preço atual do plano.
                      É uma estimativa (não entra em recebida nem em resultado); renovações e trocas antigas não são
                      registradas.
                      {a.estimativa_planos.sem_preco > 0 &&
                        ` ${a.estimativa_planos.sem_preco} aluno(s) ficaram de fora porque o plano não existe mais.`}
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Distribution title="Receita por plano" items={summary.distribuicao.receita_por_plano} />
                <Distribution title="Receita por categoria" items={summary.distribuicao.receita_por_categoria} />
                <Distribution title="Maiores clientes do mês" items={summary.distribuicao.receita_por_cliente} />
                <Distribution title="Despesas por categoria" items={summary.distribuicao.despesa_por_categoria} />
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold font-display">Evolução</h2>
            <Select value={String(historyMonths)} onValueChange={(val) => setHistoryMonths(Number(val))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Últimos 12 meses</SelectItem>
                <SelectItem value="24">Últimos 24 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="xl:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Receita x despesas x resultado</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={moneyConfig} className="h-[280px] w-full">
                  <BarChart data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={brlAxis} width={40} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(val) => formatBRL(Number(val))} />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="receita" fill="var(--color-receita)" radius={4} />
                    <Bar dataKey="despesas" fill="var(--color-despesas)" radius={4} />
                    <Bar dataKey="resultado" fill="var(--color-resultado)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Planos ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={planConfig} className="h-[240px] w-full">
                  <LineChart data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={30} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line dataKey="ativos" type="monotone" stroke="var(--color-ativos)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Novos x cancelados</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={flowConfig} className="h-[240px] w-full">
                  <BarChart data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={30} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="novos" fill="var(--color-novos)" radius={4} />
                    <Bar dataKey="cancelados" fill="var(--color-cancelados)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground">
            Receita e despesas vêm dos lançamentos cadastrados (por mês de referência). Planos novos = alunos
            cadastrados no mês; cancelamentos = alunos inativados no mês; ativos = base ao fim do mês. Alunos
            inativados antes deste módulo usam a data da última alteração como aproximação.
          </p>
        </TabsContent>

        <TabsContent value="receitas">{renderMonthTable(receitasQ.data, receitasQ.isLoading, 'Receita')}</TabsContent>
        <TabsContent value="despesas">{renderMonthTable(despesasQ.data, despesasQ.isLoading, 'Despesa')}</TabsContent>

        {/* Histórico */}
        <TabsContent value="historico">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Despesas</TableHead>
                    <TableHead className="text-right">Resultado</TableHead>
                    <TableHead className="text-right" title="Estimativa pelos planos de alunos cadastrados no mês, sem receita lançada">
                      Est. planos
                    </TableHead>
                    <TableHead className="text-center">Novos</TableHead>
                    <TableHead className="text-center">Cancel.</TableHead>
                    <TableHead className="text-center">Ativos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...history].reverse().map((row) => (
                    <TableRow
                      key={row.mes}
                      className="cursor-pointer"
                      data-state={row.mes === mes ? 'selected' : undefined}
                      onClick={() => setMes(row.mes)}
                    >
                      <TableCell className="font-medium whitespace-nowrap">{monthLabel(row.mes)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatBRL(row.receita_recebida)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatBRL(row.despesas_total)}</TableCell>
                      <TableCell
                        className={`text-right whitespace-nowrap font-semibold ${row.resultado < 0 ? 'text-destructive' : ''}`}
                      >
                        {formatBRL(row.resultado)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                        {row.receita_estimada_planos > 0 ? `~ ${formatBRL(row.receita_estimada_planos)}` : '—'}
                      </TableCell>
                      <TableCell className="text-center">{row.novos}</TableCell>
                      <TableCell className="text-center">{row.cancelados}</TableCell>
                      <TableCell className="text-center">{row.ativos}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground mt-3">
            Termina no mês selecionado ({historyMonths} meses). Clique numa linha para abrir o mês.
          </p>
        </TabsContent>
      </Tabs>

      <TransactionFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        tipo={formTipo}
        editing={editing}
        categories={categories}
        plans={plans}
        students={students}
        isSaving={saveMutation.isPending}
        onSubmit={(data) => saveMutation.mutate(data)}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              "{toDelete?.descricao}" será removido definitivamente. Para manter o registro, prefira marcá-lo como
              Cancelado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) deleteMutation.mutate(toDelete.id);
                setToDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Financeiro;
