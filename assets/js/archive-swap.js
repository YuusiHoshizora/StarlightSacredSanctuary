/* =============================================================================
 * archive-swap.js — 两栏档案右栏的「先离场、后进场」切换
 * -----------------------------------------------------------------------------
 * 人员 / 舰船 / 深空设施 / 生物 / 文件档案的右栏都是「一叠档案 + 一个空白态」。
 * 之前旧档案以绝对定位压在空白态 / 新档案上做交叉淡化，切换时两层同时可见，
 * 内容会重合。这里改成严格串行：
 *
 *   · 旧档案先在原位淡出（.is-leaving，140ms）；
 *   · 离场结束后才把 .is-active 交给新档案 / 空白态，新内容再从右侧淡入。
 *
 * 两层任何时刻都不会同时参与显示。窄屏与 prefers-reduced-motion 下不做
 * 离场等待，直接换到新内容（新内容的淡入由 CSS 的 reduced-motion 规则关掉）。
 *
 * 用法：页面脚本渲染完右栏后建一个控制器，activate() 里只需 show(profile)：
 *
 *   var swap = window.SSSArchiveSwap.create({ profiles: profiles, empty: empty });
 *   swap.show(profile || null);
 *
 * 视觉参数与 archive.css 的 archive-swap-out 时长必须一致。
 * ========================================================================== */
(function () {
    'use strict';

    var OUT_MS = 140;

    function create(cfg) {
        var profiles = cfg.profiles || [];
        var empty = cfg.empty || null;
        var token = 0;

        /* 上一轮还没走完的离场层直接收掉：它已经不代表当前选择 */
        function clearLeaving() {
            profiles.forEach(function (p) {
                if (p.classList.contains('is-leaving')) {
                    p.classList.remove('is-active', 'is-leaving');
                }
            });
        }

        function currentProfile() {
            var current = null;
            profiles.forEach(function (p) {
                if (p.classList.contains('is-active') && !p.classList.contains('is-leaving')) {
                    current = p;
                }
            });
            return current;
        }

        function commit(profile) {
            profiles.forEach(function (p) {
                p.classList.toggle('is-active', p === profile);
            });
            if (empty) empty.hidden = !!profile;
        }

        /* 只有桌面且允许动效时才串行等待离场；窄屏 / 减少动效下直接换 */
        function staggering() {
            if (!window.matchMedia) return false;
            return window.matchMedia('(min-width: 901px)').matches &&
                !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }

        function show(profile) {
            token += 1;
            var myToken = token;

            clearLeaving();

            var current = currentProfile();

            if (!profile) {
                if (current && staggering()) {
                    current.classList.add('is-leaving');
                    window.setTimeout(function () {
                        if (myToken !== token) return;
                        current.classList.remove('is-active', 'is-leaving');
                        if (empty) empty.hidden = false;
                    }, OUT_MS);
                } else {
                    if (current) current.classList.remove('is-active', 'is-leaving');
                    if (empty) empty.hidden = false;
                }
                return;
            }

            if (current && current !== profile && staggering()) {
                current.classList.add('is-leaving');
                window.setTimeout(function () {
                    if (myToken !== token) return;
                    current.classList.remove('is-active', 'is-leaving');
                    commit(profile);
                }, OUT_MS);
                return;
            }

            commit(profile);
        }

        return { show: show };
    }

    window.SSSArchiveSwap = { create: create, OUT_MS: OUT_MS };
})();
