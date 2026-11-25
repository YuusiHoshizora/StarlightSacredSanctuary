/* ==========================================================================
   目录状态（本地缓存态）
   --------------------------------------------------------------------------
   世界观前提：这个终端连不上星域网，只能读本地缓存。名录里暂时没有的条目，
   是「还没缓存到本地」，不是「圣域没有收录」。所以：

     A. 未完整（默认）—— 状态条：CATALOG // 本地缓存 + 已缓存 N 类
        + 其余未缓存至本地。**不插任何占位卡**：预留空间靠数据与组件保持
        结构可扩展，不靠一张「待收录」的假卡片。
     B. 完整（data-catalog-state="完整"）—— 状态条：CATALOG // 完整
        + 已收录 N 类 + 该分区已完整收录。

   占位卡只在容器显式写 data-catalog-slot 时才插入。全站唯一的例外是
   「未归类档案」：那里是世界观里的本地文件集合，确实会有新文件归档进来。

   用法：在真正装条目的容器上加 data-catalog：
     <div class="archive-grid" data-catalog data-catalog-unit="类">
       …真实条目…
     </div>

   可选属性：
     data-catalog-kind="grid|list"   占位形态（默认 grid；list 是整行）
     data-catalog-unit="类|条|项"     计数单位（默认「条」）
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

    function isEntry(el) {
        if (!el || el.nodeType !== 1) return false;
        if (el.classList.contains('catalog-slot')) return false;
        if (el.classList.contains('catalog-bar')) return false;
        if (el.classList.contains('catalog-note')) return false;
        if (el.classList.contains('page-eyebrow')) return false;
        if (el.classList.contains('is-locked')) return false;       // 拒绝访问 = 还在修复，不计入
        if (el.hasAttribute('hidden')) return false;
        if (el.tagName === 'NOSCRIPT' || el.tagName === 'SCRIPT') return false;
        if (el.tagName === 'TEMPLATE') return false;
        if (/^H[1-6]$/.test(el.tagName)) return false;              // 分组标题不是条目
        if (el.getAttribute('role') === 'note') return false;
        if (el.getAttribute('aria-hidden') === 'true') return false;

        /* 只数"条目"：链接 / 按钮 / 文章 / 列表项，或卡片类元素。
           分组标题、说明段、搜索框都不计入。 */
        var cls = el.className || '';
        var isItemTag = /^(A|BUTTON|ARTICLE|LI)$/.test(el.tagName);
        var isCard = /(?:^|\s)[a-z0-9-]*(?:__item|--card|__card|card)(?:\s|$)/.test(cls);
        if (!isItemTag && !isCard) return false;
        return true;
    }

    function countEntries(container) {
        var n = 0;
        for (var i = 0; i < container.children.length; i++) {
            if (isEntry(container.children[i])) n++;
        }
        return n;
    }

    function buildBar(container, count) {
        var unit = container.getAttribute('data-catalog-unit') || '条';
        var complete = container.getAttribute('data-catalog-state') === '完整';
        var note = container.getAttribute('data-catalog-note') ||
                   (complete ? '该分区已完整收录' : '其余未缓存至本地 · 接入星域网后同步');
        var countLabel = complete ? '已收录 ' : '已缓存 ';
        var stateLabel = complete ? '完整' : '本地缓存';

        var bar = document.createElement('p');
        bar.className = 'catalog-bar' + (complete ? ' is-complete' : '');
        bar.setAttribute('role', 'note');
        bar.setAttribute('aria-label',
            '目录状态：' + (complete ? '完整收录' : '本地缓存未完整') +
            '，' + countLabel + count + ' ' + unit + '。' + note);

        var label = document.createElement('span');
        label.className = 'catalog-bar__label';
        label.appendChild(document.createTextNode('CATALOG'));
        var sep = document.createElement('b');
        sep.className = 'catalog-bar__sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '//';
        label.appendChild(sep);
        label.appendChild(document.createTextNode(stateLabel));

        var countEl = document.createElement('span');
        countEl.className = 'catalog-bar__count';
        countEl.appendChild(document.createTextNode(countLabel));
        var num = document.createElement('b');
        num.className = 'catalog-bar__num';
        num.textContent = count < 10 ? '0' + count : String(count);
        countEl.appendChild(num);
        countEl.appendChild(document.createTextNode(' ' + unit));

        var tail = document.createElement('span');
        tail.className = 'catalog-bar__tail';
        tail.textContent = note;

        bar.appendChild(label);
        bar.appendChild(countEl);
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
        var count = countEntries(container);

        var bar = container.querySelector(':scope > .catalog-bar');
        if (!bar) {
            bar = buildBar(container, count);
            container.insertBefore(bar, container.firstChild);
        } else {
            var num = bar.querySelector('.catalog-bar__num');
            if (num) {
                var next = count < 10 ? '0' + count : String(count);
                if (num.textContent !== next) num.textContent = next;
            }
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

    /* 计数会随后续渲染变化（人员 / 舰船 / 设施 / 文件等由脚本填卡）：
       观察容器子树，变化后只更新数字，不重建状态条。 */
    function watch() {
        if (!('MutationObserver' in window)) return;
        var list = document.querySelectorAll('[' + ATTR + ']');
        for (var i = 0; i < list.length; i++) {
            (function (container) {
                if (container.__sssCatalogObserver) return;
                var mo = new MutationObserver(function () {
                    var num = container.querySelector(':scope > .catalog-bar .catalog-bar__num');
                    var bar = container.querySelector(':scope > .catalog-bar');
                    var slot = container.querySelector(':scope > .catalog-slot');
                    var complete = container.getAttribute('data-catalog-state') === '完整';
                    var wantSlot = !complete && container.hasAttribute('data-catalog-slot');

                    /* 页面脚本整块重绘容器时，状态条与占位也会被一起清掉 ——
                       缺什么就补什么；顺序不对就挪回去（decorate 幂等）。 */
                    var barWrong = !bar || container.firstElementChild !== bar;
                    var slotWrong = wantSlot
                        ? (!slot || container.lastElementChild !== slot)
                        : !!slot;
                    if (barWrong || slotWrong) {
                        decorate(container);
                        return;
                    }
                    if (num) {
                        var n = countEntries(container);
                        var next = n < 10 ? '0' + n : String(n);
                        /* 只在真的变了才写：否则 textContent 赋值会再次触发观察，形成自激循环 */
                        if (num.textContent !== next) num.textContent = next;
                    }
                });
                mo.observe(container, { childList: true });
                container.__sssCatalogObserver = mo;
            })(list[i]);
        }
    }

    function boot() {
        runAll();
        watch();
        /* 脚本填卡可能在 DOMContentLoaded 之后的下一帧、或数据 fetch 回来之后：
           补一次，让计数与占位跟上。 */
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
