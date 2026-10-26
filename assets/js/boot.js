/* =============================================================================
 * boot.js — 首屏加载屏
 * -----------------------------------------------------------------------------
 * 作用：资源还没进缓存时（首次访问、或缓存被清掉），任何页面都先显示加载屏，
 *       等资源真的就绪，再像舱门一样上下分开、露出页面。
 *
 * 何时显示由各页 <head> 里那段内联脚本决定 —— 必须在首次绘制前同步决定，
 * 否则会先画出页面再盖上，闪一下。判断依据是 localStorage 里的一个标记：
 *   · 还没有标记 ⇒ 这台浏览器没走过加载流程 ⇒ 显示（这一趟把资源缓存下来）
 *   · 已有标记   ⇒ 之后各页都不再显示，切换页面不会闪
 * 标记就在本文件的 open() 里写入；清掉站点数据会一并清掉它，于是下次访问又会显示一遍。
 * file:// 双击打开（SW 注册不了）、不支持 SW 的浏览器，都不显示。
 *
 * 页面里只需要一个空的 <div class="boot" id="boot"></div>，
 * 里面的结构由这里生成 —— 8 个页面不用重复那一段。
 * ========================================================================== */

/* 这一趟要等哪些字面。
   按各页实际会渲染到的来：界面与正文是 Sarasa（Regular / Bold）；等宽的地方用
   Sarasa Mono —— 主页面渲染出来的 Markdown 正文（global.css 里 .markdown-body 那条），
   以及**加载屏自己的读数**（boot.css 的 .boot__inner）：加载屏是第一次绘制，
   字体没到的话 `font-display: block` 会让读数空着，所以显示加载屏时把它一起等。
   斜体不在这里等 —— 用得极少，而每多一份就是 5–8 MB。
   加载屏与跨页切换（文件末尾那个 IIFE）共用这一份清单，不在两处各写一遍。 */
function sssFontFaces() {
    var faces = ['400 16px "Sarasa"', '700 16px "Sarasa"'];
    var want = [];
    if (document.documentElement.classList.contains('sss-boot')) want.push('400 16px "Sarasa Mono"');
    if (document.querySelector('.markdown-body')) {
        want.push('400 16px "Sarasa Mono"');
        want.push('700 16px "Sarasa Mono"');
    }
    for (var i = 0; i < want.length; i++) {
        if (faces.indexOf(want[i]) < 0) faces.push(want[i]);
    }
    return faces;
}

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

    function start() {
        var boot = document.getElementById('boot');
        if (!boot) return;
        if (!document.documentElement.classList.contains('sss-boot')) return;   // 这一趟不需要加载屏

        /* 三个读数都对应真实事件，而且各有上限：万一 SW 预缓存失败，
           也不能把人一直卡在加载屏上。 */
        var MIN_MS = 1200;      // 再快也让读数走完，别一闪而过
        var CAP_CACHE = 3500;
        var CAP_FONTS = 7000;
        var CAP_ALL = 9000;

        var t0 = Date.now();
        var done = { cache: false, fonts: false, ready: false };
        var opened = false;

        boot.innerHTML =
            '<div class="boot__half boot__half--top"></div>' +
            '<div class="boot__half boot__half--bottom"></div>' +
            '<div class="boot__seam"></div>' +
            '<div class="boot__bg" aria-hidden="true"></div>' +
            '<div class="boot__frame"></div>' +
            '<div class="boot__inner">' +
                '<div class="boot__title">星光圣域</div>' +
                '<div class="boot__sub">STARLIGHT SACRED SANCTUARY</div>' +
                '<div class="boot__steps">' +
                    '<div class="boot__step" data-step="cache"><i></i><span>建立本地缓存</span></div>' +
                    '<div class="boot__step" data-step="fonts"><i></i><span>载入字体</span></div>' +
                    '<div class="boot__step" data-step="ready"><i></i><span>系统就绪</span></div>' +
                '</div>' +
                '<div class="boot__bar"><i id="boot-bar"></i></div>' +
                '<div class="boot__hint">正在进行资源预载中，请稍后</div>' +
            '</div>';

        var bar = document.getElementById('boot-bar');

        function mark(name) {
            if (done[name] || opened) return;
            done[name] = true;

            var el = boot.querySelector('[data-step="' + name + '"]');
            if (el) el.className = 'boot__step is-done';

            var n = 0;
            for (var k in done) { if (done[k]) n++; }
            if (bar) bar.style.width = Math.round(n / 3 * 100) + '%';

            maybeOpen();
        }

        function maybeOpen() {
            if (opened || !done.cache || !done.fonts || !done.ready) return;
            window.setTimeout(open, Math.max(0, MIN_MS - (Date.now() - t0)));
        }

        function open() {
            if (opened) return;
            opened = true;

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

        // ① 预缓存：SW 的 install 里 waitUntil 的就是预缓存，所以 ready 即缓存完成
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then(function () { mark('cache'); },
                                               function () { mark('cache'); });
        } else {
            mark('cache');
        }
        window.setTimeout(function () { mark('cache'); }, CAP_CACHE);

        // ② 字体
        //    必须**显式**要求加载具体字面，不能只 await document.fonts.ready ——
        //    实测（无头 Chrome 量过）那一刻还没有任何字体进入加载流程，ready 是个
        //    已完成的 promise，.then 立刻就跑，这个读数等于形同虚设：门开在字体前面，
        //    露出来的就是"回退字体 → 真实字体"的突变。
        //    字面清单见文件开头的 sssFontFaces()
        var faces = sssFontFaces();
        if (document.fonts && document.fonts.load) {
            Promise.all(faces.map(function (face) {
                // 单个字面失败（例如字体文件缺失）不该把人卡住
                return document.fonts.load(face).catch(function () {});
            }))
                // 再挂一次 ready，兜住页面上其它字面（斜体等）；
                // 放在 loads 之后才可信 —— 这时确实有字体在加载它才会等。
                .then(function () { return document.fonts.ready; })
                .then(function () { mark('fonts'); })
                .catch(function () { mark('fonts'); });
        } else {
            mark('fonts');
        }
        window.setTimeout(function () { mark('fonts'); }, CAP_FONTS);

        // ③ 页面 load
        if (document.readyState === 'complete') {
            mark('ready');
        } else {
            window.addEventListener('load', function () { mark('ready'); });
        }
        window.setTimeout(function () { mark('ready'); }, CAP_ALL);

        window.setTimeout(open, CAP_ALL);       // 兜底：无论如何都放人进去
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

    /* 没有跨文档 View Transitions 的内核（Firefox 等）走 seamless.js 末尾那段兜底：
       上一页点链接时先把内容淡出，这里就不要再停 120ms —— 否则淡出之后还要空一段。 */
    var noVT = !sssSupportsCrossDocVT();
    if (noVT) root.classList.add('sss-no-vt');

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
