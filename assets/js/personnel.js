/* =============================================================================
 * personnel.js — 人员档案：数据渲染 + 左栏名录 / 右栏档案
 * -----------------------------------------------------------------------------
 * 数据在 assets/data/personnel.js（window.SSS_PERSONNEL）。
 * 这个脚本只负责渲染：
 *   - 人员档案首页：[data-personnel-index] → 四个等级卡片 + 实时人数
 *   - 等级页：[data-personnel][data-class] → 左栏名录 + 右栏档案
 * 点左栏只切右栏，不改页面滚动位置；# 用 pushState 改地址栏。
 * ========================================================================== */
(function () {
    'use strict';

    var DATA = window.SSS_PERSONNEL;
    if (!DATA || !DATA.members) return;

    var MISSING = '<span class="personnel-missing">数据损坏</span>';

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function val(v) {
        return v ? esc(v) : MISSING;
    }

    function byLatin(a, b) {
        return a.latin.localeCompare(b.latin, 'en');
    }

    function membersOf(key) {
        return DATA.members.filter(function (m) {
            return m.class === key;
        }).sort(byLatin);
    }

    function countOf(key) {
        return DATA.members.filter(function (m) {
            return m.class === key;
        }).length;
    }

    /* ── 人员档案首页：四个等级卡片 ── */
    var indexRoot = document.querySelector('[data-personnel-index]');
    if (indexRoot) {
        indexRoot.innerHTML = DATA.classes.map(function (c) {
            var n = countOf(c.key);
            return '                <a class="personnel-card" href="' + esc(c.key) + '">\n' +
                '                    <p class="personnel-card__code">' + esc(c.code) + '</p>\n' +
                '                    <h2 class="personnel-card__name">' + esc(c.name) + '</h2>\n' +
                '                    <p class="personnel-card__en">' + esc(c.en) + '</p>\n' +
                '                    <p class="personnel-card__desc">' + esc(c.desc) + '</p>\n' +
                '                    <p class="personnel-card__meta">' + n + ' 名成员 · 查看名录 ›</p>\n' +
                '                </a>';
        }).join('\n');
        return;
    }

    /* ── 等级页：左栏名录 + 右栏档案 ── */
    var root = document.querySelector('[data-personnel]');
    if (!root) return;

    var classKey = root.getAttribute('data-class');
    var cls = DATA.classes.filter(function (c) {
        return c.key === classKey;
    })[0];
    if (!cls) return;

    var members = membersOf(classKey);
    if (!members.length) {
        root.innerHTML = '<p class="personnel-missing">数据损坏，无法显示成员名录。</p>';
        return;
    }

    function listHtml() {
        var out = '';
        var last = '';
        members.forEach(function (m, i) {
            var initial = (m.latin.charAt(0) || '#').toUpperCase();
            if (initial !== last) {
                last = initial;
                out += '                <p class="personnel-list__group">' + esc(initial) + '</p>\n';
            }
            out += '                <a class="personnel-list__item' + (i === 0 ? ' is-active' : '') + '" href="#' + esc(m.anchor) + '" data-id="' + esc(m.anchor) + '">\n' +
                '                    <span class="personnel-list__name">' + esc(m.name) + '</span>\n' +
                '                    <span class="personnel-list__latin">' + esc(m.latin) + '</span>\n' +
                '                </a>\n';
        });
        return out;
    }

    /* 亲属名：在成员库里找得到就链到对方的档案页 #身份编号 */
    function relativeHtml(r) {
        var m = String(r).match(/^([^：:]+)[：:](.+)$/);
        var label = m ? m[1] : '';
        var name = (m ? m[2] : r).trim();
        var target = DATA.members.filter(function (x) {
            return x.name === name;
        })[0];
        if (!target) return esc(r);
        return (label ? esc(label) + '：' : '') +
            '<a class="personnel-relative" href="' + esc(target.class + '.html#' + target.anchor) + '">' + esc(name) + '</a>';
    }

    function profileHtml(m, active) {
        var meta = [
            ['姓名', esc(m.name)],
            ['性别', val(m.gender)],
            ['出生日期', val(m.birth)],
            ['种族', val(m.race)],
            ['归属舰队', val(m.fleet)],
            [m.residenceLabel || '居住地', val(m.residence)],
            ['身份编号', m.identity ? esc(m.identity) : MISSING],
        ].map(function (row) {
            return '                            <div class="org-meta__row">\n' +
                '                                <dt>' + row[0] + '</dt>\n' +
                '                                <dd>' + row[1] + '</dd>\n' +
                '                            </div>';
        }).join('\n');

        var roles = m.roles.length
            ? '                        <ul>\n' + m.roles.map(function (r) {
                return '                            <li>' + esc(r) + '</li>';
            }).join('\n') + '\n                        </ul>'
            : '                        ' + MISSING;

        var relatives = m.relatives.length
            ? '\n                    <section class="org-block personnel-profile__block personnel-profile__block--relatives">\n' +
              '                        <h3 class="org-block__head">亲属<span class="org-block__en">Relatives</span></h3>\n' +
              '                        <ul>\n' + m.relatives.map(function (r) {
                  return '                            <li>' + relativeHtml(r) + '</li>';
              }).join('\n') + '\n                        </ul>\n' +
              '                    </section>'
            : '';

        var awards = m.awards.length
            ? '                        <ul>\n' + m.awards.map(function (a) {
                return '                            <li>' + esc(a) + '</li>';
            }).join('\n') + '\n                        </ul>'
            : '                        ' + MISSING;

        var research = m.research.length
            ? m.research.map(function (p) {
                return '                        <p>' + esc(p) + '</p>';
            }).join('\n')
            : '                        ' + MISSING;

        var feedback = m.feedback.length
            ? m.feedback.map(function (p) {
                return '                        <p>' + esc(p) + '</p>';
            }).join('\n')
            : '                        ' + MISSING;

        return '                <article class="personnel-profile' + (active ? ' is-active' : '') + '" id="' + esc(m.anchor) + '">\n' +
            '                    <header class="personnel-profile__head">\n' +
            '                        <h2 class="personnel-profile__name">' + esc(m.name) + '</h2>\n' +
            '                        <p class="personnel-profile__latin">' + esc(m.latin) + '</p>\n' +
            '                    </header>\n\n' +
            '                    <section class="org-block personnel-profile__block personnel-profile__block--basic">\n' +
            '                        <h3 class="org-block__head">基本信息<span class="org-block__en">Basic Information</span></h3>\n' +
            '                        <dl class="org-meta">\n' + meta + '\n                        </dl>\n' +
            '                    </section>\n\n' +
            '                    <section class="org-block personnel-profile__block personnel-profile__block--identity">\n' +
            '                        <h3 class="org-block__head">身份信息<span class="org-block__en">Identity</span></h3>\n' +
            roles + '\n' +
            '                    </section>' + relatives + '\n\n' +
            '                    <section class="org-block personnel-profile__block personnel-profile__block--research">\n' +
            '                        <h3 class="org-block__head">科研水平<span class="org-block__en">Research</span></h3>\n' +
            '                        <h4 class="org-tier-head">获奖情况 <span class="org-tier-head__en">Awards</span></h4>\n' +
            awards + '\n' +
            '                        <h4 class="org-tier-head">当前研究 <span class="org-tier-head__en">Current Research</span></h4>\n' +
            research + '\n' +
            '                    </section>\n\n' +
            '                    <section class="org-block personnel-profile__block personnel-profile__block--feedback">\n' +
            '                        <h3 class="org-block__head">主防御舰队反馈<span class="org-block__en">Defense Fleet Feedback</span></h3>\n' +
            feedback + '\n' +
            '                    </section>\n' +
            '                </article>';
    }

    root.innerHTML = '<aside class="personnel-list" aria-label="成员名录">\n' +
        '                    <p class="personnel-list__title">名录 <span>' + members.length + '</span></p>\n' +
        listHtml() +
        '                </aside>\n\n' +
        '                <div class="personnel-detail">\n' +
        members.map(function (m, i) {
            return profileHtml(m, i === 0);
        }).join('\n\n') + '\n                </div>';

    var list = root.querySelector('.personnel-list');
    var items = Array.prototype.slice.call(root.querySelectorAll('.personnel-list__item'));
    var profiles = Array.prototype.slice.call(root.querySelectorAll('.personnel-profile'));
    if (!profiles.length) return;

    var byId = {};
    profiles.forEach(function (p) {
        byId[p.id] = p;
    });

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
            if (on) current = a;
        });

        /* 只滚左栏自己的滚动条，页面保持原位 */
        if (list && current) {
            var lr = list.getBoundingClientRect();
            var ir = current.getBoundingClientRect();
            if (ir.top < lr.top) list.scrollTop += ir.top - lr.top;
            else if (ir.bottom > lr.bottom) list.scrollTop += ir.bottom - lr.bottom;
        }
    }

    function fromHash() {
        var raw = location.hash ? location.hash.slice(1) : '';
        var id = raw;
        try {
            id = decodeURIComponent(raw);
        } catch (e) { /* 保留原值 */ }
        activate(id || (profiles[0] && profiles[0].id));
    }

    items.forEach(function (a) {
        a.addEventListener('click', function (e) {
            var id = a.getAttribute('data-id');
            if (!id) return;

            /* 不让 <a href="#…"> 触发浏览器的锚点滚动 */
            e.preventDefault();

            if (location.hash !== '#' + id) {
                try {
                    history.pushState(null, '', '#' + id);
                } catch (err) {
                    /* file:// 等环境 pushState 受限时，至少保证右栏切换 */
                }
            }

            activate(id);
        });
    });

    /* 浏览器前进 / 后退，或手动改地址栏 # 时也切右栏，但不跳页 */
    window.addEventListener('hashchange', fromHash);
    window.addEventListener('popstate', fromHash);

    /* 首次进入：有 #身份编号 就选中，没有就显示第一位；都不滚动页面 */
    fromHash();
})();
