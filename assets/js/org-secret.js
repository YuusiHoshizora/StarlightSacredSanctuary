/* =============================================================================
 * org-secret.js — 组织档案页的隐藏入口（DGAM）
 * -----------------------------------------------------------------------------
 * 玩法：把三张部门卡 —— 科研部（RES）、工业部（IND）、战术战略部（TAS）——
 * 依次拖到「星光圣域管理成员议会」那张卡上（顺序无关）。三张都到位后，
 * 议会卡右侧浮出一个小切换按钮；按一下，卡片就换成
 * 「星光圣域管理成员讨论组」（DGAM）那张，再按一下换回来。
 *
 * 三张部门卡的高亮分三种状态（对应彩蛋的三种状态）：
 *   ① 还没发现（sss.eggs 里没有 dgam）：拖上去一张，那一张就留下该部门颜色的描边，
 *      一直保持（刷新也还在，记在 sss-dgam 里；拖动过程中抓起来的那张同样高亮）
 *   ② 已经发现（进过 DGAM 页）：三张一起保持高亮
 *   ③ 入口被关掉（「关于」页那个开关 → sss.eggs.off 里有 dgam）：
 *      三张都不高亮、draggable 也摘掉 —— 拖到议会卡上**毫无反应**，
 *      和其他不能拖的部门卡完全一样
 *
 * 其他细节：
 * · 拖动经过议会卡时，卡片**边缘**用被拖的那个部门的颜色高亮，不是金色：
 *     科研部 #50F2E0 / 工业部 #EB7B25 / 战术战略部 #EE0034
 *   （颜色写在各卡的 data-color 上，脚本把它塞进 --drag-color / --dept-color 交给 CSS）
 * · 战术战略部那张在页面靠下，所以拖动时指针靠近视口上下边缘会自动滚动。
 * · sss-dgam 存的是"拖上去过的部门 key 数组"（老版本的 '1' 当作三张都拖过）；
 *   「关于」页重置这条彩蛋会把这个键一并清掉。
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

    /* ── 先认三张卡，把各自的颜色挂成 --dept-color ── */
    Array.prototype.forEach.call(document.querySelectorAll('[data-dept]'), function (el) {
        var key = el.getAttribute('data-dept');
        cards[key] = el;
        el.style.setProperty('--dept-color', el.getAttribute('data-color') || '');
    });

    /* 「关于」页那两个开关的状态（eggs.js 写的同一个键）；直接读 localStorage，
       不依赖 eggs.js 的加载顺序与 API。 */
    function readIds(key) {
        try {
            var raw = localStorage.getItem(key);
            if (!raw) return [];
            var ids = JSON.parse(raw);
            return Object.prototype.toString.call(ids) === '[object Array]' ? ids : [];
        } catch (e) {
            return [];
        }
    }

    /* 拖上去过哪几张（老版本存的是 '1'，当作三张都拖过） */
    function readStore() {
        try {
            var raw = localStorage.getItem(STORE);
            if (!raw) return [];
            if (raw === '1') return NEED.slice();
            var ids = JSON.parse(raw);
            return Object.prototype.toString.call(ids) === '[object Array]' ? ids : [];
        } catch (e) {
            return [];
        }
    }

    var collected = readStore();                                // 之前拖上去过的
    var found = readIds('sss.eggs').indexOf('dgam') >= 0;        // 彩蛋已经发现过
    var closed = readIds('sss.eggs.off').indexOf('dgam') >= 0;   // 入口被关掉了

    /* ── ③ 入口被关掉：三张都不高亮、也不能拖，整个入口等于不存在 ── */
    if (closed) {
        NEED.forEach(function (key) {
            var el = cards[key];
            if (!el) return;
            el.classList.remove('is-collected');
            el.classList.remove('is-dragging');
            el.removeAttribute('draggable');       // 连拖都起不来，和别的部门卡一模一样
        });
        switchBtn.hidden = true;
        secretCard.hidden = true;
        hideCard.hidden = false;
        return;                                     // 后面的拖放逻辑一律不装
    }

    /* ── 进来先把"已经拖过的"点亮：① 阶段一张一张攒，② 阶段三张一起亮 ── */
    function mark(key) {
        got[key] = true;
        if (cards[key]) cards[key].classList.add('is-collected');
    }

    if (found) {
        NEED.forEach(mark);                        // ② 发现之后：三张都保持高亮
        switchBtn.hidden = false;
    } else {
        NEED.forEach(function (key) {
            if (collected.indexOf(key) >= 0) mark(key);   // ① 只点亮之前拖过的那几张
        });
        if (NEED.every(function (k) { return got[k]; })) switchBtn.hidden = false;
    }

    /* ── 拖放：三张卡 + 议会卡那一块 ── */
    NEED.forEach(function (key) {
        var el = cards[key];
        if (!el) return;

        el.addEventListener('dragstart', function (e) {
            dragging = key;
            el.classList.add('is-dragging');        // 抓起来的那张也高亮
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

    function colorOf(key) {
        var el = cards[key];
        return el ? (el.getAttribute('data-color') || '') : '';
    }

    /* ── 收下一张：① 阶段就是这里一张一张攒高亮 ── */
    function collect(key) {
        if (NEED.indexOf(key) < 0 || got[key]) return;
        mark(key);
        if (collected.indexOf(key) < 0) collected.push(key);
        try { localStorage.setItem(STORE, JSON.stringify(collected)); } catch (e) {}
        if (NEED.every(function (k) { return got[k]; })) unlock();
    }

    /* ── 三张都到位：右侧浮出切换按钮 ── */
    function unlock() {
        if (!switchBtn.hidden) return;
        switchBtn.hidden = false;
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
})();
