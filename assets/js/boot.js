/* =============================================================================
 * boot.js — 首屏加载屏
 * -----------------------------------------------------------------------------
 * 作用：资源还没进缓存时（首次访问、或缓存被清掉），任何页面都先显示加载屏，
 *       等**真正要用到的资源都到手**之后再像舱门一样上下分开、露出页面。
 *
 * 何时显示由各页 <head> 里那段内联脚本决定 —— 必须在首次绘制前同步决定，
 * 否则会先画出页面再盖上，闪一下。判断依据是 localStorage 里的标记：
 *   · 还没有标记 ⇒ 这台浏览器没走过加载流程 ⇒ 显示
 *   · 已有标记   ⇒ 之后各页都不再显示，切换页面不会闪
 * 标记就在 open() 里写入；清掉站点数据会一并清掉它，于是下次访问又会显示一遍。
 * file:// 双击打开（SW 注册不了）、不支持 SW 的浏览器，都不显示。
 *
 * 加载屏现在做的事（不再是"等几个事件"而已）：
 *   ① 等 Service Worker 预缓存完成（页面 / CSS / JS / 数据）
 *   ② 把 7 个字面**真的下载并解码**（约 42.8 MB；字体不进 SW 预缓存，太占更新流量）
 *   ③ 预取文章索引与最新一篇正文，ENTER 进主页面时不再现拉
 *   ④ 等 window load（页面自己的图片 / 样式都到位）
 *   ⑤ 再等资源活动安静下来（最多 4 秒），确认没有漏网之鱼
 * 每一项都对应一条真实的 Resource Timing，明细折叠在加载屏里（默认收起）。
 *
 * 字体单独放一个**跨版本**缓存（starlight-fonts-v1）：SW 每次换 CACHE_VERSION 都会
 * 把页面缓存整个换掉，如果字体也在里面，等于每次部署都要重下 43 MB。页面自己也会往
 * 这个缓存里写（首次访问时 SW 还没接管本页，那时 fetch 到的字体 SW 存不下来）。
 * 页面里的 FONT_CACHE 与 sw.js 里的 FONT_CACHE 必须一致。
 * ========================================================================== */

/* 站点根：本文件就在 <站点根>assets/js/boot.js，去掉这段路径就是根。
   部署在域名根时是 "/"，被放在子路径下（IDE 内置服务器的 /项目名/、或临时挂到别的
   目录下预览）时也能算对 —— 首屏那几个 fetch 原来写的是 "/assets/…"，在子路径下会
   全部 404、连 sw.js 都注册不上。
   ⚠️ 必须在脚本执行期读 document.currentScript：挪到异步回调里就变成 null 了。 */
var SSS_SITE_ROOT = (function () {
    try {
        var script = document.currentScript;
        if (script && script.src) return new URL('../../', script.src).href;
    } catch (e) { /* 忽略，退回域名根 */ }
    return '/';
})();

/* 这台浏览器能不能做"跨文档"的 View Transition（也就是 @view-transition 那套）。
   ⚠️ 不能用 CSS.supports('view-transition-name','none') 判断：Firefox 从 144 起支持
   **同文档**的 View Transitions（属性存在、document.startViewTransition 也有），
   但到 158 仍**没有**跨文档那套 @view-transition 规则 —— 用属性判断会把它误判成"支持"，
   兜底动画永远不触发（这正是之前的 bug：@supports not (view-transition-name:none)
   在所有现代内核里都是死代码）。
   这里换个问法：把那条 at-rule 塞进一张样式表，看它会不会被解析。不认识的 at-rule
   会被整条丢掉（cssRules 长度 0），认识才会留下一条。 */
function sssSupportsCrossDocVT() {
    try {
        var probe = document.createElement('style');
        probe.textContent = '@view-transition{navigation:auto}';
        (document.head || document.documentElement).appendChild(probe);
        var ok = !!(probe.sheet && probe.sheet.cssRules && probe.sheet.cssRules.length);
        if (probe.parentNode) probe.parentNode.removeChild(probe);
        return ok;
    } catch (e) {
        return false;
    }
}

(function () {
    'use strict';

    /* 与 sw.js 里的 FONT_CACHE 一致（改一边就要改另一边）。
       字体文件是"基本不会变"的大文件，单独放一个缓存，SW 换版本时不跟着清掉。 */
    var FONT_CACHE = 'starlight-fonts-v1';

    /* 进门前要真正拿到手的字面（不只是"声明了"）。
       第一项用的就是加载屏自己的字面（boot.css 里的 "SSS Boot Mono"，和全站 Sarasa Mono
       是同一个文件、只是 font-display 用 swap）—— 这样加载屏文字和预热用的是**同一个
       FontFace**，首次访问不会为同一份 5 MB 文件发两次请求。
       其余按使用频率：UI 与正文 → 等宽 → 斜体。 */
    var FONTS = [
        { face: '400 16px "SSS Boot Mono"',      file: 'assets/fonts/SarasaMonoSC-Regular.woff2',     name: 'Sarasa Mono Regular' },
        { face: '400 16px "Sarasa"',             file: 'assets/fonts/SarasaGothicSC-Regular.woff2',   name: 'Sarasa Regular' },
        { face: '700 16px "Sarasa"',             file: 'assets/fonts/SarasaGothicSC-Bold.woff2',      name: 'Sarasa Bold' },
        { face: '700 16px "Sarasa Mono"',        file: 'assets/fonts/SarasaMonoSC-Bold.woff2',        name: 'Sarasa Mono Bold' },
        { face: 'italic 400 16px "Sarasa"',      file: 'assets/fonts/SarasaGothicSC-Italic.woff2',    name: 'Sarasa Italic' },
        { face: 'italic 400 16px "Sarasa Mono"', file: 'assets/fonts/SarasaMonoSC-Italic.woff2',      name: 'Sarasa Mono Italic' },
        { face: 'italic 700 16px "Sarasa Mono"', file: 'assets/fonts/SarasaMonoSC-BoldItalic.woff2',  name: 'Sarasa Mono Bold Italic' }
    ];

    function start() {
        var boot = document.getElementById('boot');
        if (!boot) return;
        if (!document.documentElement.classList.contains('sss-boot')) return;   // 这一趟不需要加载屏

        var MIN_MS = 1400;          // 读数至少走这么久，别一闪而过
        var CAP_TASK = 20000;       // 单个资源的上限
        var CAP_CACHE = 30000;      // 等 SW 预缓存的上限
        var CAP_TOTAL = 60000;      // 兜底：无论如何都要放人进去

        var t0 = Date.now();
        var opened = false;
        var doneCount = 0;
        var totalCount = 0;
        var bytes = 0;
        var failed = 0;
        var lastActivity = Date.now();
        var firstPost = null;

        boot.innerHTML =
            '<div class="boot__half boot__half--top"></div>' +
            '<div class="boot__half boot__half--bottom"></div>' +
            '<div class="boot__seam"></div>' +
            '<div class="boot__bg" aria-hidden="true"></div>' +
            '<div class="boot__frame"></div>' +
            '<div class="boot__inner">' +
                '<div class="boot__head">' +
                    '<div class="boot__title">星光圣域</div>' +
                    '<div class="boot__sub">STARLIGHT SACRED SANCTUARY</div>' +
                '</div>' +
                '<div class="boot__meter">' +
                    '<div class="boot__meter-row">' +
                        '<div class="boot__pct"><span id="boot-pct">00</span><em>%</em></div>' +
                        '<div class="boot__meter-meta">' +
                            '<span><b id="boot-done">0</b> / <b id="boot-total">0</b> 项</span>' +
                            '<span id="boot-bytes">0 KB</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="boot__bar"><i id="boot-bar"></i></div>' +
                '</div>' +
                '<div class="boot__steps" id="boot-steps">' +
                    '<div class="boot__step" data-step="cache"><i></i><span>本地缓存</span></div>' +
                    '<div class="boot__step" data-step="fonts"><i></i><span>字体</span></div>' +
                    '<div class="boot__step" data-step="data"><i></i><span>数据</span></div>' +
                    '<div class="boot__step" data-step="ready"><i></i><span>就绪</span></div>' +
                '</div>' +
                '<div class="boot__now">' +
                    '<i class="boot__now-dot"></i>' +
                    '<span class="boot__now-label" id="boot-now-label">初始化</span>' +
                    '<span class="boot__now-file" id="boot-now">—</span>' +
                '</div>' +
                '<details class="boot__log" id="boot-log-wrap">' +
                    '<summary><span>载入明细</span><b id="boot-log-count">0</b><span>项</span><i class="boot__chev"></i></summary>' +
                    '<div class="boot__log-body" id="boot-log"></div>' +
                '</details>' +
                '<div class="boot__hint">字体 7 种 · 约 42.8 MB，仅首次下载；之后从本地缓存读取</div>' +
            '</div>';

        var byId = function (id) { return document.getElementById(id); };
        var els = {
            pct: byId('boot-pct'),
            done: byId('boot-done'),
            total: byId('boot-total'),
            bytes: byId('boot-bytes'),
            bar: byId('boot-bar'),
            now: byId('boot-now'),
            nowLabel: byId('boot-now-label'),
            log: byId('boot-log'),
            logCount: byId('boot-log-count'),
            logWrap: byId('boot-log-wrap'),
            steps: byId('boot-steps')
        };

        /* ------------------------------ 小工具 ------------------------------ */

        function fmtSize(n) {
            if (!n) return '—';
            if (n < 1024) return n + ' B';
            if (n < 1048576) return Math.round(n / 1024) + ' KB';
            return (n / 1048576).toFixed(1) + ' MB';
        }

        function fmtMs(n) {
            if (!n && n !== 0) return '—';
            return n < 1000 ? Math.round(n) + ' ms' : (n / 1000).toFixed(1) + ' s';
        }

        function pad2(n) { return (n < 10 ? '0' : '') + n; }

        function kindOf(name) {
            var m = /\.([a-z0-9]+)$/i.exec(name);
            var e = m ? m[1].toLowerCase() : '';
            if (e === 'woff2' || e === 'woff' || e === 'ttf' || e === 'otf') return '字体';
            if (e === 'css') return '样式';
            if (e === 'js' || e === 'mjs') return '脚本';
            if (e === 'json') return '数据';
            if (e === 'md') return '正文';
            if (e === 'png' || e === 'jpg' || e === 'jpeg' || e === 'webp' || e === 'gif' || e === 'svg' || e === 'ico') return '图片';
            if (e === 'html') return '页面';
            return '资源';
        }

        function tick() {
            var pct = totalCount ? Math.round(doneCount / totalCount * 100) : 0;
            els.pct.textContent = pad2(pct);
            els.bar.style.width = pct + '%';
            els.done.textContent = String(doneCount);
            els.total.textContent = String(totalCount);
            els.bytes.textContent = fmtSize(bytes);
        }

        function setNow(label, file) {
            els.nowLabel.textContent = label;
            els.now.textContent = file || '—';
        }

        function markStep(name) {
            var el = els.steps.querySelector('[data-step="' + name + '"]');
            if (el) el.className = 'boot__step is-done';
        }

        /* --------------------------- 载入明细（真实时序） --------------------------- */

        var seen = Object.create(null);

        function addRow(entry) {
            var url = entry.name;
            if (seen[url]) return;
            seen[url] = true;
            lastActivity = Date.now();
            if (!/^https?:/i.test(url)) return;

            var file = url.split('/').pop().split('?')[0];
            try { file = decodeURIComponent(file); } catch (e) { /* 保持原样 */ }
            var size = entry.decodedBodySize || entry.transferSize || 0;
            var source = entry.transferSize > 0 ? '网络' : '缓存';

            var row = document.createElement('div');
            row.className = 'boot__log-row';
            row.title = url;

            var kind = document.createElement('i');
            kind.className = 'boot__log-kind';
            kind.textContent = kindOf(file);

            var name = document.createElement('b');
            name.className = 'boot__log-name';
            name.textContent = file;

            var sizeEl = document.createElement('em');
            sizeEl.className = 'boot__log-size';
            sizeEl.textContent = size ? fmtSize(size) : '—';

            var meta = document.createElement('span');
            meta.className = 'boot__log-meta';
            meta.textContent = fmtMs(entry.duration) + ' · ' + source;

            row.appendChild(kind);
            row.appendChild(name);
            row.appendChild(sizeEl);
            row.appendChild(meta);
            els.log.appendChild(row);
            els.logCount.textContent = String(els.log.children.length);
            if (els.logWrap.open) els.log.scrollTop = els.log.scrollHeight;
        }

        try {
            performance.getEntriesByType('resource').forEach(addRow);
        } catch (e) { /* 忽略 */ }

        var observer = null;
        if (window.PerformanceObserver) {
            try {
                observer = new PerformanceObserver(function (list) {
                    list.getEntries().forEach(addRow);
                });
                observer.observe({ type: 'resource', buffered: true });
            } catch (e) { /* 老内核没有 type/buffered，忽略 */ }
        }

        /* ------------------------------- 任务框架 ------------------------------- */

        function withCap(job, ms) {
            return new Promise(function (resolve) {
                var timer = setTimeout(function () { resolve(null); }, ms);
                Promise.resolve().then(job).then(function (size) {
                    clearTimeout(timer);
                    resolve(size == null ? 0 : size);
                }, function () {
                    clearTimeout(timer);
                    resolve(null);          // null = 这一项失败 / 超时
                });
            });
        }

        function runOne(job, ms) {
            return withCap(job, ms).then(function (size) {
                if (size === null) failed++;
                else bytes += size;
                doneCount++;
                tick();
            });
        }

        /* ------------------------------ ① 本地缓存 ------------------------------ */

        /* navigator.serviceWorker.ready 在没有注册时**永远不会 resolve** —— 它等的是
           「有一个 active worker 接管本页」。sw.js 拿不到（404、MIME 不对）或被浏览器策略
           挡住时就是这种情况：原来只能干等到 30 秒上限，用户看到的就是卡在 73%。
           所以先确认「到底有没有注册」：等 load（seamless.js 在 load 之后才注册）之后再给
           3 秒，还没有任何注册就当作没有本地缓存，直接放行。 */
        function hasRegistration() {
            var sw = navigator.serviceWorker;
            if (!sw.getRegistrations) return Promise.resolve(true);   // 老内核没有这个接口
            return sw.getRegistrations().then(function (list) {
                return !!(list && list.length);
            }, function () { return false; });                        // 非安全上下文等：SW 本来就不可用
        }

        function whenLoaded() {
            if (document.readyState === 'complete') return Promise.resolve();
            return new Promise(function (resolve) {
                window.addEventListener('load', function () { resolve(); }, { once: true });
            });
        }

        function waitForRegistration() {
            var tries = 10;                    // 10 × 300ms = 3s
            function poll() {
                return hasRegistration().then(function (ok) {
                    if (ok || --tries <= 0) return ok;
                    return new Promise(function (resolve) { setTimeout(resolve, 300); }).then(poll);
                });
            }
            return hasRegistration().then(function (ok) {
                return ok ? true : whenLoaded().then(poll);
            });
        }

        function waitForReady() {
            if (!navigator.serviceWorker || !navigator.serviceWorker.ready) return Promise.resolve(false);
            return waitForRegistration().then(function (ok) {
                if (!ok) return false;
                return navigator.serviceWorker.ready.then(function () {
                    // clients.claim() 是异步的：等它真的接管本页，这样字体 → SW 才会写进缓存
                    if (navigator.serviceWorker.controller) return true;
                    return new Promise(function (resolve) {
                        var timer = setTimeout(function () { resolve(true); }, 2500);
                        navigator.serviceWorker.addEventListener('controllerchange', function () {
                            clearTimeout(timer);
                            resolve(true);
                        }, { once: true });
                    });
                }, function () { return false; });
            });
        }

        function countCache() {
            if (!window.caches) return Promise.resolve(null);
            return caches.keys().then(function (names) {
                var target = null;
                for (var i = 0; i < names.length; i++) {
                    if (names[i].indexOf('starlight-cache-') === 0) target = names[i];
                }
                if (!target) return null;
                return caches.open(target)
                    .then(function (cache) { return cache.keys(); })
                    .then(function (keys) { return keys.length; });
            }).catch(function () { return null; });
        }

        function runCache() {
            setNow('本地缓存', '预缓存页面、样式与脚本');
            return runOne(function () {
                return waitForReady().then(function (ok) {
                    if (!ok) return 0;
                    setNow('本地缓存', '校验缓存清单');
                    return countCache().then(function (n) {
                        setNow('本地缓存', n == null ? '已就绪' : '已就绪 · ' + n + ' 项');
                        return 0;
                    });
                });
            }, CAP_CACHE).then(function () { markStep('cache'); });
        }

        /* -------------------------------- ② 字体 -------------------------------- */

        function warmFile(url, cacheIt) {
            return fetch(url, { credentials: 'same-origin' }).then(function (res) {
                if (!res || !res.ok) throw new Error('HTTP ' + (res && res.status));

                /* 大字体：页面自己写进跨版本缓存（首次访问时 SW 还没接管，存不下来）。
                   ⚠️ clone 必须在读 body 之前同步做 —— 异步的 caches.open() 回调里再 clone
                   时 body 已经被下面的 reader 读掉，会抛 "body is already used"。 */
                var copy = (cacheIt && window.caches) ? res.clone() : null;
                if (copy) {
                    try {
                        caches.open(FONT_CACHE).then(function (cache) {
                            cache.put(url, copy).catch(function () { });
                        }).catch(function () { });
                    } catch (e) { /* 忽略 */ }
                }

                if (res.body && res.body.getReader) {
                    var reader = res.body.getReader();
                    var size = 0;
                    return (function pump() {
                        return reader.read().then(function (step) {
                            if (step.done) return size;
                            if (step.value) size += step.value.byteLength;
                            return pump();
                        });
                    })();
                }
                return res.blob().then(function (blob) { return blob.size; });
            });
        }

        function warmFont(font) {
            /* 先让字体管线去取（这一步同时把文件放进浏览器缓存），再 fetch 一次：
               · 拿到准确字节数写进读数
               · 把响应写进跨版本缓存（`document.fonts.load` 的请求页面侧拿不到响应）
               顺序很重要：反过来先 fetch 的话，字体管线会再发一次请求。 */
            var load = (document.fonts && document.fonts.load)
                ? document.fonts.load(font.face).catch(function () { })
                : Promise.resolve();

            return load.then(function () {
                return warmFile(SSS_SITE_ROOT + font.file, true);
            });
        }

        function runFonts() {
            var i = 0;

            function next() {
                if (i >= FONTS.length) {
                    markStep('fonts');
                    return Promise.resolve();
                }
                var font = FONTS[i++];
                var short = font.file.split('/').pop();
                setNow('载入字体', short);
                return runOne(function () { return warmFont(font); }, CAP_TASK).then(next);
            }

            return next();
        }

        /* ------------------------------ ③ 文章数据 ------------------------------ */

        function runData() {
            setNow('预载数据', 'index.json');
            return runOne(function () {
                return fetch(SSS_SITE_ROOT + 'assets/post/index.json', { credentials: 'same-origin' })
                    .then(function (res) {
                        if (!res.ok) throw new Error('HTTP ' + res.status);
                        return res.json();
                    })
                    .then(function (list) {
                        if (Array.isArray(list) && list.length) firstPost = String(list[0]);
                        return 0;
                    });
            }, CAP_TASK).then(function () {
                if (!firstPost) { doneCount++; tick(); return; }   // 没有文章：这一项直接算完
                setNow('预载数据', firstPost);
                return runOne(function () {
                    return warmFile(SSS_SITE_ROOT + 'assets/post/' + encodeURIComponent(firstPost), false);
                }, CAP_TASK);
            }).then(function () { markStep('data'); });
        }

        /* ------------------------------ ④ 页面就绪 ------------------------------ */

        function waitLoad() {
            return new Promise(function (resolve) {
                if (document.readyState === 'complete') return resolve(0);
                window.addEventListener('load', function () { resolve(0); }, { once: true });
            });
        }

        function runLoad() {
            setNow('系统就绪', '等待页面自身资源');
            return runOne(waitLoad, CAP_TASK).then(function () { markStep('ready'); });
        }

        /* ------------------------- ⑤ 等资源活动安静下来 ------------------------- */

        function waitQuiet(minQuiet, maxWait) {
            var started = Date.now();
            return new Promise(function (resolve) {
                (function check() {
                    var now = Date.now();
                    if (now - lastActivity >= minQuiet || now - started >= maxWait) return resolve();
                    window.setTimeout(check, 100);
                })();
            });
        }

        /* -------------------------------- 启动 -------------------------------- */

        totalCount = 1 + FONTS.length + 2 + 1;     // 缓存 + 字体 + 索引/正文 + load
        tick();

        var cacheDone = runCache();
        var fontsDone = runFonts();
        var dataDone = cacheDone.then(runData);
        var loadDone = runLoad();

        Promise.all([cacheDone, fontsDone, dataDone, loadDone]).then(function () {
            setNow('就绪', failed ? failed + ' 项跳过' : '全部资源已就绪');
            return waitQuiet(500, 4000);
        }).then(function () {
            if (opened) return;
            window.setTimeout(open, Math.max(0, MIN_MS - (Date.now() - t0)));
        });

        /* -------------------------------- 开门 -------------------------------- */

        function open() {
            if (opened) return;
            opened = true;

            if (observer) {
                try { observer.disconnect(); } catch (e) { /* 忽略 */ }
            }

            /* 记下「这台浏览器已经走过加载流程」：以后各页都不再显示加载屏，
               除非清掉站点数据（localStorage 一并被清）或用 ?boot=1 强制重播。 */
            try { localStorage.setItem('sss-booted', '1'); } catch (e) { /* 无痕模式等，忽略 */ }

            document.documentElement.classList.add('boot-open');
            boot.classList.add('is-open');

            // 通知首页的打字机：可以开始了（见 assets/js/main.js）
            document.dispatchEvent(new Event('sss:booted'));

            window.setTimeout(function () {
                if (boot.parentNode) boot.parentNode.removeChild(boot);
                // 逐个摘掉，别用字符串 replace（会漏掉开头那个类）
                document.documentElement.classList.remove('sss-boot', 'boot-open');
            }, 1200);                        // 0.2s 错拍 + 0.8s 开门 + 余量
        }

        window.setTimeout(open, CAP_TOTAL); // 兜底：网络卡死也放人进去
    }

    /* 预渲染中的文档是隐藏的，先别启动：
       ① 门会在后台放完，用户真正激活后根本看不到；
       ② 隐藏期的 load / 字体事件也不代表用户看到那一刻的状态。
       激活时 <head> 里的 decide() 先注册、先执行，所以这里跑起来时 sss-boot 已经挂好了
       （预渲染期间既不判定、也不消费 sss-boot-next，用户点了别的链接也不会丢标记）。 */
    if (document.prerendering) {
        document.addEventListener('prerenderingchange', start, { once: true });
    } else {
        start();
    }
})();

/* =============================================================================
 * 跨页切换：内容"先藏一瞬、骨架就绪就淡入"
 * -----------------------------------------------------------------------------
 * 背景画布与顶栏在每个页面都是同一套，所以页面之间其实只有内容在变。各页 <head> 里
 * 判断"这次是不是站内跳转"（referrer 同源）并给 <html> 挂上 sss-switch —— 内容先藏住；
 * 这里等**页面骨架就绪**（DOMContentLoaded + 下一帧）就换成 sss-switch-in 让它淡入
 * （样式见 global.css）。
 *
 * ⚠️ 千万别改成"等字体就绪再揭幕"。字体要解码 0.3–0.7 秒（见 global.css 的字体载入策略），
 * 而 sss-switch 藏的是**整块内容**（main / .main-layout / .site-footer），不只是文字 ——
 * 等字体的话整页内容会空掉整整一个字体周期，看起来就是一次黑屏。
 * 文字那边已经由 font-display: block 管着了：字体没到就不显示文字，
 * 骨架（卡片、边框、背景）照常立刻出现。所以这里只管骨架，不管字体。
 *
 * 必须单独一个 IIFE：上面那个在不需要加载屏时会提前 return，写在里面就被跳过了
 * （与 seamless.js 末尾的页脚年份同一套路）。
 * ========================================================================== */
(function () {
    'use strict';

    var root = document.documentElement;

    /* 没有跨文档 View Transitions 的内核（Firefox 等）：旧页面会一直显示到新文档
       可以绘制为止，所以这里就不要再停 120ms 了 —— 停了只是让内容多空白一段。 */
    var noVT = !sssSupportsCrossDocVT();

    if (!root.classList.contains('sss-switch')) return;    // 这一趟不是站内跳转

    var MIN_MS = noVT ? 0 : 120;      // 太快会像闪一下，留一点点停顿
    var CAP_MS = 1500;     // 兜底：无论如何都要把内容放出来
    var t0 = Date.now();
    var done = false;

    function reveal() {
        if (done) return;
        done = true;

        window.setTimeout(function () {
            root.classList.remove('sss-switch');
            root.classList.add('sss-switch-in');
            // 动画放完就把类摘干净，免得 animation 的填充值一直压着 opacity
            window.setTimeout(function () { root.classList.remove('sss-switch-in'); }, 600);
        }, Math.max(0, MIN_MS - (Date.now() - t0)));
    }

    // 骨架就绪（DOM 解析完 + 下一帧，保证布局已经算出来）就揭幕
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            window.requestAnimationFrame(reveal);
        }, { once: true });
    } else {
        window.requestAnimationFrame(reveal);
    }
    window.setTimeout(reveal, CAP_MS);
})();
