import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, Edit, Trash2, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBRL, formatDateBR } from '@/lib/finance-format';
import type { EffectiveStatus, FinancialTransaction } from '@/types/finance';

const statusStyle: Record<EffectiveStatus, string> = {
  Pago: 'bg-emerald-100 text-emerald-700 border-transparent',
  Pendente: 'bg-amber-100 text-amber-700 border-transparent',
  Atrasado: 'bg-destructive/10 text-destructive border-transparent',
  Cancelado: 'bg-muted text-muted-foreground border-transparent',
};

export const StatusBadge: React.FC<{ tx: FinancialTransaction }> = ({ tx }) => (
  <Badge variant="outline" className={statusStyle[tx.status_efetivo]}>
    {tx.status_efetivo === 'Pago' ? (tx.tipo === 'Receita' ? 'Recebido' : 'Pago') : tx.status_efetivo}
  </Badge>
);

interface Props {
  items: FinancialTransaction[];
  onEdit: (tx: FinancialTransaction) => void;
  onDelete: (tx: FinancialTransaction) => void;
  onMarkPaid: (tx: FinancialTransaction) => void;
}

const amountClass = (tx: FinancialTransaction) =>
  cn('font-semibold', tx.status === 'Cancelado' && 'line-through text-muted-foreground');

export const TransactionList: React.FC<Props> = ({ items, onEdit, onDelete, onMarkPaid }) => {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum lançamento no período</p>
      </div>
    );
  }

  const actions = (tx: FinancialTransaction) => (
    <div className="flex justify-end gap-1">
      {tx.status === 'Pendente' && (
        <Button
          variant="ghost"
          size="icon"
          title={tx.tipo === 'Receita' ? 'Marcar como recebido' : 'Marcar como pago'}
          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
          onClick={() => onMarkPaid(tx)}
        >
          <CheckCircle2 className="h-4 w-4" />
        </Button>
      )}
      <Button variant="ghost" size="icon" title="Editar" onClick={() => onEdit(tx)}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Excluir"
        className="text-red-500 hover:text-red-600 hover:bg-red-50"
        onClick={() => onDelete(tx)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <>
      {/* Cards (mobile) */}
      <div className="space-y-3 md:hidden">
        {items.map((tx) => (
          <Card key={tx.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold break-words min-w-0">{tx.descricao}</p>
                <p className={amountClass(tx)}>{formatBRL(tx.valor)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{formatDateBR(tx.data)}</span>
                <span>·</span>
                <span>{tx.categoria}</span>
                <StatusBadge tx={tx} />
              </div>
              {(tx.aluno_nome || tx.plano_nome) && (
                <p className="text-sm text-muted-foreground">
                  {[tx.aluno_nome, tx.plano_nome].filter(Boolean).join(' — ')}
                </p>
              )}
              {tx.observacoes && <p className="text-sm text-muted-foreground">{tx.observacoes}</p>}
              <div className="pt-2 border-t border-border">{actions(tx)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela (desktop/tablet) */}
      <Card className="hidden md:block">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Aluno / Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="whitespace-nowrap">{formatDateBR(tx.data)}</TableCell>
                  <TableCell className="font-medium max-w-[240px]">
                    <p className="truncate" title={tx.observacoes ?? tx.descricao}>
                      {tx.descricao}
                    </p>
                  </TableCell>
                  <TableCell>{tx.categoria}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {[tx.aluno_nome, tx.plano_nome].filter(Boolean).join(' — ') || '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tx={tx} />
                  </TableCell>
                  <TableCell className={cn('text-right whitespace-nowrap', amountClass(tx))}>
                    {formatBRL(tx.valor)}
                  </TableCell>
                  <TableCell className="text-right">{actions(tx)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
};
