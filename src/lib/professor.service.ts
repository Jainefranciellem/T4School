export async function salvarDispositivoProfessor(deviceToken: string) {
    await fetch('https://n8n.nexosoftwere.cloud/webhook/salvar-dispositivo-professor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            professor_id: '1',
            device_token: deviceToken,
            platform: 'web',
        }),
    });
}
