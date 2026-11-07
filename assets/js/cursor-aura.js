/* =============================================================================
 * cursor-aura.js — 指针动效层（轨道伴星）
 * -----------------------------------------------------------------------------
 * 为什么不是给光标图换帧：CSS 的 cursor 图片在浏览器里是**静态**的（不会播放
 * GIF / APNG / SVG 动画），想动只能换图或另起一层。换图会依赖「样式变了浏览器
 * 是否立刻重绘光标」，各内核节奏不一致，还会跟页面自己的 cursor 规则打架。
 *
 * 所以这里做的是「伴星」：真正的指针仍然是 --cur-* 的静态图片，另加一个
 * pointer-events:none 的跟随层，让一颗小星绕着指针缓慢公转。白 = 普通，
 * 金 = 可点 / 拖动中；文字、准星、禁用等状态自动隐去（见 classify()）。
 * 原生光标不隐藏，所以即使 JS 没跑、或系统需要大号光标，指针照样可用。
 *
 * 只在「精细指针 + 未开启减少动态」时创建；触屏、prefers-reduced-motion 直接退出。
 * ========================================================================== */
(function () {
  "use strict";

  if (window.__sssCursorAura) return;
  window.__sssCursorAura = true;

  var fine = window.matchMedia ? window.matchMedia("(pointer: fine)") : null;
  if (!fine || !fine.matches) return;
  var reduceMq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  if (reduceMq && reduceMq.matches) return;

  var SIZE = 56;                 // 跟随层画布
  var C = SIZE / 2;              // 中心
  var R = 19.3;                  // 公转半径（在指针自己的轨道环外面，两层不挤在一起）
  var TRAIL_DEG = 56;            // 拖在伴星后面的那截轨道弧

  var el = null, orbit = null;
  var tx = 0, ty = 0, x = 0, y = 0;
  var angle = 0, last = 0, raf = 0;
  var started = false, inside = false;
  var state = "idle";
  var nextCheck = 0;
  var pressTimer = 0;
  var active = !!(reduceMq && !reduceMq.matches);

  /* 伴星后面那截轨道弧：从圆上 -44° 处画到正上方（与 dot 相接） */
  function trailPath() {
    var a = TRAIL_DEG * Math.PI / 180;
    var sx = C + R * Math.sin(-a);
    var sy = C - R * Math.cos(a);
    return "M" + sx.toFixed(2) + " " + sy.toFixed(2) +
      " A" + R + " " + R + " 0 0 1 " + C + " " + (C - R);
  }

  /* 轨道环的四段弧（静态；缺口对着上下左右，和指针图里的轨道同一套语言） */
  function ringPaths() {
    var out = "";
    var gap = 26;
    for (var s = 0; s < 360; s += 90) {
      var a0 = (s + gap) * Math.PI / 180;
      var a1 = (s + 90 - gap) * Math.PI / 180;
      var x0 = C + R * Math.sin(a0), y0 = C - R * Math.cos(a0);
      var x1 = C + R * Math.sin(a1), y1 = C - R * Math.cos(a1);
      out += '<path d="M' + x0.toFixed(2) + ' ' + y0.toFixed(2) +
        ' A' + R + ' ' + R + ' 0 0 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + '"/>';
    }
    return out;
  }

  function build() {
    el = document.createElement("div");
    el.className = "cursor-aura";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<svg viewBox="0 0 56 56" aria-hidden="true" focusable="false">' +
        '<g class="cursor-aura__ring">' + ringPaths() + '</g>' +
        '<g class="cursor-aura__orbit">' +
          '<path class="cursor-aura__trail" d="' + trailPath() + '"/>' +
          '<circle class="cursor-aura__dot" cx="' + C + '" cy="' + (C - R) + '" r="1.7"/>' +
        '</g>' +
      '</svg>';
    document.body.appendChild(el);
    orbit = el.querySelector(".cursor-aura__orbit");
  }

  /* 只顺着站内光标令牌判断状态；认不出来的（文字 / 准星 / 禁用 / 缩放）
     一律隐去，别在需要精确落点的场景里绕着转。 */
  function classify(cursor) {
    if (!cursor) return "hide";
    if (cursor.indexOf("/grabbing.svg") !== -1) return "drag";
    if (cursor.indexOf("/grab.svg") !== -1) return "grab";
    if (cursor.indexOf("/pointer.svg") !== -1) return "active";
    if (cursor.indexOf("/copy.svg") !== -1) return "active";
    if (cursor.indexOf("/default.svg") !== -1) return "idle";
    if (cursor === "auto") return "idle";
    return "hide";
  }

  function syncVisible() {
    if (!el) return;
    el.classList.toggle("is-on", inside && state !== "hide");
  }

  function setState(next) {
    if (next === state) return;
    state = next;
    el.classList.toggle("is-active", next === "active");
    el.classList.toggle("is-grab", next === "grab");
    el.classList.toggle("is-drag", next === "drag");
    syncVisible();
  }

  function sample(now) {
    if (now < nextCheck) return;
    nextCheck = now + 110;
    var node = document.elementFromPoint(tx, ty);
    if (!node) { setState("hide"); return; }
    var cur = "";
    try { cur = getComputedStyle(node).cursor; } catch (e) { /* 忽略 */ }
    setState(classify(cur));
  }

  function frame(now) {
    var dt = last ? Math.min(48, Math.max(8, now - last)) : 16;
    last = now;

    var speed = state === "drag" ? 150 : state === "active" ? 96 : state === "grab" ? 78 : 54;
    angle = (angle + speed * dt / 1000) % 360;

    x += (tx - x) * 0.34;
    y += (ty - y) * 0.34;
    el.style.transform = "translate3d(" + (x - C).toFixed(2) + "px," + (y - C).toFixed(2) + "px,0)";
    orbit.style.transform = "rotate(" + angle.toFixed(2) + "deg)";

    sample(now);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!raf) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  function show() {
    inside = true;
    if (!started) { x = tx; y = ty; started = true; }
    syncVisible();
    start();
  }

  function hide() {
    inside = false;
    syncVisible();
  }

  function onMove(e) {
    if (!active) return;
    tx = e.clientX;
    ty = e.clientY;
    if (!inside) show();
    else if (!raf) start();
  }

  function onDown() {
    if (!el || state === "hide") return;
    el.classList.add("is-press");
    clearTimeout(pressTimer);
    pressTimer = setTimeout(function () { el.classList.remove("is-press"); }, 170);
  }

  function onUp() {
    clearTimeout(pressTimer);
    if (el) el.classList.remove("is-press");
  }

  function destroy() {
    active = false;
    stop();
    clearTimeout(pressTimer);
    if (el) { el.remove(); el = null; }
  }

  build();
  document.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerdown", onDown, true);
  document.addEventListener("pointerup", onUp, true);
  document.addEventListener("pointercancel", onUp, true);
  document.addEventListener("mouseleave", hide);
  window.addEventListener("blur", hide);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) hide();
  });

  if (reduceMq && reduceMq.addEventListener) {
    reduceMq.addEventListener("change", function (e) {
      if (e.matches) destroy();
    });
  }
})();
