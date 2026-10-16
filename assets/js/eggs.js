/* =============================================================================
 * eggs.js — 彩蛋登记册
 * -----------------------------------------------------------------------------
 * 站点里藏着不与导航相连的页面（彩蛋）。这个文件做三件事：
 *
 * 1) 记下「这台浏览器发现过哪些彩蛋」—— 按 id 存在 localStorage 里。
 *    彩蛋页只要在 <body> 上写 data-egg="cq"，本文件就会自动登记（见文件末尾）。
 *    ⚠️ id 一旦发布就别改：「已发现」按 id 记，改 id 等于把所有人的进度清零。
 *    ⚠️ 预渲染保护：speculation rules 会在鼠标悬停时提前渲染目标页，
 *       所以等页面真正激活（prerenderingchange）才登记 —— 否则"悬停一下"就算发现了。
 *
 * 2) 「关于」页里那张「已发现的彩蛋」卡片：把找到的列出来，每条后面带两个操作：
 *    · 关闭入口 —— 把对应的入口元素从站点上撤掉（比如首页左下角那个点），
 *      记在 sss.eggs.off 里；再点一次是「恢复入口」。关掉之后就不显示了，但
 *      「已发现」还留着，卡片里仍然能看到自己找到过什么。
 *    · 重置 —— 把这条彩蛋完全忘掉：清掉「已发现」「关闭」以及它自己的状态
 *      （见清单里的 resetKeys），于是又变回一个没被发现的彩蛋。要点两下确认。
 *    一个都没发现时整张卡片保持 hidden（不显示）。
 *
 * 3) 样式由本文件注入（跟着 notice.js 的套路），所以「关于」页只要引这一行脚本。
 *
 * ── localStorage 键一览（改之前先看这里） ──
 *   sss.eggs      已发现的 id 数组
 *   sss.eggs.off  入口被关闭的 id 数组
 *   其余按彩蛋各自记（例如 CQ 的"点已经被扫出来过"是 sss.cq-dot，见 resetKeys）
 * ========================================================================== */
(function () {
    'use strict';

    var KEY = 'sss.eggs';
    var KEY_OFF = 'sss.eggs.off';

    /* 彩蛋清单。href 从站点根写起，这样以后把彩蛋页挪到哪一层都不用改。
       加新彩蛋：往这里加一条，再到那个页面的 <body> 上写 data-egg="同样的 id"。
       · entry：入口元素的选择器（「关闭入口」靠它撤掉；没有入口就不写）
       · resetKeys：重置时要一并清掉的、这个彩蛋自己的 localStorage 键 */
    var LIST = [
        {
            id: 'cq',
            name: 'CQ · 未知信号',
            href: '/main/cq.html',
            desc: '一段没人应答的呼叫，和一张用 SSTV 慢扫描电视传回来的 QSL 卡片。',
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

    var API = {
        list: LIST,

        /** 已经发现的彩蛋（按清单顺序返回对象） */
        found: function () {
            var ids = readArr(KEY);
            var out = [];
            for (var i = 0; i < LIST.length; i++) {
                if (ids.indexOf(LIST[i].id) >= 0) out.push(LIST[i]);
            }
            return out;
        },

        has: function (id) { return readArr(KEY).indexOf(id) >= 0; },

        /** 登记一个彩蛋；重复登记没有任何副作用 */
        find: function (id) {
            var ids = readArr(KEY);
            if (ids.indexOf(id) < 0) { ids.push(id); writeArr(KEY, ids); }
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

        /** 完全忘掉这条彩蛋：已发现 / 已关闭 / 它自己的状态键，全部清掉 */
        reset: function (id) {
            writeArr(KEY, readArr(KEY).filter(function (x) { return x !== id; }));
            writeArr(KEY_OFF, readArr(KEY_OFF).filter(function (x) { return x !== id; }));
            var egg = byId(id);
            if (!egg || !egg.resetKeys) return;
            for (var i = 0; i < egg.resetKeys.length; i++) {
                try { localStorage.removeItem(egg.resetKeys[i]); } catch (e) { /* 忽略 */ }
            }
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
       按钮走全站控件令牌（--ctl-*），「重置」用站内那支错误红（--ctl-err）表示"这个会清掉东西"。 */
    var CSS = [
        '.egg-row{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 10px;margin-bottom:10px}',
        '.egg-row__acts{display:inline-flex;flex-wrap:wrap;gap:8px;margin-left:auto}',
        '.egg-btn{min-height:30px;padding:5px 12px;font:inherit;font-size:12px;letter-spacing:1px;',
        '  color:var(--ctl-fg-dim);background:var(--ctl-bg);border:1px solid var(--ctl-border);',
        '  border-radius:var(--ctl-radius);cursor:pointer;transition:var(--ctl-transition)}',
        '.egg-btn:hover,.egg-btn:focus-visible{color:var(--ctl-fg-hover);background:var(--ctl-bg-strong);',
        '  border-color:var(--ctl-border-hover)}',
        '.egg-btn--reset:hover,.egg-btn--reset:focus-visible{color:var(--ctl-err);',
        '  border-color:var(--ctl-err);background:rgba(255,107,107,0.10)}',
        '@media (max-width:768px){.egg-row__acts{margin-left:0;width:100%}}'
    ].join('');

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    function button(label, cls, onClick) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'egg-btn' + (cls ? ' ' + cls : '');
        b.textContent = label;
        b.addEventListener('click', onClick);
        return b;
    }

    function rowFor(egg) {
        var li = document.createElement('li');
        li.className = 'egg-row';

        var a = document.createElement('a');
        a.href = egg.href;
        a.textContent = egg.name;
        li.appendChild(a);
        if (egg.desc) li.appendChild(document.createTextNode(' —— ' + egg.desc));

        var acts = document.createElement('span');
        acts.className = 'egg-row__acts';

        if (egg.entry) {
            var closed = API.isHidden(egg.id);
            acts.appendChild(button(closed ? '恢复入口' : '关闭入口', '', function () {
                API.setHidden(egg.id, !API.isHidden(egg.id));
                render();
            }));
        }

        /* 重置要点两下：彩蛋不好找，清掉进度得是明确的动作（不用原生 confirm，太跳） */
        var armed = false;
        var reset = button('重置', 'egg-btn--reset', function () {
            if (!armed) {
                armed = true;
                reset.textContent = '确认重置？';
                window.setTimeout(function () {
                    if (!armed) return;
                    armed = false;
                    reset.textContent = '重置';
                }, 3000);
                return;
            }
            API.reset(egg.id);
            render();
        });
        acts.appendChild(reset);

        li.appendChild(acts);
        return li;
    }

    function render() {
        var found = API.found();
        if (!found.length) {                    // 一个都没发现 / 全被重置了：整张卡片不显示
            card.hidden = true;
            return;
        }

        var count = card.querySelector('[data-eggs-count]');
        if (count) {
            count.textContent = '已发现 ' + found.length + ' / ' + LIST.length +
                (found.length < LIST.length ? ' —— 还有没被翻出来的。' : ' —— 全都找到了。');
        }

        var list = card.querySelector('[data-eggs-list]');
        if (list) {
            list.textContent = '';              // 清空重画（操作后就靠它刷新按钮文案）
            for (var i = 0; i < found.length; i++) list.appendChild(rowFor(found[i]));
        }

        card.hidden = false;
    }

    render();
})();
