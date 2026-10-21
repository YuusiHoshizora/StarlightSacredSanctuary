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
 * 重定向响应的处理（踩过的坑，见 asDirectResponse）：
 *   站点的 .html 地址在 Cloudflare 上会先 307 到不带扩展名的规范地址，
 *   于是预缓存 .html 页面拿到的是"被重定向过"的响应。这种响应不能直接用于
 *   导航请求（浏览器会拒绝，整页显示"无法访问此网站"），所以出入缓存前后
 *   都统一洗成等价的普通响应。
 *
 * 更新机制：seamless.js 每次加载页面都会检查 /sw.js 是否有新版本；
 *           新版本安装完成后立即接管（skipWaiting + clients.claim），
 *           下一次跳转就用到最新页面，不必手动清缓存。
 *
 * 本地预览例外：在 localhost / 127.0.0.1 / ::1 上 SW 完全不插手
 *（不预缓存、不拦截、并清掉历史缓存），这样本地改完刷新一次就能看到最新文件，
 *  不会出现"改动没生效"的假象。部署到真实域名后自动启用上面的缓存策略。
 * ========================================================================== */

const CACHE_VERSION = 'v5.62';
const CACHE_NAME = 'starlight-cache-' + CACHE_VERSION;

// 断网且无缓存时显示的离线页面（与线上 404 页是同一个文件，不再存两份）
const OFFLINE_URL = '/404.html';

// 文章索引：由 .github/workflows/generate-post-index.yml 在每次文章变动后重写，
// 所以它是"每次都可能变"的文件 —— 走网络优先，别让新文章晚一次访问才出现
const POST_INDEX_PATH = '/assets/post/index.json';

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
    '/archive/organization/',
    '/archive/organization/index.html',
    '/archive/organization/cam.html',
    '/archive/organization/dgam.html',
    '/archive/organization/res.html',
    '/archive/personnel/',
    '/archive/personnel/index.html',
    '/archive/personnel/sxm.html',
    '/archive/personnel/sam.html',
    '/archive/personnel/sfm.html',
    '/archive/personnel/spm.html',
    '/about/',
    '/about/index.html',
    '/main/mainpage.html',
    '/main/cq.html',
    '/404.html',
    // 样式
    '/assets/css/global.css',
    '/assets/css/index.css',
    '/assets/css/cq-entry.css',
    '/assets/css/error.css',
    '/assets/css/archive.css',
    '/assets/css/archive/organization.css',
    '/assets/css/archive/personnel.css',
    '/assets/css/main/mainpage.css',
    '/assets/css/main/cq.css',
    '/assets/css/starmap/index.css',
    '/assets/css/fleet/index.css',
    '/assets/css/tool/index.css',
    '/assets/css/about/index.css',
    '/assets/css/boot.css',

    // 脚本
    '/assets/js/seamless.js',
    '/assets/js/navtoggle.js',
    '/assets/js/personnel.js',
    '/assets/data/personnel.js',
    '/assets/js/org-member.js',
    '/assets/js/org-secret.js',
    '/assets/js/eggs.js',
    '/assets/js/cq-entry.js',
    '/assets/js/boot.js',
    '/assets/js/notice.js',
    '/assets/js/tool.js',
    '/assets/js/main.js',
    '/assets/js/background.js',
    '/assets/js/starmap-bg.js',
    '/assets/js/starmap-data.js',
    '/assets/js/starmap.js',
    '/assets/js/marked.min.js',

    // 文章索引
    '/assets/post/index.json',

    // 图标
    '/assets/img/logo_SSS.svg',

    // 部门题图（只放已建页的那几张，别一次预缓存 15 张）
    '/assets/img/Deptlogo/title_Dept.RES.png'
];

/* 本地预览（localhost / 127.0.0.1 / ::1）：SW 完全不插手 ——
   请求直接走网络，也不写入任何缓存。
   否则本地改完 CSS/JS 后，页面会先用缓存里的旧文件（stale-while-revalidate），
   看起来就像"改动没生效"。部署到真实域名后自动走下面的正常缓存策略。 */
const DEV_HOST = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1|\[::1\])$/.test(self.location.hostname);

/* 把"跟随过重定向"的响应洗成一份等价的普通响应。
   ----------------------------------------------------------------------------
   为什么必须有它：浏览器禁止用「重定向过的响应」满足导航请求（fetch 规范里
   response.redirected 为真时不能用于 navigate），一旦这么做了，整次导航直接失败，
   访问者看到的是浏览器自己的「无法访问此网站」，连站内 404 页都出不来。

   而站点的 .html 地址在 Cloudflare 静态资源上会先 307 到不带扩展名的规范地址
   （/main/mainpage.html → /main/mainpage），所以预缓存 /main/mainpage.html 时
   拿到的正是这种 redirected === true 的响应 —— 它被原样存进缓存后，
   下次点首页的 ENTER 就必炸。这个坑真机复现过。

   用 new Response(...) 重建一份，status / statusText / headers 原样保留，
   但新响应的 redirected 一定是 false，于是既能安全缓存、也能安全用于导航。 */
function asDirectResponse(response) {
    if (!response || !response.redirected) return response;
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
    });
}

/* ------------------------------- 安装：预缓存 ------------------------------- */

self.addEventListener('install', (event) => {
    if (DEV_HOST) {
        event.waitUntil(self.skipWaiting());
        return;
    }

    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        // 逐个抓取：单个资源失败（例如某环境不存在该路径）不影响整体安装
        await Promise.all(PRECACHE_URLS.map(async (url) => {
            try {
                const response = await fetch(new Request(url, { cache: 'reload' }));
                if (response && response.ok) {
                    // 必须洗一遍再存：.html 页面在这条链上是被 307 过的
                    //（见 asDirectResponse 的注释，存原样会让导航整页失败）
                    await cache.put(url, asDirectResponse(response));
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
                /* 本地预览：以前留下的缓存全部清掉；线上：只删旧版本 */
                .filter((name) => DEV_HOST || name !== CACHE_NAME)
                .map((name) => {
                    console.log('[SW] 删除缓存：', name);
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
    /* 本地预览：不拦截，浏览器直接走网络（永远拿到最新文件） */
    if (DEV_HOST) return;

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

    // 文章索引：网络优先（它由 GitHub Action 在每次文章变动后重写，
    // 缓存优先会让新文章晚一次访问才出现在列表里）
    if (url.pathname === POST_INDEX_PATH) {
        event.respondWith(networkFirst(request));
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(handleNavigate(request));
        return;
    }

    event.respondWith(staleWhileRevalidate(request));
});

/** 网络优先：先要最新的，网络不通再退回缓存 */
async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const response = await fetch(request);
        await putSafely(cache, request, response);   // putSafely 自己会 clone，不影响返回的那份
        return response;
    } catch (err) {
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;
        throw err;
    }
}

/** 把成功的同源响应写入缓存（跳过部分响应，失败也不影响页面）
    被重定向过的响应先洗一遍再存：它本身内容是对的（307 的目标页），
    但带着 redirect 标记存下来，将来就没法用于导航（见 asDirectResponse）。
    注意先 clone 再洗 —— asDirectResponse 会抽走 body，不能影响调用方那一份。 */
async function putSafely(cache, request, response) {
    if (!response || !response.ok || response.type !== 'basic') return;
    try {
        await cache.put(request, asDirectResponse(response.clone()));
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

    // 缓存里那份可能是旧版本存下的"被重定向过的"响应，直接交出去会让整次导航失败，
    // 所以出口处统一洗一遍（对没被重定向的响应是零成本的空操作）
    if (cached) return asDirectResponse(cached);

    const response = await network;
    if (response) return asDirectResponse(response);

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

    if (cached) return asDirectResponse(cached);

    const response = await network;
    if (response) return response;

    return new Response('离线：该资源尚未缓存', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}
