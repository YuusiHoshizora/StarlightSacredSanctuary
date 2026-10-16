/* =============================================================================
 * eggs.js — 彩蛋登记册
 * -----------------------------------------------------------------------------
 * 站点里藏着不与导航相连的页面（彩蛋）。这个文件做两件事：
 *
 * 1) 记下「这台浏览器发现过哪些彩蛋」—— 按 id 存在 localStorage 里。
 *    彩蛋页只要在 <body> 上写 data-egg="cq"，本文件就会自动登记（见文件末尾）；
 *    「关于」页读这份记录来展示。
 *    ⚠️ id 一旦发布就别改：「已发现」按 id 记，改 id 等于把所有人的进度清零。
 *    ⚠️ 预渲染保护：speculation rules 会在鼠标悬停时提前渲染目标页，
 *       所以等页面真正激活（prerenderingchange）才登记 —— 否则"悬停一下"就算发现了。
 *
 * 2) 「关于」页里那张「已发现的彩蛋」卡片：把找到的列出来、填上计数；
 *    一个都没找到就把整张卡片留成 hidden（也就是整张不显示）。
 *    卡片本身写在 about/index.html 里（默认 hidden），这里只负责填与放行。
 * ========================================================================== */
(function () {
    'use strict';

    var KEY = 'sss.eggs';

    /* 彩蛋清单。href 从站点根写起，这样以后把彩蛋页挪到哪一层都不用改。
       加新彩蛋：往这里加一条，再到那个页面的 <body> 上写 data-egg="同样的 id"。 */
    var LIST = [
        {
            id: 'cq',
            name: 'CQ · 未知信号',
            href: '/main/cq.html',
            desc: '一段没人应答的呼叫，和一张用 SSTV 慢扫描电视传回来的 QSL 卡片。'
        }
    ];

    function read() {
        try {
            var raw = localStorage.getItem(KEY);
            var arr = raw ? JSON.parse(raw) : [];
            return Object.prototype.toString.call(arr) === '[object Array]' ? arr : [];
        } catch (e) {
            return [];                 // 无痕模式 / 存储被禁：当作没发现过，不影响页面
        }
    }

    function write(ids) {
        try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) { /* 同上，忽略 */ }
    }

    var API = {
        list: LIST,

        /** 已经发现的彩蛋（按清单顺序返回对象） */
        found: function () {
            var ids = read();
            var out = [];
            for (var i = 0; i < LIST.length; i++) {
                if (ids.indexOf(LIST[i].id) >= 0) out.push(LIST[i]);
            }
            return out;
        },

        /** 登记一个彩蛋；重复登记没有任何副作用 */
        find: function (id) {
            var ids = read();
            if (ids.indexOf(id) < 0) {
                ids.push(id);
                write(ids);
            }
        },

        /** 预渲染安全地登记：预渲染中的页面先等真正激活再记（见文件头注释） */
        findWhenActive: function (id) {
            if (document.prerendering) {
                document.addEventListener('prerenderingchange', function () { API.find(id); }, { once: true });
            } else {
                API.find(id);
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

    var found = API.found();
    if (!found.length) return;                  // 一个都没发现：卡片保持 hidden

    var list = card.querySelector('[data-eggs-list]');
    if (list) {
        for (var i = 0; i < found.length; i++) {
            var egg = found[i];
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.href = egg.href;
            a.textContent = egg.name;
            li.appendChild(a);
            if (egg.desc) li.appendChild(document.createTextNode(' —— ' + egg.desc));
            list.appendChild(li);
        }
    }

    var count = card.querySelector('[data-eggs-count]');
    if (count) {
        count.textContent = '已发现 ' + found.length + ' / ' + LIST.length +
            (found.length < LIST.length ? ' —— 还有没被翻出来的。' : ' —— 全都找到了。');
    }

    card.hidden = false;
})();
