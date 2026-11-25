/* =============================================================================
 * archive-scroll.js — 档案页滚动区的上下淡出（v4 起仅保留接口）
 * -----------------------------------------------------------------------------
 * ⚠️ v4：滚动渐隐遮罩已从 archive.css 移除。本脚本仍会给滚动容器写
 *   --fade-top / --fade-bottom 并维护 window.__sssArchiveScroll.refresh()，
 *   但样式层不再消费这些变量，视觉上没有任何淡出。
 *   保留脚本是为了页面脚本（document.js 等）的 refresh() 调用不报错；
 *   如果以后需要恢复淡出，在 archive.css 里重新加 mask 即可，不用改这里。
 *
 * 旧说明（历史）：
 * 给每个能滚的容器加 .is-scrollable，并连续写 --fade-top / --fade-bottom：
 *
 *   · 滚到顶 → 上端淡出为 0；往下滚时上端淡出按 2 倍速长到 --archive-fade
 *     （前 60px 滚动就长满，面板框进入视口时已经被压得很淡）；
 *   · 下端淡出按剩余距离收缩，但内容栏至少保留 --archive-fade-min（64px），
 *     滚到最底部也不会把面板背景框硬切掉；
 *   · 名录栏的 --archive-fade / --archive-fade-min 另给一套更短的值（56px / 0）；
 *   · 短内容（不产生滚动）不挂 .is-scrollable，不压暗。
 * ========================================================================== */
(function () {
    'use strict';

    var SCROLLERS = '.archive-body, .personnel-list__scroll, .facility-list__scroll, .vessel-list__scroll,' +
        ' .biology-list__scroll, .personnel-profile__body, .facility-profile__body, .vessel-profile__body,' +
        ' .biology-profile__body, .document-list__scroll, .document-profile__body';

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
        var minFade = parseFloat(window.getComputedStyle(el).getPropertyValue('--archive-fade-min')) || 0;
        if (!limit) {
            el.style.setProperty('--fade-top', '0px');
            el.style.setProperty('--fade-bottom', '0px');
            return;
        }

        /* 上端：2 倍速长满，面板框在进入视口时已经淡掉；
           下端：按剩余距离收缩，但保留 minFade（名录为 0，内容栏 64px）。 */
        var top = Math.min(Math.max(el.scrollTop, 0) * 2, limit);
        var bottom = Math.max(Math.min(Math.max(max - el.scrollTop, 0), limit), minFade);
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
