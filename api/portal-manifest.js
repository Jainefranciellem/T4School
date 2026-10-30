// Manifest do portal do aluno, servido de uma URL real do mesmo domínio.
// O iOS ignora manifest em data: URI, então o <link rel="manifest"> do Portal
// aponta pra cá. A start_url leva o token, e o ícone instalado abre direto
// no portal em vez de cair no login do professor.
export default function handler(req, res) {
  const token = String(req.query?.token ?? '');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(token)) {
    res.status(400).json({ error: 'token inválido' });
    return;
  }

  const host = req.headers['x-forwarded-host'] ?? req.headers.host;
  const origin = `https://${host}`;
  const startUrl = `${origin}/portal/${token}`;

  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send(
    JSON.stringify({
      id: startUrl,
      name: 'Minhas Aulas',
      short_name: 'Aulas',
      description: 'Agenda de aulas do aluno',
      start_url: startUrl,
      scope: `${origin}/portal/`,
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#ffffff',
      theme_color: '#ff6b00',
      icons: [
        { src: `${origin}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: `${origin}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      ],
    }),
  );
}
