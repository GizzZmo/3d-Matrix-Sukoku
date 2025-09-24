const CACHE_NAME = 'sudoku-matrix-v2.0.0';
const STATIC_CACHE_NAME = 'sudoku-static-v2.0.0';
const DYNAMIC_CACHE_NAME = 'sudoku-dynamic-v2.0.0';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/index.tsx',
  '/src/app.component.html',
  '/src/app.component.ts',
  '/src/api.service.ts',
  '/src/pwa.service.ts',
  '/src/matrix-rain.component.ts',
  '/src/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400..900&family=Share+Tech+Mono&display=swap'
];

// API endpoints that should be cached
const API_ENDPOINTS = [
  '/health',
  '/api/v1/leaderboard',
  '/api/v1/statistics'
];

// Network-first strategy for these patterns
const NETWORK_FIRST_PATTERNS = [
  /\/api\/v1\/solver\//,
  /\/api\/v1\/users\//
];

// Cache-first strategy for these patterns  
const CACHE_FIRST_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  /\.(?:css|js|woff|woff2|ttf|eot)$/,
  /cdn\.tailwindcss\.com/,
  /fonts\.googleapis\.com/
];

self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      }),
      self.skipWaiting()
    ])
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (CACHE_FIRST_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Handle navigation requests with network-first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Default: network-first with cache fallback
  event.respondWith(networkFirstStrategy(request));
});

// Handle API requests with intelligent caching
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Network-first for critical operations
  if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(request.url))) {
    return networkFirstStrategy(request);
  }
  
  // Cache-first for relatively static data
  if (url.pathname.includes('/leaderboard') || url.pathname.includes('/statistics')) {
    return cacheFirstWithNetworkUpdate(request);
  }
  
  // POST/PUT/DELETE - always try network, store for background sync if offline
  if (request.method !== 'GET') {
    return handleMutationRequest(request);
  }
  
  return networkFirstStrategy(request);
}

// Network-first strategy with cache fallback
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request.clone(), networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache for:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') || new Response('Offline', { status: 503 });
    }
    
    throw error;
  }
}

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then(networkResponse => {
      if (networkResponse.ok) {
        caches.open(STATIC_CACHE_NAME).then(cache => {
          cache.put(request, networkResponse);
        });
      }
    }).catch(() => {
      // Ignore network errors for background updates
    });
    
    return cachedResponse;
  }
  
  // Not in cache, try network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request.clone(), networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return generic offline response
    return new Response('Resource not available offline', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Cache-first with background network update
async function cacheFirstWithNetworkUpdate(request) {
  const cachedResponse = await caches.match(request);
  
  // Start network request in parallel
  const networkPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      caches.open(DYNAMIC_CACHE_NAME).then(cache => {
        cache.put(request, networkResponse.clone());
      });
    }
    return networkResponse;
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Otherwise wait for network
  return networkPromise;
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Return cached index.html for SPA routing
    const cachedResponse = await caches.match('/index.html');
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback offline page
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>3D Sudoku Matrix - Offline</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Orbitron', sans-serif; background: #000; color: #22d3ee; text-align: center; padding: 50px; }
          h1 { color: #d946ef; text-shadow: 0 0 10px rgba(217, 70, 239, 0.5); }
        </style>
      </head>
      <body>
        <h1>3D Sudoku Matrix</h1>
        <p>You're currently offline. Please check your internet connection and try again.</p>
        <button onclick="window.location.reload()">Retry</button>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Handle POST/PUT/DELETE requests with background sync support
async function handleMutationRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // Store for background sync when online
    if (self.registration && 'sync' in self.registration) {
      const requestData = {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: await request.text(),
        timestamp: Date.now()
      };
      
      // Store in IndexedDB for background sync
      await storeOfflineRequest(requestData);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Request queued for when you\'re back online',
        queued: true
      }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Background sync for offline requests
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineRequests());
  }
});

async function syncOfflineRequests() {
  console.log('Background sync: Processing offline requests...');
  
  try {
    const offlineRequests = await getOfflineRequests();
    
    for (const requestData of offlineRequests) {
      try {
        const response = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        });
        
        if (response.ok) {
          await removeOfflineRequest(requestData.timestamp);
          console.log('Synced offline request:', requestData.url);
        }
      } catch (error) {
        console.error('Failed to sync request:', error);
      }
    }
  } catch (error) {
    console.error('Background sync error:', error);
  }
}

// IndexedDB helpers for offline requests
async function storeOfflineRequest(requestData) {
  // Simplified - in production use proper IndexedDB
  const requests = JSON.parse(localStorage.getItem('offlineRequests') || '[]');
  requests.push(requestData);
  localStorage.setItem('offlineRequests', JSON.stringify(requests));
}

async function getOfflineRequests() {
  return JSON.parse(localStorage.getItem('offlineRequests') || '[]');
}

async function removeOfflineRequest(timestamp) {
  const requests = JSON.parse(localStorage.getItem('offlineRequests') || '[]');
  const filtered = requests.filter(req => req.timestamp !== timestamp);
  localStorage.setItem('offlineRequests', JSON.stringify(filtered));
}

// Push notification handling
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New challenge available!',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Play Now',
        icon: '/assets/icons/play-action.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/assets/icons/close-action.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('3D Sudoku Matrix', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('Service Worker loaded successfully');