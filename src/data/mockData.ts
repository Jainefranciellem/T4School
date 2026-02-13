export interface Student {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  plano: string;
  aulas_restantes: number;
  status: 'Ativo' | 'Inativo';
  avatar?: string;
}

export interface Lesson {
  id: string;
  aluno_id: string;
  data: string;
  hora: string;
  local: string;
  instrutor: string;
  status: 'Agendada' | 'Confirmada' | 'Compareceu' | 'Faltou' | 'Cancelada';
  observacoes?: string;
  notificacao_enviada?: boolean;
  enviar_notificacao?: boolean;
  aulas_restantes?: number;
}

export interface Plan {
  id: string;
  nome: string;
  qtd_aulas: number;
  validade_dias: number;
  preco: number;
}

// Mock students
export const mockStudents: Student[] = [
  {
    id: '1',
    nome: 'Lucas Silva',
    telefone: '5584999001122',
    email: 'lucas.silva@email.com',
    plano: 'Pacote 10 Aulas',
    aulas_restantes: 10,
    status: 'Ativo',
  },
  {
    id: '2',
    nome: 'Marina Costa',
    telefone: '5584999334455',
    email: 'marina.costa@email.com',
    plano: 'mensal',
    aulas_restantes: 3,
    status: 'Ativo',
  },
  {
    id: '3',
    nome: 'Pedro Henrique',
    telefone: '5584999667788',
    email: 'pedro.h@email.com',
    plano: 'avulso',
    aulas_restantes: 1,
    status: 'Ativo',
  },
  {
    id: '4',
    nome: 'Ana Beatriz',
    telefone: '5584999889900',
    email: 'ana.beatriz@email.com',
    plano: 'trimestral',
    aulas_restantes: 8,
    status: 'Ativo',
  },
  {
    id: '5',
    nome: 'Rafael Mendes',
    telefone: '5584999112233',
    email: 'rafael.m@email.com',
    plano: 'mensal',
    aulas_restantes: 0,
    status: 'Inativo',
  },
];

// Generate lessons for the current week
const today = new Date();
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const mockLessons: Lesson[] = [
  {
    id: '1',
    aluno_id: '1',
    data: formatDate(today),
    hora: '07:00',
    local: 'Praia de Ponta Negra',
    instrutor: 'Carlos',
    status: 'Confirmada',
    notificacao_enviada: true,
  },
  {
    id: '2',
    aluno_id: '2',
    data: formatDate(today),
    hora: '09:00',
    local: 'Praia de Ponta Negra',
    instrutor: 'Carlos',
    status: 'Agendada',
    notificacao_enviada: true,
  },
  {
    id: '3',
    aluno_id: '3',
    data: formatDate(today),
    hora: '11:00',
    local: 'Praia do Meio',
    instrutor: 'Bruno',
    status: 'Agendada',
    notificacao_enviada: false,
  },
  {
    id: '4',
    aluno_id: '4',
    data: formatDate(new Date(today.getTime() + 86400000)),
    hora: '07:00',
    local: 'Praia de Ponta Negra',
    instrutor: 'Carlos',
    status: 'Agendada',
    observacoes: 'Primeira aula - trazer protetor solar',
  },
  {
    id: '5',
    aluno_id: '1',
    data: formatDate(new Date(today.getTime() + 86400000)),
    hora: '09:00',
    local: 'Praia de Ponta Negra',
    instrutor: 'Carlos',
    status: 'Agendada',
  },
  {
    id: '6',
    aluno_id: '2',
    data: formatDate(new Date(today.getTime() + 2 * 86400000)),
    hora: '07:00',
    local: 'Praia do Forte',
    instrutor: 'Bruno',
    status: 'Agendada',
  },
  {
    id: '7',
    aluno_id: '4',
    data: formatDate(new Date(today.getTime() + 3 * 86400000)),
    hora: '08:00',
    local: 'Praia de Ponta Negra',
    instrutor: 'Carlos',
    status: 'Agendada',
  },
  {
    id: '8',
    aluno_id: '3',
    data: formatDate(new Date(today.getTime() - 86400000)),
    hora: '10:00',
    local: 'Praia do Meio',
    instrutor: 'Bruno',
    status: 'Compareceu',
  },
  {
    id: '9',
    aluno_id: '1',
    data: formatDate(new Date(today.getTime() - 2 * 86400000)),
    hora: '07:00',
    local: 'Praia de Ponta Negra',
    instrutor: 'Carlos',
    status: 'Compareceu',
  },
  {
    id: '10',
    aluno_id: '5',
    data: formatDate(new Date(today.getTime() - 3 * 86400000)),
    hora: '09:00',
    local: 'Praia de Ponta Negra',
    instrutor: 'Carlos',
    status: 'Faltou',
  },
];

export const mockPlans: Plan[] = [
  { id: '1', nome: 'Aula Avulsa', qtd_aulas: 1, validade_dias: 30, preco: 130 },
  { id: '2', nome: 'Pacote 4 Aulas', qtd_aulas: 4, validade_dias: 30, preco: 480 },
  { id: '3', nome: 'Pacote 6 Aulas', qtd_aulas: 6, validade_dias: 45, preco: 720 },
  { id: '4', nome: 'Pacote 10 Aulas', qtd_aulas: 10, validade_dias: 90, preco: 950 },
];

export const instructors = ['Torquato'];

export const locations = [
  'Cinelandia',
  'Bomba',
  'Cara de Sapo',
  'Sementeira',
];

// Helper function to get student by ID
export const getStudentById = (id: string): Student | undefined => {
  return mockStudents.find(s => s.id === id);
};

// Helper function to get lessons for a specific date
export const getLessonsForDate = (date: string): Lesson[] => {
  return mockLessons.filter(l => l.data === date);
};

// Helper function to get today's lessons
export const getTodaysLessons = (): Lesson[] => {
  return getLessonsForDate(formatDate(today));
};

// Helper function to get upcoming lessons (next 7 days)
export const getUpcomingLessons = (): Lesson[] => {
  const nextWeek = new Date(today.getTime() + 7 * 86400000);
  return mockLessons.filter(l => {
    const lessonDate = new Date(l.data);
    return lessonDate >= today && lessonDate <= nextWeek;
  });
};
