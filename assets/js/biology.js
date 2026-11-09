/* =============================================================================
 * biology.js — 生物档案页：左栏名录搜索 + 选中 / 取消选择
 * -----------------------------------------------------------------------------
 * 行为照舰船 / 人员 / 深空设施档案：
 *   · 点左栏条目选中，右栏显示对应档案；
 *   · 再点一次已选中的条目、点左栏或右栏空白处、点页面最左/最右留白，
 *     都取消选择并回到 NO / INFO 空白态；
 *   · 地址栏 #条目代号 可直接选中，前进 / 后退也会跟着切换。
 * ========================================================================== */
(function () {
    'use strict';

    var root = document.querySelector('.biology-layout');
    if (!root) return;

    /* ── 左栏名录搜索 ── */
    if (window.SSSArchiveSearch) {
        window.SSSArchiveSearch.attach({
            input: root.querySelector('.archive-search__input'),
            empty: root.querySelector('.archive-search__empty'),
            scroll: root.querySelector('.biology-list__scroll'),
            items: Array.prototype.slice.call(root.querySelectorAll('.biology-list__item')),
            groups: Array.prototype.slice.call(root.querySelectorAll('.biology-list__group')),
            groupSelector: '.biology-list__group'
        });
    }

    /* ── 选中 / 取消选择 ── */
    var items = Array.prototype.slice.call(root.querySelectorAll('.biology-list__item'));
    var profiles = Array.prototype.slice.call(root.querySelectorAll('.biology-profile'));
    var empty = root.querySelector('.archive-empty');
    var list = root.querySelector('.biology-list__scroll');
    var listPane = root.querySelector('.biology-list');
    var detailPane = root.querySelector('.biology-detail');

    var byId = Object.create(null);
    profiles.forEach(function (p) { byId[p.id] = p; });

    function refresh() {
        if (window.__sssArchiveScroll && window.__sssArchiveScroll.refresh) {
            window.__sssArchiveScroll.refresh();
        }
    }

    function activate(id) {
        var profile = id ? byId[id] || null : null;

        profiles.forEach(function (p) {
            p.classList.toggle('is-active', p === profile);
        });

        var current = null;
        items.forEach(function (a) {
            var on = !!profile && a.getAttribute('data-id') === profile.id;
            a.classList.toggle('is-active', on);
            if (on) a.setAttribute('aria-current', 'true');
            else a.removeAttribute('aria-current');
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

        /* 换条目时把右栏正文送回到开头 */
        if (profile) {
            var body = profile.querySelector('.biology-profile__body');
            if (body) body.scrollTop = 0;
        }

        refresh();
    }

    function setHash(id) {
        if (location.hash === '#' + id) return;
        try {
            history.pushState(null, '', '#' + id);
        } catch (e) {
            /* file:// 等环境 pushState 受限时，至少保证右栏切换 */
        }
    }

    function clearSelection() {
        if (!profiles.some(function (p) { return p.classList.contains('is-active'); })) return;
        try { history.pushState(null, '', location.pathname); } catch (e) { }
        activate('');
    }

    function fromHash() {
        var raw = location.hash ? location.hash.slice(1) : '';
        var id = raw;
        try {
            id = decodeURIComponent(raw);
        } catch (e) { /* 保留原值 */ }
        activate(id || '');
    }

    /* 名录条目：选中；再点已选中的条目 = 取消选择 */
    root.addEventListener('click', function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
        if (!a || !root.contains(a)) return;
        var id = a.getAttribute('href').slice(1);
        if (!byId[id]) return;
        e.preventDefault();

        if (a.classList.contains('is-active')) {
            clearSelection();
            return;
        }

        setHash(id);
        activate(id);
    });

    window.addEventListener('hashchange', fromHash);
    window.addEventListener('popstate', fromHash);

    /* 点左栏 / 右栏空白处取消选择 */
    if (listPane) {
        listPane.addEventListener('click', function (e) {
            if (e.target.closest('.biology-list__item, .archive-search')) return;
            clearSelection();
        });
    }

    if (detailPane) {
        detailPane.addEventListener('click', function (e) {
            if (e.target.closest('.org-block, .biology-profile__head, a, button')) return;
            clearSelection();
        });
    }

    /* 页面最左 / 最右留白：点在 .archive-section 外面的 main 上取消选择 */
    var pageMain = document.querySelector('main');
    if (pageMain) {
        pageMain.addEventListener('click', function (e) {
            if (e.target.closest('.archive-section')) return;
            clearSelection();
        });
    }

    /* 首次进入：有 #条目代号 就选中，没有就显示空白态 */
    fromHash();

    if (window.__sssPageCleanup) {
        window.__sssPageCleanup.add('biology', function () {
            window.removeEventListener('hashchange', fromHash);
            window.removeEventListener('popstate', fromHash);
        });
    }
})();
