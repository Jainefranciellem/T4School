// PWA instalado no celular é suspenso/retomado pelo SO sem disparar uma
// navegação nova, então o Cache-Control do vercel.json nunca chega a ser
// reavaliado. Aqui comparamos o index.html atual com o que está publicado
// sempre que o app volta a ficar visível, e recarregamos se mudou.
const INDEX_URL = '/index.html';

async function fetchIndexHtml(): Promise<string | null> {
  try {
    const res = await fetch(INDEX_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export function watchForNewVersion() {
  let baselineHtml: string | null = null;
  let checking = false;

  fetchIndexHtml().then((html) => {
    baselineHtml = html;
  });

  const checkForUpdate = async () => {
    if (document.visibilityState !== 'visible' || baselineHtml === null || checking) return;
    checking = true;
    const html = await fetchIndexHtml();
    checking = false;
    if (html && html !== baselineHtml) {
      window.location.reload();
    }
  };

  document.addEventListener('visibilitychange', checkForUpdate);
  window.addEventListener('focus', checkForUpdate);
}
