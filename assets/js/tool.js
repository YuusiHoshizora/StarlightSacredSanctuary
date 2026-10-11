/* ============================================================
   工具页脚本：拾色器（色相环 + 饱和度/亮度方块）
   ------------------------------------------------------------
   · 圆环选色相，环内方块选饱和度（横轴 0→100%）与亮度（纵轴 100%→0%），
     三者合起来覆盖 sRGB 内的所有颜色
   · 方块是逐像素按 HSL 算出来画的，所以「点到的像素」与「取到的颜色」完全一致
     （用两层渐变叠出来的方块做不到这点，色值会对不上）
   · 画布按 devicePixelRatio 绘制；圆环缓存到离屏画布、方块只在色相变化时重算，
     拖动时不重复做重活
   · 鼠标 / 触摸拖动取色；键盘：←→ 色相、↑↓ 亮度、Shift+↑↓ 饱和度
   · 读出 HEX / RGB / HSL，点一下复制
   ============================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("hue-wheel");
  if (!canvas || !canvas.getContext) return;

  const swatch = document.getElementById("hue-swatch");
  const tip = document.getElementById("hue-tip");
  const outHex = document.getElementById("hue-hex");
  const outRgb = document.getElementById("hue-rgb");
  const outHsl = document.getElementById("hue-hsl");
  const ctx = canvas.getContext("2d");

  /* 初始状态 = 站内金色 #FFD700（金色对应 50.588°，写整 51° 会算成 #FFD900） */
  let hue = 50.588;
  let sat = 1;
  let light = 0.5;

  let dragging = null;        // "ring" | "square" | null
  let cssSize = 300;
  let dpr = 1;
  let geo = null;
  let ringCache = null;       // 离屏圆环
  let squareImage = null;     // 方块像素（只在色相变化时重算）
  let squareHue = null;

  /* ── 颜色换算 ── */
  function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = ((((h % 360) + 360) % 360) / 60);
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let rgb;
    if (hp < 1) rgb = [c, x, 0];
    else if (hp < 2) rgb = [x, c, 0];
    else if (hp < 3) rgb = [0, c, x];
    else if (hp < 4) rgb = [0, x, c];
    else if (hp < 5) rgb = [x, 0, c];
    else rgb = [c, 0, x];
    const m = l - c / 2;
    return rgb.map((v) => Math.round(Math.min(255, Math.max(0, (v + m) * 255))));
  }

  function toHex(rgb) {
    return "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  }

  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  /* ── 几何 ── */
  function geometry() {
    const cx = cssSize / 2;
    const cy = cssSize / 2;
    const outer = cssSize / 2 - 3;
    const ring = Math.max(14, cssSize * 0.14);      // 圆环厚度
    const inner = outer - ring;
    const side = inner * 1.32;                      // 环内方块边长（内切圆里留点边距）
    return {
      cx, cy, outer, inner, ring, mid: (outer + inner) / 2,
      sx: cx - side / 2, sy: cy - side / 2, side
    };
  }

  /* ── 尺寸（CSS 尺寸不变，后备像素按 DPR 放大） ── */
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    cssSize = Math.max(160, Math.round(rect.width || 300));
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    geo = geometry();
    ringCache = null;
    squareImage = null;
    squareHue = null;
  }

  /* ── 圆环（缓存到离屏画布，只在尺寸变化时重画） ── */
  function buildRing() {
    const off = document.createElement("canvas");
    off.width = Math.round(cssSize * dpr);
    off.height = Math.round(cssSize * dpr);
    const c = off.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.lineWidth = geo.outer - geo.inner;
    c.lineCap = "butt";
    for (let a = 0; a < 360; a++) {
      const start = ((a - 90) * Math.PI) / 180;      // 0° 在正上方，顺时针递增
      c.beginPath();
      c.strokeStyle = "hsl(" + a + ", 100%, 50%)";
      c.arc(geo.cx, geo.cy, geo.mid, start, start + (1.4 * Math.PI) / 180);
      c.stroke();
    }
    ringCache = off;
  }

  /* ── 方块（逐像素 HSL；色相变了才重算） ── */
  function buildSquare() {
    const px = Math.max(2, Math.round(geo.side * dpr));
    const img = ctx.createImageData(px, px);
    const data = img.data;
    for (let j = 0; j < px; j++) {
      const l = 1 - j / (px - 1);
      for (let i = 0; i < px; i++) {
        const s = i / (px - 1);
        const rgb = hslToRgb(hue, s, l);
        const k = (j * px + i) * 4;
        data[k] = rgb[0];
        data[k + 1] = rgb[1];
        data[k + 2] = rgb[2];
        data[k + 3] = 255;
      }
    }
    squareImage = img;
    squareHue = hue;
  }

  function draw() {
    if (!geo) return;
    if (!ringCache) buildRing();
    ctx.clearRect(0, 0, cssSize, cssSize);

    ctx.drawImage(ringCache, 0, 0, cssSize, cssSize);

    if (!squareImage || squareHue !== hue) buildSquare();
    /* putImageData 用的是设备像素，所以要乘 dpr 定位 */
    ctx.putImageData(squareImage, Math.round(geo.sx * dpr), Math.round(geo.sy * dpr));

    /* 方块外框 */
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.strokeRect(geo.sx + 0.5, geo.sy + 0.5, geo.side - 1, geo.side - 1);

    /* 圆环上的色相标记 */
    const rad = ((hue - 90) * Math.PI) / 180;
    ctx.beginPath();
    ctx.fillStyle = "hsl(" + hue + ", 100%, 50%)";
    ctx.arc(geo.cx + Math.cos(rad) * geo.mid, geo.cy + Math.sin(rad) * geo.mid,
            Math.max(5, cssSize * 0.026), 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
    ctx.stroke();

    /* 方块里的饱和度/亮度标记 */
    const mx = geo.sx + sat * geo.side;
    const my = geo.sy + (1 - light) * geo.side;
    ctx.beginPath();
    ctx.arc(mx, my, Math.max(5, cssSize * 0.026), 0, Math.PI * 2);
    ctx.fillStyle = toHex(hslToRgb(hue, sat, light));
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mx, my, Math.max(2, cssSize * 0.009), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fill();
  }

  /* ── 更新读数 ── */
  function update() {
    const rgb = hslToRgb(hue, sat, light);
    const hex = toHex(rgb);
    const h = ((Math.round(hue) % 360) + 360) % 360;
    const s100 = Math.round(sat * 100);
    const l100 = Math.round(light * 100);
    const hslText = "hsl(" + h + ", " + s100 + "%, " + l100 + "%)";

    if (swatch) swatch.style.background = hex;
    if (outHex) {
      outHex.textContent = hex;
      outHex.dataset.copy = hex;
    }
    if (outRgb) {
      outRgb.textContent = rgb.join(", ");
      outRgb.dataset.copy = "rgb(" + rgb.join(", ") + ")";
    }
    if (outHsl) {
      outHsl.textContent = h + "°, " + s100 + "%, " + l100 + "%";
      outHsl.dataset.copy = hslText;
    }
    canvas.setAttribute("aria-valuenow", String(h));
    canvas.setAttribute("aria-valuetext", hex + " · 饱和度 " + s100 + "% · 亮度 " + l100 + "%");
    draw();
  }

  /* ── 取色 ── */
  function applyRing(x, y) {
    const dx = x - geo.cx;
    const dy = y - geo.cy;
    if (!dx && !dy) return;
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;   // 正上方 = 0°
    hue = ((deg % 360) + 360) % 360;
  }

  function applySquare(x, y) {
    sat = clamp01((x - geo.sx) / geo.side);
    light = clamp01(1 - (y - geo.sy) / geo.side);
  }

  function pickFromEvent(e, mode) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (mode === "ring") applyRing(x, y);
    else applySquare(x, y);
    update();
  }

  /* 按下时决定这次拖动调哪个：圆环区 → 色相，环内（方块及周围）→ 饱和度/亮度。
     分界就用圆环内缘，和视觉一致（方块本身对角只到内缘的 ~0.93，不会误判）。 */
  function modeAt(x, y) {
    const d = Math.hypot(x - geo.cx, y - geo.cy);
    return d > geo.inner - 1 ? "ring" : "square";
  }

  canvas.addEventListener("pointerdown", (e) => {
    const rect = canvas.getBoundingClientRect();
    dragging = modeAt(e.clientX - rect.left, e.clientY - rect.top);
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) { /* 合成事件没有真实指针时忽略 */ }
    pickFromEvent(e, dragging);
    e.preventDefault();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    pickFromEvent(e, dragging);
  });

  function endDrag(e) {
    dragging = null;
    if (canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  /* 键盘：←→ 色相，↑↓ 亮度，Shift+↑↓ 饱和度（都按 1% / 1° 走，Shift 时 ×10） */
  canvas.addEventListener("keydown", (e) => {
    const fast = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowRight") hue = (hue + fast) % 360;
    else if (e.key === "ArrowLeft") hue = (hue - fast + 360) % 360;
    else if (e.key === "ArrowUp") {
      if (e.shiftKey) sat = clamp01(sat + fast / 100);
      else light = clamp01(light + fast / 100);
    } else if (e.key === "ArrowDown") {
      if (e.shiftKey) sat = clamp01(sat - fast / 100);
      else light = clamp01(light - fast / 100);
    } else if (e.key === "Home") {
      hue = 0;
    } else {
      return;
    }
    e.preventDefault();
    update();
  });

  /* ── 点色值复制 ── */
  function showTip(text, ok) {
    if (!tip) return;
    tip.textContent = text;
    tip.classList.toggle("hue__tip--done", !!ok);
    window.clearTimeout(showTip.timer);
    showTip.timer = window.setTimeout(() => {
      tip.textContent = "点色值复制";
      tip.classList.remove("hue__tip--done");
    }, 1400);
  }

  function fallbackCopy(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showTip("已复制 " + text, true);
    } catch (err) {
      showTip("复制失败，手动选中吧：" + text, false);
    }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => showTip("已复制 " + text, true),
        () => fallbackCopy(text)
      );
      return;
    }
    fallbackCopy(text);
  }

  [outHex, outRgb, outHsl].forEach((btn) => {
    if (!btn) return;
    btn.addEventListener("click", () => copyText(btn.dataset.copy || btn.textContent.trim()));
  });

  /* ── 启动 ── */
  resizeCanvas();
  update();
  window.addEventListener("resize", () => {
    resizeCanvas();
    update();
  });
})();
