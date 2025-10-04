/**
 * File: app/public/sw.js
 * Service Worker untuk PWA, menangani caching dan offline mode.
 * VERSI PERBAIKAN: Mengatasi error POST request caching dan menerapkan strategi yang tepat.
 */

// VERSI BARU: Setiap ada perubahan, naikkan nomor versi ini
const CACHE_NAME = 'family-laundry-cache-v1.1.19134'; 

const CORE_ASSETS = [
  './',
  'index.php',
  'css/style.css',
  'manifest.json',
  'js/main.js',
  'js/api.js',
  'js/ui.js',
  'js/modals.js',
  'js/dashboard.js',
  'js/transaksi.js',
  'js/absensi.js',
  'js/profil.js',
  'js/karyawan.js',
  'js/konsumen.js',
  'js/layanan.js',
  'js/kategori.js',
  'js/kecepatan.js',
  'js/outlet.js',
  'js/laporan.js',
  'js/laporan_absensi.js',
  'js/settings.js',
  'js/tugas.js',
  'js/tugas_luar.js',
  'js/image-compressor.js',
  'js/ringkasan_harian.js',
  'js/shift.js',
  'js/proses_kerja.js',
  'js/setoran_kas.js',
  'js/layanan_b2b.js',
  'js/verifikasi_b2b.js'
];

const CDN_ASSETS = [
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://unpkg.com/sweetalert/dist/sweetalert.min.js'
];

self.addEventListener('install', event => {
    console.log(`Service Worker: Menginstall versi ${CACHE_NAME}...`);
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            const coreAssetsPromise = cache.addAll(CORE_ASSETS.map(url => new Request(url, {cache: 'reload'})));
            
            const cdnAssetsPromise = Promise.all(
                CDN_ASSETS.map(url => {
                    const request = new Request(url, { mode: 'no-cors' });
                    return fetch(request).then(response => cache.put(url, response));
                })
            );
            return Promise.all([coreAssetsPromise, cdnAssetsPromise]);
        }).then(() => {
            console.log(`Service Worker: Instalasi ${CACHE_NAME} berhasil`);
            self.skipWaiting(); // Aktifkan SW baru segera setelah instalasi
        }).catch(error => {
            console.error('Service Worker: Error saat instalasi:', error);
        })
    );
});

self.addEventListener('activate', event => {
    console.log(`Service Worker: Mengaktifkan versi ${CACHE_NAME}...`);
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Menghapus cache lama:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log(`Service Worker: ${CACHE_NAME} aktif dan mengendalikan semua clients`);
            self.clients.claim();
        }).catch(error => {
            console.error('Service Worker: Error saat aktivasi:', error);
        })
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    
    // Periksa apakah ini request ke API
    const isApiRequest = request.url.includes('/api.php');
    
    // PERBAIKAN: Handle API requests dengan benar
    if (isApiRequest) {
        // Hanya cache GET requests ke API, skip POST/PUT/DELETE
        if (request.method !== 'GET') {
            // Untuk non-GET requests, langsung fetch tanpa caching
            console.log(`Service Worker: Skip caching untuk ${request.method} request ke API`);
            event.respondWith(
                fetch(request).catch(error => {
                    console.error('Service Worker: Error pada API request:', error);
                    throw error;
                })
            );
            return;
        }
        
        // STRATEGI: Network First untuk GET API requests
        console.log('Service Worker: Network-first strategy untuk GET API request');
        event.respondWith(
            fetch(request)
                .then(networkResponse => {
                    // Hanya cache response yang berhasil (status 200-299)
                    if (networkResponse.ok) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseToCache);
                            console.log('Service Worker: API response disimpan ke cache');
                        }).catch(cacheError => {
                            console.warn('Service Worker: Error saat menyimpan API ke cache:', cacheError);
                        });
                    }
                    return networkResponse;
                })
                .catch(networkError => {
                    console.warn('Service Worker: Network error untuk API, mencoba cache:', networkError);
                    // Jika jaringan gagal, coba ambil dari cache
                    return caches.match(request).then(cachedResponse => {
                        if (cachedResponse) {
                            console.log('Service Worker: Menggunakan cached API response');
                            return cachedResponse;
                        }
                        // Jika tidak ada di cache juga, lempar error
                        throw networkError;
                    });
                })
        );
        return;
    }

    // STRATEGI: Cache First untuk aset statis (HTML, CSS, JS)
    event.respondWith(
        caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
                console.log('Service Worker: Menggunakan cached static asset:', request.url);
                return cachedResponse;
            }
            
            // Tidak ada di cache, fetch dari network
            console.log('Service Worker: Fetching static asset dari network:', request.url);
            return fetch(request).then(networkResponse => {
                // Hanya cache response yang berhasil
                if (networkResponse.ok) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseToCache);
                        console.log('Service Worker: Static asset disimpan ke cache');
                    }).catch(cacheError => {
                        console.warn('Service Worker: Error saat menyimpan static asset ke cache:', cacheError);
                    });
                }
                return networkResponse;
            }).catch(networkError => {
                console.error('Service Worker: Failed to fetch static asset:', networkError);
                
                // Untuk HTML requests yang gagal, coba return halaman offline
                if (request.destination === 'document') {
                    return new Response(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Offline - Family Laundry</title>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <style>
                                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                                .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                                .icon { font-size: 48px; color: #ccc; margin-bottom: 20px; }
                                h1 { color: #333; margin-bottom: 10px; }
                                p { color: #666; margin-bottom: 20px; }
                                button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
                                button:hover { background: #0056b3; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="icon">📱</div>
                                <h1>Anda Sedang Offline</h1>
                                <p>Aplikasi Family Laundry tidak dapat terhubung ke internet. Periksa koneksi Anda dan coba lagi.</p>
                                <button onclick="window.location.reload()">Coba Lagi</button>
                            </div>
                        </body>
                        </html>
                    `, {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: { 'Content-Type': 'text/html' }
                    });
                }
                
                throw networkError;
            });
        })
    );
});

// Handle messages dari main thread
self.addEventListener('message', event => {
    if (event.data?.action === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
    
    if (event.data?.action === 'skipWaiting') {
        console.log('Service Worker: Menerima perintah skipWaiting');
        self.skipWaiting();
    }
    
    if (event.data?.action === 'CLEAR_CACHE') {
        console.log('Service Worker: Membersihkan cache...');
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }).then(() => {
                console.log('Service Worker: Semua cache dibersihkan');
                event.ports[0].postMessage({ success: true });
            })
        );
    }
});

// Handle background sync (untuk future enhancement)
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        console.log('Service Worker: Background sync triggered');
        event.waitUntil(
            // Handle background sync tasks di sini
            Promise.resolve().then(() => {
                console.log('Service Worker: Background sync completed');
            })
        );
    }
});

// Handle push notifications (untuk future enhancement)
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body || 'Ada update baru di Family Laundry!',
            icon: '/icon-192x192.png',
            badge: '/icon-72x72.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: data.id || 1,
                url: data.url || '/'
            },
            actions: [
                {
                    action: 'open',
                    title: 'Buka',
                    icon: '/icon-72x72.png'
                },
                {
                    action: 'close',
                    title: 'Tutup'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title || 'Family Laundry', options)
        );
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification clicked', event);
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            // Cari window yang sudah terbuka
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Jika tidak ada window yang terbuka, buka yang baru
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

console.log(`Service Worker: ${CACHE_NAME} loaded and ready`);