/* =============================================================================
 * facility.js — 深空设施档案：左栏名录 / 右栏档案
 * -----------------------------------------------------------------------------
 * 数据在 assets/data/facility.js（window.SSS_FACILITY）。
 * 这个脚本只负责渲染：
 *   - [data-facility] → 左栏设施名录 + 右栏设施档案
 * 没有分类层级：点名录就直接换右栏。点左栏只切右栏，
 * 不改页面滚动位置；# 用 pushState 改地址栏。
 * 空字段 / 截断的记录一律渲染成「数据损坏」（与人员档案同一口径）。
 * ========================================================================== */
(function () {
    'use strict';

    var DATA = window.SSS_FACILITY;
    if (!DATA || !DATA.facilities || !DATA.facilities.length) return;

    var MISSING = '<span class="facility-missing">数据损坏</span>';

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
        return '<section class="org-block facility-block">\n' +
            '    <h3 class="org-block__head">' + title +
            (en ? '<span class="org-block__en">' + en + '</span>' : '') + '</h3>\n' +
            indent(body, 4) + '\n' +
            '</section>';
    }

    /* ── 基本信息 ──
       深空设施多功能，不写「性质」：只列归属与资料库里确实给了的字段。 */
    function metaHtml(f) {
        var rows = [
            ['归属', f.affiliation ? esc(f.affiliation) : MISSING]
        ];
        if (f.abbr) rows.push(['代号', esc(f.abbr)]);
        if (f.clearance) rows.push(['授权等级', esc(f.clearance)]);
        if (f.plan) rows.push(['所属计划', esc(f.plan)]);

        return rows.map(function (row) {
            return '<div class="org-meta__row">\n' +
                '    <dt>' + row[0] + '</dt>\n' +
                '    <dd>' + row[1] + '</dd>\n' +
                '</div>';
        }).join('\n');
    }

    /* 记录损坏：写在 <dl> 外面（<dl> 里只允许 dt / dd / div） */
    function damagedHtml(f) {
        return '<p class="facility-damaged">记录状态：数据损坏' +
            (f.damagedNote ? ' —— ' + esc(f.damagedNote) : '') + '</p>';
    }

    /* ── 独特配件：一个配件一张小节，可带子配件 ── */
    function subpartHtml(c) {
        var out = '<article class="facility-subpart">\n';
        out += '    <h5 class="facility-subpart__name">' + esc(c.name);
        if (c.en) out += '<span class="facility-subpart__en">' + esc(c.en) + '</span>';
        out += '</h5>\n';
        if (c.meta) out += '    <p class="facility-part__meta">' + esc(c.meta) + '</p>\n';
        if (c.desc && c.desc.length) {
            out += indent(paras(c.desc), 4) + '\n';
        } else {
            out += '    <p>' + MISSING + '</p>\n';
        }
        return out + '</article>';
    }

    function partHtml(p) {
        var out = '<article class="facility-part">\n';
        out += '    <h4 class="facility-part__name">' + esc(p.name);
        if (p.en) out += '<span class="facility-part__en">' + esc(p.en) + '</span>';
        out += '</h4>\n';
        if (p.meta) out += '    <p class="facility-part__meta">' + esc(p.meta) + '</p>\n';
        if (p.note) out += '    <p class="facility-part__note">' + esc(p.note) + '</p>\n';
        if (p.desc && p.desc.length) {
            out += indent(paras(p.desc), 4) + '\n';
        } else if (!p.children || !p.children.length) {
            out += '    <p>' + MISSING + '</p>\n';
        }
        if (p.children && p.children.length) {
            out += '    <div class="facility-subparts">\n' +
                indent(p.children.map(subpartHtml).join('\n'), 8) + '\n' +
                '    </div>\n';
        }
        return out + '</article>';
    }

    /* ── 通用配件：一行一个系统，N/A 表示该设施没有这一套 ── */
    function modulesHtml(list) {
        var rows = list.map(function (row) {
            var items = row.items || [];
            var body;
            if (!items.length) {
                body = MISSING;
            } else if (items.length === 1 && items[0] === 'N/A') {
                body = '<span class="facility-na">N/A</span>';
            } else {
                body = '\n' + indent('<ul class="facility-modules__list">\n' +
                    indent(items.map(function (t) {
                        var html = t === 'N/A' ? '<span class="facility-na">N/A</span>' : inline(t);
                        return '<li>' + html + '</li>';
                    }).join('\n'), 4) + '\n</ul>', 8) + '\n        ';
            }
            return '    <div class="facility-modules__row">\n' +
                '        <dt>' + esc(row.label) + '</dt>\n' +
                '        <dd>' + body + '</dd>\n' +
                '    </div>';
        }).join('\n');
        return '<dl class="facility-modules">\n' + rows + '\n</dl>';
    }

    /* ── 配件区：独特 / 通用 / 「为什么没有」的说明 ── */
    function partsHtml(f) {
        var p = f.parts;
        if (!p) return '';

        var notes = (p.note || []).map(function (t) {
            return '<p class="facility-parts-note">' + inline(t) + '</p>';
        }).join('\n');
        var hasUnique = p.unique !== null && p.unique !== undefined;
        var hasCommon = p.common !== null && p.common !== undefined;

        // 两节都不存在、只有说明（非星光圣域设施）→ 合成一块「配件」
        if (!hasUnique && !hasCommon && notes) {
            return block('配件', 'Modules', notes);
        }

        var out = '';
        if (hasUnique) {
            var uniq = p.unique.length
                ? p.unique.map(partHtml).join('\n')
                : '<p>' + MISSING + '</p>';
            if (notes) uniq += '\n' + notes;
            out = block('独特配件', 'Unique Modules', uniq);
        }
        if (hasCommon) {
            var common = p.common.length
                ? modulesHtml(p.common)
                : '<p>' + MISSING + '</p>';
            out += (out ? '\n' : '') + block('通用配件', 'Standard Modules', common);
        }
        return out;
    }

    function orgsHtml(f) {
        if (!f.orgs || !f.orgs.length) return '';
        var body = f.orgs.map(function (o) {
            return '<div class="facility-org">\n' +
                '    <h4 class="facility-org__name">' + esc(o.name) + '</h4>\n' +
                indent(paras(o.desc), 4) + '\n' +
                '</div>';
        }).join('\n');
        return block('参与组织与势力', 'Participating Organizations', body);
    }

    /* ── 一份设施档案 ── */
    function profileHtml(f, active) {
        /* 标题上方只留缩写代号；没有缩写的条目直接从名称开始（不再写「性质」） */
        var kicker = f.abbr || '';
        var head = '<header class="facility-profile__head">\n' +
            (kicker ? '    <p class="facility-profile__kicker">' + esc(kicker) + '</p>\n' : '') +
            '    <h2 class="facility-profile__name">' + esc(f.name) + '</h2>\n' +
            (f.en ? '    <p class="facility-profile__en">' + esc(f.en) + '</p>\n' : '') +
            (f.foreign ? '    <p class="facility-profile__badge">非星光圣域设施</p>\n' : '') +
            '</header>';

        var out = '<article class="facility-profile' + (active ? ' is-active' : '') + '" id="' + esc(f.id) + '">\n' +
            indent(head, 4) + '\n';

        out += indent(block('基本信息', 'Basic Information',
            '<dl class="org-meta">\n' + indent(metaHtml(f), 4) + '\n</dl>' +
            (f.damaged ? '\n' + damagedHtml(f) : '')), 4) + '\n';

        if (f.intro && f.intro.length) {
            out += indent(block('简介', 'Introduction', paras(f.intro)), 4) + '\n';
        }
        var parts = partsHtml(f);
        if (parts) out += indent(parts, 4) + '\n';
        if (f.response && f.response.length) {
            out += indent(block('应对措施', 'Countermeasures', paras(f.response)), 4) + '\n';
        }
        var orgs = orgsHtml(f);
        if (orgs) out += indent(orgs, 4) + '\n';

        return out + '</article>';
    }

    /* ── 渲染：左栏名录 + 右栏所有档案 ── */
    var root = document.querySelector('[data-facility]');
    if (!root) return;

    var AFFIL = DATA.affiliations || {};

    function affilAbbr(name) {
        return (AFFIL[name] && AFFIL[name].abbr) || '';
    }

    /* 名录分组：星光圣域固定第一，其余按归属缩写首字母；
       没有缩写的排在有缩写的之后，归属为空的条目归入「数据损坏」组、排最后。
       组内顺序 = 数据里的书写顺序。 */
    function groupKey(name) {
        if (!name) return '3';
        if (name === '星光圣域') return '0';
        var abbr = affilAbbr(name);
        return abbr ? '1' + abbr : '2' + name;
    }

    /* 父子设施：子设施挂在父设施下面，不再单独出现在归属分组里（分组按父设施的归属算）。
       父设施那一行在左栏是「文件夹」，点开 / 收起子设施。 */
    var facilityById = {};
    DATA.facilities.forEach(function (f) {
        facilityById[f.id] = f;
    });

    var childrenOf = {};
    var roots = [];
    DATA.facilities.forEach(function (f) {
        if (f.parent && facilityById[f.parent]) {
            (childrenOf[f.parent] = childrenOf[f.parent] || []).push(f);
        } else {
            roots.push(f);
        }
    });

    var groups = [];
    var groupIndex = {};
    roots.forEach(function (f) {
        var key = f.affiliation || '';
        if (!groupIndex[key]) {
            groupIndex[key] = {
                key: key,
                name: key || '数据损坏',
                abbr: affilAbbr(key),
                items: []
            };
            groups.push(groupIndex[key]);
        }
        groupIndex[key].items.push(f);
    });
    groups.sort(function (a, b) {
        return groupKey(a.key).localeCompare(groupKey(b.key), 'en');
    });

    /* 同一种设施类型有多条时（索拉克分支矩阵 ×4），名录里补上各自的名字，
       否则左栏会出现四条一模一样的条目。 */
    var kindCount = {};
    DATA.facilities.forEach(function (f) {
        kindCount[f.kind] = (kindCount[f.kind] || 0) + 1;
    });

    function listName(f) {
        if (!f.kind) return f.name;
        if ((kindCount[f.kind] || 0) > 1 && f.name.indexOf(f.kind) === 0) return f.name;
        return f.kind;
    }

    /* 子设施属于别的势力时，在英文类型后面补一个缩写，免得脱离归属分组后看不出来 */
    function childTag(f) {
        if (!f.parent || !f.affiliation) return '';
        var parent = facilityById[f.parent];
        if (!parent || parent.affiliation === f.affiliation) return '';
        var abbr = affilAbbr(f.affiliation);
        if (!abbr) return '';
        return '<span class="facility-list__tag">' + esc(abbr) + '</span>';
    }

    var index = 0;

    function itemHtml(f, isChild) {
        var item = '<a class="facility-list__item' + (isChild ? ' facility-list__item--child' : '') +
            (index === 0 ? ' is-active' : '') +
            '" href="#' + esc(f.id) + '" data-id="' + esc(f.id) + '">\n' +
            '    <span class="facility-list__name">' + esc(listName(f)) + '</span>\n' +
            (f.kindEn ? '    <span class="facility-list__en">' + esc(f.kindEn) + childTag(f) + '</span>\n' : '') +
            '</a>';
        index += 1;
        return item;
    }

    /* 父设施 = 左栏一个「文件夹」：父设施链接 + 展开按钮，子设施缩进在下面 */
    function branchHtml(f) {
        var kids = childrenOf[f.id] || [];
        if (!kids.length) return itemHtml(f, false);

        var kidsId = 'facility-children-' + f.id;
        var out = '<div class="facility-list__branch" data-branch="' + esc(f.id) + '">\n';
        out += '    <div class="facility-list__row">\n';
        out += indent(itemHtml(f, false), 8) + '\n';
        out += '        <button class="facility-list__toggle" type="button" aria-expanded="false"' +
            ' aria-controls="' + esc(kidsId) + '"' +
            ' data-name="' + esc(listName(f)) + '"' +
            ' aria-label="展开 ' + esc(listName(f)) + ' 的分支">\n';
        out += '            <span class="facility-list__caret" aria-hidden="true"></span>\n';
        out += '        </button>\n';
        out += '    </div>\n';
        out += '    <div class="facility-list__children" id="' + esc(kidsId) + '" hidden>\n';
        out += indent(kids.map(function (c) {
            return itemHtml(c, true);
        }).join('\n'), 8) + '\n';
        out += '    </div>\n';
        out += '</div>';
        return out;
    }

    function listHtml() {
        index = 0;
        return groups.map(function (g) {
            var head = '<p class="facility-list__group">' +
                (g.abbr ? '<span class="facility-list__abbr">' + esc(g.abbr) + '</span>' : '') +
                esc(g.name) + '</p>';
            var items = g.items.map(function (f) {
                return indent(branchHtml(f), 4);
            }).join('\n');
            return indent(head, 4) + '\n' + items;
        }).join('\n');
    }

    root.innerHTML = '<aside class="facility-list" aria-label="设施名录">\n' +
        '    <p class="facility-list__title">名录 <span>' + DATA.facilities.length + '</span></p>\n' +
        listHtml() + '\n' +
        '</aside>\n' +
        '<div class="facility-detail">\n' +
        DATA.facilities.map(function (f, i) {
            return indent(profileHtml(f, i === 0), 4);
        }).join('\n\n') + '\n' +
        '</div>';

    var list = root.querySelector('.facility-list');
    var items = Array.prototype.slice.call(root.querySelectorAll('.facility-list__item'));
    var profiles = Array.prototype.slice.call(root.querySelectorAll('.facility-profile'));
    if (!profiles.length) return;

    var byId = {};
    profiles.forEach(function (p) {
        byId[p.id] = p;
    });

    /* 展开 / 收起父设施下面的子设施 */
    function setExpanded(branch, on) {
        var btn = branch.querySelector('.facility-list__toggle');
        var kids = branch.querySelector('.facility-list__children');
        if (!btn || !kids) return;
        btn.setAttribute('aria-expanded', on ? 'true' : 'false');
        btn.setAttribute('aria-label', (on ? '收起 ' : '展开 ') + (btn.getAttribute('data-name') || '') + ' 的分支');
        kids.hidden = !on;
    }

    /* 首次渲染（含带 #设施代号 直接进来）由浏览器自己定位，不在这里滚页面 */
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

        /* 选中的是子设施（或父设施）时，把它的「文件夹」展开，否则左栏里看不到选中项 */
        if (current) {
            var branch = current.closest ? current.closest('.facility-list__branch') : null;
            if (branch) setExpanded(branch, true);
        }

        /* 只滚左栏自己的滚动条，页面保持原位 */
        if (list && current) {
            var lr = list.getBoundingClientRect();
            var ir = current.getBoundingClientRect();
            if (ir.top < lr.top) list.scrollTop += ir.top - lr.top;
            else if (ir.bottom > lr.bottom) list.scrollTop += ir.bottom - lr.bottom;
        }

        /* 读到一半切到另一条设施：档案标题已经被滚出视口时把它拉回来，
           否则页面停在新档案的中段。没滚过就什么都不做。
           窄屏（名录在上、档案在下）换档案时也要把标题带进来，
           否则点完名录还停在名录那一段。首次渲染不动页面。 */
        var head = profile.querySelector('.facility-profile__head');
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

    /* 名录与档案里的设施交叉链接走同一套：只切右栏，不让浏览器跳锚点。
       父设施行右侧的展开按钮只负责开合，不切换右栏。 */
    root.addEventListener('click', function (e) {
        var toggle = e.target && e.target.closest ? e.target.closest('.facility-list__toggle') : null;
        if (toggle && root.contains(toggle)) {
            var branch = toggle.closest('.facility-list__branch');
            if (branch) setExpanded(branch, toggle.getAttribute('aria-expanded') !== 'true');
            return;
        }

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

    /* 首次进入：有 #设施代号 就选中，没有就显示第一条 */
    fromHash();
    initialising = false;
})();
