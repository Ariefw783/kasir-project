const CACHE_NAME = 'kasirpro-v1-cache';
const ASSETS_TO_CACHE = [
  './',
  './logo.png'
];

// Event saat Service Worker dipasang (Install)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Event saat Service Worker aktif (Activate)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Event penanganan Fetch (Request Jaringan)
self.addEventListener('fetch', event => {
  // Biarkan request Firebase / Firestore langsung bypass tanpa masuk ke cache lokal Service Worker
  if (
    event.request.url.includes('firestore.googleapis.com') || 
    event.request.url.includes('firebaseinstallations.googleapis.com') ||
    event.request.url.includes('googleapis.com') ||
    event.request.url.includes('gstatic.com')
  ) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Jika ada di cache, gunakan cache. Jika tidak, ambil dari jaringan (network).
      return cachedResponse || fetch(event.request).catch(err => {
        console.warn('Akses jaringan gagal, mengaktifkan respon cadangan offline:', err);
        
        // Mencegah ERR_FAILED dengan mengembalikan respon kosong yang valid secara HTTP jika gagal total
        return new Response('Koneksi terputus. Silakan periksa jaringan Anda.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      });
    })
  );
});