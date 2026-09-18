/* =============================================================================
 * sw.js — 星光圣域 Service Worker
 * -----------------------------------------------------------------------------
 * 目标：让站内页面之间的切换"无缝"。
 *
 * 策略：
 *   · install ：预缓存全部页面（HTML）与静态资源（CSS/JS/文章索引），
 *               刻意不预缓存 8 MB 的字体文件，字体在首次真正用到时再缓存。
 *   · 导航请求：缓存优先，立即返回已缓存的页面，同时在后台更新缓存；
 *               没有网络时回退到缓存页面 / 离线页。
 *   · 静态资源：stale-while-revalidate（先给缓存，再后台刷新）。
 *
 * 更新机制：seamless.js 每次加载页面都会检查 /sw.js 是否有新版本；
 *           新版本安装完成后立即接管（skipWaiting + clients.claim），
 *           下一次跳转就用到最新页面，不必手动清缓存。
 * ========================================================================== */

const CACHE_VERSION = 'v4.1';
const CACHE_NAME = 'starlight-cache-' + CACHE_VERSION;

// 断网且无缓存时显示的离线页面
const OFFLINE_URL = '/error.html';

// 预缓存清单：全部页面 + 全站共用资源（体积都很小）
const PRECACHE_URLS = [
    // 页面（同时缓存 "目录形式" 与 ".html" 两种地址，命中率更高）
    '/',
    '/index.html',
    '/starmap/',
    '/starmap/index.html',
    '/fleet/',
    '/fleet/index.html',
    '/tool/',
    '/tool/index.html',
    '/archive/',
    '/archive/index.html',
    '/main/mainpage.html',
    '/error.html',

    // 样式
    '/assets/css/global.css',
    '/assets/css/index.css',
    '/assets/css/error.css',
    '/assets/css/archive.css',
    '/assets/css/main/mainpage.css',
    '/assets/css/starmap/index.css',
    '/assets/css/fleet/index.css',
    '/assets/css/tool/index.css',

    // 脚本
    '/assets/js/seamless.js',
    '/assets/js/main.js',
    '/assets/js/background.js',
    '/assets/js/starmap-bg.js',
    '/assets/js/starmap-data.js',
    '/assets/js/starmap.js',
    '/assets/js/marked.min.js',

    // 文章索引
    '/assets/post/index.json'
];

/* ------------------------------- 安装：预缓存 ------------------------------- */

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        // 逐个抓取：单个资源失败（例如某环境不存在该路径）不影响整体安装
        await Promise.all(PRECACHE_URLS.map(async (url) => {
            try {
                const response = await fetch(new Request(url, { cache: 'reload' }));
                if (response && response.ok) {
                    await cache.put(url, response);
                }
            } catch (err) {
                console.log('[SW] 预缓存跳过：', url, err && err.message);
            }
        }));

        console.log('[SW] 预缓存完成，共', PRECACHE_URLS.length, '项');
        await self.skipWaiting();
    })());
});

/* --------------------------- 激活：清理旧缓存并接管 --------------------------- */

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(
            names
                .filter((name) => name !== CACHE_NAME)
                .map((name) => {
                    console.log('[SW] 删除旧缓存：', name);
                    return caches.delete(name);
                })
        );
        await self.clients.claim();
    })());
});

/* --------------------------------- 消息通道 --------------------------------- */

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

/* --------------------------------- 请求拦截 --------------------------------- */

self.addEventListener('fetch', (event) => {
    const request = event.request;

    // 只处理同源 GET
    if (request.method !== 'GET') return;

    let url;
    try {
        url = new URL(request.url);
    } catch (err) {
        return;
    }
    if (url.origin !== self.location.origin) return;

    // Range 请求（部分下载）交给网络，避免缓存返回不完整内容
    if (request.headers.has('range')) return;

    if (request.mode === 'navigate') {
        event.respondWith(handleNavigate(request));
        return;
    }

    event.respondWith(staleWhileRevalidate(request));
});

/** 把成功的同源响应写入缓存（重定向响应与部分响应跳过，失败也不影响页面） */
async function putSafely(cache, request, response) {
    if (!response || !response.ok || response.type !== 'basic' || response.redirected) return;
    try {
        await cache.put(request, response.clone());
    } catch (err) {
        console.log('[SW] 写入缓存失败：', request.url, err && err.message);
    }
}

/* 导航请求：缓存优先 → 后台更新 → 断网回退 */
async function handleNavigate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });

    // 后台更新（不阻塞本次导航）
    const network = fetch(request)
        .then(async (response) => {
            await putSafely(cache, request, response);
            return response;
        })
        .catch(() => null);

    if (cached) return cached;

    const response = await network;
    if (response) return response;

    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;

    return new Response('离线：暂时无法加载该页面', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}

/* 静态资源：先返回缓存，再在后台刷新 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });

    const network = fetch(request)
        .then(async (response) => {
            await putSafely(cache, request, response);
            return response;
        })
        .catch(() => null);

    if (cached) return cached;

    const response = await network;
    if (response) return response;

    return new Response('离线：该资源尚未缓存', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}
