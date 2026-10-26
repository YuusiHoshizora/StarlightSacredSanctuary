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
 * 没有跨文档 View Transitions 时的兜底切换动画
 * -----------------------------------------------------------------------------
 * Chrome / Edge / Safari 由 global.css 里的 @view-transition 自己做跨页淡出淡入，
 * 这里什么都不做。
 *
 * Firefox（实测 158：document.startViewTransition 存在、但 @view-transition 会被丢掉）
 * 没有跨文档过渡。不补的话：上一页"啪"地消失 → 新页面白等 sss-switch 揭幕 →
 * 内容才淡入，中间空一段，看起来就没有切换动画。
 *
 * 所以这里在**左键点站内链接**时手动接一下：先给 <html> 挂 sss-leaving
 * （CSS 让内容淡出 160ms），再跳转；下一页 <head> 里的 sss-switch 照常把新内容淡入。
 * 两头接上，观感接近原生过渡。顶栏与背景不动，仍然是「外壳常驻、内容替换」。
 *
 * 只处理最普通的左键点站内链接：带修饰键 / 中键 / target=_blank / download /
 * 站外 / 同页锚点，全部交给浏览器默认行为。
 * 判断"支持不支持"用 boot.js 里的 sssSupportsCrossDocVT()（两处复用同一份实现）。
 * ========================================================================== */
(function () {
    'use strict';

    function supports() {
        if (typeof sssSupportsCrossDocVT === 'function') return sssSupportsCrossDocVT();
        // boot.js 没加载时的独立判断，逻辑与 boot.js 里那份一致
        try {
            var probe = document.createElement('style');
            probe.textContent = '@view-transition{navigation:auto}';
            (document.head || document.documentElement).appendChild(probe);
            var ok = !!(probe.sheet && probe.sheet.cssRules && probe.sheet.cssRules.length);
            if (probe.parentNode) probe.parentNode.removeChild(probe);
            return ok;
        } catch (err) {
            return false;
        }
    }

    if (supports()) return;

    var root = document.documentElement;
    root.classList.add('sss-no-vt');

    // 省电 / 减少动态效果：不做滞后跳转，直接跳
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var LEAVE_MS = 160;          // 与 CSS 里 sss-content-out 的时长一致
    var leaving = false;

    document.addEventListener('click', function (event) {
        if (leaving || event.defaultPrevented) return;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        var node = event.target;
        var anchor = node && node.closest ? node.closest('a[href]') : null;
        if (!anchor) return;
        if (anchor.target && anchor.target !== '_self') return;
        if (anchor.hasAttribute('download')) return;

        var href = anchor.getAttribute('href');
        if (!href || href.charAt(0) === '#') return;

        var url;
        try {
            url = new URL(anchor.href, location.href);
        } catch (err) {
            return;
        }
        if (url.origin !== location.origin) return;
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
        // 同页只改 hash：不跳转，别淡出
        if (url.pathname === location.pathname && url.search === location.search && url.hash) return;

        event.preventDefault();
        leaving = true;
        root.classList.add('sss-leaving');

        window.setTimeout(function () { location.href = url.href; }, LEAVE_MS);
    });
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
