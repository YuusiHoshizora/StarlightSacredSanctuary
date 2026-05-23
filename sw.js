// sw.js - Service Worker for Starlight Sacred Sanctuary
const CACHE_NAME = 'starlight-cache-v3.0';

// 需要预缓存的关键资源（全局共用资源，首次安装时缓存）
const PRECACHE_URLS = [
  '/assets/img/bg.webp',
  '/assets/fonts/SarasaUiSC-Regular.woff2',
  // 可添加首页 HTML（可选）
  //'/index.html'
];

// 安装阶段：预缓存 + 跳过等待
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching', PRECACHE_URLS);
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活阶段：删除旧缓存 + 立即接管所有客户端
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// 消息监听：接收前台通知，立即跳过等待（配合页面监听使用）
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 拦截请求 → 网络优先，缓存备用
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 仅处理同源请求（不缓存跨域资源）
  if (request.mode === 'navigate' || request.url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // 网络成功：更新缓存并返回最新响应
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // 网络失败：回退缓存（如果有）
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Serving from cache (offline):', request.url);
              return cachedResponse;
            }
            // 既无网络又无缓存：返回一个简单的离线页
            return new Response('Offline', { status: 503 });
          });
        })
    );
  }
  // 跨域请求直接通过网络获取，不缓存
});
