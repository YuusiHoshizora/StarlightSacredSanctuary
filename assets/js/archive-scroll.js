/* =============================================================================
 * archive-scroll.js — 档案页滚动区的上下淡出
 * -----------------------------------------------------------------------------
 * 给每个能滚的容器加 .is-scrollable，并连续写 --fade-top / --fade-bottom：
 *
 *   · 滚到顶 → 上端淡出为 0；往下滚多少，上端淡出就长多少（最多 --archive-fade）；
 *   · 快到底 → 下端淡出同样收短，滚到最底部时下端为 0；
 *   · 短内容（不产生滚动）不挂 .is-scrollable，不压暗。
 *
 * 这样淡出是**连续变化**的，不会在"开始滚动 / 滚到底"时突然出现或消失整条
 * mask —— Firefox 下尤其明显；也避免切换 mask 时文字 / 标题重新栅格化的突变。
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
        var scrollable = max > 1;
        el.classList.toggle('is-scrollable', scrollable);

        if (!scrollable) {
            el.style.setProperty('--fade-top', '0px');
            el.style.setProperty('--fade-bottom', '0px');
            return;
        }

        var limit = parseFloat(window.getComputedStyle(el).getPropertyValue('--archive-fade')) || 0;
        if (!limit) {
            el.style.setProperty('--fade-top', '0px');
            el.style.setProperty('--fade-bottom', '0px');
            return;
        }

        var top = Math.min(Math.max(el.scrollTop, 0), limit);
        var bottom = Math.min(Math.max(max - el.scrollTop, 0), limit);
        el.style.setProperty('--fade-top', top + 'px');
        el.style.setProperty('--fade-bottom', bottom + 'px');
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
                el.classList.remove('is-scrollable');
                el.style.removeProperty('--fade-top');
                el.style.removeProperty('--fade-bottom');
            });
            window.removeEventListener('resize', schedule);
            window.removeEventListener('load', schedule);
            if (frame) window.cancelAnimationFrame(frame);
            window.__sssArchiveScroll = null;
        });
    }
})();
