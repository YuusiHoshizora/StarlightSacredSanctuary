// sw.js - Service Worker for Starlight Sacred Sanctuary
const CACHE_NAME = 'starlight-cache-v1';

// 需要预缓存的关键资源（所有页面共用的 bg.png、字体、全局 CSS/JS）
const PRECACHE_URLS = [
  '/assets/img/bg.png',
  '/assets/fonts/SarasaUiSC-Regular.woff2',
  '/assets/css/globle.css',
  '/assets/js/main.js',
  // 如果希望离线也能访问首页，可以添加首页 HTML 本身
  '/index.html'
];

// 安装阶段：预缓存所有关键资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching', PRECACHE_URLS);
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      // 跳过等待，立即激活新 SW
      return self.skipWaiting();
    })
  );
});

// 激活阶段：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // 立即控制所有客户端（包括已打开的页面）
      return self.clients.claim();
    })
  );
});

// 拦截请求：优先从缓存返回，缓存未命中时从网络获取并加入缓存
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 只缓存同源请求（不缓存跨域资源如 CDN）
  if (request.mode === 'navigate' || request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // 命中缓存，直接返回（无网络请求）
          return cachedResponse;
        }

        // 未命中，从网络获取
        return fetch(request).then((networkResponse) => {
          // 只缓存成功的响应（图片、字体、样式等）
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch((error) => {
          // 网络失败时，对于导航请求可以返回离线页面（此处简单返回错误）
          console.error('[SW] Fetch failed:', error);
          // 可返回一个自定义离线页面
          // if (request.mode === 'navigate') { ... }
        });
      })
    );
  } else {
    // 非同源请求（例如外部字体CDN）正常通过网络获取
    return;
  }
});