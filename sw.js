/* ============================================================================
 * EventLink · Service Worker
 * ----------------------------------------------------------------------------
 * Estratégia:
 *   - App shell (HTML/CSS/JS/ícones/fontes): cache-first com atualização em
 *     segundo plano (stale-while-revalidate) → abertura instantânea, como app nativo.
 *   - Firebase (dados em tempo real): SEMPRE network, nunca cacheado, para não
 *     servir dados antigos. Se faltar rede, deixa o erro normal acontecer
 *     (o app já trata isso com toasts de erro).
 * ==========================================================================*/

const CACHE_NAME = 'eventlink-shell-v1';

const SHELL_FILES = [
  './index.html',
  './painel-cliente.html',
  './painel-profissional.html',
  './painel-gestor.html',
  './manifest.json',
  './manifest-cliente.json',
  './manifest-profissional.json',
  './manifest-gestor.json',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-256.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

// Domínios que NUNCA devem ser cacheados (dados em tempo real / SDKs externos)
const NEVER_CACHE_HOSTS = [
  'firebaseio.com',
  'googleapis.com',
  'firebaseapp.com',
  'gstatic.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        SHELL_FILES.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW] Falhou ao cachear', url, err))
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function isNeverCache(url) {
  return NEVER_CACHE_HOSTS.some((host) => url.includes(host));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = request.url;

  // Firebase / fontes / SDK externos: deixa passar direto pela rede, sem cache.
  if (isNeverCache(url)) {
    return; // não intercepta — comportamento padrão do navegador
  }

  // App shell: stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      return cached || network || new Response('Offline', { status: 503 });
    })
  );
});
