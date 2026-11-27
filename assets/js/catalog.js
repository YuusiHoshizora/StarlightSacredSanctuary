/* ==========================================================================
   目录占位（仅未归类档案）
   --------------------------------------------------------------------------
   v7：全站移除 `CATALOG // …` 状态条。
   目录不再报状态、不报数量，也不在页面上显示任何“缓存 / 完整”读数；
   页面正文与页头已经说明了数据损坏 / 本地缓存。

   唯一的例外仍然是「未归类档案」：它是世界观里的本地文件集合，会持续有新文件归档，
   所以保留一张 `VACANT SLOT / 待收录` 占位卡。只有容器显式写 `data-catalog-slot`
   时才会插入；其它页面即使保留 `data-catalog` 属性也不会有任何视觉输出。

   用法：
     <div class="document-list__scroll" data-catalog data-catalog-kind="list"
          data-catalog-unit="项" data-catalog-slot
          data-catalog-slot-desc="本地文件尚未归类归档"></div>
   ========================================================================== */
(function () {
    'use strict';

    var ATTR = 'data-catalog';
    var READY = 'data-catalog-ready';

    function buildSlot(container) {
        var kind = container.getAttribute('data-catalog-kind') || 'grid';
        var desc = container.getAttribute('data-catalog-slot-desc') || '该分区仍可由本地文件继续归档';

        var slot = document.createElement('div');
        slot.className = 'catalog-slot' + (kind === 'list' ? ' catalog-slot--row' : '');
        slot.setAttribute('role', 'note');
        slot.setAttribute('aria-label', '待收录：' + desc);

        var tag = document.createElement('span');
        tag.className = 'catalog-slot__tag';
        tag.setAttribute('aria-hidden', 'true');
        tag.textContent = 'VACANT SLOT';

        var title = document.createElement('p');
        title.className = 'catalog-slot__title';
        title.textContent = '待收录';

        var sub = document.createElement('p');
        sub.className = 'catalog-slot__desc';
        sub.textContent = desc;

        var plus = document.createElement('span');
        plus.className = 'catalog-slot__plus';
        plus.setAttribute('aria-hidden', 'true');
        plus.textContent = '+';

        slot.appendChild(tag);
        slot.appendChild(title);
        slot.appendChild(sub);
        slot.appendChild(plus);
        return slot;
    }

    function decorate(container) {
        if (!container || !container.hasAttribute) return;
        if (!container.hasAttribute(ATTR)) return;

        var complete = container.getAttribute('data-catalog-state') === '完整';
        var wantSlot = !complete && container.hasAttribute('data-catalog-slot');
        var slot = container.querySelector(':scope > .catalog-slot');

        if (!wantSlot) {
            if (slot) slot.remove();
        } else {
            if (!slot) slot = buildSlot(container);
            /* 始终把占位放在末尾：页面脚本可能在占位之后继续追加卡片 */
            if (container.lastElementChild !== slot) container.appendChild(slot);
        }

        container.setAttribute(READY, '');
    }

    function runAll() {
        var list = document.querySelectorAll('[' + ATTR + ']');
        for (var i = 0; i < list.length; i++) decorate(list[i]);
    }

    /* 页面脚本可能整块重绘容器（文件列表等）：缺占位就补回去。 */
    function watch() {
        if (!('MutationObserver' in window)) return;
        var list = document.querySelectorAll('[' + ATTR + ']');
        for (var i = 0; i < list.length; i++) {
            (function (container) {
                if (container.__sssCatalogObserver) return;
                var mo = new MutationObserver(function () {
                    var complete = container.getAttribute('data-catalog-state') === '完整';
                    var wantSlot = !complete && container.hasAttribute('data-catalog-slot');
                    var slot = container.querySelector(':scope > .catalog-slot');
                    var slotWrong = wantSlot
                        ? (!slot || container.lastElementChild !== slot)
                        : !!slot;
                    if (slotWrong) decorate(container);
                });
                mo.observe(container, { childList: true });
                container.__sssCatalogObserver = mo;
            })(list[i]);
        }
    }

    function boot() {
        runAll();
        watch();
        window.setTimeout(runAll, 320);
        window.setTimeout(runAll, 1200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }

    window.SSSCatalog = { refresh: boot, decorate: decorate };
})();
