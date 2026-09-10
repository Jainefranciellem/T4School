import { apiFetch } from './api';
import { getClientId } from './device-id';

export async function salvarDispositivoProfessor(deviceToken: string) {
    await apiFetch('/me/device-token', {
        method: 'POST',
        body: JSON.stringify({
            device_token: deviceToken,
            platform: 'web',
            client_id: getClientId(),
        }),
    });
}
