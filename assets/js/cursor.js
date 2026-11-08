/* =============================================================================
 * cursor.js — 自绘指针（只让「外环」转，本体不动）
 * -----------------------------------------------------------------------------
 * 为什么要有这一层：CSS 的 cursor 图片是静态的，浏览器不会播放 GIF / APNG /
 * SVG 动画，所以「指针上的环转起来」只能把图形画到 DOM 上。
 *
 * 做法：
 *   · 状态来源仍然是 CSS —— 每条 cursor 规则旁边都有一条 --cursor-kind，
 *     它和 cursor 一起继承。脚本只读这个自定义属性，不复制选择器；
 *   · 隐藏系统光标（html.sss-dom-cursor 下 cursor:none），在指针坐标上 1:1
 *     摆一张 32×32 的同款 SVG（--cur-* 用的就是这些文件）；
 *   · 每次 pointer 事件直接写 transform，**不做缓动 / 不做 lerp**，所以没有延迟；
 *   · 图形在 SVG 文件里被标成两部分：<g class="cursor-ring"> 是外圈（轨道环 /
 *     三段环），其余是本体。**只有 ring 组会被旋转**，本体永远静止：
 *       转：pointer / grab / grabbing / progress / wait / help / no-drop
 *       不转：default（星芒没有环）、text、crosshair、move、copy、禁止、缩放…
 *
 * 兜底：只在「精细指针 + 未开 reduced-motion + 非强制色」时启用；SVG 没加载全
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
  /* 只有带 cursor-ring 组的状态才转；数值是外环转一圈的时长 */
  var SPIN = {
    "pointer": "6s",
    "grab": "9s",
    "grabbing": "4s",
    "help": "6s",
    "wait": "2.4s",
    "progress": "1.4s",
    "no-drop": "6s"
  };
  var HOT = { "zoom-in": [14, 14], "zoom-out": [14, 14] };

  var layer = null;
  var arts = Object.create(null);
  var ready = false;
  var on = false;
  var inside = false;
  var suspendDepth = 0;
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
    return arts[k] ? k : "default";
  }

  function applyKind(k) {
    var art = arts[k];
    if (!art) { k = "default"; art = arts[k]; }
    var prev = arts[current];
    if (prev && prev !== art) prev.classList.remove("is-on", "is-spin");
    current = k;
    var hot = HOT[k] || [16, 16];
    hx = hot[0];
    hy = hot[1];
    art.classList.add("is-on");
    /* 文件里没有 cursor-ring 的状态不加 is-spin，免得转空 */
    if (SPIN[k] && art.querySelector(".cursor-ring")) art.classList.add("is-spin");
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
    inside = true;
    if (suspendDepth) return;           // 页面过渡中：先交给系统光标，别在这时候接管
    if (!ready) return;                 // 图还没就绪：系统光标继续用着
    if (!on) activate();
    else { place(); check(false); }
  }

  function hide() {
    on = false;
    inside = false;
    if (layer) layer.classList.remove("is-on");
    /* 指针离开文档时把系统光标还回去，下次进入的 pointermove 会重新接管 */
    document.documentElement.classList.remove("sss-dom-cursor");
  }

  /* SPA 的 View Transition 会把整页的快照盖到最上层，自绘层也跟着被盖住；
     这段时间让位给系统光标（静态 SVG，同一张图），过渡结束再接管回来。
     不然切换页面时会有一小下完全看不到指针。 */
  function suspend() {
    if (!ready || dead) return;
    suspendDepth++;
    on = false;
    if (layer) layer.classList.remove("is-on");
    document.documentElement.classList.remove("sss-dom-cursor");
  }

  function resume() {
    suspendDepth = Math.max(0, suspendDepth - 1);
    if (suspendDepth || !ready || dead) return;
    if (inside) activate();             // 用过渡期间最后记录的坐标重新接管
  }

  function onStateChange() {
    if (ready && on) check(true);
  }

  function onDown(e) {
    if (e.pointerType === "touch") return;
    x = e.clientX;
    y = e.clientY;
    inside = true;
    if (suspendDepth) return;
    if (!on && ready) activate();
    else { place(); }
    check(true);
  }

  function onUp() { check(true); }

  function destroy() {
    dead = true;
    ready = false;
    on = false;
    document.documentElement.classList.remove("sss-dom-cursor");
    if (layer) { layer.remove(); layer = null; }
    document.removeEventListener("pointerrawupdate", onMove);
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerdown", onDown);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    document.removeEventListener("scroll", onStateChange, true);
    window.removeEventListener("resize", onStateChange);
    document.removeEventListener("mouseleave", hide);
    window.removeEventListener("blur", hide);
    document.removeEventListener("sss:vt-start", suspend);
    document.removeEventListener("sss:vt-end", resume);
  }

  function build() {
    layer = document.createElement("div");
    layer.className = "sss-cursor";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);

    var loads = KINDS.map(function (k) {
      return fetch("/assets/img/cursor/" + k + ".svg", { credentials: "same-origin" })
        .then(function (res) {
          if (!res.ok) throw new Error("cursor svg " + k);
          return res.text();
        })
        .then(function (text) {
          if (!layer) return false;                 // 已 destroy（比如中途切到减少动态）
          var doc = new DOMParser().parseFromString(text, "image/svg+xml");
          if (!doc || !doc.documentElement || doc.getElementsByTagName("parsererror").length) {
            throw new Error("cursor svg parse " + k);
          }
          var svg = document.importNode(doc.documentElement, true);
          svg.setAttribute("class", "sss-cursor__art");
          svg.setAttribute("data-kind", k);
          svg.setAttribute("aria-hidden", "true");
          svg.setAttribute("focusable", "false");
          svg.style.setProperty("--sss-spin", SPIN[k] || "0s");
          layer.appendChild(svg);
          arts[k] = svg;
          return true;
        });
    });

    Promise.all(loads).then(function () {
      if (!dead) ready = true;
    }).catch(function () {
      /* 有一张没拿到就不接管，保留系统光标 */
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
  document.addEventListener("scroll", onStateChange, true);
  window.addEventListener("resize", onStateChange);
  document.addEventListener("mouseleave", hide);
  window.addEventListener("blur", hide);
  document.addEventListener("sss:vt-start", suspend);
  document.addEventListener("sss:vt-end", resume);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) hide();
  });

  if (reduce && reduce.addEventListener) {
    reduce.addEventListener("change", function (e) {
      if (e.matches) destroy();
    });
  }
})();
