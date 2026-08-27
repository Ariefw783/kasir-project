const CACHE_NAME = 'kasirpro-v2.2-cache';
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

// Event penanganan Fetch (Request Jaringan) - Strategi Hybrid
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
  
  // 1. Strategi Network-First khusus untuk index.html agar perubahan kode langsung terlihat
  if (event.request.mode === 'navigate' || event.request.url.endsWith('index.html') || event.request.url === self.location.origin + '/') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Jika jaringan berhasil, simpan/perbarui file index.html terbaru ke dalam cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match(event.request)) // Jika offline atau jaringan gagal, gunakan cache sebagai cadangan
    );
  } else {
    // 2. Strategi Cache-First untuk aset statis lainnya (seperti logo.png) agar aplikasi memuat lebih cepat
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        return cachedResponse || fetch(event.request).catch(() => {});
      })
    );
  }
});
