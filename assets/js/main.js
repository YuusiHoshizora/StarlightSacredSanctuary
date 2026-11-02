/* =============================================================================
 * main.js — 首页打字机
 * -----------------------------------------------------------------------------
 * SPA 换页（assets/js/spa.js）会把这个脚本重新执行一次，所以：
 *   · 整个文件包在 IIFE 里 —— 顶层 const 在第二次执行时会重复声明报错
 *   · 进来先把 #typing 清空，重新打
 *   · 离开页面时由 __sssPageCleanup 停掉定时器，别对着已经移除的节点继续打
 * ========================================================================== */
(function () {
    'use strict';

    var target = document.getElementById('typing');
    if (!target) return;

    var text = "愿星光照亮我们的前程";
    var index = 0;
    var alive = true;
    var timer = 0;

    target.textContent = '';

    function type() {
        if (!alive) return;
        if (index < text.length) {
            target.innerHTML += text[index];
            index++;
            timer = window.setTimeout(type, 80);
        }
    }

    // 首屏加载屏还开着的话，等它让开再开始（否则动画会在加载屏后面白白播完）
    if (document.documentElement.classList.contains('sss-boot')) {
        document.addEventListener('sss:booted', type, { once: true });
    } else {
        type();
    }

    if (window.__sssPageCleanup) {
        window.__sssPageCleanup.add('main', function () {
            alive = false;
            window.clearTimeout(timer);
        });
    }
})();
