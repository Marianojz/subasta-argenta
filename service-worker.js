// service-worker.js - Service Worker para PWA - Subasta Argenta
const CACHE_NAME = 'subasta-argenta-v1.0.0';
const DYNAMIC_CACHE = 'subasta-argenta-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

const FIREBASE_ASSETS = [
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js'
];

// Instalación - cachear assets estáticos
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cacheando assets estáticos');
        return cache.addAll([...STATIC_ASSETS, ...FIREBASE_ASSETS]);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación - limpiar cachés viejos
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activado');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Eliminando caché viejo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch - estrategia Network First con Cache Fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Solo cachear GET requests
  if (request.method !== 'GET') return;
  
  // No cachear Firebase API calls
  if (request.url.includes('firestore.googleapis.com') || 
      request.url.includes('firebase') ||
      request.url.includes('firebasestorage')) {
    return;
  }
  
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Si la respuesta es válida, cachearla dinámicamente
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => {
              cache.put(request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, buscar en caché
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Si no está en caché, mostrar página offline
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Manejo de mensajes desde la app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// Sincronización en background (opcional)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-auctions') {
    event.waitUntil(syncAuctions());
  }
});

async function syncAuctions() {
  try {
    console.log('🔄 Sincronizando subastas...');
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Error sincronizando:', error);
    return Promise.reject(error);
  }
}
