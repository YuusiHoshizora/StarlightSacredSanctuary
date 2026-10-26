/* =============================================================================
 * vessel.js — 舰船档案：左栏名录 / 右栏档案
 * -----------------------------------------------------------------------------
 * 数据在 assets/data/vessel.js（window.SSS_VESSEL）。
 * 这个脚本只负责渲染：
 *   - [data-vessel] → 左栏舰船名录 + 右栏舰船档案
 * 名录按尺寸分类分组（巨型 / 大型 / 中型 / 小型），点名录只切右栏，
 * 不改页面滚动位置；# 用 pushState 改地址栏。
 * 空字段 / 截断的记录一律渲染成「数据损坏」（与深空设施档案同一口径）。
 * ========================================================================== */
(function () {
    'use strict';

    var DATA = window.SSS_VESSEL;
    if (!DATA || !DATA.vessels || !DATA.vessels.length) return;

    var MISSING = '<span class="vessel-missing">数据损坏</span>';

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* 给多行 HTML 的每一行加缩进，只为输出好看，不影响渲染 */
    function indent(text, spaces) {
        var pad = new Array(spaces + 1).join(' ');
        return String(text).split('\n').map(function (line) {
            return line ? pad + line : line;
        }).join('\n');
    }

    /* 正文在数据里就是纯文本（资料库的 wiki 链接已在录入时展开），这里只做转义 */
    function inline(text) {
        return esc(text);
    }

    function paras(list) {
        return (list || []).map(function (t) {
            return '<p>' + inline(t) + '</p>';
        }).join('\n');
    }

    function block(title, en, body) {
        return '<section class="org-block vessel-block">\n' +
            '    <h3 class="org-block__head">' + title +
            (en ? '<span class="org-block__en">' + en + '</span>' : '') + '</h3>\n' +
            indent(body, 4) + '\n' +
            '</section>';
    }

    /* ── 基本信息：尺寸分类 / 迭代次数（资料库没写的字段不出现） ── */
    function metaHtml(s) {
        var rows = [
            ['尺寸分类', s.size ? esc(s.size) : MISSING]
        ];
        if (s.iteration) rows.push(['迭代次数', esc(s.iteration)]);

        return rows.map(function (row) {
            return '<div class="org-meta__row">\n' +
                '    <dt>' + row[0] + '</dt>\n' +
                '    <dd>' + row[1] + '</dd>\n' +
                '</div>';
        }).join('\n');
    }

    /* 记录损坏：写在 <dl> 外面（<dl> 里只允许 dt / dd / div） */
    function damagedHtml(s) {
        return '<p class="vessel-damaged">记录状态：数据损坏' +
            (s.damagedNote ? ' —— ' + esc(s.damagedNote) : '') + '</p>';
    }

    /* ── 详细装备：一行一套系统，N/A 表示该舰没有这一套 ── */
    function modulesHtml(list) {
        var rows = list.map(function (row) {
            var items = row.items || [];
            var body;
            if (!items.length) {
                body = MISSING;
            } else if (items.length === 1 && items[0] === 'N/A') {
                body = '<span class="vessel-na">N/A</span>';
            } else {
                body = '\n' + indent('<ul class="vessel-modules__list">\n' +
                    indent(items.map(function (t) {
                        var html = t === 'N/A' ? '<span class="vessel-na">N/A</span>' : inline(t);
                        return '<li>' + html + '</li>';
                    }).join('\n'), 4) + '\n</ul>', 8) + '\n        ';
            }
            return '    <div class="vessel-modules__row">\n' +
                '        <dt>' + esc(row.label) + '</dt>\n' +
                '        <dd>' + body + '</dd>\n' +
                '    </div>';
        }).join('\n');
        return '<dl class="vessel-modules">\n' + rows + '\n</dl>';
    }

    /* ── 装备区：清单，或「为什么没有清单」的说明 ── */
    function equipmentHtml(s) {
        var notes = (s.equipmentNote || []).map(function (t) {
            return '<p class="vessel-equipment-note">' + inline(t) + '</p>';
        }).join('\n');

        if (notes) {
            return block('详细装备', 'Equipment', notes);
        }
        if (s.equipment && s.equipment.length) {
            return block('详细装备', 'Equipment', modulesHtml(s.equipment));
        }
        return block('详细装备', 'Equipment', '<p>' + MISSING + '</p>');
    }

    /* ── 一份舰船档案 ── */
    function profileHtml(s, active) {
        var head = '<header class="vessel-profile__head">\n' +
            '    <p class="vessel-profile__kicker">' + esc(s.kind || '') + '</p>\n' +
            '    <h2 class="vessel-profile__name">' + esc(s.name) + '</h2>\n' +
            (s.en ? '    <p class="vessel-profile__en">' + esc(s.en) + '</p>\n' : '') +
            '</header>';

        var out = '<article class="vessel-profile' + (active ? ' is-active' : '') + '" id="' + esc(s.id) + '">\n' +
            indent(head, 4) + '\n';

        out += indent(block('基本信息', 'Basic Information',
            '<dl class="org-meta">\n' + indent(metaHtml(s), 4) + '\n</dl>' +
            (s.damaged ? '\n' + damagedHtml(s) : '')), 4) + '\n';

        if (s.intro && s.intro.length) {
            out += indent(block('简介', 'Introduction', paras(s.intro)), 4) + '\n';
        }
        out += indent(equipmentHtml(s), 4) + '\n';

        return out + '</article>';
    }

    /* ── 渲染：左栏名录 + 右栏所有档案 ── */
    var root = document.querySelector('[data-vessel]');
    if (!root) return;

    /* 名录分组：按 sizes 的顺序，组内顺序 = 数据里的书写顺序 */
    var sizes = DATA.sizes || [];
    var groups = sizes.map(function (size) {
        return {
            name: size.name,
            en: size.en || '',
            items: DATA.vessels.filter(function (s) {
                return s.size === size.name;
            })
        };
    }).filter(function (g) {
        return g.items.length;
    });

    /* sizes 里没登记、但数据里出现的尺寸，兜底归到最后一组，别丢条目 */
    var known = {};
    sizes.forEach(function (size) { known[size.name] = true; });
    var others = DATA.vessels.filter(function (s) { return !known[s.size]; });
    if (others.length) {
        groups.push({ name: '数据损坏', en: '', items: others });
    }

    var index = 0;

    function itemHtml(s) {
        var item = '<a class="vessel-list__item' + (index === 0 ? ' is-active' : '') +
            '" href="#' + esc(s.id) + '" data-id="' + esc(s.id) + '">\n' +
            '    <span class="vessel-list__name">' + esc(s.name) + '</span>\n' +
            (s.en ? '    <span class="vessel-list__en">' + esc(s.en) + '</span>\n' : '') +
            '</a>';
        index += 1;
        return item;
    }

    function listHtml() {
        index = 0;
        return groups.map(function (g) {
            var head = '<p class="vessel-list__group">' +
                esc(g.name) +
                (g.en ? '<span class="vessel-list__group-en">' + esc(g.en) + '</span>' : '') +
                '</p>';
            var items = g.items.map(function (s) {
                return indent(itemHtml(s), 4);
            }).join('\n');
            return indent(head, 4) + '\n' + items;
        }).join('\n');
    }

    root.innerHTML = '<aside class="vessel-list" aria-label="舰船名录">\n' +
        '    <p class="vessel-list__title">名录 <span>' + DATA.vessels.length + '</span></p>\n' +
        listHtml() + '\n' +
        '</aside>\n' +
        '<div class="vessel-detail">\n' +
        DATA.vessels.map(function (s, i) {
            return indent(profileHtml(s, i === 0), 4);
        }).join('\n\n') + '\n' +
        '</div>';

    var list = root.querySelector('.vessel-list');
    var items = Array.prototype.slice.call(root.querySelectorAll('.vessel-list__item'));
    var profiles = Array.prototype.slice.call(root.querySelectorAll('.vessel-profile'));
    if (!profiles.length) return;

    var byId = {};
    profiles.forEach(function (p) {
        byId[p.id] = p;
    });

    /* 首次渲染（含带 #舰船代号 直接进来）由浏览器自己定位，不在这里滚页面 */
    var initialising = true;

    function activate(id) {
        var profile = byId[id] || profiles[0];
        if (!profile) return;

        profiles.forEach(function (p) {
            p.classList.toggle('is-active', p === profile);
        });

        var current = null;
        items.forEach(function (a) {
            var on = a.getAttribute('data-id') === profile.id;
            a.classList.toggle('is-active', on);
            if (on) a.setAttribute('aria-current', 'true');
            else a.removeAttribute('aria-current');
            if (on) current = a;
        });

        /* 只滚左栏自己的滚动条，页面保持原位 */
        if (list && current) {
            var lr = list.getBoundingClientRect();
            var ir = current.getBoundingClientRect();
            if (ir.top < lr.top) list.scrollTop += ir.top - lr.top;
            else if (ir.bottom > lr.bottom) list.scrollTop += ir.bottom - lr.bottom;
        }

        /* 读到一半切到另一条舰船：档案标题已经被滚出视口时把它拉回来，
           否则页面停在新档案的中段。没滚过就什么都不做。
           窄屏（名录在上、档案在下）换档案时也要把标题带进来，
           否则点完名录还停在名录那一段。首次渲染不动页面。 */
        var head = profile.querySelector('.vessel-profile__head');
        if (head && !initialising) {
            var hr = head.getBoundingClientRect();
            var stacked = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
            if (hr.top < 96 || (stacked && hr.top > 96)) {
                window.scrollTo(0, window.scrollY + hr.top - 96);
            }
        }
    }

    function setHash(id) {
        if (location.hash === '#' + id) return;
        try {
            history.pushState(null, '', '#' + id);
        } catch (err) {
            /* file:// 等环境 pushState 受限时，至少保证右栏切换 */
        }
    }

    function fromHash() {
        var raw = location.hash ? location.hash.slice(1) : '';
        var id = raw;
        try {
            id = decodeURIComponent(raw);
        } catch (e) { /* 保留原值 */ }
        activate(id || profiles[0].id);
    }

    /* 名录里的舰船交叉链接走同一套：只切右栏，不让浏览器跳锚点 */
    root.addEventListener('click', function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
        if (!a || !root.contains(a)) return;
        var id = a.getAttribute('href').slice(1);
        if (!byId[id]) return;
        e.preventDefault();
        setHash(id);
        activate(id);
    });

    /* 浏览器前进 / 后退，或手动改地址栏 # 时也切右栏，但不跳页 */
    window.addEventListener('hashchange', fromHash);
    window.addEventListener('popstate', fromHash);

    /* 首次进入：有 #舰船代号 就选中，没有就显示第一条 */
    fromHash();
    initialising = false;
})();
