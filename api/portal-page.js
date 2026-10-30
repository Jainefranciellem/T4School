// Serve o index.html do app para /portal/<token> já com o manifest do aluno
// no <head>. O iOS lê o manifest ao carregar o HTML, antes do React rodar,
// então trocar o <link> via JavaScript chega tarde: o ícone instalado
// herdaria a start_url "/" do manifest global e abriria o login do professor.
export default async function handler(req, res) {
  const token = String(req.query?.token ?? '');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(token)) {
    res.status(400).send('token inválido');
    return;
  }

  const host = req.headers['x-forwarded-host'] ?? req.headers.host;
  const upstream = await fetch(`https://${host}/index.html`);
  if (!upstream.ok) {
    res.status(502).send('falha ao carregar o app');
    return;
  }

  const html = (await upstream.text())
    .replace(
      '<link rel="manifest" href="/manifest.json">',
      `<link rel="manifest" href="/api/portal-manifest?token=${token}">`,
    )
    .replace(
      '<meta name="apple-mobile-web-app-title" content="Agenda">',
      '<meta name="apple-mobile-web-app-title" content="Minhas Aulas">',
    );

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(200).send(html);
}
