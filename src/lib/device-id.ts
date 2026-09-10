const STORAGE_KEY = 'device_client_id';

// Identificador estável por navegador/instalação (não por usuário) — o login
// é compartilhado entre professor e outras pessoas, então o backend precisa
// de algo que distinga "o aparelho de cada um" pra não limpar o token de
// notificação de uma pessoa quando a outra loga no mesmo app.
export function getClientId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // localStorage indisponível (modo privado, storage bloqueado etc) — sem
    // persistência entre sessões, mas não impede o registro de push nessa vez.
    return crypto.randomUUID();
  }
}
