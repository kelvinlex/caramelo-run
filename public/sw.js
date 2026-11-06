// Service Worker para Vira-Lata Run 3D (Caramelo Run PWA)
const CACHE_NAME = 'caramelo-run-v1.0.0';

const INITIAL_CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/logo.png',
  '/logo.jpg',
  '/sounds/batida_carro.mp3',
  '/dinheiro/icone_10_cutout.png',
  '/dinheiro/icone_50_roxo_cutout.png',
  '/dinheiro/icone_100_vermelho_cutout.png'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Instalando PWA Caramelo Run...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pré-carregando arquivos estáticos');
      // addAll falha se 1 arquivo falhar; usa allSettled para não quebrar instalação
      return Promise.allSettled(
        INITIAL_CACHE_ASSETS.map((url) => cache.add(url).catch((err) => console.warn('[SW] Falha ao cachear', url, err)))
      );
    }).then(() => self.skipWaiting())
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Ativando versão:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia de Fetch: Cache First para assets estáticos e Stale-While-Revalidate para o restante
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Ignorar chamadas de API do backend (ex: /api/) para sempre ir na rede
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/mysqlteste')) {
    return;
  }

  // 🚫 IGNORAR completamente Vite Dev Server / HMR em desenvolvimento
  // Sem isso o SW intercepta `src/*.tsx?t=...`, `@vite/client`, etc e quebra o HMR com "Failed to load"
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@react') ||
    url.pathname.startsWith('/@fs') ||
    url.pathname.includes('/node_modules/') ||
    url.search.includes('t=') && url.pathname.match(/\.(tsx?|jsx?|css)$/) ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.includes('__vite')
  ) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Atualiza o cache em segundo plano sem bloquear a resposta rápida
        fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
          }
        }).catch(() => {/* Ignora erros de rede em background */});

        return cachedResponse;
      }

      // Se não está no cache, busca na rede e salva no cache
      return fetch(req).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, responseToCache);
        });

        return networkResponse;
      }).catch((err) => {
        console.warn('[SW] Fetch falhou para', req.url, err);
        // Fallback em modo offline se for uma navegação HTML
        if (req.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
        // Retorna erro de rede como resposta para não quebrar o SW (evita "erro não esperado")
        return new Response('', { status: 504, statusText: 'Gateway Timeout' });
      });
    }).catch((err) => {
      console.warn('[SW] Erro no caches.match', err);
      return fetch(req).catch(() => {
        if (req.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});
