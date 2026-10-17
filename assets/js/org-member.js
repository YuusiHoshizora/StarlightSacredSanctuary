/* =============================================================================
 * org-member.js — 成员名录的提示条
 * -----------------------------------------------------------------------------
 * 组织详情页里的成员名录，每张人名卡是一个**索引项**：点一下本该打开那个人的
 * 人员档案 / 那个人所在的页面。但两种情况下走不通，点了只能弹一条提示：
 *
 *   1. 普通页面：人员数据库（「档案 → 人员档案」那一类）当前数据损坏、拒绝访问
 *      → 「错误：成员数据库拒绝访问：数据损坏」
 *   2. 彩蛋页（例如机密的那一页）：彩蛋页不连向站内其它页面
 *      → 「错误：无法从机密页面快捷跳转」
 *
 * 用法：在要触发的元素上加 data-member，并在页面里引入本脚本：
 *     <button type="button" class="org-member" data-member>…</button>
 *     <script defer src="../../assets/js/org-member.js"></script>
 * 文案可以按页覆盖：<body data-member-msg="…">，或单个元素 data-member-msg="…"
 * （元素上的优先于页面上的，页面上的优先于默认那句）。
 *
 * 提示条的形式照彩蛋页那个「彩蛋已发现」的提示条：从底部往上 14px 淡入的
 * 圆角玻璃面板 + 小方点（强调色换成错误红）。DOM 由脚本生成，页面不用写 markup；
 * 样式在 assets/css/archive/organization.css 的「错误提示」一节（.org-toast）。
 * ========================================================================== */
(function () {
    'use strict';

    var DEFAULT_MSG = '错误：成员数据库拒绝访问：数据损坏';
    var HOLD_MS = 5200;          // 与彩蛋提示条一样：停 5.2 秒自己收起来
    var toast = null;
    var textNode = null;
    var timer = 0;

    function hide() {
        if (!toast) return;
        window.clearTimeout(timer);
        timer = 0;
        toast.classList.remove('is-in');
    }

    /* 文案优先级：元素自己 > <body> 上的 > 默认那句 */
    function msgFor(el) {
        var own = el && el.getAttribute && el.getAttribute('data-member-msg');
        if (own) return own;
        var page = document.body && document.body.getAttribute('data-member-msg');
        return page || DEFAULT_MSG;
    }

    function build() {
        toast = document.createElement('div');
        toast.className = 'org-toast';
        toast.setAttribute('role', 'status');       // 读屏会念出来，但不抢焦点
        var dot = document.createElement('span');
        dot.className = 'org-toast__dot';
        dot.setAttribute('aria-hidden', 'true');
        toast.appendChild(dot);
        textNode = document.createTextNode(DEFAULT_MSG);
        toast.appendChild(textNode);
        document.body.appendChild(toast);

        /* 点提示条本身也可以收起；ESC 同样收起（键盘用户不用等） */
        toast.addEventListener('click', hide);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') hide();
        });
        return toast;
    }

    function show(msg) {
        var t = toast || build();
        if (textNode.nodeValue !== msg) textNode.nodeValue = msg;
        window.clearTimeout(timer);
        if (!t.classList.contains('is-in')) {
            /* ⚠️ 先让它按"没进来"的初态上屏，下一帧再加 is-in ——
               插入与加类同一帧的话浏览器会跳过过渡，等于没有动画 */
            void t.offsetWidth;
            window.requestAnimationFrame(function () {
                t.classList.add('is-in');
            });
        }
        timer = window.setTimeout(hide, HOLD_MS);   // 连点会重新计时
    }

    /* 一个委托监听就够：以后加成员、加页面都不用再绑 */
    document.addEventListener('click', function (e) {
        var el = e.target && e.target.closest ? e.target.closest('[data-member]') : null;
        if (!el) return;
        e.preventDefault();
        show(msgFor(el));
    });
})();
