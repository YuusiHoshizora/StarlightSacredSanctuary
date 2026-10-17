/* =============================================================================
 * org-secret.js — 组织档案页的隐藏入口（DGAM）
 * -----------------------------------------------------------------------------
 * 玩法：把三张部门卡 —— 科研部（RES）、工业部（IND）、战术战略部（TAS）——
 * 依次拖到「星光圣域管理成员议会」那张卡上（顺序无关）。三张都到位后，
 * 议会卡右侧浮出一个小切换按钮；按一下，卡片就换成
 * 「星光圣域管理成员讨论组」（DGAM）那张，再按一下换回来。
 *
 * 细节：
 * · 拖动经过议会卡时，卡片**边缘**用被拖的那个部门的颜色高亮，不是金色：
 *     科研部 #50F2E0 / 工业部 #EB7B25 / 战术战略部 #EE0034
 *   （颜色写在各卡的 data-color 上，脚本把它塞进 --drag-color 交给 CSS）
 * · 战术战略部那张在页面靠下，所以拖动时指针靠近视口上下边缘会自动滚动，
 *   不用先手动滚回顶部再把卡"拖出屏幕"。
 * · 收集到的部门卡会留下痕迹（描边与代号转成该部门色，见 .org-card.is-collected）。
 * · 解锁状态记在 localStorage 的 sss-dgam 里，下次进来按钮还在。
 *
 * 结构见 archive/organization/index.html，样式见
 * assets/css/archive/organization.css 的「隐藏入口」一节。
 * ========================================================================== */
(function () {
    'use strict';

    var STORE = 'sss-dgam';
    var NEED = ['res', 'ind', 'tas'];
    var EDGE = 120;              // 指针离上下边缘多近开始自动滚动
    var SPEED = 16;              // 最快每帧滚多少像素

    var slot = document.querySelector('[data-org-slot]');
    if (!slot) return;

    var hideCard = slot.querySelector('[data-org="cam"]');
    var secretCard = slot.querySelector('[data-org="dgam"]');
    var switchBtn = slot.querySelector('.org-switch');
    if (!hideCard || !secretCard || !switchBtn) return;

    var cards = {};              // 部门 key → 卡片元素
    var got = {};                // 已经拖上去的部门
    var dragging = null;         // 正在拖的部门 key
    var rafId = 0;
    var dir = 0;                 // -1 上滚 / +1 下滚 / 0 不动
    var speed = 0;

    /* ── 三张可拖的部门卡 ── */
    Array.prototype.forEach.call(document.querySelectorAll('[data-dept]'), function (el) {
        var key = el.getAttribute('data-dept');
        cards[key] = el;
        el.style.setProperty('--dept-color', el.getAttribute('data-color') || '');

        el.addEventListener('dragstart', function (e) {
            dragging = key;
            el.classList.add('is-dragging');
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'copy';
                try { e.dataTransfer.setData('text/plain', key); } catch (err) {}
            }
            startScroll();
        });

        el.addEventListener('dragend', function () {
            dragging = null;
            el.classList.remove('is-dragging');
            slot.classList.remove('is-drag-over');
            stopScroll();
        });
    });

    function colorOf(key) {
        var el = cards[key];
        return el ? (el.getAttribute('data-color') || '') : '';
    }

    /* ── 议会卡这一块：拖进来就高亮，松手就收下 ── */
    function over(e) {
        if (!dragging) return;
        e.preventDefault();                              // 不 preventDefault 就不让放下
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        var color = colorOf(dragging);
        if (color) slot.style.setProperty('--drag-color', color);
        slot.classList.add('is-drag-over');
    }

    slot.addEventListener('dragenter', over);
    slot.addEventListener('dragover', over);

    slot.addEventListener('dragleave', function (e) {
        if (e.relatedTarget && slot.contains(e.relatedTarget)) return;
        slot.classList.remove('is-drag-over');
    });

    slot.addEventListener('drop', function (e) {
        e.preventDefault();
        slot.classList.remove('is-drag-over');
        var key = dragging;
        if (!key && e.dataTransfer) key = e.dataTransfer.getData('text/plain');
        collect(key);
    });

    /* ── 收下一张 ── */
    function collect(key) {
        if (NEED.indexOf(key) < 0 || got[key]) return;
        got[key] = true;
        if (cards[key]) cards[key].classList.add('is-collected');
        if (NEED.every(function (k) { return got[k]; })) unlock();
    }

    /* ── 三张都到位：右侧浮出切换按钮，并记下解锁状态 ── */
    function unlock() {
        if (!switchBtn.hidden) return;
        switchBtn.hidden = false;
        try { localStorage.setItem(STORE, '1'); } catch (e) {}
    }

    /* ── 切换：两张卡叠在同一格里，谁不 hidden 谁露脸 ── */
    function apply(showSecret) {
        hideCard.hidden = showSecret;
        secretCard.hidden = !showSecret;
        switchBtn.setAttribute('aria-pressed', showSecret ? 'true' : 'false');
        var label = showSecret ? '切换到星光圣域管理成员议会' : '切换到星光圣域管理成员讨论组';
        switchBtn.setAttribute('aria-label', label);
        switchBtn.title = label;
    }

    switchBtn.addEventListener('click', function () {
        apply(secretCard.hidden);
    });

    /* ── 拖动时靠近视口上下边缘自动滚动（战术战略部在下面，用得上） ── */
    function tick() {
        if (!dragging) { rafId = 0; return; }
        if (dir) window.scrollBy(0, dir * Math.max(4, speed));
        rafId = window.requestAnimationFrame(tick);
    }

    function startScroll() {
        if (!rafId) rafId = window.requestAnimationFrame(tick);
    }

    function stopScroll() {
        if (rafId) window.cancelAnimationFrame(rafId);
        rafId = 0;
        dir = 0;
    }

    document.addEventListener('dragover', function (e) {
        if (!dragging) return;
        var h = window.innerHeight || document.documentElement.clientHeight;
        var y = e.clientY;
        if (y < EDGE) {
            dir = -1;
            speed = SPEED * (1 - y / EDGE);
        } else if (y > h - EDGE) {
            dir = 1;
            speed = SPEED * (1 - (h - y) / EDGE);
        } else {
            dir = 0;
        }
    }, true);

    /* ── 上次已经解开过：按钮直接留着 ── */
    try {
        if (localStorage.getItem(STORE) === '1') switchBtn.hidden = false;
    } catch (e) {}
})();
