/* =============================================================================
 * eggs.js — 彩蛋登记册
 * -----------------------------------------------------------------------------
 * 站点里藏着不与导航相连的页面（彩蛋）。这个文件做三件事：
 *
 * 1) 记下「这台浏览器发现过哪些彩蛋」—— 按 id 存在 localStorage 里，**数组顺序就是发现先后**。
 *    彩蛋页只要在 <body> 上写 data-egg="cq"，本文件就会自动登记（见文件末尾）。
 *    ⚠️ id 一旦发布就别改：「已发现」按 id 记，改 id 等于把所有人的进度清零。
 *    ⚠️ 预渲染保护：speculation rules 会在鼠标悬停时提前渲染目标页，
 *       所以等页面真正激活（prerenderingchange）才登记 —— 否则"悬停一下"就算发现了。
 *
 * 2) 「关于」页里那张「已发现的彩蛋」卡片，做成一个**设置页面**的样子：
 *    · 顶上只报数：全发现 → 「所有彩蛋已发现」；否则 → 「目前已发现彩蛋数：X」
 *      （X 与"全部"都从清单长度算，写死不了）
 *    · 下面按**发现先后**列出来，每条一行：名字（可点进彩蛋页）+ 一个开关 + 一个重置
 *      · 开关：开 = 入口正常显示；关 = 把入口从站点上撤掉（记 sss.eggs.off）。
 *        关掉之后入口彻底不出现（连扫描也扫不出来），但「已发现」还留着
 *      · 重置：**一键生效、不用二次确认** —— 只清这一条
 *    · 列表最下面：「重置所有彩蛋」—— 这个**需要二次确认**（点两下）
 *    · 一个都没发现时整张卡片保持 hidden（不显示）
 *
 * 3) 样式由本文件注入（跟着 notice.js 的套路），「关于」页只要引这一行脚本。
 *
 * ── localStorage 键一览（改之前先看这里） ──
 *   sss.eggs      已发现的 id 数组（顺序 = 发现先后）
 *   sss.eggs.off  入口被关闭的 id 数组
 *   其余按彩蛋各自记（例如 CQ 的"点已经被扫出来过"是 sss.cq-dot，见 resetKeys）
 * ========================================================================== */
(function () {
    'use strict';

    var KEY = 'sss.eggs';
    var KEY_OFF = 'sss.eggs.off';

    /* 彩蛋清单。href 从站点根写起，这样以后把彩蛋页挪到哪一层都不用改。
       加新彩蛋：往这里加一条，再到那个页面的 <body> 上写 data-egg="同样的 id"。
       · entry：入口元素的选择器（开关"关"时靠它撤掉；没有入口就不写）
       · resetKeys：重置时要一并清掉的、这个彩蛋自己的 localStorage 键 */
    var LIST = [
        {
            id: 'cq',
            name: 'CQ · 未知信号',
            href: '/main/cq.html',
            entry: '#cq-dot',
            resetKeys: ['sss.cq-dot']
        }
    ];

    function readArr(key) {
        try {
            var raw = localStorage.getItem(key);
            var arr = raw ? JSON.parse(raw) : [];
            return Object.prototype.toString.call(arr) === '[object Array]' ? arr : [];
        } catch (e) {
            return [];                 // 无痕模式 / 存储被禁：当作空，不影响页面
        }
    }

    function writeArr(key, arr) {
        try { localStorage.setItem(key, JSON.stringify(arr)); } catch (e) { /* 同上，忽略 */ }
    }

    function byId(id) {
        for (var i = 0; i < LIST.length; i++) {
            if (LIST[i].id === id) return LIST[i];
        }
        return null;
    }

    function clearEggKeys(egg) {
        var keys = (egg && egg.resetKeys) || [];
        for (var i = 0; i < keys.length; i++) {
            try { localStorage.removeItem(keys[i]); } catch (e) { /* 忽略 */ }
        }
    }

    var API = {
        list: LIST,

        /** 已经发现的彩蛋 —— **按发现先后**返回（数组顺序就是发现顺序，不是清单顺序） */
        found: function () {
            var ids = readArr(KEY);
            var out = [];
            for (var i = 0; i < ids.length; i++) {
                var egg = byId(ids[i]);
                if (egg) out.push(egg);
            }
            return out;
        },

        has: function (id) { return readArr(KEY).indexOf(id) >= 0; },

        /** 登记一个彩蛋；重复登记没有任何副作用 */
        find: function (id) {
            var ids = readArr(KEY);
            if (ids.indexOf(id) < 0) { ids.push(id); writeArr(KEY, ids); }   // 追加 = 记下发现先后
        },

        /** 预渲染安全地登记：预渲染中的页面先等真正激活再记（见文件头注释） */
        findWhenActive: function (id) {
            if (document.prerendering) {
                document.addEventListener('prerenderingchange', function () { API.find(id); }, { once: true });
            } else {
                API.find(id);
            }
        },

        /** 这个彩蛋的入口是不是被关掉了（关掉后入口元素不再出现） */
        isHidden: function (id) { return readArr(KEY_OFF).indexOf(id) >= 0; },

        setHidden: function (id, hide) {
            var ids = readArr(KEY_OFF);
            var at = ids.indexOf(id);
            if (hide && at < 0) { ids.push(id); writeArr(KEY_OFF, ids); }
            else if (!hide && at >= 0) { ids.splice(at, 1); writeArr(KEY_OFF, ids); }
        },

        /** 完全忘掉这一条：已发现 / 已关闭 / 它自己的状态键，全清掉 */
        reset: function (id) {
            writeArr(KEY, readArr(KEY).filter(function (x) { return x !== id; }));
            writeArr(KEY_OFF, readArr(KEY_OFF).filter(function (x) { return x !== id; }));
            clearEggKeys(byId(id));
        },

        /** 完全忘掉所有彩蛋（连没发现过的一并清干净它的状态键） */
        resetAll: function () {
            writeArr(KEY, []);
            writeArr(KEY_OFF, []);
            for (var i = 0; i < LIST.length; i++) clearEggKeys(LIST[i]);
        }
    };

    window.SSS_EGGS = API;

    /* ---------- 彩蛋页：<body data-egg="cq"> 就自动登记 ---------- */
    var own = document.body && document.body.getAttribute('data-egg');
    if (own) API.findWhenActive(own);

    /* ---------- 「关于」页：填那张卡片 ---------- */
    var card = document.getElementById('about-eggs');
    if (!card) return;                          // 不是关于页

    /* 样式跟 notice.js 一样由脚本注入：关于页只需引这一行脚本，不用再动它的样式表。
       开关走全站控件令牌；"开"用金色（站内金色只用于强调/选中，这正是选中态）；
       "重置"用站里已有的错误红 --ctl-err 表示"这个会清掉东西"。没有引入新颜色。 */
    var CSS = [
        '.egg-row{display:flex;align-items:center;gap:14px;padding:11px 0;',
        '  border-top:1px solid rgba(255,255,255,0.06)}',
        /* 名字：这里**不要下划线**。关于页的 .about-card a 自带 text-decoration:underline，
           我又画了一条 border-bottom，两条叠在一起就是"双下划线"。
           所以用 .about-card .egg-row__name 提高权重压掉那一条，自己也不画线 ——
           hover/聚焦只用颜色（转金）表示可点。 */
        '.about-card .egg-row__name{flex:1 1 auto;min-width:0;font-size:14px;letter-spacing:1px;',
        '  color:rgba(255,255,255,0.88);text-decoration:none;transition:var(--ctl-transition)}',
        '.about-card .egg-row__name:hover,.about-card .egg-row__name:focus-visible{',
        '  color:var(--ctl-fg-hover);text-decoration:none}',
        '.egg-row__acts{display:inline-flex;align-items:center;gap:10px;flex:0 0 auto}',
        /* 开关：跟全站控件同一套 —— 小方角（--ctl-radius）+ 1px 淡描边 + 玻璃底；
           "开"就是强调态：金色描边 + 淡金底 + 金色方块，方块带一点辉光，
           呼应加载屏里"这一步已完成"那个小金点。别改成胶囊，那不是这个站的语言。 */
        '.egg-switch{position:relative;width:44px;height:24px;flex:0 0 auto;padding:0;',
        '  background:var(--ctl-bg);border:1px solid var(--ctl-border);',
        '  border-radius:var(--ctl-radius);cursor:pointer;transition:var(--ctl-transition)}',
        '.egg-switch__knob{position:absolute;top:50%;left:4px;width:12px;height:12px;margin-top:-6px;',
        '  border-radius:1px;background:rgba(255,255,255,0.5);',
        '  transition:left 0.25s var(--ctl-ease), background-color 0.25s var(--ctl-ease),',
        '             box-shadow 0.25s var(--ctl-ease)}',
        '.egg-switch.is-on{border-color:var(--ctl-border-hover);background:var(--ctl-bg-strong)}',
        '.egg-switch.is-on .egg-switch__knob{left:26px;background:#FFD700;',
        '  box-shadow:0 0 8px rgba(255,215,0,0.8)}',
        '.egg-switch:focus-visible{outline:2px solid rgba(255,215,0,0.55);outline-offset:2px}',
        /* 按钮 */
        '.egg-btn{min-height:30px;padding:5px 12px;font:inherit;font-size:12px;letter-spacing:1px;',
        '  color:var(--ctl-fg-dim);background:var(--ctl-bg);border:1px solid var(--ctl-border);',
        '  border-radius:var(--ctl-radius);cursor:pointer;transition:var(--ctl-transition)}',
        '.egg-btn:hover,.egg-btn:focus-visible{color:var(--ctl-fg-hover);background:var(--ctl-bg-strong);',
        '  border-color:var(--ctl-border-hover)}',
        '.egg-btn--reset:hover,.egg-btn--reset:focus-visible{color:var(--ctl-err);',
        '  border-color:var(--ctl-err);background:rgba(255,107,107,0.10)}',
        /* 底部：重置所有彩蛋 */
        '.egg-foot{margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.06);',
        '  display:flex;justify-content:flex-end}',
        '@media (max-width:768px){.egg-row{gap:10px}.egg-btn{padding:5px 10px}}'
    ].join('');

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
    }

    function button(label, cls, onClick) {
        var b = el('button', 'egg-btn' + (cls ? ' ' + cls : ''), label);
        b.type = 'button';
        b.addEventListener('click', onClick);
        return b;
    }

    /* 开关：开 = 入口正常显示；关 = 入口撤掉（入口元素自己会读同一个标记） */
    function switchFor(egg) {
        var on = !API.isHidden(egg.id);
        var sw = el('button', 'egg-switch' + (on ? ' is-on' : ''));
        sw.type = 'button';
        sw.setAttribute('role', 'switch');
        sw.setAttribute('aria-checked', on ? 'true' : 'false');
        sw.setAttribute('aria-label', '显示「' + egg.name + '」的入口');
        sw.appendChild(el('span', 'egg-switch__knob'));
        sw.addEventListener('click', function () {
            API.setHidden(egg.id, on);      // 当前是开 → 关掉；当前是关 → 打开
            render();
        });
        return sw;
    }

    function rowFor(egg) {
        var li = el('li', 'egg-row');

        var a = el('a', 'egg-row__name', egg.name);
        a.href = egg.href;
        li.appendChild(a);

        var acts = el('span', 'egg-row__acts');
        acts.appendChild(switchFor(egg));
        // 单条重置：一键生效，不做二次确认
        acts.appendChild(button('重置', 'egg-btn--reset', function () {
            API.reset(egg.id);
            render();
        }));
        li.appendChild(acts);
        return li;
    }

    /* 底部「重置所有彩蛋」：这个要二次确认（点两下） */
    function footFor() {
        var foot = el('div', 'egg-foot');
        var armed = false;
        var all;
        all = button('重置所有彩蛋', 'egg-btn--reset', function () {
            if (!armed) {
                armed = true;
                all.textContent = '确认重置全部？';
                window.setTimeout(function () {
                    if (!armed) return;
                    armed = false;
                    all.textContent = '重置所有彩蛋';
                }, 4000);
                return;
            }
            API.resetAll();
            render();
        });
        foot.appendChild(all);
        return foot;
    }

    function render() {
        var found = API.found();
        if (!found.length) {                    // 一个都没发现 / 全被重置了：整张卡片不显示
            card.hidden = true;
            return;
        }

        var count = card.querySelector('[data-eggs-count]');
        if (count) {
            // 两个数字都从清单长度算，"全发现"不写死
            count.textContent = found.length >= LIST.length
                ? '所有彩蛋已发现'
                : '目前已发现彩蛋数：' + found.length;
        }

        var list = card.querySelector('[data-eggs-list]');
        if (list) {
            list.textContent = '';              // 清空重画（操作后靠它刷新开关与开关文案）
            for (var i = 0; i < found.length; i++) list.appendChild(rowFor(found[i]));
        }

        var old = card.querySelector('.egg-foot');
        if (old) old.parentNode.removeChild(old);
        card.appendChild(footFor());

        card.hidden = false;
    }

    render();
})();
