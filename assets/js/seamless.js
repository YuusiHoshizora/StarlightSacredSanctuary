/* =============================================================================
 * seamless.js — 全站"无缝切换"辅助脚本
 * -----------------------------------------------------------------------------
 * 页面之间的淡入淡出由 global.css 里的跨文档 View Transitions 提供（纯 CSS，
 * 不需要 JS 参与）。本脚本只负责"让下一页提前就绪"，共两件事：
 *
 * 1) Service Worker
 *    /sw.js 会预缓存全部页面与静态资源；导航请求采用"缓存优先 + 后台更新"，
 *    于是第二次进入任意页面几乎瞬时完成（断网也能打开）。这里负责注册，
 *    并在每次加载时主动检查更新，避免长期停留在旧缓存上。
 *
 * 2) 预取回退（仅非 Chromium 内核）
 *    Chrome / Edge 由页面里的 <script type="speculationrules"> 负责预渲染；
 *    Safari / Firefox 等不支持推测规则的内核，则在鼠标悬停 / 键盘聚焦 /
 *    触摸按下时，提前把目标页面取回本地缓存。
 *
 * 3) 页脚的版权年份（文件末尾，单独一个 IIFE）
 *    起止年的「起始年」写在 HTML 里，结束年改成当年，省得每年一月回头改一遍。
 *    注意：主 IIFE 在支持推测规则的内核里会提前 return，所以这段必须单独成块。
 * ========================================================================== */

(function () {
    'use strict';

    /* 站点根：本文件在 <站点根>assets/js/seamless.js，去掉这段路径就是根。
       部署在域名根时是 "/"；被放在子路径下预览（IDE 内置服务器的 /项目名/）时也对 ——
       原来写死 '/sw.js'，子路径下会 404，SW 注册不上，首屏加载屏就会一直等它。
       ⚠️ 必须在脚本执行期读 document.currentScript（下面注册发生在 load 回调里）。 */
    var SITE_ROOT = (function () {
        try {
            var script = document.currentScript;
            if (script && script.src) return new URL('../../', script.src).href;
        } catch (err) { /* 忽略，退回域名根 */ }
        return '/';
    })();

    /* ------------------------------ Service Worker ----------------------------- */

    function activate(worker) {
        try {
            worker.postMessage({ type: 'SKIP_WAITING' });
        } catch (err) {
            /* 忽略：不影响页面功能 */
        }
    }

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker
                .register(SITE_ROOT + 'sw.js', { updateViaCache: 'none' })
                .then(function (reg) {
                    // 已有等待中的新版本：立即让它接管（新版本已预缓存好最新页面）
                    if (reg.waiting) {
                        activate(reg.waiting);
                    }

                    reg.addEventListener('updatefound', function () {
                        var installing = reg.installing;
                        if (!installing) return;
                        installing.addEventListener('statechange', function () {
                            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                                activate(installing);
                            }
                        });
                    });

                    // 每次打开页面都检查一次更新
                    reg.update().catch(function () {});
                })
                .catch(function (err) {
                    console.log('[seamless] SW registration failed: ', err);
                });
        });

        /* 新版本接管时留个标记：说明刚部署过、SW 的缓存整个换了一轮，
           下次导航补弹一次加载屏（各页 <head> 里读 sss-boot-next，读走即清）。
           只在"本来就有控制器"时才记 —— 首次安装也会触发 controllerchange，
           而那一次本来就已经弹过加载屏了，不能再多记一次。
           注意这段必须在下面「预取回退」那个 return 之前。 */
        var hadController = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.addEventListener('controllerchange', function () {
            if (!hadController) return;
            try { localStorage.setItem('sss-boot-next', '1'); } catch (err) { /* 无痕模式等，忽略 */ }
        });
    }

    /* ------------------------ 预取回退（仅非 Chromium 内核） ------------------------ */

    // 支持推测规则的内核交给浏览器预渲染，不重复劳动
    if (window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
        return;
    }

    // 省流量 / 慢速网络下不做预取
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
    if (conn.saveData) return;
    if (/(^|-)2g$/.test(conn.effectiveType || '')) return;

    var MAX_PREFETCH = 8;
    var prefetched = Object.create(null);
    var prefetchCount = 0;

    /** 判断某个链接是否值得预取，返回规范化后的绝对 URL 或 null */
    function targetUrl(anchor) {
        if (!anchor || anchor.target || anchor.hasAttribute('download')) return null;
        if (anchor.dataset && anchor.dataset.noPrefetch !== undefined) return null;

        var raw = anchor.getAttribute('href');
        if (!raw || raw.charAt(0) === '#') return null;

        var url;
        try {
            url = new URL(anchor.href, location.href);
        } catch (err) {
            return null;
        }

        if (url.origin !== location.origin) return null;           // 站外链接不预取
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        if (url.pathname === location.pathname && url.search === location.search) return null; // 当前页

        url.hash = '';
        return url.href;
    }

    function prefetch(anchor) {
        if (prefetchCount >= MAX_PREFETCH) return;

        var href = targetUrl(anchor);
        if (!href || prefetched[href]) return;

        prefetched[href] = true;
        prefetchCount++;

        try {
            fetch(href, { credentials: 'same-origin', priority: 'low' }).catch(function () {
                /* 预取失败无所谓，点击时还有正常导航 */
            });
        } catch (err) {
            /* 忽略 */
        }
    }

    function onIntent(event) {
        var node = event.target;
        if (!node || !node.closest) return;
        var anchor = node.closest('a[href]');
        if (anchor) prefetch(anchor);
    }

    document.addEventListener('pointerover', onIntent, { passive: true });
    document.addEventListener('focusin', onIntent, true);
    document.addEventListener('touchstart', onIntent, { passive: true });
})();

/* =============================================================================
 * 页脚的版权年份
 * -----------------------------------------------------------------------------
 * HTML 里写着 `© <span class="copyright-years" data-since="2025">2025–2026</span>`，
 * 起始年写死、结束年由这里改成当年 —— 跨年不用回头改 8 个页面。
 * 静态年份本来就写在 HTML 里，所以禁用 JS 时也显示得出来（只是不会自动跨年）。
 * 单独一个 IIFE：上面那个在支持推测规则的内核里会提前 return，写在里面会被跳过。
 * ========================================================================== */
(function () {
    'use strict';

    var els = document.querySelectorAll('.copyright-years');
    if (!els.length) return;

    var now = new Date().getFullYear();

    Array.prototype.forEach.call(els, function (el) {
        var since = parseInt(el.getAttribute('data-since'), 10);
        if (!since || !now || now < since) return;
        el.textContent = now > since ? since + '–' + now : String(since);
    });
})();
