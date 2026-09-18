/* ============================================================
   星光圣域 · 背景（星野 + 六边形网格 + 鼠标激活区特效）
   ------------------------------------------------------------
   分层（自下而上）：
     1. .hex-bg__sky    星云底色 + 缓慢移动的极光（随鼠标轻微视差）
     2. .hex-bg__stars  星空，缓慢闪烁
     3. .hex-bg__grid   六边形网格（静态，仅在尺寸变化时重绘）
     4. .hex-bg__fx     鼠标激活区特效

   激活区：
   · 以鼠标为圆心；内圈描边 -> #3a3072，越远越淡，圆外保持 #c0c0c0
   · 每个六边形中心 -> #ffd700 实心圆点（半径 = 1.5 倍描边）
   · 相邻圆点用 #ffd700 细线连接，越远越透明
   · 内圈（0 ~ FALLOFF_START 比例）不衰减，只有外层衰减
   · 边界的细金环 + 移动时掠过的一道浅光（华丽感，但保持暗调）
   ============================================================ */
(function () {
  'use strict';

  var DEFAULTS = {
    R: 30,                    // 六边形外接圆半径（CSS px）
    STROKE: 1.8,              // 六边形描边粗细
    BASE_STROKE: '#c0c0c0',   // 普通六边形描边（网格线）
    ACTIVE_STROKE: '#3a3072', // 激活区内圈描边
    DOT_COLOR: '#ffd700',     // 圆点与连线颜色
    RADIUS: 260,              // 激活区半径（CSS px）
    FALLOFF_START: 0.45,      // 内圈比例：该范围内完全不衰减
    FALLOFF_POW: 1.1,         // 衰减曲线指数：越大末端收得越平缓（过渡越柔）
    SMOOTH: 0.2,              // 圆心跟随鼠标的缓动系数（0~1，越大越跟手）
    GLOW: 0,                  // 圆内紫色雾化强度（0 = 关闭）

    /* --- 华丽度相关，全部可调；设为 0 即关闭对应特效 --- */
    SKY_PARALLAX: 0.03,       // 星云随鼠标的视差强度（相对位移比例）
    AURORA: 0.5,              // 极光强度
    STAR_DENSITY: 1 / 9000,   // 星星密度（每平方 CSS 像素）
    STAR_TWINKLE: 0.55,       // 星星闪烁幅度
    AURA: 0.5,                // 激活区底部的柔光强度
    RING: 0.4,                // 边界金环强度
    RAY: 0.28,                // 移动时掠光的强度
    CLICK_BURST: true,        // 点击时扩散一圈金色波纹
    ANIM_FPS: 30,             // 星云/星空的刷新率（越低越省电、越不抢帧）

    GRID_DOT: 0,              // 六边形中心的静态小点亮度（0 = 关闭）
    GRID_DOT_PULSE: false,    // 小点是否呼吸闪烁（默认关，避免与星图互相干扰）
    INTERACTIVE: true,        // 是否启用鼠标激活区；false 则只保留静态网格

    /* --- 网格样式 ---
       'hex'   ：六边形蜂窝（全站默认）
       'coord' ：坐标纸式直角网格，供星图页使用；格子边长 = 视口高 / COORD_N，
                 画布顶部与左边缘即为坐标原点，因此第 k 条线的位置是 k*cell，
                 页面按同一个公式取整即可让内容精确落在交点上 */
    GRID_STYLE: 'hex',
    COORD_N: 20,              // 纵向格数（格子数量）
    COORD_MAJOR: 5,           // 每隔几条画一条加粗主线（主线间隔永远是它的整数倍，缩放时不跳变）
    COORD_MINOR: '#232334',   // 细线颜色
    COORD_MAJOR_C: '#3d3d5c', // 主线颜色
    COORD_AXIS: '#5a5a7a',    // 坐标轴颜色
    COORD_MARK: 0.5,          // 交点小十字/小点的亮度（0 = 关闭）
    COORD_SNAP_CELLS: 1,      // 内容吸附粒度（单位：细格）。1 = 落在细线交点；
                              // 改成 COORD_MAJOR 则落在带标记的主线交点上
    COORD_PX: 34,             // 网格在屏幕上保持的基准格距（px）
    ZOOM_MIN: 0.7,            // 最小比例尺
    ZOOM_DEFAULT: 1,          // 默认比例尺（介于最小与最大之间）
    ZOOM_MAX: 1.45,           // 最大比例尺
    ZOOM_STEP: 1.16,          // 每次点击按钮的缩放步进
    ZOOM_MS: 420,             // 缩放缓动时长（毫秒），越大越柔和；0 = 立即切换
    SNAP: true                // 把 window.SSS_COORD 暴露给页面做对齐
  };

  /* 各页可通过 window.SSS_BG 覆盖上面任意一项，得到「同风格、不同克制程度」的背景。
     starmap 页在 assets/js/starmap-bg.js 里用一套更安静的参数覆盖。 */
  var CFG = {};
  (function merge() {
    var o = window.SSS_BG || {};
    for (var k in DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) {
        CFG[k] = Object.prototype.hasOwnProperty.call(o, k) ? o[k] : DEFAULTS[k];
      }
    }
  })();

  var W = Math.sqrt(3) * CFG.R;  // 列间距
  var H = 1.5 * CFG.R;           // 行间距
  var DOT_R = CFG.STROKE * 1.5;  // 圆点半径 = 1.5 倍描边

  /* 网格原点：固定量，保证底图与激活区使用完全相同的晶格 */
  function gridOffset() {
    return (Math.round(vw / W) * W - vw) / 2;
  }

  var layer = document.createElement('div');
  layer.className = 'hex-bg';
  layer.setAttribute('aria-hidden', 'true');

  var sky = document.createElement('canvas');
  var st = document.createElement('canvas');
  var cx = document.createElement('canvas');
  var fx = document.createElement('canvas');
  sky.className = 'hex-bg__sky';
  st.className = 'hex-bg__stars';
  cx.className = 'hex-bg__grid';
  fx.className = 'hex-bg__fx';
  layer.appendChild(sky);
  layer.appendChild(st);
  layer.appendChild(cx);
  layer.appendChild(fx);

  var sctx = sky.getContext('2d');
  var tctx = st.getContext('2d');
  var ctx = cx.getContext('2d');
  var fctx = fx.getContext('2d');

  var vw = 0, vh = 0, dpr = 1;
  var pointer = { x: 0, y: 0, on: false };
  var cur = { x: 0, y: 0 };
  var animating = false;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 星星：极坐标存储，闪烁只改 alpha，不重算位置 */
  var stars = [];
  var buckets = [];          // 按亮度分档，减少 path 数量
  var starPhase = 0;
  var skyPhase = 0;
  var bursts = [];           // 点击扩散的金色波纹
  var rayDx = 1, rayDy = 0, rayPower = 0;   // 移动掠光的方向与强度

  function setup(canvas, context) {
    canvas.width = Math.max(1, Math.round(vw * dpr));
    canvas.height = Math.max(1, Math.round(vh * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function resize() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    setup(sky, sctx);
    setup(st, tctx);
    setup(cx, ctx);
    setup(fx, fctx);
    if (!pointer.on) {
      cur.x = vw / 2;
      cur.y = vh / 2;
    }
    buildStars();
    drawSky();
    drawStars();
    refreshCoordCell();
    drawGrid();
    draw();
  }

  /* 按 GRID_STYLE 选择网格绘制方式 */
  function drawGrid() {
    if (CFG.GRID_STYLE === 'coord') drawCoordGrid();
    else drawBase();
  }

  /* ============ 坐标纸式直角网格（星图页用） ============
     网格与内容共用同一套「缩放 + 平移」，所以相对位置始终对齐：

       内容位置 = 吸附点 * zoom + pan
       网格线   = 原点 + k * (基准格距 * zoom) + pan

     内容吸附在细格交点上（粒度见 COORD_SNAP_CELLS），主线只取每 COORD_MAJOR 格一条，
     两者落在同一套格点上，因此任何比例尺下都严格对齐 —— 吸附在乘 zoom 之前完成，
     缩放只是把"格点"整体拉近拉远，不会让内容滑到格子内部。

     关键在于 pan 对两者的作用是**同向同量**的 —— 拖动时网格和内容一起走。
     缩放锚定在原点（画布左上角），因此不需要任何补偿平移，
     放大 → 缩小回到同一比例尺时 pan 自然复原。
     线条画在 +0.5 处，让 1px 线落在整像素上、不发虚。 */
  var coordZoom = 1;
  var coordPanX = 0;       // 平移量（拖动画布 = 整体位移）
  var coordPanY = 0;
  var coordCellPx = 0;     // 当前渲染用的格距 = 基准格距 * zoom

  /* 基准比例尺（zoom = 1）下的名义格距：内容坐标的量化步长 */
  function coordCellBase() {
    return vh / CFG.COORD_N;
  }

  /* 内容吸附步长 = 基准格距 × COORD_SNAP_CELLS（默认 1 格，即吸附到细线交点）。
     注意吸附发生在「乘 zoom 之前」，所以任何比例尺下吸附点都仍是格点：
       (m*步长) * zoom + pan = m * (步长*zoom) + pan —— 正好是第 m 条网格线。 */
  function coordSnapStep() {
    var cells = Math.max(1, Math.round(CFG.COORD_SNAP_CELLS || 1));
    return coordCellBase() * cells;
  }

  /* 归一化坐标 -> 像素位置。
     先在基准比例尺下吸附到格点，再整体乘 zoom、加 pan —— 只缩放一次。 */
  function coordSnapZoomPx(u, v) {
    var c = coordSnapStep();
    var bx = Math.round((u * vw) / c) * c;
    var by = Math.round((v * vh) / c) * c;
    return [bx * coordZoom + coordPanX, by * coordZoom + coordPanY];
  }

  /* 不吸附，仅缩放平移 */
  function coordPosPx(u, v) {
    return [u * vw * coordZoom + coordPanX, v * vh * coordZoom + coordPanY];
  }

  /* 网格原点在屏幕上的位置（内容与网格共用，保证同向位移） */
  function gridOriginX() { return coordPanX; }
  function gridOriginY() { return coordPanY; }

  /* 计算当前实际渲染用的格距，恒等于 基准格距 * zoom */
  function refreshCoordCell() {
    coordCellPx = coordCellBase() * coordZoom;
    return coordCellPx;
  }

  /* 通知网格重绘 + 页面同步（星图页在 window.SSS_ON_ZOOM 里重画星点） */
  function notifyView() {
    drawCoordGrid();
    if (typeof window.SSS_ON_ZOOM === 'function') {
      window.SSS_ON_ZOOM(coordZoom, coordPanX, coordPanY);
    }
  }

  /* 直接应用一次缩放（不带动画） */
  function coordApplyZoom(next) {
    var z = Math.min(CFG.ZOOM_MAX, Math.max(CFG.ZOOM_MIN, next));
    if (z === coordZoom) return;
    coordZoom = z;
    refreshCoordCell();
  }

  /* ============ 缩放缓动 ============
     按钮点击不直接跳到目标比例尺，而是在 ZOOM_MS 内缓动过去；
     网格与内容每帧一起重绘，所以过渡期间两者始终同步。
     采用「指数趋近」：按下立即起步、接近目标时自然收尾，
     连续点击只需改写目标值即可平滑接续，不会重新计时或跳变。 */
  var zoomTween = { raf: 0, target: null, last: 0 };

  function zoomAnimating() {
    return Math.abs(zoomTween.target - coordZoom) > 0.0005;
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function zoomTweenStep(now) {
    zoomTween.raf = 0;
    var dtSec = zoomTween.last ? Math.min(0.05, (now - zoomTween.last) / 1000) : 1 / 60;
    zoomTween.last = now;

    var diff = zoomTween.target - coordZoom;
    if (Math.abs(diff) <= 0.0005) {
      coordApplyZoom(zoomTween.target);
      zoomTween.last = 0;
      notifyView();
      return;
    }
    /* tau 取时长的 1/3.2，约 3 个时间常数后基本到位 */
    var tau = Math.max(0.001, (CFG.ZOOM_MS / 1000) / 3.2);
    var k = 1 - Math.exp(-dtSec / tau);
    coordApplyZoom(coordZoom + diff * k);
    notifyView();
    zoomTween.raf = requestAnimationFrame(zoomTweenStep);
  }

  /* 平滑地把比例尺推向 z */
  function zoomTo(z) {
    zoomTween.target = Math.min(CFG.ZOOM_MAX, Math.max(CFG.ZOOM_MIN, z));
    if (!(CFG.ZOOM_MS > 0) || prefersReducedMotion()) {
      coordApplyZoom(zoomTween.target);
      zoomTween.last = 0;
      notifyView();
      return;
    }
    if (!zoomTween.raf) zoomTween.raf = requestAnimationFrame(zoomTweenStep);
  }

  /* 按步进缩放；从「当前目标」继续累积，连点手感连续 */
  function zoomByStep(factor) {
    var from = zoomTween.target == null ? coordZoom : zoomTween.target;
    zoomTo(from * factor);
  }

  /* 立即停止缓动并停在 target */
  function zoomStop() {
    if (zoomTween.raf) cancelAnimationFrame(zoomTween.raf);
    zoomTween.raf = 0;
    zoomTween.last = 0;
    zoomTween.target = coordZoom;
  }

  function drawCoordGrid() {
    ctx.save();
    ctx.clearRect(0, 0, vw, vh);

    /* 屏幕上的格距：随缩放变化，但保持在 COORD_PX 附近，过细则太密、过粗则显空 */
    var c = refreshCoordCell();
    /* 网格原点：与内容共用同一个平移量，保证拖动时同向移动 */
    var ox = gridOriginX();
    var oy = gridOriginY();

    /* 主线间隔永远是 COORD_MAJOR 的整数倍 —— 也就是"哪些线是主线"在逻辑坐标里固定不变，
       缩放时主线与标记点不会整体错位（否则每换一档，整片格点都会跳一格，
       星点看着就像离开了格点）。
       只在主线过密时才升档（COORD_MAJOR 的 2 倍、3 倍……），升档也仍然落在同一套格点上。 */
    var majorStep = Math.max(1, Math.round(1 / coordZoom));
    var major = CFG.COORD_MAJOR * majorStep;
    var kx0 = Math.floor((0 - ox) / c), kx1 = Math.ceil((vw - ox) / c);
    var ky0 = Math.floor((0 - oy) / c), ky1 = Math.ceil((vh - oy) / c);
    var k;

    /* 细线 */
    ctx.lineWidth = 1;
    ctx.strokeStyle = CFG.COORD_MINOR;
    ctx.beginPath();
    for (k = kx0; k <= kx1; k++) {
      if (k % major === 0) continue;
      var x = ox + k * c;
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, vh);
    }
    for (k = ky0; k <= ky1; k++) {
      if (k % major === 0) continue;
      var y = oy + k * c;
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(vw, y + 0.5);
    }
    ctx.stroke();

    /* 主线 */
    ctx.strokeStyle = CFG.COORD_MAJOR_C;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (k = Math.ceil(kx0 / major) * major; k <= kx1; k += major) {
      var mx = ox + k * c;
      ctx.moveTo(mx + 0.5, 0);
      ctx.lineTo(mx + 0.5, vh);
    }
    for (k = Math.ceil(ky0 / major) * major; k <= ky1; k += major) {
      var my = oy + k * c;
      ctx.moveTo(0, my + 0.5);
      ctx.lineTo(vw, my + 0.5);
    }
    ctx.stroke();

    /* 原点坐标轴（随内容一起缩放平移，因此也参与对齐） */
    ctx.strokeStyle = CFG.COORD_AXIS;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(ox + 0.5, 0); ctx.lineTo(ox + 0.5, vh);
    ctx.moveTo(0, oy + 0.5); ctx.lineTo(vw, oy + 0.5);
    ctx.stroke();

    /* 交点标记：只在主线上打点，避免整屏噪点 */
    if (CFG.COORD_MARK > 0) {
      var r = 1.7;
      var a1 = 0.20 * CFG.COORD_MARK;
      ctx.fillStyle = 'rgba(192,192,192,' + a1 + ')';
      ctx.beginPath();
      for (var i = Math.ceil(kx0 / major) * major; i <= kx1; i += major) {
        for (var j = Math.ceil(ky0 / major) * major; j <= ky1; j += major) {
          var px = ox + i * c, py = oy + j * c;
          ctx.moveTo(px + r, py);
          ctx.arc(px, py, r, 0, Math.PI * 2);
        }
      }
      ctx.fill();
      /* 原点单独用金色点一下 */
      ctx.beginPath();
      ctx.arc(ox + 0.5, oy + 0.5, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,215,0,' + (0.35 * CFG.COORD_MARK) + ')';
      ctx.fill();
    }
    ctx.restore();
  }

  /* 整屏六边形路径（左右各多画一列，保证水平方向无缝）。
     尖顶六边形的行距是 1.5R（不是 3R）：只有行距为 1.5R 时上下相邻的六边形
     才会真正共用一条边，拼成蜂窝。 */
  function drawBase() {
    ctx.save();
    /* 只清成透明：星云与星空由下层的 .hex-bg__sky / .hex-bg__stars 提供，
       这里铺满不透明底色会把它们完全盖住。 */
    ctx.clearRect(0, 0, vw, vh);
    ctx.strokeStyle = CFG.BASE_STROKE;
    ctx.lineWidth = CFG.STROKE;

    var off = gridOffset();
    var n0 = Math.floor((0 - off) / W) - 2;
    var n1 = Math.ceil((vw - off) / W) + 2;
    var r0 = Math.floor((0 - CFG.R) / H);
    var r1 = Math.ceil((vh + CFG.R) / H);

    ctx.beginPath();
    for (var r = r0; r <= r1; r++) {
      var y = r * H;
      var shift = (r & 1) ? W / 2 : 0;
      for (var q = n0; q <= n1; q++) {
        var x = q * W + shift + off;
        for (var i = 0, px = 0, py = 0, sx = 0, sy = 0; i < 6; i++) {
          var a = (Math.PI / 180) * (60 * i - 90);
          px = x + CFG.R * Math.cos(a);
          py = y + CFG.R * Math.sin(a);
          if (i === 0) { sx = px; sy = py; ctx.moveTo(px, py); }
          else { ctx.lineTo(px, py); }
        }
        ctx.lineTo(sx, sy);
      }
    }
    ctx.stroke();

    /* 六边形中心的小点：一点静态结构感，但不会与星图内容争视觉 */
    if (CFG.GRID_DOT > 0) {
      var rr = Math.max(0.9, CFG.STROKE * 0.9) * (CFG.R / 30) * 1.15;
      var al = Math.min(1, CFG.GRID_DOT);
      ctx.beginPath();
      for (var r2 = r0; r2 <= r1; r2++) {
        var y2 = r2 * H;
        var sh2 = (r2 & 1) ? W / 2 : 0;
        for (var q2 = n0; q2 <= n1; q2++) {
          var x2 = q2 * W + sh2 + off;
          ctx.moveTo(x2 + rr, y2);
          ctx.arc(x2, y2, rr, 0, Math.PI * 2);
        }
      }
      ctx.fillStyle = 'rgba(192,192,192,' + (al * 0.5) + ')';
      ctx.fill();
      /* 一点点金色，呼应整个站点的配色 */
      ctx.beginPath();
      for (var r3 = r0; r3 <= r1; r3++) {
        var y3 = r3 * H;
        var sh3 = (r3 & 1) ? W / 2 : 0;
        for (var q3 = n0; q3 <= n1; q3++) {
          var x3 = q3 * W + sh3 + off;
          ctx.moveTo(x3 + rr * 0.45, y3);
          ctx.arc(x3, y3, rr * 0.45, 0, Math.PI * 2);
        }
      }
      ctx.fillStyle = 'rgba(255,215,0,' + (al * 0.34) + ')';
      ctx.fill();
    }
    ctx.restore();
  }

  /* ============ 星云底色 + 缓慢移动的极光 ============ */
  function drawSky() {
    sctx.save();
    sctx.clearRect(0, 0, vw, vh);

    /* 底色：深蓝紫，与 #0c0c0c 的网格自然衔接 */
    var g = sctx.createLinearGradient(0, 0, 0, vh);
    g.addColorStop(0, '#0a0a14');
    g.addColorStop(0.55, '#0c0c12');
    g.addColorStop(1, '#0b0a10');
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, vw, vh);

    if (CFG.AURORA > 0) {
      /* 两团缓慢漂移的极光；位置随鼠标轻微视差 */
      var px = (cur.x - vw / 2) * CFG.SKY_PARALLAX;
      var py = (cur.y - vh / 2) * CFG.SKY_PARALLAX;
      var t = skyPhase;
      var blobs = [
        { x: vw * 0.26 + Math.sin(t * 0.13) * vw * 0.06, y: vh * 0.3 + Math.cos(t * 0.11) * vh * 0.05,
          r: Math.max(vw, vh) * 0.5, c: [58, 48, 114], a: 0.30 },
        { x: vw * 0.76 + Math.cos(t * 0.09) * vw * 0.05, y: vh * 0.68 + Math.sin(t * 0.12) * vh * 0.06,
          r: Math.max(vw, vh) * 0.42, c: [32, 44, 96], a: 0.24 }
      ];
      for (var i = 0; i < blobs.length; i++) {
        var b = blobs[i];
        var bg = sctx.createRadialGradient(b.x + px, b.y + py, 0, b.x + px, b.y + py, b.r);
        bg.addColorStop(0, 'rgba(' + b.c[0] + ',' + b.c[1] + ',' + b.c[2] + ',' + (b.a * CFG.AURORA * 2) + ')');
        bg.addColorStop(1, 'rgba(' + b.c[0] + ',' + b.c[1] + ',' + b.c[2] + ',0)');
        sctx.fillStyle = bg;
        sctx.beginPath();
        sctx.arc(b.x + px, b.y + py, b.r, 0, Math.PI * 2);
        sctx.fill();
      }
    }
    sctx.restore();
  }

  /* ============ 星空 ============ */
  function buildStars() {
    var want = Math.max(40, Math.round(vw * vh * CFG.STAR_DENSITY));
    while (stars.length > want) stars.pop();
    while (stars.length < want) stars.push(newStar());
    /* 按亮度分 3 档，绘制时每档一次 path */
    buckets = [[], [], []];
    for (var i = 0; i < stars.length; i++) {
      buckets[Math.min(2, Math.floor(stars[i].bright * 3))].push(stars[i]);
    }
  }

  function newStar() {
    var r = Math.random();
    return {
      x: Math.random() * vw,
      y: Math.random() * vh,
      rad: 0.4 + r * r * 1.5,             // 多数是小星点
      bright: 0.22 + Math.random() * 0.78,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5,
      warm: Math.random() < 0.3           // 部分星星偏金
    };
  }

  function drawStars() {
    tctx.save();
    tctx.clearRect(0, 0, vw, vh);
    var amp = reduced ? 0 : CFG.STAR_TWINKLE;
    for (var b = 0; b < 3; b++) {
      var arr = buckets[b];
      if (!arr || !arr.length) continue;
      var big = b === 2;
      tctx.beginPath();
      for (var i = 0; i < arr.length; i++) {
        var s = arr[i];
        /* 闪烁只改半径，颜色统一；再用每颗星的相位错开 */
        var tw = 1 + amp * Math.sin(starPhase * s.speed + s.phase);
        var rad = s.rad * tw;
        if (rad < 0.15) continue;
        tctx.moveTo(s.x + rad, s.y);
        tctx.arc(s.x, s.y, rad, 0, Math.PI * 2);
      }
      tctx.fillStyle = big ? 'rgba(226,214,255,0.95)' : 'rgba(200,204,224,0.75)';
      tctx.fill();
    }
    /* 少量偏金的亮星 */
    tctx.beginPath();
    var n = 0;
    for (var j = 0; j < stars.length; j++) {
      var q = stars[j];
      if (!q.warm || q.bright < 0.7) continue;
      var tw2 = 1 + amp * Math.sin(starPhase * q.speed + q.phase);
      var r2 = q.rad * 1.35 * tw2;
      if (r2 < 0.2) continue;
      tctx.moveTo(q.x + r2, q.y);
      tctx.arc(q.x, q.y, r2, 0, Math.PI * 2);
      n++;
    }
    if (n) {
      tctx.fillStyle = 'rgba(255,215,0,0.55)';
      tctx.fill();
    }
    tctx.restore();
  }

  /* 六个相邻方向在屏幕上的偏移，按「到邻居中心的方位角」排列：
     0°、60°、120°、180°、240°、300°，对应的边序号依次为 1、2、3、4、5、0。
     用像素偏移（而不是轴向 (dq,dr)）来定位邻居：本晶格奇数行会整体平移半格，
     轴向偏移的符号随行奇偶改变，直接写死很容易出错。 */
  var NDPOS = [[1, 0, 1], [0.5, 1, 2], [-0.5, 1, 3],
               [-1, 0, 4], [-0.5, -1, 5], [0.5, -1, 0]];

  /* 六边形中心固定，只描指定的那一条边（顶点 i -> 顶点 i+1） */
  function strokeEdge(c, x, y, i) {
    var a0 = (Math.PI / 180) * (60 * i - 90);
    var a1 = (Math.PI / 180) * (60 * (i + 1) - 90);
    c.beginPath();
    c.moveTo(x + CFG.R * Math.cos(a0), y + CFG.R * Math.sin(a0));
    c.lineTo(x + CFG.R * Math.cos(a1), y + CFG.R * Math.sin(a1));
    c.stroke();
  }

  function cellKey(r, x) {
    return r + ':' + Math.round(x);
  }

  /* 激活区的六边形描边。
     每条公共边只描一次：相邻两格都描会让这条边叠加成两倍粗。
     方位角 0°/120°/240° 由本格负责，其余由对面那格负责；
     邻居不在本次范围内时这条边没人画，本格补上。 */
  function strokeActive(list) {
    var present = {};
    var i, k;
    for (i = 0; i < list.length; i++) present[cellKey(list[i].r, list[i].x)] = true;
    fctx.lineWidth = CFG.STROKE;
    for (i = 0; i < list.length; i++) {
      var c = list[i];
      fctx.strokeStyle = rgb(mix(ACTIVE, BASE, 1 - c.f), 1);
      for (k = 0; k < 6; k++) {
        var nx = c.x + NDPOS[k][0] * W;
        var ny = c.y + NDPOS[k][1] * H;
        var here = present[cellKey(c.r + NDPOS[k][1], nx)];
        if (!here || k % 2 === 0) strokeEdge(fctx, c.x, c.y, NDPOS[k][2]);
      }
    }
  }

  /* 收集激活区内的六边形。
     范围与衰减范围严格一致（都是 RADIUS）：衰减值在 RADIUS 处恰好归零，
     所以圆边界上的颜色与背景完全相同，不会留下可见的接缝。 */
  function cells() {
    var out = [];
    var off = gridOffset();
    var cull = CFG.RADIUS;
    var q0 = Math.floor((cur.x - off) / W);
    var r0 = Math.round(cur.y / H);
    var lim = Math.ceil(cull / W) + 1;
    var rlim = Math.ceil(cull / H) + 1;
    for (var dr = -rlim; dr <= rlim; dr++) {
      var r = r0 + dr;
      var shift = (r & 1) ? W / 2 : 0;
      var y = r * H;
      for (var dq = -lim; dq <= lim; dq++) {
        var q = q0 + dq;
        var x = q * W + shift + off;
        var d = Math.hypot(x - cur.x, y - cur.y);
        if (d <= cull) out.push({ x: x, y: y, d: d, q: q, r: r });
      }
    }
    return out;
  }

  function mix(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }
  function rgb(c, a) {
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }

  var BASE = [0xc0, 0xc0, 0xc0];
  var ACTIVE = [0x3a, 0x30, 0x72];

  /* 衰减：内圈（0 ~ FALLOFF_START）恒为 1，之后平滑单调衰减，
     并在半径 RADIUS 处**恰好**归零。这样圆边界上的衰减值为 0，
     与背景完全一致，不会出现可见的接缝。 */
  function falloff(d) {
    var r0 = CFG.RADIUS * CFG.FALLOFF_START;
    if (d <= r0) return 1;
    if (d >= CFG.RADIUS) return 0;
    var t = (d - r0) / (CFG.RADIUS - r0);
    var s = 1 - t * t * (3 - 2 * t);   // smoothstep
    return Math.pow(s, CFG.FALLOFF_POW);
  }

  /* 调试用：返回当前激活区内的六边形列表 */
  function debugCells() {
    return cells().map(function (c) {
      return { x: Math.round(c.x), y: Math.round(c.y), d: Math.round(c.d) };
    });
  }

  function draw() {
    fctx.clearRect(0, 0, vw, vh);
    if (!CFG.INTERACTIVE) return;
    var list = cells();
    if (!list.length) return;

    var i, j, c;

    /* 先算好每个六边形的衰减值 */
    for (i = 0; i < list.length; i++) list[i].f = falloff(list[i].d);

    /* --- 1. 激活区底部的柔光（在描边下面，给整个区域一层微光） --- */
    if (CFG.AURA > 0) {
      var aura = fctx.createRadialGradient(cur.x, cur.y, 0, cur.x, cur.y, CFG.RADIUS);
      aura.addColorStop(0, 'rgba(86,72,158,' + (0.16 * CFG.AURA) + ')');
      aura.addColorStop(0.5, 'rgba(58,48,114,' + (0.10 * CFG.AURA) + ')');
      aura.addColorStop(1, 'rgba(58,48,114,0)');
      fctx.fillStyle = aura;
      fctx.beginPath();
      fctx.arc(cur.x, cur.y, CFG.RADIUS, 0, Math.PI * 2);
      fctx.fill();
    }

    /* --- 1b. 移动时掠过的一道浅光（朝鼠标运动方向的极窄扇形） --- */
    if (CFG.RAY > 0 && pointer.on && (rayPower > 0.01)) {
      fctx.save();
      fctx.translate(cur.x, cur.y);
      fctx.rotate(Math.atan2(rayDy, rayDx));
      var rg = fctx.createLinearGradient(0, 0, CFG.RADIUS, 0);
      rg.addColorStop(0, 'rgba(255,240,190,' + (0.16 * CFG.RAY * rayPower) + ')');
      rg.addColorStop(0.45, 'rgba(255,215,0,' + (0.07 * CFG.RAY * rayPower) + ')');
      rg.addColorStop(1, 'rgba(255,215,0,0)');
      fctx.fillStyle = rg;
      fctx.beginPath();
      fctx.moveTo(0, 0);
      fctx.arc(0, 0, CFG.RADIUS, -0.16, 0.16);
      fctx.closePath();
      fctx.fill();
      fctx.restore();
    }

    /* --- 2. 六边形描边：颜色由 #3a3072 连续过渡到背景的 #c0c0c0 --- */
    strokeActive(list);

    /* --- 2b. 边界一圈会呼吸的细金环 --- */
    if (CFG.RING > 0) {
      var pulse = 0.6 + 0.4 * Math.sin(starPhase * 0.9);
      var rr = CFG.RADIUS * (0.985 + 0.012 * Math.sin(starPhase * 0.9));
      fctx.beginPath();
      fctx.arc(cur.x, cur.y, rr, 0, Math.PI * 2);
      fctx.lineWidth = CFG.STROKE * 0.9;
      fctx.strokeStyle = 'rgba(255,215,0,' + (0.22 * CFG.RING * pulse) + ')';
      fctx.stroke();
    }

    /* --- 2c. 点击扩散的金色波纹 --- */
    for (i = bursts.length - 1; i >= 0; i--) {
      var bu = bursts[i];
      var k = (starPhase - bu.t0) / bu.life;
      if (k >= 1) { bursts.splice(i, 1); continue; }
      if (k < 0) continue;
      var ease = 1 - Math.pow(1 - k, 3);
      fctx.beginPath();
      fctx.arc(bu.x, bu.y, CFG.RADIUS * 0.15 + ease * CFG.RADIUS * 0.95, 0, Math.PI * 2);
      fctx.lineWidth = CFG.STROKE * 2 * (1 - k);
      fctx.strokeStyle = 'rgba(255,215,0,' + (0.5 * (1 - k) * (1 - k)) + ')';
      fctx.stroke();
    }

    /* --- 3. 六边形中心的金色圆点（半径 = 1.5 倍描边，随距离缩小并淡出） --- */
    for (i = 0; i < list.length; i++) {
      c = list[i];
      if (c.f <= 0.004) continue;
      var rad = DOT_R * (0.35 + 0.65 * c.f);
      fctx.beginPath();
      fctx.arc(c.x, c.y, rad, 0, Math.PI * 2);
      fctx.fillStyle = rgb([0xff, 0xd7, 0x00], c.f);
      fctx.fill();
    }

    /* --- 4. 相邻圆点之间的连线（线宽 = 描边粗细，越远越透明） --- */
    var index = {};
    for (i = 0; i < list.length; i++) index[cellKey(list[i].r, list[i].x)] = list[i];
    fctx.lineWidth = CFG.STROKE;
    for (i = 0; i < list.length; i++) {
      c = list[i];
      for (j = 0; j < 6; j++) {
        var nb = index[cellKey(c.r + NDPOS[j][1], c.x + NDPOS[j][0] * W)];
        if (!nb) continue;
        /* 每条连线只画一次：只保留方位角 0/60/120 的三个方向 */
        if (j > 2) continue;
        var fm = Math.min(c.f, nb.f);
        if (fm <= 0.004) continue;
        fctx.beginPath();
        fctx.moveTo(c.x, c.y);
        fctx.lineTo(nb.x, nb.y);
        fctx.strokeStyle = rgb([0xff, 0xd7, 0x00], fm * 0.72);
        fctx.stroke();
      }
    }
  }

  function ease() {
    animating = false;
    var dx = pointer.x - cur.x;
    var dy = pointer.y - cur.y;
    if (reduced) {
      cur.x = pointer.x;
      cur.y = pointer.y;
      draw();
      return;
    }
    if (Math.abs(dx) < 0.35 && Math.abs(dy) < 0.35) {
      cur.x = pointer.x;
      cur.y = pointer.y;
      draw();
      return;
    }
    cur.x += dx * CFG.SMOOTH;
    cur.y += dy * CFG.SMOOTH;
    draw();
    animating = true;
    requestAnimationFrame(ease);
  }

  function onMove(e) {
    if (!CFG.INTERACTIVE) return;
    var nx = e.clientX, ny = e.clientY;
    if (pointer.on) {
      rayDx = nx - pointer.x;
      rayDy = ny - pointer.y;
      var len = Math.hypot(rayDx, rayDy);
      if (len > 0.6) {
        rayDx /= len;
        rayDy /= len;
        rayPower = Math.min(1, rayPower + len / 90);   // 移动越快越亮
      }
    }
    pointer.x = nx;
    pointer.y = ny;
    if (!pointer.on) {
      pointer.on = true;
      cur.x = pointer.x;
      cur.y = pointer.y;
      draw();
      return;
    }
    if (!animating) {
      animating = true;
      requestAnimationFrame(ease);
    }
  }

  /* 点击：在原处留一圈金色波纹 */
  function onDown(e) {
    if (!CFG.INTERACTIVE || !CFG.CLICK_BURST) return;
    bursts.push({ x: e.clientX, y: e.clientY, t0: starPhase, life: 1.1 });
    if (bursts.length > 4) bursts.shift();
    ensureAnim();
  }

  var resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 80);
  }

  /* 后台动画：极光漂移 + 星空闪烁。
     · 只有「确实会变化」的层才重绘；某一层不重绘就不会带动它重新合成
     · 两者都不需要动时（或 ANIM_FPS <= 0）完全不起循环，背景变成纯静态，
       在本身已有逐帧动画的页面（如星图）上几乎不占用开销
     · 全屏画布重绘会带动整棵 .hex-bg 子树重新合成，ANIM_FPS 越低越省 */
  var rafId = 0, lastTick = 0;
  var SKY_MOVES = CFG.AURORA > 0 && CFG.ANIM_FPS > 0;
  var STARS_TWINKLE = CFG.STAR_TWINKLE > 0 && CFG.ANIM_FPS > 0;
  var ANIMATED = SKY_MOVES || STARS_TWINKLE;
  var minInterval = 1000 / Math.max(1, CFG.ANIM_FPS);

  function ensureAnim() {
    if (!rafId && (ANIMATED || bursts.length)) rafId = requestAnimationFrame(tick);
  }

  function tick(now) {
    rafId = 0;
    if (!lastTick || now - lastTick >= minInterval) {
      var dt = lastTick ? Math.min(0.2, (now - lastTick) / 1000) : 1 / CFG.ANIM_FPS;
      lastTick = now;
      if (SKY_MOVES) { skyPhase += dt; drawSky(); }
      if (STARS_TWINKLE) { starPhase += dt; drawStars(); }
      if (rayPower > 0) rayPower = Math.max(0, rayPower - dt * 1.8);
      if (bursts.length || rayPower > 0.01) draw();
    }
    if (!reduced && (ANIMATED || bursts.length)) ensureAnim();
  }

  /* ============ 供页面调用的坐标网格接口 ============
     网格与内容共用同一套缩放/平移，所以两者相对位置始终对齐。
     缩放请用 zoomIn / zoomOut / reset（带缓动）；setView 供需要直接指定的场合使用。 */
  function setCoordView(z, panX, panY) {
    zoomStop();
    if (z != null) coordZoom = Math.min(CFG.ZOOM_MAX, Math.max(CFG.ZOOM_MIN, z));
    if (panX != null) coordPanX = panX;
    if (panY != null) coordPanY = panY;
    refreshCoordCell();
    notifyView();
  }

  /* 回到默认：比例尺缓动回去，位置立即归零 */
  function resetView() {
    if (zoomTween.raf) cancelAnimationFrame(zoomTween.raf);
    zoomTween.raf = 0;
    zoomTween.last = 0;
    coordPanX = 0;
    coordPanY = 0;
    zoomTo(CFG.ZOOM_DEFAULT);
    if (!zoomTween.raf && Math.abs(coordZoom - CFG.ZOOM_DEFAULT) < 1e-9) notifyView();
  }

  /* 归一化坐标 -> 已对齐格点的像素位置（相对视口左上角） */
  function snapPos(u, v) {
    return coordSnapZoomPx(u == null ? 0 : u, v == null ? 0 : v);
  }

  function init() {
    /* 关闭无 JS 降级样式，改由画布绘制 */
    document.documentElement.classList.remove('no-js');
    document.body.insertBefore(layer, document.body.firstChild);
    resize();
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('blur', function () { pointer.on = false; });
    window.SSSHex = { cfg: CFG, redraw: resize, center: cur, cells: debugCells };
    if (CFG.GRID_STYLE === 'coord' && CFG.SNAP) {
      window.SSS_COORD = {
        /* 当前实际格距（含缩放与限幅） */
        cell: function () { return coordCellPx || coordCellBase(); },
        base: coordCellBase,
        w: function () { return vw; },
        h: function () { return vh; },
        n: function () { return CFG.COORD_N; },
        zoom: function () { return coordZoom; },
        pan: function () { return [coordPanX, coordPanY]; },
        limits: function () {
          return { min: CFG.ZOOM_MIN, max: CFG.ZOOM_MAX, def: CFG.ZOOM_DEFAULT };
        },
        /* 归一化 -> 像素：pos 不吸附，snap 先吸附再缩放平移 */
        pos: coordPosPx,
        snap: coordSnapZoomPx,
        setView: setCoordView,
        /* 按钮用的平滑缩放；zoomTarget 是动画终点，便于连续点击累积 */
        zoomIn: function (f) { zoomByStep(f || CFG.ZOOM_STEP); },
        zoomOut: function (f) { zoomByStep(1 / (f || CFG.ZOOM_STEP)); },
        zoomTarget: function () { return zoomTween.target; },
        zoomAnimating: zoomAnimating,
        panBy: function (dx, dy) { setCoordView(null, coordPanX + dx, coordPanY + dy); },
        reset: resetView,
        canZoomIn: function () { return zoomTween.target < CFG.ZOOM_MAX - 1e-6; },
        canZoomOut: function () { return zoomTween.target > CFG.ZOOM_MIN + 1e-6; }
      };
      /* 默认视图：既不是最大也不是最小 */
      resetView();
    }
    ensureAnim();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
