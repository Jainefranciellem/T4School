import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { listarAlunos } from '@/lib/students.service';
import { AulasService } from '@/lib/aulas.service';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart3,
  Download,
  Filter,
  TrendingUp,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Reports: React.FC = () => {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });
  const [studentFilter, setStudentFilter] = useState<string>('all');

  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ['alunos'],
    queryFn: listarAlunos,
  });

  const { data: lessons = [], isLoading: isLoadingLessons } = useQuery({
    queryKey: ['aulas'],
    queryFn: AulasService.listarAulas,
  });

  if (isLoadingStudents || isLoadingLessons) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate statistics
  const filteredLessons = lessons.filter((lesson) => {
    const lessonDate = new Date(lesson.data);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    const inDateRange = lessonDate >= startDate && lessonDate <= endDate;
    const matchesStudent =
      studentFilter === 'all' || lesson.aluno_id === studentFilter;

    return inDateRange && matchesStudent;
  });

  const stats = {
    total: filteredLessons.length,
    attended: filteredLessons.filter((l) => l.status === 'Compareceu').length,
    missed: filteredLessons.filter((l) => l.status === 'Faltou').length,
    cancelled: filteredLessons.filter((l) => l.status === 'Cancelada').length,
    scheduled: filteredLessons.filter((l) => ['Agendada', 'Confirmada'].includes(l.status)).length,
  };

  const attendanceRate = stats.total > 0
    ? Math.round((stats.attended / (stats.attended + stats.missed)) * 100) || 0
    : 0;

  // Group by student for the table
  const studentStats = students.map((student) => {
    const studentLessons = filteredLessons.filter((l) => l.aluno_id === student.id);
    const attended = studentLessons.filter((l) => l.status === 'Compareceu').length;
    const missed = studentLessons.filter((l) => l.status === 'Faltou').length;
    const total = attended + missed;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 0;

    return {
      ...student,
      totalLessons: studentLessons.length,
      attended,
      missed,
      rate,
    };
  }).filter((s) => s.totalLessons > 0);

  const handleExportCSV = () => {
    toast({
      title: 'Exportando relatório...',
      description: 'O download começará em breve.',
    });

    // Generate CSV content
    const headers = ['Aluno', 'Plano', 'Aulas Totais', 'Compareceu', 'Faltou', 'Taxa'];
    const rows = studentStats.map((s) => [
      s.nome,
      s.plano,
      s.totalLessons,
      s.attended,
      s.missed,
      `${s.rate}%`,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Relatórios</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe a frequência e métricas dos alunos
          </p>
        </div>
        <Button onClick={handleExportCSV}>
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">Data inicial</Label>
              <Input
                id="start"
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Data final</Label>
              <Input
                id="end"
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student">Aluno</Label>
              <Select value={studentFilter} onValueChange={setStudentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os alunos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os alunos</SelectItem>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total de aulas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{stats.attended}</p>
                <p className="text-xs text-muted-foreground">Compareceu</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{stats.missed}</p>
                <p className="text-xs text-muted-foreground">Faltou</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{attendanceRate}%</p>
                <p className="text-xs text-muted-foreground">Taxa presença</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance by student */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Frequência por Aluno
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Compareceu</TableHead>
                  <TableHead className="text-center">Faltou</TableHead>
                  <TableHead className="text-center">Taxa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentStats.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {student.nome.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium">{student.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {student.plano}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{student.totalLessons}</TableCell>
                    <TableCell className="text-center text-success font-medium">
                      {student.attended}
                    </TableCell>
                    <TableCell className="text-center text-destructive font-medium">
                      {student.missed}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-success rounded-full transition-all"
                            style={{ width: `${student.rate}%` }}
                          />
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            student.rate >= 80
                              ? 'text-success'
                              : student.rate >= 60
                              ? 'text-warning'
                              : 'text-destructive'
                          }`}
                        >
                          {student.rate}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {studentStats.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum dado disponível para o período selecionado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
