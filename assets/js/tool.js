/* ============================================================
   工具页脚本：色相环
   ------------------------------------------------------------
   · 圆环按 1° 一段绘制（画布按 devicePixelRatio 放大，高分屏不糊）
   · 指针点击 / 拖动取色；键盘左右方向键微调（Shift 加速），可无障碍操作
   · 下方给出 HEX / RGB / HSL，点一下复制到剪贴板
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

  let hue = 50.588;          // 站内金色 #FFD700 的色相（不是整 51°，那样会偏成 #FFD900）
  let dragging = false;
  let cssSize = 260;

  /* ── 颜色换算 ── */
  function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = ((h % 360) + 360) % 360 / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let rgb = [0, 0, 0];
    if (hp < 1) rgb = [c, x, 0];
    else if (hp < 2) rgb = [x, c, 0];
    else if (hp < 3) rgb = [0, c, x];
    else if (hp < 4) rgb = [0, x, c];
    else if (hp < 5) rgb = [x, 0, c];
    else rgb = [c, 0, x];
    const m = l - c / 2;
    return rgb.map((v) => Math.round((v + m) * 255));
  }

  function toHex(rgb) {
    return "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  }

  /* ── 画布尺寸（按 DPR 放大，CSS 尺寸保持不变） ── */
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    cssSize = Math.max(120, Math.round(rect.width || 260));
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function geometry() {
    const cx = cssSize / 2;
    const cy = cssSize / 2;
    const outer = cssSize / 2 - 3;
    const ring = Math.max(16, cssSize * 0.2);        // 圆环厚度
    const inner = outer - ring;
    return { cx, cy, outer, inner, mid: (outer + inner) / 2 };
  }

  function draw() {
    const g = geometry();
    ctx.clearRect(0, 0, cssSize, cssSize);

    /* 圆环：每 1° 一段，稍微多画 1.2° 盖住接缝 */
    ctx.lineWidth = g.outer - g.inner;
    ctx.lineCap = "butt";
    for (let a = 0; a < 360; a++) {
      const start = ((a - 90) * Math.PI) / 180;      // 0° 在正上方，顺时针递增
      ctx.beginPath();
      ctx.strokeStyle = "hsl(" + a + ", 100%, 50%)";
      ctx.arc(g.cx, g.cy, g.mid, start, start + (1.2 * Math.PI) / 180);
      ctx.stroke();
    }

    /* 内圈挖空成面板底色，让圆环更像一个环 */
    ctx.beginPath();
    ctx.fillStyle = "rgba(12, 12, 28, 0.85)";
    ctx.arc(g.cx, g.cy, g.inner - 0.5, 0, Math.PI * 2);
    ctx.fill();

    /* 当前色相的标记 */
    const rad = ((hue - 90) * Math.PI) / 180;
    const mx = g.cx + Math.cos(rad) * g.mid;
    const my = g.cy + Math.sin(rad) * g.mid;
    ctx.beginPath();
    ctx.fillStyle = "hsl(" + hue + ", 100%, 50%)";
    ctx.arc(mx, my, Math.max(6, cssSize * 0.035), 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
    ctx.stroke();
  }

  /* ── 更新界面 ── */
  function update(redraw) {
    const rgb = hslToRgb(hue, 1, 0.5);
    const hex = toHex(rgb);
    const h = ((Math.round(hue) % 360) + 360) % 360;
    const hsl = "hsl(" + h + ", 100%, 50%)";     // 复制出去的是整数，别带一长串小数

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
      outHsl.textContent = h + "°, 100%, 50%";
      outHsl.dataset.copy = hsl;
    }
    canvas.setAttribute("aria-valuenow", String(h));
    canvas.setAttribute("aria-valuetext", hex);
    if (redraw !== false) draw();
  }

  /* ── 取色 ── */
  function pickFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const dx = e.clientX - rect.left - rect.width / 2;
    const dy = e.clientY - rect.top - rect.height / 2;
    if (!dx && !dy) return;
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;   // 正上方 = 0°
    hue = ((deg % 360) + 360) % 360;
    update();
  }

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) { /* 合成事件没有真实指针时忽略 */ }
    pickFromEvent(e);
    e.preventDefault();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    pickFromEvent(e);
  });

  function endDrag(e) {
    dragging = false;
    if (canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  /* 键盘：左右方向键微调（Shift 一次 10°） */
  canvas.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      hue = (hue + step) % 360;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      hue = (hue - step + 360) % 360;
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
