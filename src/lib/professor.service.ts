import { apiFetch } from './api';

export async function salvarDispositivoProfessor(deviceToken: string) {
    await apiFetch('/me/device-token', {
        method: 'POST',
        body: JSON.stringify({
            device_token: deviceToken,
            platform: 'web',
        }),
    });
}
