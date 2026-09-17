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
 * ========================================================================== */

(function () {
    'use strict';

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
                .register('/sw.js', { updateViaCache: 'none' })
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
