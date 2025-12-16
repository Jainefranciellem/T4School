const API_URL = 'https://n8n.nexosoftwere.cloud/webhook/97d7b623-3144-4c87-84c4-6ff897ff48ac';

export async function listarAlunos() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error('Erro ao listar alunos');
  return res.json();
}

export async function criarAluno(data: any) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error('Erro ao criar aluno');
  return res.json();
}

export async function atualizarAluno(id: string, data: any) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Erro ao atualizar aluno');
  return res.json();
}