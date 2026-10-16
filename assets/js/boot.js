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
   按各页实际会渲染到的来：界面与正文是 Sarasa（Regular / Bold）；主页面渲染出来的
   Markdown 正文用 Sarasa Mono（global.css 里 .markdown-body 那条），页面上有它才多等一份。
   斜体不在这里等 —— 用得极少，而每多一份就是 5–8 MB。
   加载屏与跨页切换（文件末尾那个 IIFE）共用这一份清单，不在两处各写一遍。 */
function sssFontFaces() {
    var faces = ['400 16px "Sarasa"', '700 16px "Sarasa"'];
    if (document.querySelector('.markdown-body')) {
        faces.push('400 16px "Sarasa Mono"');
        faces.push('700 16px "Sarasa Mono"');
    }
    return faces;
}

(function () {
    'use strict';

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
})();

/* =============================================================================
 * 跨页切换：内容"先藏住、字体就绪再淡入"
 * -----------------------------------------------------------------------------
 * 背景画布与顶栏在每个页面都是同一套，所以页面之间其实只有内容在变。各页 <head> 里
 * 判断"这次是不是站内跳转"（referrer 同源）并给 <html> 挂上 sss-switch —— 内容先藏住；
 * 这里等上面同一批字面加载完成，再换成 sss-switch-in 让它淡入（样式见 global.css）。
 * 于是字体解码那 0.3–0.7 秒的空窗被这段过渡盖住：看到的是"外壳不动、内容淡入"，
 * 而不是"先画回退字体、再换成真字体"的突变。
 *
 * 必须单独一个 IIFE：上面那个在不需要加载屏时会提前 return，写在里面就被跳过了
 * （与 seamless.js 末尾的页脚年份同一套路）。
 * ========================================================================== */
(function () {
    'use strict';

    var root = document.documentElement;
    if (!root.classList.contains('sss-switch')) return;    // 这一趟不是站内跳转

    var MIN_MS = 120;      // 太快会像闪一下，留一点点停顿
    var CAP_MS = 3000;     // 兜底：字体出问题也不能把内容一直藏着
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

    if (document.fonts && document.fonts.load) {
        Promise.all(sssFontFaces().map(function (face) {
            return document.fonts.load(face).catch(function () {});
        }))
            .then(function () { return document.fonts.ready; })
            .then(reveal)
            .catch(reveal);
    } else {
        reveal();
    }
    window.setTimeout(reveal, CAP_MS);
})();
