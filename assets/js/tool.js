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

  /* 初始颜色：#3A3072（站内那抹深紫）。改这一行就能换默认色。 */
  const INITIAL = "#3A3072";
  const initHsl = rgbToHsl(hexToRgb(INITIAL));

  let hue = initHsl[0];
  let sat = initHsl[1];
  let light = initHsl[2];

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

  /* 反方向：hex / rgb → HSL（用于「直接输入数值跳转颜色」与初始色） */
  function hexToRgb(text) {
    let s = String(text).trim().replace(/^#/, "");
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  }

  function rgbToHsl(rgb) {
    const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const c = max - min;
    if (!c) return [0, 0, l];
    const s = c / (1 - Math.abs(2 * l - 1));
    let h;
    if (max === r) h = ((g - b) / c) % 6;
    else if (max === g) h = (b - r) / c + 2;
    else h = (r - g) / c + 4;
    h *= 60;
    if (h < 0) h += 360;
    return [h, Math.min(1, s), Math.min(1, l)];
  }

  const clamp255 = (v) => Math.min(255, Math.max(0, Math.round(Number(v) || 0)));

  /* 解析用户输入：支持 #RGB / #RRGGBB / RRGGBB / rgb(r,g,b) / r,g,b / hsl(h,s%,l%) / h,s%,l% */
  function parseColor(text) {
    const s = String(text).trim();
    if (!s) return null;

    const rgb = hexToRgb(s);
    if (rgb) return rgbToHsl(rgb);

    const m3 = s.match(/^(?:rgba?\()?\s*(-?\d{1,3})\D+(-?\d{1,3})\D+(-?\d{1,3})\s*\)?$/i);
    if (m3) return rgbToHsl([clamp255(m3[1]), clamp255(m3[2]), clamp255(m3[3])]);

    const mh = s.match(/^(?:hsla?\()?\s*(-?\d{1,3}(?:\.\d+)?)\D+(\d{1,3}(?:\.\d+)?)\s*%\D+(\d{1,3}(?:\.\d+)?)\s*%\s*\)?$/i);
    if (mh) {
      const h = ((Number(mh[1]) % 360) + 360) % 360;
      return [h, Math.min(1, Math.abs(Number(mh[2])) / 100), Math.min(1, Math.abs(Number(mh[3])) / 100)];
    }
    return null;
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

    if (swatch) swatch.style.background = hex;
    /* 正在输入的那个框别去覆盖它，其余两个跟着当前颜色走 */
    setField(outHex, hex);
    setField(outRgb, rgb.join(", "));
    setField(outHsl, h + "°, " + s100 + "%, " + l100 + "%");

    canvas.setAttribute("aria-valuenow", String(h));
    canvas.setAttribute("aria-valuetext", hex + " · 饱和度 " + s100 + "% · 亮度 " + l100 + "%");
    draw();
  }

  function setField(input, value) {
    if (!input || document.activeElement === input) return;
    input.value = value;
  }

  /* 输入框：聚焦全选、回车跳到该颜色、失焦则回到当前真实值 */
  [outHex, outRgb, outHsl].forEach((input) => {
    if (!input) return;
    input.addEventListener("focus", () => input.select());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const parsed = parseColor(input.value);
        if (parsed) {
          hue = parsed[0];
          sat = parsed[1];
          light = parsed[2];
          input.blur();                       // 失焦后 update() 会把三个框都刷新成新值
          update();
          showTip("已跳到 " + toHex(hslToRgb(hue, sat, light)), true);
        } else {
          showTip("看不出这是什么颜色值：" + input.value.trim(), false);
        }
      } else if (e.key === "Escape") {
        input.blur();                          // 放弃这次输入
      }
    });
    input.addEventListener("blur", () => update());
  });

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
    /* 焦点收到画布上：输入框还聚焦时 setField 不会覆盖它（那是给「正在输入」留的守卫），
       拖色环就会出现 HEX 停在旧值、RGB/HSL 已经变了的自相矛盾。
       preventDefault 会挡掉浏览器默认的「按下即聚焦」，所以这里手动聚焦。 */
    canvas.focus({ preventScroll: true });
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
    tip.classList.toggle("hue__tip--done", !!ok);       // 金色：成功
    tip.classList.toggle("hue__tip--err", ok === false); // 复用错误页那支红：失败
    window.clearTimeout(showTip.timer);
    showTip.timer = window.setTimeout(() => {
      tip.textContent = "";            // 提示只在复制后短暂出现，平时留空
      tip.classList.remove("hue__tip--done", "hue__tip--err");
    }, 1400);
  }

  function fallbackCopy(text, btn) {
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

  /* ── 每行最右侧的复制按钮：复制同一行输入框里的值 ── */
  document.querySelectorAll(".hue__copy").forEach((btn) => {
    /* 按下时别让输入框失焦：失焦会触发 update() 把框刷回当前颜色，
       复制的就不是屏幕上看到的那串了（输完没回车也会被刷掉） */
    btn.addEventListener("pointerdown", (e) => e.preventDefault());
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      const value = target ? target.value.trim() : "";
      if (!value) return;
      copyText(value);
    });
  });

  /* ── 启动 ── */
  resizeCanvas();
  update();
  window.addEventListener("resize", () => {
    resizeCanvas();
    update();
  });
})();


/* ============================================================
   工具页脚本：时间转换（星纪元 ⇄ 公元）
   ------------------------------------------------------------
   设定（写死在这里，方便以后调）：
     · 公元 2110-01-01 00:00:00 UTC = 星纪元（S.E.）1 年 1 月 1 日 00:00:00
     · 星纪元一年 12 个月、一个月 30 天、一天 24 小时 —— 一年恒为 360 天，
       没有闰年、闰月、闰秒
     · 本工具只换算「日」，时/分/秒两边都是 00:00:00（纪元本身也对齐在午夜）

   算法：
     两条时间轴都以「自公元 2110-01-01 UTC 起的整日数」为桥（记为绝对日）。
     · SE → 绝对日：(年-1)*360 + (月-1)*30 + (日-1)
     · 绝对日 → SE：除以 360 / 30 取商取余（负数要向下取整，JS 的 % 会出负余数）
     · 公元 → 绝对日：用 Date.UTC 做日期运算，闰年交给 Date 处理（它是前推格里历）
       —— 不自己数闰年，避免把「整百年不是闰年」写错
     · 绝对日 → 公元：二分查找落在哪一年（年长 365/366 不固定，直接算会踩闰年边界），
       再取年内的第几天

     公元 2110-01-01 之前的日期落在纪元之前：绝对日变成负数，S.E. 年份记作 0 或负数
     （0 = 纪元前一年，-1 = 纪元前两年……即「前星纪元 N 年」的 N 就是 |年|）。

   两边互为输入：改星纪元就更新公元，改公元就更新星纪元；每次都由当前输入重算，
   不保留中间状态，所以来回切也不会累积误差。

   界面：输入框排成「395 年 6 月 9 日」，年月日三个字放在输入框外面；只给换算结果，
   不回显「年内第几天」之类的推导信息（见 DESIGN.md「操作界面的文案」）。
   ============================================================ */
(function () {
  "use strict";

  const MS_PER_DAY = 86400000;
  const SE_MONTHS = 12;
  const SE_MONTH_DAYS = 30;
  const SE_YEAR_DAYS = SE_MONTHS * SE_MONTH_DAYS;   // 360

  /* 纪元锚点：公元 2110-01-01 UTC。Date.UTC 的月份从 0 开始，所以是 0。 */
  const EPOCH = Date.UTC(2110, 0, 1);

  const el = {
    seYear: document.getElementById("se-year"),
    seMonth: document.getElementById("se-month"),
    seDay: document.getElementById("se-day"),
    seNote: document.getElementById("se-note"),
    adYear: document.getElementById("ad-year"),
    adMonth: document.getElementById("ad-month"),
    adDay: document.getElementById("ad-day"),
    adNote: document.getElementById("ad-note"),
  };
  if (!el.seYear || !el.adYear) return;      // 这张卡片不在这个页面上

  /* ── 基础换算 ── */
  /* Date.UTC 的坑：年份 0–99 会被当成 1900–1999（Date.UTC(50, 0, 1) 是 1950 年）。
     本工具的「前星纪元」会换算到公元 0–99 这一段，所以必须自己按真实年份构造 UTC 时刻。
     month 用 1–12；日/月溢出照 Date 的规则归一化（day 0 = 上个月最后一天）。 */
  function utcMs(year, month, day) {
    const t = new Date(0);
    t.setUTCFullYear(year, month - 1, day);
    t.setUTCHours(0, 0, 0, 0);
    return t.getTime();
  }

  /* 某年某月的天数（前推格里历闰年规则：4 整除、整百年须 400 整除） */
  function daysInGregorianMonth(year, month) {
    return new Date(utcMs(year, month + 1, 0)).getUTCDate();
  }

  function jdnToDate(jdn) {
    return new Date(EPOCH + jdn * MS_PER_DAY);
  }

  function dateToJdn(year, month, day) {
    const t = utcMs(year, month, day);
    if (!isFinite(t)) return null;
    return Math.round((t - EPOCH) / MS_PER_DAY);
  }

  /* ── SE → 绝对日 ──
     JS 的 % 对负数会给负余数（-1 % 30 === -1），所以不能直接用取余公式。
     这里把「年在内的第几天」先归一化到 0..359，负数年也能得到正确结果。 */
  function seToJdn(year, month, day) {
    const start = (year - 1) * SE_YEAR_DAYS;
    const within = (month - 1) * SE_MONTH_DAYS + (day - 1);
    return start + within;
  }

  /* ── 绝对日 → SE ──
     允许负的年月日：绝对日 < 0 就是纪元之前，年份自然落到 0 或负数。 */
  function seFromJdn(jdn) {
    const year = Math.floor(jdn / SE_YEAR_DAYS) + 1;
    const inYear = jdn - (year - 1) * SE_YEAR_DAYS;      // 恒在 0..359
    return {
      year: year,
      month: Math.floor(inYear / SE_MONTH_DAYS) + 1,
      day: (inYear % SE_MONTH_DAYS) + 1,
    };
  }

  /* ── 绝对日 → 公元（二分查找年份：格里历年长不固定，直接算会踩闰年边界） ── */
  function gregorianFromJdn(jdn) {
    const target = jdnToDate(jdn);
    if (!isFinite(target.getTime())) return null;

    const y = target.getUTCFullYear();

    /* 年份上下界：先取相邻年，再逐年推开，保证恰好把目标年夹住 */
    let lo = y - 1;
    let hi = y + 1;
    while (dateToJdn(lo, 1, 1) !== null && dateToJdn(lo, 1, 1) > jdn) lo -= 1;
    while (dateToJdn(hi, 1, 1) !== null && dateToJdn(hi, 1, 1) <= jdn) hi += 1;

    while (dateToJdn(lo, 1, 1) === null || dateToJdn(hi, 1, 1) === null || hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (mid === lo || mid === hi) return null;          // 推到 Date 能表示的边界了
      if (dateToJdn(mid, 1, 1) === null) return null;
      if (dateToJdn(mid, 1, 1) <= jdn) lo = mid;
      else hi = mid;
    }

    const dayOfYear = jdn - dateToJdn(lo, 1, 1) + 1;
    if (dayOfYear < 1 || dayOfYear > 366) return null;
    if (dayOfYear !== (jdnToDate(jdn).getTime() - utcMs(lo, 1, 1)) / MS_PER_DAY + 1) return null;

    return {
      year: lo,
      month: target.getUTCMonth() + 1,
      day: target.getUTCDate(),
      dayOfYear: dayOfYear,
    };
  }

  /* ── 输入读取 ──
     type=number 的 .value 是「用户看见的那串字符」：空串、'-'、'1e5' 都读得出来，
     所以用 Number() 会把空串当成 0。这里一律先当字符串校验，非纯整数就返回 null。 */
  function readInt(input) {
    const text = input ? input.value.trim() : "";
    if (!/^[+-]?\d+$/.test(text)) return null;
    return parseInt(text, 10);
  }

  /* ── 提示行（只用来放错误；换算成功时保持空） ── */
  const notes = { se: el.seNote, ad: el.adNote };

  function setNote(side, text, isError) {
    const node = notes[side];
    if (!node) return;
    node.textContent = text;
    node.classList.toggle("timeconv__note--err", !!isError);
  }

  /* 输入有误：提示写在**正在编辑的那一侧**（就近），另一侧只清掉提示。
     数字都保留 —— 用户可能只改错了一位，别把已经填好的值抹掉。 */
  function failInput(side, text) {
    setNote(side, text, true);
    setNote(side === "se" ? "ad" : "se", "", false);
  }

  /* ── 星纪元 → 公元 ── */
  function syncFromSe() {
    const y = readInt(el.seYear);
    const m = readInt(el.seMonth);
    const d = readInt(el.seDay);

    if (y === null || m === null || d === null) {
      setNote("ad", "", false);          // 输入没填完：只清提示，不抹掉已经填好的数字
      return;
    }
    if (m < 1 || m > SE_MONTHS) { failInput("se", "星纪元的月份只有 1–12"); return; }
    if (d < 1 || d > SE_MONTH_DAYS) { failInput("se", "星纪元每月固定 30 天（1–30）"); return; }

    const jdn = seToJdn(y, m, d);
    const g = gregorianFromJdn(jdn);
    if (!g) { failInput("se", "超出可换算范围"); return; }

    el.adYear.value = g.year;
    el.adMonth.value = g.month;
    el.adDay.value = g.day;

    setNote("se", "", false);
    setNote("ad", "", false);
  }

  /* ── 公元 → 星纪元 ── */
  function syncFromAd() {
    const y = readInt(el.adYear);
    const m = readInt(el.adMonth);
    const d = readInt(el.adDay);

    if (y === null || m === null || d === null) {
      setNote("se", "", false);
      return;
    }
    if (m < 1 || m > 12) { failInput("ad", "公元的月份只有 1–12"); return; }
    if (d < 1 || d > daysInGregorianMonth(y, m)) {
      failInput("ad", "公元 " + y + " 年 " + m + " 月没有 " + d + " 日");
      return;
    }

    const jdn = dateToJdn(y, m, d);
    if (jdn === null) { failInput("ad", "超出可换算范围"); return; }
    const se = seFromJdn(jdn);

    el.seYear.value = se.year;
    el.seMonth.value = se.month;
    el.seDay.value = se.day;

    setNote("se", "", false);
    setNote("ad", "", false);
  }

  /* ── 绑定：两边都能改，谁改就由谁驱动另一边 ── */
  [el.seYear, el.seMonth, el.seDay].forEach(function (input) {
    input.addEventListener("input", syncFromSe);
  });
  [el.adYear, el.adMonth, el.adDay].forEach(function (input) {
    input.addEventListener("input", syncFromAd);
  });

  /* ── 默认值：星纪元 395 年 6 月 9 日（页面 HTML 里已经写好，这里再算一遍保证自洽） ── */
  syncFromSe();
})();


/* ============================================================
   工具页脚本：罗马数字（阿拉伯数字 ⇄ 罗马数字）
   ------------------------------------------------------------
   · 只做标准罗马数字：1–3999。罗马数字没有 0 和负数；4000 起要用上划线
     （V̄ 之类），这里不支持，直接报错
   · 两边都能改：改阿拉伯就更新罗马，改罗马就更新阿拉伯
   · 罗马输入按「标准写法」校验：先按减法规则算出值，再把它转回罗马数字比对，
     所以 IIII / VX / IC 这类非标准写法会被拒绝，并提示正确写法
   · 提示行只放错误；换算成功时什么都不写 —— 操作界面只给结果，不解释过程
     （见 DESIGN.md「操作界面的文案」）
   ============================================================ */
(function () {
  "use strict";

  const arInput = document.getElementById("roman-arabic");
  const rmInput = document.getElementById("roman-roman");
  const note = document.getElementById("roman-note");
  if (!arInput || !rmInput || !note) return;      // 这张卡片不在这个页面上

  const MAX = 3999;
  /* 从大到小排好：一直取到取不动为止，就是标准写法 */
  const TABLE = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
  ];
  const VALUES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

  function toRoman(n) {
    let out = "";
    for (let i = 0; i < TABLE.length; i++) {
      while (n >= TABLE[i][0]) {
        out += TABLE[i][1];
        n -= TABLE[i][0];
      }
    }
    return out;
  }

  /* 返回 { n } 或 { err }；空串返回 null */
  function fromRoman(text) {
    const s = text.trim().toUpperCase().replace(/\s+/g, "");   // 允许小写、允许中间带空格
    if (!s) return null;
    if (!/^[IVXLCDM]+$/.test(s)) return { err: "只用 I V X L C D M 七个字母" };

    /* 从右往左：比右边小就减，否则就加 —— 减法规则（IV / IX / XL / XC / CD / CM）自然成立 */
    let total = 0;
    let prev = 0;
    for (let i = s.length - 1; i >= 0; i--) {
      const v = VALUES[s[i]];
      if (v < prev) total -= v;
      else { total += v; prev = v; }
    }
    if (total < 1 || total > MAX) return { err: "标准罗马数字只写到 1–3999" };

    const canonical = toRoman(total);
    if (canonical !== s) return { err: "不是标准写法，应写作 " + canonical };
    return { n: total };
  }

  /* 只显示错误；成功时清空，不列出「按位拆开」之类的推导过程 */
  function setNote(text, isError) {
    note.textContent = text;
    note.classList.toggle("roman__note--err", !!isError);
  }

  function syncFromArabic() {
    const raw = arInput.value.trim().replace(/[\s,]/g, "");   // 容忍 "2 498" / "2,498"
    if (!raw) { setNote("", false); return; }
    if (!/^\d+$/.test(raw)) { setNote("阿拉伯数字只能填 0–9 的整数", true); return; }

    const n = parseInt(raw, 10);
    if (n === 0) { setNote("罗马数字里没有 0（1–3999）", true); return; }
    if (n > MAX) { setNote("标准罗马数字只写到 3999", true); return; }

    rmInput.value = toRoman(n);
    setNote("", false);
  }

  function syncFromRoman() {
    if (!rmInput.value.trim()) { setNote("", false); return; }
    const res = fromRoman(rmInput.value);
    if (res.err) { setNote(res.err, true); return; }

    arInput.value = String(res.n);
    setNote("", false);
  }

  [arInput, rmInput].forEach(function (input) {
    input.addEventListener("input", input === arInput ? syncFromArabic : syncFromRoman);
  });

  /* 默认值：2599 ⇄ MMDXCIX（HTML 里已经写好，这里再算一遍保证自洽） */
  syncFromArabic();
})();
