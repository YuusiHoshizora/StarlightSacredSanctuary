/* =============================================================================
 * spa.js — 站内「同文档」导航
 * -----------------------------------------------------------------------------
 * Firefox 没有跨文档 View Transitions，但支持**同文档**的
 * document.startViewTransition()。所以站内导航改成"同文档换内容"：
 *
 *   点击（左键、站内、两个页面都在 PILOT 里）
 *     → 并行 fetch：目标页 HTML + 目标页的页面脚本源码
 *     → 预挂目标页 CSS
 *     → document.startViewTransition() 里：
 *         跑上一页注册的清理 → 换内容根（<main> / .main-layout）+ 页脚
 *         → 同步执行目标页脚本 → 改标题 / URL → 回到顶部
 *
 * navbar / 背景画布 / 页脚外壳都不重新加载，换的只有内容；Chrome 与 Firefox
 * 都用同一套 view-transition 伪元素动画（见 global.css），所以是真交叉淡化。
 *
 * 页面脚本按"源码文本"取回来、在换页回调里用 <script> 同步执行 —— 这样数据驱动的
 * 页面（人员 / 设施 / 舰船 / 主页面）在新快照里就已经渲染好，不会先空一下再填。
 * 脚本里如果有全局监听/定时器，必须在结束时注册清理（window.__sssPageCleanup.add）。
 *
 * 试点页面：见下方 PILOT。暂不包含 /tool/starmap/（画布 + 大量 rAF，需要专门拆解）、
 * /main/cq（彩蛋页）和 /archive/organization/（org-secret 的拖拽循环待接入）。
 * ========================================================================== */
(function () {
    'use strict';

    /* 试点页面：全部用 normPath 归一化后的形式（去 .html / 去尾斜杠） */
    var PILOT = {
        '/': true,
        '/about': true,
        '/archive': true,
        '/archive/facility': true,
        '/archive/organization': true,
        '/archive/organization/cam': true,
        /* DGAM 是彩蛋页，但**可以在试点里**：同文档换页只换 <main> 与页脚，
           它依赖的两样东西现在已经就位 ——
             · 登记「已发现」靠 <body data-egg="dgam">，换页后由 syncBody() 搬到 body 上，
               eggs.js 在 sss:swap 时补登记（所以不要再把它挪出 PILOT 来"绕开"这个问题）
             · 「彩蛋已发现」提示条写在 <main> 里面，跟着内容一起换进来 / 换出去
           把它留在 PILOT 里，DGAM 与站内其它页之间才是同文档切换（不再整页跳）。 */
        '/archive/organization/dgam': true,
        '/archive/organization/res': true,
        '/archive/organization/ind': true,
        '/archive/organization/adm': true,
        '/archive/organization/int': true,
        '/archive/organization/dip': true,
        '/archive/organization/col': true,
        '/archive/organization/log': true,
        '/archive/organization/flo': true,
        '/archive/organization/arc': true,
        '/archive/organization/eco': true,
        '/archive/organization/lif': true,
        '/archive/organization/edu': true,
        '/archive/organization/inv': true,
        '/archive/organization/pla': true,
        '/archive/organization/tas': true,
        '/archive/biology': true,
        '/archive/personnel': true,
        '/archive/personnel/sam': true,
        '/archive/personnel/sfm': true,
        '/archive/personnel/spm': true,
        '/archive/personnel/sxm': true,
        '/archive/vessel': true,
        '/fleet': true,
        '/tool': true,
        '/main/mainpage': true,
        /* CQ 彩蛋页（画布 + 音频 + 大量 rAF）以前整页跳转，现在也在试点里 ——
           前提是那页自己做全了这几件事，以后改它别退回去：
             · 弹窗（#cq-modal）与提示条（#cq-toast）写在 <main> 里面
             · 每进来一次发一个 __cqGen 代号，所有异步回调先核对代号；换页时在
               __sssPageCleanup 里作废代号、清定时器、**暂停两段音频**（不暂停会在别的
               页面后台继续响）、取消 rAF、摘掉 <html> 上的 cq-restored / cq-modal-open
             · <head> 里那支「已发现 → cq-restored」同步脚本换页时不跑，所以页面脚本
               要按 localStorage 再对齐一次（否则站内进来会从头演一遍） */
        '/main/cq': true
    };

    /* 全站外壳脚本：不参与"换页后重跑" */
    var SHELL_SCRIPTS = /\/assets\/js\/(boot|background|notice|seamless|navtoggle|eggs|spa)\.js$/;

    function normPath(pathname) {
        var p = String(pathname || '/').replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/+$/, '');
        return p === '' ? '/' : p;
    }

    function isPilotUrl(url) {
        return PILOT[normPath(url.pathname)] === true;
    }

    /* 老内核没有同文档过渡：保持整页跳转 */
    if (!document.startViewTransition) return;
    if (!isPilotUrl(new URL(location.href))) return;

    /* ------------------------- 页面脚本的清理登记表 ------------------------- */
    /* 页面脚本在末尾登记一个清理函数（移除全局监听 / 取消定时器 / 删掉挂到
       body 上的临时节点）。换页前统一跑一遍，避免重复绑定和内存泄漏。 */
    var cleanups = Object.create(null);
    window.__sssPageCleanup = {
        add: function (name, fn) { cleanups[name] = fn; },
        runAll: function () {
            Object.keys(cleanups).forEach(function (name) {
                try { cleanups[name](); } catch (e) { /* 忽略 */ }
                delete cleanups[name];
            });
        }
    };

    var navigating = false;
    var scriptCache = Object.create(null);
    var currentPath = normPath(location.pathname);
    var currentSearch = location.search;

    /* ------------------------------ 链接解析 ------------------------------ */

    function resolveUrl(value, base) {
        try { return new URL(value, base).href; } catch (e) { return null; }
    }

    function samePage(url) {
        return normPath(url.pathname) === normPath(location.pathname) && url.search === location.search;
    }

    /* 顶栏与样式表的相对地址先固化成绝对地址：换页后文档 base URL 会变，
       各页给「当前页」那一项写的 href="." 会解析到新页面（在关于页点「档案」→ 回 /about/），
       样式表的相对 href 也会在深层路径下解析错。 */
    Array.prototype.forEach.call(document.querySelectorAll('.navbar a[href], link[rel="stylesheet"][href], link[rel="icon"][href]'), function (el) {
        var attr = el.tagName === 'LINK' ? 'href' : 'href';
        var abs = resolveUrl(el.getAttribute(attr), location.href);
        if (abs) el.setAttribute(attr, abs);
    });

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
        try { url = new URL(anchor.href, location.href); } catch (e) { return; }
        if (url.origin !== location.origin) return;
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
        /* ?boot=1（工具页「加载测试」）必须整页加载才会重播加载屏，别被同文档导航吃掉 */
        if (/(^|[?&])boot(=|&|$)/.test(url.search)) return;
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
                var scripts = collectScripts(doc, url);
                var texts = unique(scripts.filter(function (s) { return s.src; }).map(function (s) { return s.src; }));
                return Promise.all([
                    preloadStyles(doc, url),
                    Promise.all(texts.map(fetchScript))
                ]).then(function () {
                    return apply(doc, url, scripts, push);
                });
            })
            .catch(function () {
                location.href = url.href;           // 任何一步失败：退回整页跳转
            })
            .then(function () { navigating = false; },
                  function () { navigating = false; location.href = url.href; });
    }

    function unique(list) {
        var seen = Object.create(null);
        return list.filter(function (item) {
            if (seen[item]) return false;
            seen[item] = true;
            return true;
        });
    }

    /* --------------------------- 目标页 CSS 预挂载 --------------------------- */

    function currentStyles() {
        var map = Object.create(null);
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

    function preloadStyles(doc, url) {
        var have = currentStyles();
        var jobs = [];

        wantedStyles(doc, url).forEach(function (abs) {
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

    function pruneStyles(doc, url) {
        var wanted = Object.create(null);
        wantedStyles(doc, url).forEach(function (abs) { wanted[abs] = true; });

        var have = currentStyles();
        Object.keys(have).forEach(function (abs) {
            if (!wanted[abs] && have[abs].parentNode) have[abs].parentNode.removeChild(have[abs]);
        });
    }

    /* ---------------------------- 页面脚本的收集与执行 ---------------------------- */

    /* 这个内联脚本是不是在 <head> 里？
       各页 <head> 里的内联脚本只有两支：决定要不要弹加载屏的守卫、和
       documentElement.classList.add('css-ready')。它们只在整页加载时有意义，
       换页时重跑会把加载屏又打开，所以整类跳过。
       （以前是按"源码里出现 sss-boot"来跳，会误伤正文里提到 sss-boot 的页面脚本 ——
        例如 DGAM 页那段"等加载屏收起来再弹提示条"的脚本，于是它的提示条永远不出现。） */
    function isHeadScript(node) {
        var n = node;
        while (n && n.nodeType === 1) {
            if (n.tagName === 'HEAD') return true;
            n = n.parentNode;
        }
        return false;
    }

    function collectScripts(doc, url) {
        var items = [];
        Array.prototype.forEach.call(doc.querySelectorAll('script'), function (s) {
            if (s.type && s.type !== 'text/javascript') return;      // speculationrules
            var src = s.getAttribute('src');
            if (src) {
                var abs = resolveUrl(src, url.href);
                if (!abs || SHELL_SCRIPTS.test(abs)) return;
                items.push({ src: abs });
                return;
            }
            var code = s.textContent || '';
            if (!code.trim()) return;
            if (isHeadScript(s)) return;                            // 加载屏 / 首帧保护
            items.push({ code: code });
        });
        return items;
    }

    function fetchScript(src) {
        if (scriptCache[src]) return Promise.resolve(scriptCache[src]);
        return fetch(src, { credentials: 'same-origin' }).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        }).then(function (text) {
            scriptCache[src] = text;
            return text;
        });
    }

    function runScript(code) {
        var el = document.createElement('script');
        el.textContent = code;
        el.setAttribute('data-sss-page', '');
        document.body.appendChild(el);
        if (el.parentNode) el.parentNode.removeChild(el);
    }

    /* -------------------------- 把相对地址变成绝对地址 -------------------------- */

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

    function contentRoot(scope) {
        return scope.querySelector('.main-layout') || scope.querySelector('main');
    }

    function replaceContent(doc, url) {
        var oldRoot = contentRoot(document);
        var newRoot = contentRoot(doc);
        if (!oldRoot || !newRoot) return false;
        var imported = document.importNode(newRoot, true);
        absolutize(imported, url);
        oldRoot.parentNode.replaceChild(imported, oldRoot);
        return true;
    }

    function replaceFooter(doc, url) {
        var oldEl = document.querySelector('.site-footer');
        var newEl = doc.querySelector('.site-footer');
        if (!oldEl || !newEl) return;
        var imported = document.importNode(newEl, true);
        absolutize(imported, url);
        oldEl.parentNode.replaceChild(imported, oldEl);
    }

    /* <body> 上的 data-* 属性也要跟着目标页走。
       换页只换 <main> 与页脚，body 本身不换；而彩蛋登记靠 <body data-egg="...">，
       不把属性搬过来，经由站内换页进入的彩蛋页就永远不会被记为"已发现"。
       只搬 data-*（body 的 class / style 由各页脚本和加载屏维护，不碰）。 */
    function syncBody(doc) {
        var target = doc.body;
        if (!target) return;

        var wanted = Object.create(null);
        Array.prototype.forEach.call(target.attributes, function (attr) {
            if (attr.name.indexOf('data-') === 0) wanted[attr.name] = attr.value;
        });

        /* 先删掉目标页没有的 —— 否则离开彩蛋页之后 data-egg 还挂着，
           下一次换页会被当成"又进了一次彩蛋页"。 */
        Array.prototype.slice.call(document.body.attributes).forEach(function (attr) {
            if (attr.name.indexOf('data-') === 0 && !(attr.name in wanted)) {
                document.body.removeAttribute(attr.name);
            }
        });

        Object.keys(wanted).forEach(function (name) {
            document.body.setAttribute(name, wanted[name]);
        });
    }

    function apply(doc, url, scripts, push) {
        var run = function () {
            cleanupsRunAll();

            if (!replaceContent(doc, url)) { location.href = url.href; return; }
            replaceFooter(doc, url);
            syncBody(doc);

            if (doc.title) document.title = doc.title;
            pruneStyles(doc, url);

            /* 先推 URL，再同步执行目标页脚本：数据驱动页面（如 personnel.js）
               要靠新 URL 上的 ?person= 才能选中对应条目 */
            if (push) history.pushState({ sssSpa: true }, '', url.href);

            /* 在同一个任务里同步执行目标页脚本 —— 新快照里内容已经是渲染好的 */
            scripts.forEach(function (item) {
                try { runScript(item.src ? scriptCache[item.src] : item.code); }
                catch (e) { /* 单个脚本失败不影响换页 */ }
            });

            currentPath = normPath(url.pathname);
            currentSearch = url.search;
            window.scrollTo(0, 0);
            document.dispatchEvent(new CustomEvent('sss:swap', { detail: { url: url.href } }));
        };

        /* View Transition 的快照盖在整页最上层，自绘指针层也会被盖住；过渡期间
           让 cursor.js 暂时交回系统光标（同一张静态 SVG），结束再接管回来。
           不然切页那 ~220ms 会完全看不到指针。 */
        document.dispatchEvent(new Event('sss:vt-start'));
        var transition;
        try {
            transition = document.startViewTransition(run);
        } catch (err) {
            document.dispatchEvent(new Event('sss:vt-end'));
            throw err;
        }
        var vtDone = function () { document.dispatchEvent(new Event('sss:vt-end')); };
        transition.finished.then(vtDone, vtDone);

        return transition.finished.catch(function () { });
    }

    function cleanupsRunAll() {
        try { window.__sssPageCleanup.runAll(); } catch (e) { /* 忽略 */ }
    }

    /* ------------------------------ 前进 / 后退 ------------------------------ */

    window.addEventListener('popstate', function () {
        var url = new URL(location.href);
        /* 前进/后退落到 ?boot=1 时也整页重来，才能重播加载屏 */
        if (/(^|[?&])boot(=|&|$)/.test(url.search)) { location.reload(); return; }
        /* popstate 时 location 已经是目标地址，不能拿它和自身比；要跟"当前 DOM 是哪一页"比。
           同页的 # 变化（文章 / 档案条目）交给页面脚本，不要重新换页。 */
        if (normPath(url.pathname) === currentPath && url.search === currentSearch) return;
        if (!isPilotUrl(url)) {         // 上一条不是试点页：离开这个文档，整页加载
            location.reload();
            return;
        }
        navigate(url, false);
    });
})();
