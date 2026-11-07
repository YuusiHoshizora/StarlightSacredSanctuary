/* =============================================================================
 * cursor.js — 自绘指针（让指针图形自己转）
 * -----------------------------------------------------------------------------
 * 为什么要有这一层：CSS 的 cursor 图片是静态的，浏览器不会播放 GIF / APNG /
 * SVG 动画，所以「指针自己转」只能把图形画在 DOM 上。
 *
 * 做法：
 *   · 状态来源仍然是 CSS —— 每条 cursor 规则旁边都有一条 --cursor-kind，
 *     它和 cursor 一起继承。脚本只读这个自定义属性，不复制选择器；
 *   · 隐藏系统光标（html.sss-dom-cursor 下 cursor:none），在指针坐标上 1:1
 *     摆一张 32×32 的同款 SVG（--cur-* 用的就是这些文件）；
 *   · 每次 pointer 事件直接写 transform，**不做缓动 / 不做 lerp**，所以没有延迟；
 *   · 只让图形边缘对称的状态转：默认星芒、金色指针（星 + 轨道环）、等待 / 处理中。
 *     文本、准星、拖拽、复制、禁止这些需要方向或精确落点的状态保持静止。
 *
 * 兜底：只在「精细指针 + 未开 reduced-motion + 非强制色」时启用；图片没加载全
 * 就不接管，系统光标照旧。JS 没跑 / 中途出错 → 仍是静态 SVG 指针，站点不受影响。
 * ========================================================================== */
(function () {
  "use strict";

  if (window.__sssCursorDom) return;
  window.__sssCursorDom = true;

  var fine = window.matchMedia ? window.matchMedia("(pointer: fine)") : null;
  if (!fine || !fine.matches) return;
  var reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  if (reduce && reduce.matches) return;
  var forced = window.matchMedia ? window.matchMedia("(forced-colors: active)") : null;
  if (forced && forced.matches) return;

  var KINDS = [
    "default", "pointer", "text", "vertical-text", "crosshair", "grab", "grabbing",
    "move", "all-scroll", "cell", "context-menu", "help", "wait", "progress",
    "copy", "alias", "zoom-in", "zoom-out", "not-allowed", "no-drop",
    "ew-resize", "ns-resize", "nesw-resize", "nwse-resize"
  ];
  var ALIAS = {
    "col-resize": "ew-resize", "row-resize": "ns-resize",
    "e-resize": "ew-resize", "w-resize": "ew-resize",
    "n-resize": "ns-resize", "s-resize": "ns-resize",
    "ne-resize": "nesw-resize", "sw-resize": "nesw-resize",
    "nw-resize": "nwse-resize", "se-resize": "nwse-resize"
  };
  /* 只给旋转对称的图形加自转；速度是 CSS 时长 */
  var SPIN = {
    "default": "12s",
    "pointer": "7s",
    "progress": "1.4s",
    "wait": "2.4s",
    "help": "6s"
  };
  var HOT = { "zoom-in": [14, 14], "zoom-out": [14, 14] };

  var layer = null;
  var imgs = Object.create(null);
  var ready = false;
  var on = false;
  var dead = false;
  var current = "default";
  var x = -100, y = -100;
  var hx = 16, hy = 16;
  var lastCheck = 0;

  function place() {
    layer.style.transform =
      "translate3d(" + (x - hx) + "px," + (y - hy) + "px,0)";
  }

  function readKind() {
    var el = null;
    try { el = document.elementFromPoint(x, y); } catch (e) { /* 忽略 */ }
    if (!el) return "default";
    var k = "";
    try { k = getComputedStyle(el).getPropertyValue("--cursor-kind").trim(); } catch (e) { /* 忽略 */ }
    if (!k) return "default";
    k = ALIAS[k] || k;
    return imgs[k] ? k : "default";
  }

  function applyKind(k) {
    var img = imgs[k];
    if (!img) { k = "default"; img = imgs[k]; }
    var prev = imgs[current];
    if (prev && prev !== img) prev.classList.remove("is-on", "is-spin");
    current = k;
    var hot = HOT[k] || [16, 16];
    hx = hot[0];
    hy = hot[1];
    img.classList.add("is-on");
    if (SPIN[k]) img.classList.add("is-spin");
    place();
  }

  function check(force) {
    if (!ready || !on || dead) return;
    var now = performance.now();
    if (!force && now - lastCheck < 60) return;
    lastCheck = now;
    var k = readKind();
    if (k !== current) applyKind(k);
  }

  function activate() {
    if (!ready || dead) return;
    on = true;
    document.documentElement.classList.add("sss-dom-cursor");
    layer.classList.add("is-on");
    applyKind(readKind());
    place();
  }

  function onMove(e) {
    if (dead) return;
    if (e.pointerType === "touch") return;
    x = e.clientX;
    y = e.clientY;
    if (!ready) return;                 // 图还没就绪：系统光标继续用着
    if (!on) activate();
    else { place(); check(false); }
  }

  function hide() {
    on = false;
    if (layer) layer.classList.remove("is-on");
    /* 指针离开文档时把系统光标还回去：否则窗口失焦后指针可能"消失"，直到下次移动。
       下次进入文档的 pointermove 会重新接管，同一帧里换回自绘光标。 */
    document.documentElement.classList.remove("sss-dom-cursor");
  }

  function onStateChange() {
    if (ready && on) check(true);
  }

  function destroy() {
    dead = true;
    ready = false;
    on = false;
    document.documentElement.classList.remove("sss-dom-cursor");
    if (layer) { layer.remove(); layer = null; }
    document.removeEventListener("pointerrawupdate", onMove);
    document.removeEventListener("pointermove", onMove);    document.removeEventListener("pointerdown", onDown);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    document.removeEventListener("scroll", onLayoutChange, true);
    window.removeEventListener("resize", onLayoutChange);
    document.removeEventListener("mouseleave", hide);
    window.removeEventListener("blur", hide);
  }

  function onDown(e) {
    if (e.pointerType === "touch") return;
    x = e.clientX;
    y = e.clientY;
    if (!on && ready) activate();
    else { place(); }
    check(true);
  }

  function onUp() { check(true); }

  /* 滚动 / 尺寸变化时指针没动，但下面的元素可能换了（悬停态也就变了） */
  function onLayoutChange() { onStateChange(); }

  function build() {
    layer = document.createElement("div");
    layer.className = "sss-cursor";
    layer.setAttribute("aria-hidden", "true");

    var loads = KINDS.map(function (k) {
      var img = new Image();
      img.className = "sss-cursor__img";
      img.dataset.kind = k;
      img.alt = "";
      img.draggable = false;
      img.src = "/assets/img/cursor/" + k + ".svg";
      img.style.setProperty("--sss-spin", SPIN[k] || "0s");
      layer.appendChild(img);
      imgs[k] = img;
      if (img.decode) {
        return img.decode().then(function () { return true; }, function () { return false; });
      }
      return new Promise(function (res) {
        img.onload = function () { res(true); };
        img.onerror = function () { res(false); };
      });
    });

    document.body.appendChild(layer);

    Promise.all(loads).then(function (results) {
      if (dead) return;
      if (results.indexOf(false) !== -1) return;   // 有任何一张坏了就不接管
      ready = true;
    });
  }

  build();

  if ("onpointerrawupdate" in document) {
    document.addEventListener("pointerrawupdate", onMove, { passive: true });
  }
  /* pointermove 始终留着：rawupdate 各内核支持不一致，重复写同一个坐标没有副作用 */
  document.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerdown", onDown, true);
  document.addEventListener("pointerup", onUp, true);
  document.addEventListener("pointercancel", onUp, true);
  document.addEventListener("scroll", onLayoutChange, true);
  window.addEventListener("resize", onLayoutChange);
  document.addEventListener("mouseleave", hide);
  window.addEventListener("blur", hide);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) hide();
  });

  if (reduce && reduce.addEventListener) {
    reduce.addEventListener("change", function (e) {
      if (e.matches) destroy();
    });
  }
})();
