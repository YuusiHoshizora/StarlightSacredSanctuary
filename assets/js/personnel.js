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
            out += '                <a class="personnel-list__item" href="#' + esc(m.anchor) + '" data-id="' + esc(m.anchor) + '">\n' +
                '                    <span class="personnel-list__name">' + esc(m.name) + '</span>\n' +
                '                    <span class="personnel-list__latin">' + esc(m.latin) + '</span>\n' +
                '                </a>\n';
        });
        return out;
    }

    /* 亲属名：在成员库里找得到就链到对方的档案页 ?person=身份编号 */
    function relativeHtml(r) {
        var m = String(r).match(/^([^：:]+)[：:](.+)$/);
        var label = m ? m[1] : '';
        var name = (m ? m[2] : r).trim();
        var target = DATA.members.filter(function (x) {
            return x.name === name;
        })[0];
        if (!target) return esc(r);
        return (label ? esc(label) + '：' : '') +
            '<a class="personnel-relative" href="' + esc(target.class + '.html?person=' + encodeURIComponent(target.anchor)) + '">' + esc(name) + '</a>';
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

        var basic = '                    <section class="org-block personnel-profile__block personnel-profile__block--basic">\n' +
            '                        <h3 class="org-block__head">基本信息<span class="org-block__en">Basic Information</span></h3>\n' +
            '                        <dl class="org-meta">\n' + meta + '\n                        </dl>\n' +
            '                    </section>';

        var identity = '                    <section class="org-block personnel-profile__block personnel-profile__block--identity">\n' +
            '                        <h3 class="org-block__head">身份信息<span class="org-block__en">Identity</span></h3>\n' +
            roles + '\n' +
            '                    </section>';

        var researchBlock = '                    <section class="org-block personnel-profile__block personnel-profile__block--research">\n' +
            '                        <h3 class="org-block__head">科研水平<span class="org-block__en">Research</span></h3>\n' +
            '                        <h4 class="org-tier-head">获奖情况 <span class="org-tier-head__en">Awards</span></h4>\n' +
            awards + '\n' +
            '                        <h4 class="org-tier-head">当前研究 <span class="org-tier-head__en">Current Research</span></h4>\n' +
            research + '\n' +
            '                    </section>';

        var feedbackBlock = '                    <section class="org-block personnel-profile__block personnel-profile__block--feedback">\n' +
            '                        <h3 class="org-block__head">主防御舰队反馈<span class="org-block__en">Defense Fleet Feedback</span></h3>\n' +
            feedback + '\n' +
            '                    </section>';

        return '                <article class="personnel-profile' + (active ? ' is-active' : '') + '" id="' + esc(m.anchor) + '">\n' +
            '                    <header class="personnel-profile__head">\n' +
            '                        <h2 class="personnel-profile__name">' + esc(m.name) + '</h2>\n' +
            '                        <p class="personnel-profile__latin">' + esc(m.latin) + '</p>\n' +
            '                    </header>\n\n' +
            '                    <div class="personnel-profile__body">\n' +
            '                    <div class="personnel-profile__cols">\n' +
            '                        <div class="personnel-profile__col personnel-profile__col--left">\n' +
            basic + '\n' + identity + relatives + '\n' +
            '                        </div>\n' +
            '                        <div class="personnel-profile__col personnel-profile__col--right">\n' +
            researchBlock + '\n' + feedbackBlock + '\n' +
            '                        </div>\n' +
            '                    </div>\n' +
            '                    </div>\n' +
            '                </article>';
    }

    root.innerHTML = '<aside class="personnel-list" aria-label="成员名录">\n' +
        '                    <div class="personnel-list__head">\n' +
        '                        <p class="personnel-list__title">名录 <span>' + members.length + '</span></p>\n' +
        '                        <div class="archive-search">\n' +
        '                            <input type="search" class="archive-search__input" placeholder="搜索成员" aria-label="按名称搜索成员" autocomplete="off" spellcheck="false">\n' +
        '                            <p class="archive-search__empty" hidden>没有找到匹配的条目</p>\n' +
        '                        </div>\n' +
        '                    </div>\n' +
        '                    <div class="personnel-list__scroll">\n' +
        listHtml() +
        '                    </div>\n' +
        '                </aside>\n\n' +
        '                <div class="personnel-detail">\n' +
        '                    <div class="archive-empty" role="status" aria-label="未选择成员">\n' +
        '                        <span class="archive-empty__dot" aria-hidden="true"></span>\n' +
        '                        <p class="archive-empty__text">NO / INFO</p>\n' +
        '                    </div>\n' +
        members.map(function (m) {
            return profileHtml(m, false);
        }).join('\n\n') + '\n                </div>';

    var list = root.querySelector('.personnel-list__scroll');
    var items = Array.prototype.slice.call(root.querySelectorAll('.personnel-list__item'));
    var profiles = Array.prototype.slice.call(root.querySelectorAll('.personnel-profile'));
    var empty = root.querySelector('.archive-empty');
    if (!profiles.length) return;

    if (window.SSSArchiveSearch) {
        window.SSSArchiveSearch.attach({
            input: root.querySelector('.archive-search__input'),
            empty: root.querySelector('.archive-search__empty'),
            scroll: list,
            items: items,
            groups: Array.prototype.slice.call(root.querySelectorAll('.personnel-list__group')),
            groupSelector: '.personnel-list__group'
        });
    }

    var byId = {};
    profiles.forEach(function (p) {
        byId[p.id] = p;
    });

    function activate(id) {
        var profile = (id && byId[id]) || null;

        /* 当前稳定选中的档案；正在做离场动画的不算 */
        var currentProfile = null;
        profiles.forEach(function (p) {
            if (p.classList.contains('is-active') && !p.classList.contains('is-leaving')) {
                currentProfile = p;
            }
        });

        /* 上一轮还没结束的离场层直接收掉，避免叠两层 */
        profiles.forEach(function (p) {
            if (p.classList.contains('is-leaving')) {
                p.classList.remove('is-active', 'is-leaving');
            }
        });

        var wide = window.matchMedia && window.matchMedia('(min-width: 901px)').matches;
        var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var animating = !!currentProfile && currentProfile !== profile && wide && !still;

        if (animating) {
            currentProfile.classList.add('is-leaving');
            window.setTimeout(function () {
                /* 期间又切回这一条的话，is-leaving 已经被清掉，不能误摘 is-active */
                if (currentProfile.classList.contains('is-leaving')) {
                    currentProfile.classList.remove('is-active', 'is-leaving');
                }
            }, 190);
        }

        profiles.forEach(function (p) {
            if (p === profile) p.classList.add('is-active');
            else if (p !== currentProfile || !animating) p.classList.remove('is-active');
        });

        var current = null;
        items.forEach(function (a) {
            var on = profile && a.getAttribute('data-id') === profile.id;
            a.classList.toggle('is-active', on);
            if (on) current = a;
        });

        if (empty) empty.hidden = !!profile;

        /* 只滚左栏自己的滚动条，页面保持原位 */
        if (list && current) {
            var lr = list.getBoundingClientRect();
            var ir = current.getBoundingClientRect();
            if (ir.top < lr.top) list.scrollTop += ir.top - lr.top;
            else if (ir.bottom > lr.bottom) list.scrollTop += ir.bottom - lr.bottom;
        }

        /* 右栏标题固定在顶上，换人时把正文送回到开头 */
        if (profile) {
            var body = profile.querySelector('.personnel-profile__body');
            if (body) body.scrollTop = 0;
        }

        /* 右栏内容换了（或回到空白），滚动状态要重算 */
        if (window.__sssArchiveScroll && window.__sssArchiveScroll.refresh) {
            window.__sssArchiveScroll.refresh();
        }
    }

    function fromHash() {
        var id = '';

        /* 优先读 ?person=身份编号：静态主机的 clean-url 跳转不会丢 query */
        try {
            var q = new URLSearchParams(location.search).get('person');
            if (q) id = q;
        } catch (e) { /* 老浏览器不支持 URLSearchParams 时退回 hash */ }

        if (!id) {
            var raw = location.hash ? location.hash.slice(1) : '';
            try {
                id = decodeURIComponent(raw);
            } catch (e) { /* 保留原值 */ }
        }

        activate(id || '');
    }

    items.forEach(function (a) {
        a.addEventListener('click', function (e) {
            var id = a.getAttribute('data-id');
            if (!id) return;

            /* 不让 <a href="#…"> 触发浏览器的锚点滚动 */
            e.preventDefault();

            /* 再点一次已高亮的条目 = 取消选择，回到空白态 */
            if (a.classList.contains('is-active')) {
                clearSelection();
                return;
            }

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

    /* 点左栏 / 右栏的空白处取消选择 */
    var listPane = root.querySelector('.personnel-list');
    var detailPane = root.querySelector('.personnel-detail');

    function clearSelection() {
        if (!profiles.some(function (p) { return p.classList.contains('is-active'); })) return;
        try { history.pushState(null, '', location.pathname); } catch (e) { }
        activate('');
    }

    if (listPane) {
        listPane.addEventListener('click', function (e) {
            if (e.target.closest('.personnel-list__item, .archive-search')) return;
            clearSelection();
        });
    }

    if (detailPane) {
        detailPane.addEventListener('click', function (e) {
            if (e.target.closest('.org-block, .personnel-profile__head, a, button')) return;
            clearSelection();
        });
    }

    /* 页面最左 / 最右的留白：main 铺满整个视口，正文 section 居中；
       点在 section 外面的 main 上就取消选择。main 会随 SPA 换页整个替换，
       不用登记清理。 */
    var pageMain = document.querySelector('main');
    if (pageMain) {
        pageMain.addEventListener('click', function (e) {
            if (e.target.closest('.archive-section')) return;
            clearSelection();
        });
    }

    /* 跨文档 View Transition / 预渲染时，脚本可能在 URL 的 query 稳定之前就跑完；
       pageshow 与 load 后再补一次选中，保证从组织页带 ?person= 进来一定落到对应人物 */
    window.addEventListener('pageshow', fromHash);
    window.addEventListener('load', function () {
        window.setTimeout(fromHash, 60);
    });

    /* 首次进入：有 ?person= / #身份编号 就选中，没有就显示空白态；都不滚动页面 */
    fromHash();

    if (window.__sssPageCleanup) {
        window.__sssPageCleanup.add('personnel', function () {
            window.removeEventListener('hashchange', fromHash);
            window.removeEventListener('popstate', fromHash);
        });
    }
})();
