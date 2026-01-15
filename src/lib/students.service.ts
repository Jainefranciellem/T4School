const API_URLS = {
  LIST: 'https://n8n.nexosoftwere.cloud/webhook/d376860c-6632-490a-99f1-bad44ac1f309',
  CREATE: 'https://n8n.nexosoftwere.cloud/webhook/97d7b623-3144-4c87-84c4-6ff897ff48ac',
  UPDATE: 'https://n8n.nexosoftwere.cloud/webhook/atualizar-aluno',
  DELETE: 'https://n8n.nexosoftwere.cloud/webhook/excluir-aluno',
};


export interface Student {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  plano: 'mensal' | 'trimestral' | 'avulso';
  aulas_restantes?: number;
  status: 'Ativo' | 'Inativo';
}

export async function listarAlunos(): Promise<Student[]> {
  try {
    const res = await fetch(API_URLS.LIST, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
    );

    if (!res.ok) {
      throw new Error('Erro ao listar alunos');
    }

    const data = await res.json();

    // ✅ Garante que sempre seja array
    if (Array.isArray(data)) {
      return data;
    }

    return [];
  } catch (error) {
    console.error('Erro ao buscar alunos:', error);
    return [];
  }
}

export async function criarAluno(data: Omit<Student, 'id'>) {
  const res = await fetch(API_URLS.CREATE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create', // Often helpful for single-webhook setups
      ...data
    }),
  });

  if (!res.ok) throw new Error('Erro ao criar aluno');
  return res.json();
}

export async function atualizarAluno(id: string, data: Partial<Student>) {
  const res = await fetch(API_URLS.UPDATE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      ...data
    }),
  });
  if (!res.ok) throw new Error('Erro ao atualizar aluno');
  return res.json();
}

export async function excluirAluno(id: string) {
  const res = await fetch(API_URLS.DELETE, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error('Erro ao excluir aluno');
  return res.json();
}