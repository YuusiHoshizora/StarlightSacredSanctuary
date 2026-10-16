/* =============================================================================
 * cq-entry.js — 首页那个"要被扫出来"的 CQ 入口（只在首页引用）
 * -----------------------------------------------------------------------------
 * CQ 彩蛋页没有明摆着的入口。首页左下角藏着一个点：默认不显示、名字是 "???"。
 *
 * 怎么让它现身 —— **复用背景那次扫描的真实半径**，不另造一套命中判定：
 *   · background.js 点一下会在原地留一圈金色波纹（CFG.CLICK_BURST），
 *     波纹从 0.15×R 扩散到约 1.1×R，R 就是 CFG.RADIUS（默认 260 CSS px）；
 *   · 那份配置挂在 window.SSSHex.cfg 上，这里直接读它当判定半径：
 *     「点击位置到这个点的距离 ≤ R」就是被扫到了 → 现身并保持。
 *   想调难易，改 background.js 的 RADIUS（或只改首页那份 CFG 覆盖）即可，
 *   判定会跟着变 —— 这正是"让那个扫描成为真的"的意思。
 *
 * 现身时很小声地放一遍 cq.wav；点这个点进 CQ 页。
 * 进过 CQ 页之后（eggs.js 记下的"已发现"），名字从 "???" 换成 "73"。
 *
 * 找不到 #cq-dot 就直接退出，所以别的页面误引了也没有副作用。
 * ========================================================================== */
(function () {
    'use strict';

    var dot = document.getElementById('cq-dot');
    if (!dot) return;                                   // 不是首页

    var KEY = 'sss.cq-dot';                             // "这个点已经被扫出来过"
    var RADIUS_FALLBACK = 260;                          // 与 background.js 的 CFG.RADIUS 默认值一致
    var VOLUME = 0.16;                                  // "很小声"
    var EGGS_KEY = 'sss.eggs';                          // eggs.js 用的同一个键

    function get(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function set(key, val) {
        try { localStorage.setItem(key, val); } catch (e) { /* 无痕模式等，忽略 */ }
    }

    var revealed = get(KEY) === '1';

    /* 名字：进过 CQ 页（eggs 里记着 cq）就是 "73"，否则还是 "???"。
       这里直接读 localStorage，不依赖 eggs.js 的加载顺序与 API。 */
    function name() {
        var raw = get(EGGS_KEY);
        if (!raw) return '???';
        try {
            var ids = JSON.parse(raw);
            return Object.prototype.toString.call(ids) === '[object Array]' &&
                   ids.indexOf('cq') >= 0 ? '73' : '???';
        } catch (e) {
            return '???';
        }
    }

    /* 入口是不是被人在「关于」页的彩蛋卡片里关掉了（eggs.js 写的同一个键）。
       关掉之后这个点就彻底不出现，连扫也不扫出来。 */
    function entryClosed() {
        var raw = get('sss.eggs.off');
        if (!raw) return false;
        try {
            var ids = JSON.parse(raw);
            return Object.prototype.toString.call(ids) === '[object Array]' && ids.indexOf('cq') >= 0;
        } catch (e) {
            return false;
        }
    }

    /* 判定半径：优先用背景真正在用的那个（这样"看到的扫描"和"判定"永远是同一个数） */
    function scanRadius() {
        try {
            if (window.SSSHex && window.SSSHex.cfg && window.SSSHex.cfg.RADIUS > 0) {
                return window.SSSHex.cfg.RADIUS;
            }
        } catch (e) { /* 拿不到就退回默认值 */ }
        return RADIUS_FALLBACK;
    }

    var audio = null;
    function playQuiet() {
        if (!audio) {
            audio = new Audio('assets/audio/cq.wav');   // 相对首页
            audio.volume = VOLUME;
            audio.preload = 'none';
        }
        var p = audio.play();
        // 浏览器拦下自动播放就算了，不弹任何提示（这是彩蛋，不该打断人）
        if (p && p.catch) p.catch(function () {});
    }

    function show(withSound) {
        dot.querySelector('[data-cq-name]').textContent = name();
        dot.classList.add('is-found');
        // 无障碍上也要"出现"：它是个 <a>，别让键盘 Tab 到一个看不见的东西
        dot.removeAttribute('aria-hidden');
        dot.removeAttribute('tabindex');
        if (withSound) playQuiet();
    }

    /* 页面任意处按下：背景会在原地画一圈扩散到 scanRadius() 的波纹，
       这里用同一个半径判断"这个点有没有被扫到"。 */
    document.addEventListener('pointerdown', function (e) {
        if (entryClosed()) return;                                                // 入口已关闭：永不现身
        if (e.target && e.target.closest && e.target.closest('#cq-dot')) return;  // 点在点上，交给链接自己

        var r = dot.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        if (Math.sqrt(dx * dx + dy * dy) > scanRadius()) return;                  // 没扫到

        if (revealed) { show(false); return; }
        revealed = true;
        set(KEY, '1');
        show(true);                                                              // 只在"扫出来"那一次出声
    });

    /* 之前已经扫出来过（或已经发现过）：这一趟直接显示，不用再扫。
       但入口被关掉时什么都不做 —— 关掉之后就不再显示了。 */
    if (!entryClosed() && (revealed || name() === '73')) {
        revealed = true;
        show(false);
    }
})();
