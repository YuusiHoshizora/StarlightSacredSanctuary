/* =============================================================================
 * biology.js — 生物档案页：左栏名录搜索
 * -----------------------------------------------------------------------------
 * 页面是静态的（目前只有真理花一条），这里只把 archive-list-search.js
 * 接到生物名录上；条目多起来以后，再照 vessel.js 补选中 / 深链逻辑。
 * ========================================================================== */
(function () {
    'use strict';

    var root = document.querySelector('.biology-layout');
    if (!root || !window.SSSArchiveSearch) return;

    window.SSSArchiveSearch.attach({
        input: root.querySelector('.archive-search__input'),
        empty: root.querySelector('.archive-search__empty'),
        scroll: root.querySelector('.biology-list__scroll'),
        items: Array.prototype.slice.call(root.querySelectorAll('.biology-list__item')),
        groups: Array.prototype.slice.call(root.querySelectorAll('.biology-list__group')),
        groupSelector: '.biology-list__group'
    });
})();
