/* ============================================================
   站点公告（居中弹窗）
   ------------------------------------------------------------
   · 只在用户主动打开时显示：关于页「站点公告」卡片、工具页「公告测试」。
     进入页面时**不再自动弹**，不会有不请自来的弹窗。
   · 样式由本文件注入，所以任何页面（含自带样式的 PPT 页）都只需引这一行脚本
   ============================================================ */
(function () {
  "use strict";

  /* ── 公告内容：改这里就行 ── */
  const NOTICE = {
    label: "警告",
    title: "无法连接至星域网",
    body: "目前无法连接至星域网，正在使用本地缓存内容。",
    confirm: "了解"
  };

  /* ── 样式（跟着站内的暗底 + 金色 + 玻璃质感） ── */
  const CSS = `
  .sss-notice{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
    padding:20px;background:rgba(4,4,12,.72);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
    animation:sss-notice-fade .22s ease-out both}
  .sss-notice__card{position:relative;width:100%;max-width:440px;padding:26px 24px 22px;
    background:rgba(18,18,38,.96);border:1px solid rgba(255,215,0,.28);border-radius:16px;
    box-shadow:0 24px 60px rgba(0,0,0,.6);color:#fff;text-align:left;
    animation:sss-notice-pop .26s cubic-bezier(.2,.9,.3,1.2) both}
  .sss-notice__label{display:inline-block;margin-bottom:12px;padding:3px 10px;font-size:12px;
    letter-spacing:2px;color:#FFD700;background:rgba(255,215,0,.12);
    border:1px solid rgba(255,215,0,.3);border-radius:999px}
  .sss-notice__title{margin:0 0 10px;font-size:20px;line-height:1.4;color:#FFD700;letter-spacing:1px}
  .sss-notice__body{margin:0;font-size:14px;line-height:1.8;color:rgba(255,255,255,.78);
    overflow-wrap:break-word}
  .sss-notice__actions{display:flex;justify-content:flex-end;margin-top:20px}
  .sss-notice__ok{min-height:42px;padding:11px 30px;font:inherit;font-size:15px;letter-spacing:2px;
    color:var(--ctl-fg);background:var(--ctl-bg);border:1px solid var(--ctl-border);
    border-radius:var(--ctl-radius);--cursor-kind: pointer; cursor: var(--cur-pointer);transition:var(--ctl-transition)}
  .sss-notice__ok:hover,.sss-notice__ok:focus-visible{
    color:var(--ctl-fg-hover);background:var(--ctl-bg-strong);border-color:var(--ctl-border-hover)}
  .sss-notice__close{position:absolute;top:10px;right:10px;width:32px;height:32px;display:flex;
    align-items:center;justify-content:center;font:inherit;font-size:20px;line-height:1;
    color:var(--ctl-fg-dim);background:var(--ctl-bg);border:1px solid var(--ctl-border);
    border-radius:var(--ctl-radius);--cursor-kind: pointer; cursor: var(--cur-pointer);transition:var(--ctl-transition)}
  .sss-notice__close:hover,.sss-notice__close:focus-visible{
    color:var(--ctl-fg-hover);background:var(--ctl-bg-strong);border-color:var(--ctl-border-hover)}
  @keyframes sss-notice-fade{from{opacity:0}to{opacity:1}}
  @keyframes sss-notice-pop{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
  @media (max-width:768px){
    .sss-notice{padding:16px}
    .sss-notice__card{padding:22px 18px 18px;border-radius:14px}
    .sss-notice__title{font-size:18px}
    .sss-notice__ok{width:100%;min-height:46px}
  }
  @media (prefers-reduced-motion:reduce){
    .sss-notice,.sss-notice__card{animation:none}
  }`;

  let dialog = null;
  let lastFocus = null;
  let prevOverflow = "";

  function close() {
    if (!dialog) return;
    const el = dialog;
    dialog = null;
    el.remove();
    document.removeEventListener("keydown", onKeydown, true);
    document.documentElement.style.overflow = prevOverflow;
    if (lastFocus && lastFocus.focus) {
      try { lastFocus.focus(); } catch (err) { /* 忽略 */ }
    }
  }

  function onKeydown(e) {
    if (!dialog) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    /* 焦点收束在弹窗里（只有关闭与确定两个可点元素） */
    if (e.key === "Tab") {
      const items = dialog.querySelectorAll("button");
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      /* 焦点还在弹窗容器上（刚打开时就是这样）：第一次 Tab 进弹窗内部的第一个按钮 */
      if (!dialog.contains(document.activeElement) || document.activeElement === dialog) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function build() {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    const wrap = document.createElement("div");
    wrap.className = "sss-notice";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-labelledby", "sss-notice-title");
    /* 可编程聚焦（-1）：把焦点收进弹窗，但**不落到「了解」按钮上** ——
       自动弹的公告不该一出来就让人看见某个按钮"被选中"。
       容器没有 :focus-visible 样式，所以不会画出焦点框。 */
    wrap.tabIndex = -1;

    const card = document.createElement("div");
    card.className = "sss-notice__card";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "sss-notice__close";
    closeBtn.setAttribute("aria-label", "关闭通知");
    closeBtn.textContent = "×";

    const label = document.createElement("div");
    label.className = "sss-notice__label";
    label.textContent = NOTICE.label;

    const title = document.createElement("h2");
    title.className = "sss-notice__title";
    title.id = "sss-notice-title";
    title.textContent = NOTICE.title;

    const body = document.createElement("p");
    body.className = "sss-notice__body";
    body.textContent = NOTICE.body;

    const actions = document.createElement("div");
    actions.className = "sss-notice__actions";
    const ok = document.createElement("button");
    ok.type = "button";
    ok.className = "sss-notice__ok";
    ok.textContent = NOTICE.confirm;
    actions.appendChild(ok);

    card.appendChild(closeBtn);
    card.appendChild(label);
    card.appendChild(title);
    card.appendChild(body);
    card.appendChild(actions);
    wrap.appendChild(card);

    /* 点遮罩空白处关闭（点卡片本身不关） */
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap) close();
    });
    closeBtn.addEventListener("click", close);
    ok.addEventListener("click", close);

    return wrap;
  }

  function show() {
    if (dialog) return;              // 已经开着就别重复弹
    lastFocus = document.activeElement;
    dialog = build();
    prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";   // 弹窗期间禁止背景滚动
    document.body.appendChild(dialog);
    document.addEventListener("keydown", onKeydown, true);
    /* 焦点收进弹窗容器，而不是「了解」按钮：按钮一出现就带焦点
       会看起来像"已经选中了"。容器聚焦既能挡住背景、又不会画出任何焦点框。 */
    try { dialog.focus(); } catch (err) { /* 忽略 */ }
  }

  /* 打开公告（按需）：入口是「关于」页的「站点公告」卡片，工具页的「公告测试」也发同一个事件。
     两处都只是往 document 上发一个 sss:notice 事件，公告本身不关心是谁触发的。
     进入页面不再自动弹。 */
  document.addEventListener("sss:notice", function () {
    show();
  });

})();
