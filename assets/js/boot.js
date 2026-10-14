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
            '<div class="boot__hint">首次访问 · 正在把站内资源存到本地，之后就快了</div>' +
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
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { mark('fonts'); });
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
