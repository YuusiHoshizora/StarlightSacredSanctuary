/* ==========================================================================
   目录状态条（本地缓存态）
   --------------------------------------------------------------------------
   世界观前提：这个终端连不上星域网，只能读本地缓存。名录里暂时没有的条目，
   是「还没缓存到本地」，不是「圣域没有收录」。状态条只报状态，不报数量。
   所以：

     A. 未完整（默认）—— CATALOG // 本地缓存 + 检测到数据损坏 · 无法访问部分数据。
        **不插任何占位卡**：预留空间靠数据与组件保持结构可扩展，
        不靠一张「待收录」的假卡片。
     B. 完整（data-catalog-state="完整"）—— CATALOG // 完整 + 该分区已完整收录。

   占位卡只在容器显式写 data-catalog-slot 时才插入。全站唯一的例外是
   「未归类档案」：那里是世界观的本地文件集合，确实会有新文件归档进来。

   用法：在真正装条目的容器上加 data-catalog：
     <div class="archive-grid" data-catalog data-catalog-unit="类">
       …真实条目…
     </div>

   可选属性：
     data-catalog-kind="grid|list"   占位形态（默认 grid；list 是整行）
     data-catalog-unit="类|条|项"     单位（保留给 aria-label / 将来使用）
     data-catalog-note="…"           状态条右侧的一句补充说明
     data-catalog-state="完整"        明确声明完整收录：不插占位、状态条转「完整」
     data-catalog-slot               显式要求占位卡（仅用于未归类档案这类本地集合）
     data-catalog-slot-desc="…"      占位卡里的说明
   属性保留在 DOM 上，重复执行不会重复插入。
   ========================================================================== */
(function () {
    'use strict';

    var ATTR = 'data-catalog';
    var READY = 'data-catalog-ready';

    function buildBar(container) {
        var unit = container.getAttribute('data-catalog-unit') || '条';
        var complete = container.getAttribute('data-catalog-state') === '完整';
        var note = container.getAttribute('data-catalog-note') ||
                   (complete ? '该分区已完整收录' : '检测到数据损坏 · 无法访问部分数据');
        var stateLabel = complete ? '完整' : '本地缓存';

        var bar = document.createElement('p');
        bar.className = 'catalog-bar' + (complete ? ' is-complete' : '');
        bar.setAttribute('role', 'note');
        bar.setAttribute('aria-label',
            '目录状态：' + (complete ? '完整收录' : '本地缓存，未完整') +
            '。' + note + '（单位：' + unit + '）');

        var label = document.createElement('span');
        label.className = 'catalog-bar__label';
        label.appendChild(document.createTextNode('CATALOG'));
        var sep = document.createElement('b');
        sep.className = 'catalog-bar__sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '//';
        label.appendChild(sep);
        label.appendChild(document.createTextNode(stateLabel));

        var tail = document.createElement('span');
        tail.className = 'catalog-bar__tail';
        tail.textContent = note;

        bar.appendChild(label);
        bar.appendChild(tail);
        return bar;
    }

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

        var bar = container.querySelector(':scope > .catalog-bar');
        if (!bar) {
            bar = buildBar(container);
            container.insertBefore(bar, container.firstChild);
        }

        var slot = container.querySelector(':scope > .catalog-slot');
        var wantSlot = !complete && container.hasAttribute('data-catalog-slot');
        if (!wantSlot) {
            if (slot) slot.remove();
        } else {
            if (!slot) slot = buildSlot(container);
            /* 始终把占位放在末尾：页面脚本可能在占位之后继续追加卡片 */
            if (container.lastElementChild !== slot) container.appendChild(slot);
        }

        /* 状态条始终在最前 */
        if (container.firstElementChild !== bar) container.insertBefore(bar, container.firstElementChild);

        container.setAttribute(READY, '');
    }

    function runAll() {
        var list = document.querySelectorAll('[' + ATTR + ']');
        for (var i = 0; i < list.length; i++) decorate(list[i]);
    }

    /* 页面脚本可能整块重绘容器（人员 / 舰船 / 设施 / 文件等）：
       观察容器子树，缺状态条 / 占位就补回去。 */
    function watch() {
        if (!('MutationObserver' in window)) return;
        var list = document.querySelectorAll('[' + ATTR + ']');
        for (var i = 0; i < list.length; i++) {
            (function (container) {
                if (container.__sssCatalogObserver) return;
                var mo = new MutationObserver(function () {
                    var bar = container.querySelector(':scope > .catalog-bar');
                    var slot = container.querySelector(':scope > .catalog-slot');
                    var complete = container.getAttribute('data-catalog-state') === '完整';
                    var wantSlot = !complete && container.hasAttribute('data-catalog-slot');

                    var barWrong = !bar || container.firstElementChild !== bar;
                    var slotWrong = wantSlot
                        ? (!slot || container.lastElementChild !== slot)
                        : !!slot;
                    if (barWrong || slotWrong) decorate(container);
                });
                mo.observe(container, { childList: true });
                container.__sssCatalogObserver = mo;
            })(list[i]);
        }
    }

    function boot() {
        runAll();
        watch();
        /* 脚本填卡可能在 DOMContentLoaded 之后的下一帧、或数据 fetch 回来之后 */
        window.setTimeout(runAll, 320);
        window.setTimeout(runAll, 1200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }

    /* 站内同文档换页（spa.js）替换内容后由页面自行调用；也挂在 window 上方便调试。 */
    window.SSSCatalog = { refresh: boot, decorate: decorate };
})();
