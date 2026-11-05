/* =============================================================================
 * archive-scroll.js — 档案页滚动区的上下淡出开关
 * -----------------------------------------------------------------------------
 * 档案页的滚动容器（普通页的 .archive-body，两栏页的名录 / 内容栏）只在
 * **真的还有内容要滚**时才挂 mask 渐变：
 *
 *   · can-down —— 下面还有内容 → 下端淡出（第一屏就能看见的边界）
 *   · can-up   —— 上面还有内容（已经往下滚过）→ 上端淡出
 *
 * 所以：
 *   · 短内容（不产生滚动）一个类都不加，不会被两端渐变平白压暗；
 *   · 停在顶部时只淡出下端，第一行的标题 / 第一条不会被压暗；
 *   · 滚到最底部时只淡出上端，最后一条能完整读到。
 * 渐变长度由 archive.css 的 --archive-fade 给出（桌面 120px / 窄屏 80px）。
 *
 * 页面脚本（personnel / facility / vessel）切换条目后要调一次
 * window.__sssArchiveScroll.refresh()，因为右栏内容的 scrollHeight 变了。
 * 站内换页（spa.js）会重跑本脚本；清理函数把监听摘掉，别让它挂在旧 DOM 上。
 * ========================================================================== */
(function () {
    'use strict';

    var SCROLLERS = '.archive-body, .personnel-list, .facility-list, .vessel-list,' +
        ' .personnel-detail, .facility-detail, .vessel-detail';

    var nodes = [];
    var frame = 0;

    function update(el) {
        var max = el.scrollHeight - el.clientHeight;
        var overflow = max > 1;
        el.classList.toggle('can-up', overflow && el.scrollTop > 1);
        el.classList.toggle('can-down', overflow && el.scrollTop < max - 1);
    }

    function updateAll() {
        frame = 0;
        nodes.forEach(update);
    }

    function schedule() {
        if (frame) return;
        frame = window.requestAnimationFrame(updateAll);
    }

    function bind() {
        nodes.forEach(function (el) {
            el.removeEventListener('scroll', schedule);
        });

        nodes = Array.prototype.slice.call(document.querySelectorAll(SCROLLERS));
        nodes.forEach(function (el) {
            el.addEventListener('scroll', schedule, { passive: true });
            update(el);
        });
        schedule();
    }

    function refresh() {
        bind();
    }

    window.__sssArchiveScroll = { refresh: refresh };

    bind();
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(schedule).catch(function () { });
    }

    if (window.__sssPageCleanup) {
        window.__sssPageCleanup.add('archive-scroll', function () {
            nodes.forEach(function (el) {
                el.removeEventListener('scroll', schedule);
            });
            window.removeEventListener('resize', schedule);
            window.removeEventListener('load', schedule);
            if (frame) window.cancelAnimationFrame(frame);
            window.__sssArchiveScroll = null;
        });
    }
})();
