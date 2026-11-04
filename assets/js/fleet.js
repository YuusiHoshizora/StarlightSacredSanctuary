/* ============================================================
   舰队页 · 悬停卡片换整页主题色
   ------------------------------------------------------------
   全站有两套颜色，分工不同：

     · 主题色（紫色基调）：天空底色、激活区描边、柔光、极光、选区、顶栏。
     · 强调色（金色 #FFD700）：导航 / 页脚 hover、焦点、卡片标题等强调态。

   鼠标移到某张舰队卡片上（或键盘聚焦）时，**只换主题色**：
   把页面里的紫色换成该舰队的颜色，强调色始终是金色、不参与换色。
   银色的六边形网格线也不换色。

   换色范围：
     · 页面令牌 --fleet-tone / --fleet-tone-rgb（::selection 等页面细节取它）
     · 顶栏底色 --fleet-nav-bg（透明度和玻璃模糊不变，只换色调）
     · 背景画布的天空底色、激活区描边 / 柔光 / 极光（window.SSSHex.setTone）

   强调色（金色）不参与换色：导航 / 页脚 hover、焦点、卡片标题、圆点 / 连线 /
   金环 / 掠光 / 点击波纹都保持原样。

   移出卡片（或失焦）后平滑回到紫色。颜色写在卡片的 data-fleet-color 上。
   动效：320ms easeOutCubic；系统偏好「减少动态」时直接切换。
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var cards = document.querySelectorAll('.fleet-card[data-fleet-color]');
  if (!cards.length) return;

  /* 默认主题色 = 全站紫色基调（与 background.js 的 TONE_COLOR、global.css 的选区同色） */
  var DEFAULT_TONE = '#3A3072';
  var DEFAULT_RGB = parseHex(DEFAULT_TONE);

  var current = DEFAULT_RGB.slice();
  var target = DEFAULT_RGB.slice();
  var fromColor = DEFAULT_RGB.slice();
  var hovered = null;        // 鼠标所在卡片
  var focused = null;        // 键盘聚焦的卡片（鼠标点出来的焦点不算）
  var rafId = 0;
  var startTime = 0;
  var DURATION = 320;        // 换色时长（毫秒）
  var reduced = !!(window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* '#rgb' / '#rrggbb' → [r, g, b]；解析失败返回 null */
  function parseHex(hex) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return null;
    var h = m[1];
    if (h.length === 3) {
      h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) +
          h.charAt(2) + h.charAt(2);
    }
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16)
    ];
  }

  function toHex(c) {
    return '#' + c.map(function (v) {
      var h = Math.max(0, Math.min(255, Math.round(v))).toString(16);
      return h.length < 2 ? '0' + h : h;
    }).join('').toUpperCase();
  }

  /* 以默认紫色为原点，把某个原始颜色沿主题色变化方向偏移。
     主题色回到紫色时结果与原始颜色完全相同，所以复位不会跳色。 */
  function shiftColor(base, rgb, k) {
    return [
      Math.max(0, Math.min(255, Math.round(base[0] + (rgb[0] - DEFAULT_RGB[0]) * k))),
      Math.max(0, Math.min(255, Math.round(base[1] + (rgb[1] - DEFAULT_RGB[1]) * k))),
      Math.max(0, Math.min(255, Math.round(base[2] + (rgb[2] - DEFAULT_RGB[2]) * k)))
    ];
  }

  /* 顶栏底色的原始值（与 global.css 的 .navbar background 一致） */
  var NAV_BASE = [10, 10, 30];

  /* 把当前主题色写进页面令牌、顶栏底色与背景画布。
     强调色令牌（--ctl-*）不动，金色保持原样。
     背景画布由 background.js 维护，页面没装它（例如脚本顺序变了）时静默跳过。 */
  function paint(rgb) {
    var r = Math.round(rgb[0]);
    var g = Math.round(rgb[1]);
    var b = Math.round(rgb[2]);
    var hex = toHex([r, g, b]);
    var parts = r + ', ' + g + ', ' + b;

    root.style.setProperty('--fleet-tone', hex);
    root.style.setProperty('--fleet-tone-rgb', parts);

    /* 顶栏：底色向舰队色偏移，透明度和玻璃质感不变 */
    var nav = shiftColor(NAV_BASE, [r, g, b], 0.20);
    root.style.setProperty('--fleet-nav-bg',
      'rgba(' + nav[0] + ', ' + nav[1] + ', ' + nav[2] + ', 0.35)');

    if (window.SSSHex && typeof window.SSSHex.setTone === 'function') {
      window.SSSHex.setTone([r, g, b]);
    }
  }

  function sameRgb(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  }

  /* 换色用「起止色 + 进度」而不是指数趋近：进度按真实时间算，
     所以即使 rAF 被节流（后台标签、低电量），到时间也一定能落到目标色。 */
  function step(now) {
    rafId = 0;
    if (!startTime) startTime = now;

    var t = Math.min(1, (now - startTime) / DURATION);
    var e = 1 - Math.pow(1 - t, 3);       // easeOutCubic
    for (var i = 0; i < 3; i++) {
      current[i] = fromColor[i] + (target[i] - fromColor[i]) * e;
    }

    paint(current);

    if (t < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      current = target.slice();
      startTime = 0;
    }
  }

  /* 根据 hovered / focused 决定目标色，并确保动画循环在跑 */
  function refresh() {
    var card = hovered || focused;
    var rgb = card ? parseHex(card.getAttribute('data-fleet-color')) : null;
    var next = rgb || DEFAULT_RGB.slice();

    if (!sameRgb(next, target)) {
      /* 从当前看到的颜色接着过渡；连续划过几张卡片也不会跳回金色再起步 */
      fromColor = current.slice();
      target = next;
      startTime = 0;
    }

    if (reduced) {
      current = target.slice();
      paint(current);
      return;
    }
    if (!rafId) {
      rafId = requestAnimationFrame(step);
    }
  }

  function onEnter(e) {
    hovered = e.currentTarget;
    refresh();
  }

  function onLeave(e) {
    if (hovered === e.currentTarget) {
      hovered = null;
      refresh();
    }
  }

  function onFocus(e) {
    /* 只把键盘焦点算作「选中」：鼠标点击后的焦点不该让主题一直停在那张卡上 */
    var keyboard = true;
    try { keyboard = e.currentTarget.matches(':focus-visible'); } catch (err) {}
    if (!keyboard) return;
    focused = e.currentTarget;
    refresh();
  }

  function onBlur(e) {
    if (focused === e.currentTarget) {
      focused = null;
      refresh();
    }
  }

  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    card.addEventListener('pointerenter', onEnter, false);
    card.addEventListener('pointerleave', onLeave, false);
    card.addEventListener('focus', onFocus, false);
    card.addEventListener('blur', onBlur, false);
  }

  /* 站内同文档换页（spa.js）后 <html> 上的内联令牌会留下来，
     必须清掉，否则下一页的强调色会停在这张舰队的颜色上。
     清内联值而不是写回金色：让下一页回到 global.css 的 :root 默认。 */
  function resetTheme() {
    hovered = null;
    focused = null;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    startTime = 0;
    current = DEFAULT_RGB.slice();
    target = current.slice();
    fromColor = current.slice();
    root.style.removeProperty('--fleet-tone');
    root.style.removeProperty('--fleet-tone-rgb');
    root.style.removeProperty('--fleet-nav-bg');
    if (window.SSSHex && typeof window.SSSHex.setTone === 'function') {
      window.SSSHex.setTone(DEFAULT_RGB);
    }
  }

  document.addEventListener('sss:swap', resetTheme, false);

  /* 从往返缓存（bfcache）恢复时也回到默认色，避免把上次悬停的颜色带回来 */
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) resetTheme();
  }, false);
})();
