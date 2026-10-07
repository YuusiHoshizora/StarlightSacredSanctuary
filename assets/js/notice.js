/* ============================================================
   首次打开通知（居中弹窗）
   ------------------------------------------------------------
   · 只弹一次：用 localStorage 记一个标记，关闭后永不再弹
     （换设备 / 换浏览器 / 清缓存 / 无痕会再看到一次 —— 纯静态站只能按设备记）
   · 想对所有人再弹一次：把下面 NOTICE.id 改成新值即可（当成一条新通知）
   · 预渲染安全：speculation rules 预渲染时页面 JS 会提前执行，
     所以这里等「真正激活」（prerenderingchange）才显示、也才写标记，
     否则用户还没看见就被标记成"已看过"了
   · localStorage 不可用（无痕 / 禁用存储）时依次降级到 sessionStorage、内存
   · 自动化环境不弹：navigator.webdriver 为真、或页面里提前设了
     window.__SSS_NO_NOTICE = true（给自己写的端到端测试留的开关），都直接跳过
   · 样式由本文件注入，所以任何页面（含自带样式的 PPT 页）都只需引这一行脚本
   ============================================================ */
(function () {
  "use strict";

  /* ── 通知内容：改这里就行 ── */
  const NOTICE = {
    id: "2026-09-26-first-open",          // 换新 id = 当成一条新通知，所有人会再看一次
    label: "通知",
    title: "欢迎来到星光圣域",
    body: "这里会不定期发布星域动态、星图与档案的更新说明。",
    confirm: "知道了"
  };

  /* 首页有 slogan 打字动画，等它打完再弹；其它页面稍等一下即可 */
  const DELAY = /^\/(index\.html)?$/.test(location.pathname) ? 2400 : 600;
  const KEY = "sss.notice." + NOTICE.id;

  /* ── 存储：localStorage → sessionStorage → 内存，任何一步失败都不影响其它功能 ── */
  const memory = {};
  let store = null;
  try {
    const t = "__sss_notice_probe__";
    localStorage.setItem(t, "1");
    localStorage.removeItem(t);
    store = localStorage;
  } catch (err) {
    try {
      const t = "__sss_notice_probe__";
      sessionStorage.setItem(t, "1");
      sessionStorage.removeItem(t);
      store = sessionStorage;
    } catch (err2) {
      store = null;
    }
  }

  function seen() {
    try {
      return store ? store.getItem(KEY) === "1" : memory[KEY] === true;
    } catch (err) {
      return memory[KEY] === true;
    }
  }

  function markSeen() {
    memory[KEY] = true;
    try {
      if (store) store.setItem(KEY, "1");
    } catch (err) { /* 写不进去也不影响：本次会话内内存里已记住 */ }
  }

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
  .sss-notice__ok{min-height:42px;padding:11px 26px;font:inherit;font-size:15px;letter-spacing:1px;
    color:#FFD700;background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.4);
    border-radius:8px;cursor:pointer;transition:background .25s,border-color .25s}
  .sss-notice__ok:hover,.sss-notice__ok:focus-visible{background:rgba(255,215,0,.2);border-color:#FFD700}
  .sss-notice__close{position:absolute;top:10px;right:10px;width:34px;height:34px;display:flex;
    align-items:center;justify-content:center;font:inherit;font-size:20px;line-height:1;
    color:rgba(255,255,255,.55);background:transparent;border:0;border-radius:8px;cursor:pointer}
  .sss-notice__close:hover,.sss-notice__close:focus-visible{color:#FFD700;background:rgba(255,215,0,.12)}
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
    if (dialog || seen()) return;
    markSeen();                       // 「只弹一次」：显示过就记下来
    lastFocus = document.activeElement;
    dialog = build();
    prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";   // 弹窗期间禁止背景滚动
    document.body.appendChild(dialog);
    document.addEventListener("keydown", onKeydown, true);
    const ok = dialog.querySelector(".sss-notice__ok");
    if (ok) {
      try { ok.focus(); } catch (err) { /* 忽略 */ }
    }
  }

  function activate() {
    if (seen()) return;
    window.setTimeout(show, DELAY);
  }

  function start() {
    if (window.__SSS_NO_NOTICE || navigator.webdriver) return;   // 自动化 / 显式关闭
    if (seen()) return;
    /* 预渲染中的页面先不弹、也不写标记，等真正激活 */
    if (document.prerendering) {
      document.addEventListener("prerenderingchange", activate, { once: true });
    } else {
      activate();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
