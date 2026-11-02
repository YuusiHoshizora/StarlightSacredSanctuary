/* =============================================================================
 * spa.js — 站内「同文档」导航（试点）
 * -----------------------------------------------------------------------------
 * 背景：Firefox 到现在（159）仍没有**跨文档** View Transitions —— 每次点链接都是
 * 真·换文档，做不到 B 站那种「内容交叉淡化」。但 Firefox 支持**同文档**的
 * document.startViewTransition()。所以这里在试点页面之间把导航改成"同文档换内容"：
 *
 *   点击（左键、站内、两个页面都在 PILOT 里）
 *     → fetch 目标页 → 预挂目标页的 CSS
 *     → document.startViewTransition( 换 <main> + <footer>、改标题、pushState )
 *
 * navbar / 背景画布 / 页脚外壳都不重新加载，换的只有内容；Chrome 与 Firefox
 * 都用同一套 view-transition 伪元素动画（见 global.css），所以是真交叉淡化。
 *
 * 只接管 PILOT 里列出的页面：其余链接保持整页跳转，不改变现有行为。
 * 往试点里加页面时要先确认：
 *   · 内容是 <main>（页脚也要能被单独替换）
 *   · 没有页面级内联脚本（换完不会执行），或者在这里补一个 init
 *   · 页面 CSS 是独立文件（会自动挂上/摘掉）
 * ========================================================================== */
(function () {
    'use strict';

    var PILOT = {
        '/about/': true,
        '/archive/': true,
        '/fleet/': true
    };

    function normPath(pathname) {
        var p = String(pathname || '/').replace(/\/index\.html$/, '/');
        // /about 与 /about/ 视为同一页（Cloudflare 两种地址都可能出现）
        if (p !== '/' && !/\/$/.test(p) && !/\.[^/]+$/.test(p)) p += '/';
        return p;
    }

    function isPilotUrl(url) {
        return PILOT[normPath(url.pathname)] === true;
    }

    // 老内核没有同文档过渡：保持整页跳转（现在的淡入行为）
    if (!document.startViewTransition) return;
    // 当前页不是试点：不接管
    if (!isPilotUrl(new URL(location.href))) return;

    var navigating = false;

    /* ------------------------------ 链接解析 ------------------------------ */

    function resolveUrl(value, base) {
        try {
            return new URL(value, base).href;
        } catch (e) {
            return null;
        }
    }

    function samePage(url) {
        return normPath(url.pathname) === normPath(location.pathname) && url.search === location.search;
    }

    /* 顶栏是常驻的（换页不替换），但文档 base URL 会随 pushState 变：
       各个页面给「当前页」那一项写的是 href="."，换到别的路径后它会解析到新页
       （在关于页点「档案」→ 解析回 /about/ → 整页重载，看起来就是"本页跳一下"）。
       所以进来先按此刻的 URL 把顶栏链接固定成绝对地址。 */
    (function absolutizeShell() {
        var nav = document.querySelector('.navbar');
        if (!nav) return;
        Array.prototype.forEach.call(nav.querySelectorAll('a[href]'), function (a) {
            var abs = resolveUrl(a.getAttribute('href'), location.href);
            if (abs) a.setAttribute('href', abs);
        });
    })();

    /* --------------------------------- 点击 --------------------------------- */

    document.addEventListener('click', function (event) {
        if (navigating || event.defaultPrevented) return;
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
        } catch (e) {
            return;
        }
        if (url.origin !== location.origin) return;
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
        if (!isPilotUrl(url)) return;
        if (samePage(url)) {
            if (url.hash) return;               // 同页锚点：交给浏览器滚过去
            event.preventDefault();             // 点当前页自己：不整页重载，回到顶部
            window.scrollTo(0, 0);
            return;
        }

        event.preventDefault();
        navigate(url, true);
    });

    /* ------------------------------ 导航主流程 ------------------------------ */

    function navigate(url, push) {
        if (navigating) return;
        navigating = true;

        fetch(url.href, { credentials: 'same-origin' })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.text();
            })
            .then(function (html) {
                var doc = new DOMParser().parseFromString(html, 'text/html');
                return preloadStyles(doc, url).then(function () {
                    return apply(doc, url, push);
                });
            })
            .catch(function () {
                location.href = url.href;       // 任何一步失败：退回整页跳转
            })
            .then(function () { navigating = false; },
                  function () { navigating = false; location.href = url.href; });
    }

    /* --------------------------- 目标页 CSS 预挂载 --------------------------- */

    function currentStyles() {
        var map = {};
        Array.prototype.forEach.call(document.querySelectorAll('link[rel="stylesheet"][href]'), function (link) {
            var abs = resolveUrl(link.getAttribute('href'), location.href);
            if (abs) map[abs] = link;
        });
        return map;
    }

    function wantedStyles(doc, url) {
        var list = [];
        Array.prototype.forEach.call(doc.querySelectorAll('link[rel="stylesheet"][href]'), function (link) {
            var abs = resolveUrl(link.getAttribute('href'), url.href);
            if (abs) list.push(abs);
        });
        return list;
    }

    /** 目标页需要、当前页还没有的样式表，先挂上并等加载完，避免新快照闪一下无样式 */
    function preloadStyles(doc, url) {
        var have = currentStyles();
        var wanted = wantedStyles(doc, url);
        var jobs = [];

        wanted.forEach(function (abs) {
            if (have[abs]) return;
            jobs.push(new Promise(function (resolve) {
                var link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = abs;
                link.onload = link.onerror = function () { resolve(); };
                document.head.appendChild(link);
                window.setTimeout(resolve, 1500);       // 兜底
            }));
        });

        return Promise.all(jobs);
    }

    /** 换完之后，把目标页不需要的样式表摘掉（试点页的 CSS 都是独立命名空间） */
    function pruneStyles(doc, url) {
        var wanted = {};
        wantedStyles(doc, url).forEach(function (abs) { wanted[abs] = true; });

        var have = currentStyles();
        Object.keys(have).forEach(function (abs) {
            if (!wanted[abs]) {
                var link = have[abs];
                if (link.parentNode) link.parentNode.removeChild(link);
            }
        });
    }

    /* -------------------------- 把相对地址变成绝对地址 -------------------------- */

    /** 换进来的节点是按"目标页"的相对路径写的，留在当前文档里会解析错（如 archive 的
        organization/）。统一按目标页 URL 展开成绝对地址，之后再点也不会错。 */
    function absolutize(root, url) {
        ['href', 'src'].forEach(function (attr) {
            Array.prototype.forEach.call(root.querySelectorAll('[' + attr + ']'), function (el) {
                var value = el.getAttribute(attr);
                if (!value || value.charAt(0) === '#') return;
                var abs = resolveUrl(value, url.href);
                if (abs) el.setAttribute(attr, abs);
            });
        });

        Array.prototype.forEach.call(root.querySelectorAll('[srcset]'), function (el) {
            var value = el.getAttribute('srcset');
            if (!value) return;
            el.setAttribute('srcset', value.split(',').map(function (part) {
                var bits = part.trim().split(/\s+/);
                if (bits[0]) {
                    var abs = resolveUrl(bits[0], url.href);
                    if (abs) bits[0] = abs;
                }
                return bits.join(' ');
            }).join(', '));
        });
    }

    /* -------------------------------- 替换内容 -------------------------------- */

    function replaceInto(doc, url, selector) {
        var oldEl = document.querySelector(selector);
        var newEl = doc.querySelector(selector);
        if (!oldEl || !newEl) return;
        var imported = document.importNode(newEl, true);
        absolutize(imported, url);
        oldEl.parentNode.replaceChild(imported, oldEl);
    }

    function initPage(url) {
        var path = normPath(url.pathname);

        /* 关于页的两块内联交互（换页时内联脚本不会执行，这里补上） */
        if (path === '/about/') {
            var card = document.getElementById('about-notice');
            if (card) {
                var openNotice = function () { document.dispatchEvent(new Event('sss:notice')); };
                card.addEventListener('click', openNotice);
                card.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openNotice();
                    }
                });
            }
        }

        /* eggs.js 里「关于」页那张卡片：让它重新填一次 */
        document.dispatchEvent(new CustomEvent('sss:swap', { detail: { url: url.href } }));
    }

    function apply(doc, url, push) {
        var run = function () {
            replaceInto(doc, url, 'main');
            replaceInto(doc, url, '.site-footer');

            if (doc.title) document.title = doc.title;
            pruneStyles(doc, url);

            if (push) history.pushState({ sssSpa: true }, '', url.href);
            window.scrollTo(0, 0);
            initPage(url);
        };

        return document.startViewTransition(run).finished.catch(function () { });
    }

    /* ------------------------------ 前进 / 后退 ------------------------------ */

    window.addEventListener('popstate', function () {
        var url = new URL(location.href);
        if (!isPilotUrl(url)) {         // 上一条不是试点页：离开这个文档，整页加载
            location.reload();
            return;
        }
        navigate(url, false);
    });
})();
