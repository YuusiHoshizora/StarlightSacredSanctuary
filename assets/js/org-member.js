/* =============================================================================
 * org-member.js — 「成员数据库拒绝访问」小窗
 * -----------------------------------------------------------------------------
 * 组织详情页里的成员名录，姓名是**索引项**：点一下本该打开那个人的人员档案。
 * 但人员数据库（「档案 → 人员档案」那一类）当前数据损坏、拒绝访问 ——
 * 所以点了只能报错，全站这一套口径统一由这里出。
 *
 * 用法：在要触发的那一行上加 data-member，并在页面里引入本脚本：
 *     <button type="button" class="org-roster__item" data-member>…</button>
 *     <script defer src="../../assets/js/org-member.js"></script>
 *
 * 小窗的 DOM 由脚本生成（页面不用写 markup），样式在
 * assets/css/archive/organization.css 的「错误小窗」一节（.org-modal）。
 * ========================================================================== */
(function () {
    'use strict';

    var MSG = '错误：成员数据库拒绝访问：数据损坏';
    var modal = null;
    var lastFocus = null;

    function close() {
        if (!modal || modal.hidden) return;
        modal.hidden = true;
        document.documentElement.classList.remove('org-modal-open');
        /* 焦点还给刚才点的那一行，键盘用户不会走丢 */
        if (lastFocus && lastFocus.focus) lastFocus.focus();
        lastFocus = null;
    }

    function build() {
        modal = document.createElement('div');
        modal.className = 'org-modal';
        modal.hidden = true;
        modal.innerHTML =
            '<div class="org-modal__panel" role="dialog" aria-modal="true" aria-label="错误">' +
                '<button type="button" class="org-modal__close" aria-label="关闭">×</button>' +
                '<p class="org-modal__msg"></p>' +
            '</div>';
        modal.querySelector('.org-modal__msg').textContent = MSG;
        document.body.appendChild(modal);

        modal.querySelector('.org-modal__close').addEventListener('click', close);
        modal.addEventListener('click', function (e) {
            if (e.target === modal) close();          // 点暗底也关
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal && !modal.hidden) close();
        });
        return modal;
    }

    function open(trigger) {
        var m = modal || build();
        lastFocus = trigger || null;
        m.hidden = false;
        document.documentElement.classList.add('org-modal-open');
        m.querySelector('.org-modal__close').focus();
    }

    /* 一个委托监听就够：以后加成员、加页面都不用再绑 */
    document.addEventListener('click', function (e) {
        var el = e.target && e.target.closest ? e.target.closest('[data-member]') : null;
        if (!el) return;
        e.preventDefault();
        open(el);
    });
})();
