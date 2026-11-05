/* =============================================================================
 * archive-list-search.js — 档案页左栏名录搜索
 * -----------------------------------------------------------------------------
 * 在「名录 N」下面放一个搜索框，按名称过滤左栏条目（中文名 / 英文名 / 拉丁名）。
 * 过滤是**就地隐藏**不匹配的条目，而不是像星图那样弹一个结果层 —— 星图的搜索
 * 是「地图里找不到位置」，这里搜的就是下面这份名录本身。交互语言照星图搜索来：
 *   · 放大镜图标、聚焦金边、原生清除按钮；
 *   · Esc 清空并收起；Enter 打开第一条匹配；↓ 把焦点交给第一条匹配；
 *   · 没有匹配时显示「没有找到匹配的条目」。
 * 分组标题 / 父子设施文件夹会根据组内是否还有可见条目一起隐藏。
 * ========================================================================== */
(function () {
    'use strict';

    function attach(cfg) {
        var input = cfg.input;
        if (!input) return null;

        var items = cfg.items || [];
        var groups = cfg.groups || [];
        var branches = cfg.branches || [];
        var empty = cfg.empty;
        var scroll = cfg.scroll;
        var groupSelector = cfg.groupSelector || '';
        var branchChildrenSelector = cfg.branchChildrenSelector || '';

        var saved = [];
        var searching = false;

        function isVisible(el) {
            return !!el && el.offsetParent !== null;
        }

        function refresh() {
            if (window.__sssArchiveScroll) window.__sssArchiveScroll.refresh();
        }

        function rememberBranches() {
            saved = [];
            branches.forEach(function (b) {
                var kids = branchChildrenSelector ? b.querySelector(branchChildrenSelector) : null;
                if (kids) saved.push({ kids: kids, open: !kids.hidden });
            });
        }

        function reset() {
            searching = false;
            items.forEach(function (it) { it.hidden = false; });
            groups.forEach(function (g) { g.hidden = false; });
            branches.forEach(function (b) { b.hidden = false; });
            saved.forEach(function (s) { s.kids.hidden = !s.open; });
            if (empty) empty.hidden = true;
            if (scroll) scroll.scrollTop = 0;
            refresh();
        }

        function filter() {
            var q = input.value.trim().toLowerCase();

            if (!q) {
                if (searching) reset();
                return;
            }

            if (!searching) {
                searching = true;
                rememberBranches();
            }

            items.forEach(function (it) {
                it.hidden = it.textContent.toLowerCase().indexOf(q) < 0;
            });

            /* 父子设施：分支里还有可见条目就留着；子条目命中时自动展开 */
            branches.forEach(function (b) {
                var kids = branchChildrenSelector ? b.querySelector(branchChildrenSelector) : null;
                var any = false;
                var childHit = false;
                items.forEach(function (it) {
                    if (!b.contains(it) || it.hidden) return;
                    any = true;
                    if (kids && kids.contains(it)) childHit = true;
                });
                b.hidden = !any;
                if (any && childHit && kids) kids.hidden = false;
            });

            /* 分组标题：一直到下一个分组标题都没有可见条目，就藏掉 */
            groups.forEach(function (g) {
                var any = false;
                var n = g.nextElementSibling;
                while (n && !(groupSelector && n.matches(groupSelector))) {
                    if (!n.hidden) { any = true; break; }
                    n = n.nextElementSibling;
                }
                g.hidden = !any;
            });

            var anyVisible = items.some(isVisible);
            if (empty) empty.hidden = anyVisible;
            if (scroll) scroll.scrollTop = 0;
            refresh();
        }

        input.addEventListener('input', filter);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                input.value = '';
                filter();
                input.blur();
            } else if (e.key === 'Enter') {
                var first = items.filter(isVisible)[0];
                if (first) {
                    e.preventDefault();
                    first.click();
                }
            } else if (e.key === 'ArrowDown') {
                var firstDown = items.filter(isVisible)[0];
                if (firstDown) {
                    e.preventDefault();
                    firstDown.focus();
                }
            }
        });

        reset();
        return { filter: filter, reset: reset };
    }

    window.SSSArchiveSearch = { attach: attach };
})();
