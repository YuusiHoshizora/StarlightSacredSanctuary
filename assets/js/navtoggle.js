/* =============================================================================
 * navtoggle.js — 顶栏导航的手机折叠
 * -----------------------------------------------------------------------------
 * 背景：窄屏（≤768px）下 6 个导航链接会跟 logo 挤在同一行，于是各页的
 * <header class="navbar"> 里多了一个按钮：
 *
 *     <nav id="site-nav">
 *         …6 个链接…
 *         <button class="navbar__toggle" type="button"
 *                 aria-label="导航菜单" aria-controls="site-nav" aria-expanded="false">
 *             <span class="navbar__toggle__bars" aria-hidden="true"></span>
 *         </button>
 *     </nav>
 *
 * CSS（global.css 的 ≤768px 块）负责全部外观：按钮只在窄屏出现，
 * #site-nav 变成从栏下缘铺到屏底的面板，靠 .navbar 上的 .is-menu-open 开合。
 * 本脚本只管三件事，都不碰内联样式：
 *
 *   1) 点按钮 → 在 .navbar 上切 .is-menu-open、同步 aria-expanded；
 *      展开时锁住页面滚动（面板自己是可滚的），连同「点链接 / 按 Esc /
 *      窗口拉宽回桌面」三种收场一起处理。
 *   2) 按当前地址给对应链接加上 aria-current="page"，让面板里那一条显示
 *      「当前页」的金色标记。用 URL 解析来比，不靠 href 字符串猜 ——
 *      各页链接写法不一（"." / ".." / "starmap/" / "/about/"），
 *      字符串比会同时命中首页和子目录页的父级链接。
 *   3) 禁 JS 时按钮不出现、导航维持原样（按钮的显隐由 CSS 控制，
 *      HTML 里没有 hidden 属性），所以不存在"点了没反应"的死按钮。
 * ========================================================================== */

(function () {
    'use strict';

    var navbar = document.querySelector('header.navbar');
    if (!navbar) return;

    var toggle = navbar.querySelector('.navbar__toggle');
    var panel = navbar.querySelector('#site-nav');
    if (!toggle || !panel) return;

    /* ------------------------- 1) 开合 + 页面滚动锁 ------------------------- */

    // 与 global.css 里那条 @media (max-width: 768px) 保持一致
    var narrow = window.matchMedia('(max-width: 768px)');
    var isOpen = false;
    var locked = false;

    function lockScroll() {
        if (locked) return;
        locked = true;
        document.body.style.overflow = 'hidden';
    }

    function unlockScroll() {
        if (!locked) return;
        locked = false;
        document.body.style.overflow = '';
    }

    function setOpen(next) {
        if (next === isOpen) return;
        isOpen = next;

        // 样式全在 CSS 里，这里只切状态
        navbar.classList.toggle('is-menu-open', isOpen);
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

        // 面板开着时别让后面的页面跟着滚（面板本身 overflow-y:auto）
        if (isOpen) {
            lockScroll();
        } else {
            unlockScroll();
        }
    }

    function close() {
        setOpen(false);
    }

    toggle.addEventListener('click', function () {
        setOpen(!isOpen);
    });

    // 点任意一条导航链接（含当前页那条）：先收起再让浏览器去跳转
    panel.addEventListener('click', function (event) {
        if (event.target.closest('a[href]')) close();
    });

    // Esc 收起，并把焦点还给按钮（键盘用户不至于"焦点掉到看不见的地方"）
    document.addEventListener('keydown', function (event) {
        if (!isOpen) return;
        if (event.key !== 'Escape' && event.key !== 'Esc') return;
        close();
        toggle.focus();
    });

    // 把窗口拉宽回桌面（或转屏）时，面板本就该自然回到横向一行 —— 顺手清掉状态，
    // 免得 body 上留着 overflow:hidden 把页面锁死。
    // 用 change 事件（只在跨过断点时触发一次），别用 resize（会一路狂调）。
    function onBreakpointChange() {
        if (!narrow.matches) close();
    }

    if (narrow.addEventListener) {
        narrow.addEventListener('change', onBreakpointChange);
    } else if (narrow.addListener) {
        narrow.addListener(onBreakpointChange);           // 老 Safari
    }

    /* --------------------------- 2) 当前页标记 --------------------------- */

    // 把路径收敛成同一种写法：
    //   /            → /            （首页）
    //   /starmap     → /starmap     （目录形式）
    //   /starmap/    → /starmap
    //   /about/index.html → /about  （显式 index.html 与目录形式视为同一页）
    //   /main/mainpage.html → /main/mainpage（真实文件名，另有自己的文件地址）
    function normalize(pathname) {
        var p = pathname || '/';

        // 去掉结尾的 /index.html 或 /index.htm
        p = p.replace(/\/index\.html?$/i, '/');
        // 去掉结尾多余的 /
        if (p.length > 1) p = p.replace(/\/+$/, '');

        return p || '/';
    }

    try {
        var here = normalize(window.location.pathname);
        var links = panel.querySelectorAll('a[href]');
        var i;

        // 先清掉上一轮留下的标记（理论上每次加载都是新的，这里只是稳妥）
        for (i = 0; i < links.length; i++) {
            links[i].removeAttribute('aria-current');
        }

        for (i = 0; i < links.length; i++) {
            var link = links[i];

            // 用浏览器解析后的绝对地址来比，href 写成什么都无所谓
            if (link.origin !== window.location.origin) continue;
            if (normalize(link.pathname) !== here) continue;

            link.setAttribute('aria-current', 'page');
            break;
        }
    } catch (err) {
        /* 算不出来就不标，导航本身照常可用 */
    }
})();
