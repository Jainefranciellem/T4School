import { pedirPermissaoNotificacao } from '../../lib/notifications.service';

export function AtivarNotificacoes() {
    async function handleClick() {
        const ok = await pedirPermissaoNotificacao();

        if (ok) {
            alert('Notificações ativadas com sucesso');
        } else {
            alert('Permissão negada');
        }
    }

    return (
        <button onClick={handleClick}>
            Ativar notificações
        </button>
    );
}
