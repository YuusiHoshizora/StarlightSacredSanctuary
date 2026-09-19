/**
 * 星图·星光圣域
 * 星图渲染 + 右侧信息交互
 *
 * 依赖：starmap-data.js（提供 STARMAP_DATA）
 */

// ── 依赖检查 ──
if (typeof STARMAP_DATA === 'undefined') {
  console.error(
    'starmap.js: 缺少星系数据。请确保先加载 starmap-data.js'
  );
}

// ── DOM 引用 ──
const canvas = document.getElementById("starmap-canvas");
const ctx = canvas.getContext("2d");
const infoContainer = document.getElementById("system-info");

let selectedId = null;
let hoveredId = null;
let fadeTimer = null;

// ── 过渡动画参数 ──
const ANIM_SPEED = 0.05;   // 每帧插值步长（越大越快）

// 为每个星系创建动画状态（初始默认态：半透明 #C0C0C0）
const animState = {};
STARMAP_DATA.forEach(sys => {
  animState[sys.id] = {
    glowAlpha: 0,          // 光晕不透明度
    glowR: 192, glowG: 192, glowB: 192, // 默认冷灰 (#C0C0C0)
    dotBrightness: 0.5,       // 星点透明度（0.5半透明）
    nameBrightness: 0,        // 名称透明度（0=完全透明）
  };
});

let animFrameId = null;

// ── 获取目标状态 ──
function getTargetState(sysId) {
  if (selectedId === sysId) {
    // 选中态：金色光晕 + 不透明金色星点
    return {
      glowAlpha: 0.35,
      glowR: 255, glowG: 215, glowB: 0,  // #DDA520
      dotBrightness: 1.0,        // 完全不透明
      nameBrightness: 1,
    };
  } else if (hoveredId === sysId) {
    // 悬停态：柔和金色光晕 + 较高透明度
    return {
      glowAlpha: 0.15,
      glowR: 255, glowG: 215, glowB: 0,
      dotBrightness: 0.8,        // 较明显
      nameBrightness: 0.85,
    };
  } else {
    // 默认态：极淡灰色光晕、半透明星点
    return {
      glowAlpha: 0.05,
      glowR: 192, glowG: 192, glowB: 192,
      dotBrightness: 0.5,
      nameBrightness: 0,
    };
  }
}

// ── 更新动画状态（插值） ──
function updateAnimState() {
  let needsUpdate = false;
  STARMAP_DATA.forEach(sys => {
    const s = animState[sys.id];
    const target = getTargetState(sys.id);

    const lerp = (a, b) => a + (b - a) * ANIM_SPEED;
    const nearEnough = (a, b) => Math.abs(a - b) < 0.001;

    function updateField(name, targetVal) {
      if (!nearEnough(s[name], targetVal)) {
        s[name] = lerp(s[name], targetVal);
        needsUpdate = true;
      } else {
        s[name] = targetVal;
      }
    }

    updateField('glowAlpha', target.glowAlpha);
    updateField('glowR', target.glowR);
    updateField('glowG', target.glowG);
    updateField('glowB', target.glowB);
    updateField('dotBrightness', target.dotBrightness);
    updateField('nameBrightness', target.nameBrightness);
  });

  if (needsUpdate) {
    drawStarMap();
    animFrameId = requestAnimationFrame(updateAnimState);
  } else {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }
}

// ── 触发动画 ──
function startAnimation() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
  }
  animFrameId = requestAnimationFrame(updateAnimState);
}

// ── 画布尺寸管理 ──
// 画布是 position:absolute 铺满 .starmap-layout 的，所以按外层布局盒子定尺寸，
// 而不是按 .starmap-left（它现在只用于承载右侧信息栏，宽度已经不代表画布）。
function resizeCanvas() {
  const host = canvas.parentElement.parentElement || canvas.parentElement;
  const rect = host.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}
// ── 画布坐标 → 逻辑坐标 ──
function getCanvasScale() {
  const rect = canvas.getBoundingClientRect();
  return { w: rect.width, h: rect.height };
}

// ── 星系坐标 → 画布像素 ──
// starmap-data.js 里的 x / y 就是「小格」坐标（原点 = 维斯佩拉 = (0, 0)），
// 位置交给背景的同一个变换函数算：小格坐标 * 格距 + 原点屏幕位置。
// 所以任何比例尺下星系都精确落在小坐标格点上（实测偏差 0），
// 而且相对位置永远固定，不会随窗口宽高比漂移。
// 星系只保证在小坐标上是整数格，在中/大坐标上不一定落在交点上（与坐标纸用法一致）。
// canvas 左上角与视口左上角重合（画布铺满内容区），所以视口像素即画布像素。
function systemPixel(sys, w, h) {
  const C = window.SSS_COORD;
  if (C) {
    const p = C.snap(sys.x, sys.y);   // 与网格同一套原点 / 缩放 / 吸附
    return { px: p[0], py: p[1] };
  }
  // 背景脚本没加载时的兜底：以视口中心为原点，按 40 小格高近似绘制
  const c = Math.min(w, h) / 40;
  return { px: w / 2 + sys.x * c, py: h / 2 + sys.y * c };
}

// ── 绘制星图（使用动画插值） ──
function drawStarMap() {
  const { w, h } = getCanvasScale();
  ctx.clearRect(0, 0, w, h);

  for (const sys of STARMAP_DATA) {
    const s = animState[sys.id];
    const { px, py } = systemPixel(sys, w, h);
    const isActive = (selectedId === sys.id || hoveredId === sys.id);

    // ── 光晕 ──
    const glowRadius = 16;
    const glowColor = `rgba(${Math.round(s.glowR)},${Math.round(s.glowG)},${Math.round(s.glowB)},${s.glowAlpha})`;
    const gradient = ctx.createRadialGradient(px, py, 0, px, py, glowRadius);
    gradient.addColorStop(0, glowColor);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // ── 星点 ──
    // 颜色固定：默认 #C0C0C0 (192,192,192) / 激活 #DDA520 (255, 215, 0)
    const dotR = isActive ? 255 : 192;
    const dotG = isActive ? 215 : 192;
    const dotB = isActive ? 32  : 192;
    // 透明度由 dotBrightness 控制，0→全透明，1→不透明
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${dotR},${dotG},${dotB},${s.dotBrightness})`;
    ctx.fill();

    // ── 选中时外圈（颜色为 #DDA520） ──
    if (selectedId === sys.id) {
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 215, 0,${s.glowAlpha * 1.2})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ── 名称标签 ──
    // 颜色同样固定，透明度用 nameBrightness 过渡
    const nR = isActive ? 255 : 192;
    const nG = isActive ? 215 : 192;
    const nB = isActive ? 32  : 192;
    ctx.fillStyle = `rgba(${nR},${nG},${nB},${s.nameBrightness})`;
    ctx.font = "14px 'Sarasa'";
    ctx.textAlign = "center";
    ctx.fillText(sys.name, px, py - 14);
  }
}

// ── 点击检测 ──
function getSystemAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const mx = clientX - rect.left;
  const my = clientY - rect.top;
  const { w, h } = getCanvasScale();

  for (const sys of STARMAP_DATA) {
    const { px, py } = systemPixel(sys, w, h);
    const dx = mx - px;
    const dy = my - py;
    if (dx * dx + dy * dy < 324) {
      return sys;
    }
  }
  return null;
}

// ── 更新右侧信息 ──
function renderSystemInfo(system, isInitial = false) {
  clearTimeout(fadeTimer);

  if (isInitial) {
    // ── 首次加载：直接渲染 ──
    document.querySelectorAll('.system-list-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.id === system?.id);
    });

    if (!system) {
      infoContainer.innerHTML = `
        <div class="empty-info">
          <p>当前星图系统运行异常</p>
          <p>无法访问星图系统主数据库</p>
          <p>部分星系信息可能缺失</p>
        </div>
      `;
    } else {
      infoContainer.innerHTML = `
        <div id="system-info-body">
          <h2 class="system-name">${system.name}</h2>
          <p class="system-name-en">${system.nameEn}</p>
          <div class="system-info-divider"></div>
          <p class="system-description">${system.description}</p>
        </div>
        <br>
        <div class="system-info-details">
          <div class="system-info-grid">
            <div class="info-item">
              <div class="label">恒星数量</div>
              <div class="value">${system.starCount}</div>
            </div>
            <div class="info-item">
              <div class="label">行星数量</div>
              <div class="value">${system.planets}</div>
            </div>
            <div class="info-item">
              <div class="label">恒星类型</div>
              <div class="value">${system.starType}</div>
            </div>
            <div class="info-item">
              <div class="label">开发程度</div>
              <div class="value">${system.developmentLevel}</div>
            </div>
          </div>
        </div>
      `;
    }
    infoContainer.style.opacity = '1';
    return;
  }

  // ── 非首次 ──
  const body = document.getElementById('system-info-body');

  if (!system) {
    // 场景1：选中 → 未选中（整体淡出淡入）
    if (!body) return; // 已经是空状态，跳过

    infoContainer.style.opacity = '0';
    fadeTimer = setTimeout(() => {
      document.querySelectorAll('.system-list-btn').forEach((btn) => {
        btn.classList.remove('active');
      });
      infoContainer.innerHTML = `
        <div class="empty-info">
          <p>当前星图系统运行异常</p>
          <p>无法访问星图系统主数据库</p>
          <p>部分星系信息可能缺失</p>
        </div>
      `;
      infoContainer.style.opacity = '1';
    }, 100);
    return;
  }

  if (!body) {
    // 场景2：未选中 → 选中（整体淡出淡入）
    infoContainer.style.opacity = '0';
    fadeTimer = setTimeout(() => {
      document.querySelectorAll('.system-list-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.id === system.id);
      });
      infoContainer.innerHTML = `
        <div id="system-info-body">
          <h2 class="system-name">${system.name}</h2>
          <p class="system-name-en">${system.nameEn}</p>
          <div class="system-info-divider"></div>
          <p class="system-description">${system.description}</p>
        </div>
        <br>
        <div class="system-info-details">
          <div class="system-info-grid">
            <div class="info-item">
              <div class="label">恒星数量</div>
              <div class="value">${system.starCount}</div>
            </div>
            <div class="info-item">
              <div class="label">行星数量</div>
              <div class="value">${system.planets}</div>
            </div>
            <div class="info-item">
              <div class="label">恒星类型</div>
              <div class="value">${system.starType}</div>
            </div>
            <div class="info-item">
              <div class="label">开发程度</div>
              <div class="value">${system.developmentLevel}</div>
            </div>
          </div>
        </div>
      `;
      infoContainer.style.opacity = '1';
    }, 250);
    return;
  }

  // 场景3：选中A → 选中B（文字级 fading，保持原有行为）
  document.querySelectorAll('.system-list-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.id === system.id);
  });

  const name = body.querySelector('.system-name');
  const nameEn = body.querySelector('.system-name-en');
  const description = body.querySelector('.system-description');
  const values = infoContainer.querySelectorAll('.info-item .value');

  name.classList.add('fading');
  nameEn.classList.add('fading');
  description.classList.add('fading');
  values.forEach(v => v.classList.add('fading'));

  fadeTimer = setTimeout(() => {
    name.textContent = system.name;
    nameEn.textContent = system.nameEn;
    description.textContent = system.description;

    const [starCount, planets, starType, developmentLevel] = values;
    starCount.textContent      = system.starCount;
    planets.textContent        = system.planets;
    starType.textContent       = system.starType;
    developmentLevel.textContent = system.developmentLevel;

    name.classList.remove('fading');
    nameEn.classList.remove('fading');
    description.classList.remove('fading');
    values.forEach(v => v.classList.remove('fading'));
  }, 200);
}


// ── 选中星系 ──
function selectSystem(system) {
  const newId = system ? system.id : null;

  // 前后都是空选中，不需要更新信息面板
  if (newId === selectedId) return;   // ← 同一星系重复点击也顺手过滤掉了

  selectedId = newId;
  renderSystemInfo(system);
  startAnimation();
}

// ── 鼠标悬停 ──
function handleMouseMove(e) {
  const sys = getSystemAt(e.clientX, e.clientY);
  const newId = sys ? sys.id : null;
  if (newId !== hoveredId) {
    hoveredId = newId;
    startAnimation();
  }
}

function handleMouseLeave() {
  if (hoveredId !== null) {
    hoveredId = null;
    startAnimation();
  }
}

canvas.addEventListener("mousemove", handleMouseMove);
canvas.addEventListener("mouseleave", handleMouseLeave);
canvas.addEventListener("click", (e) => {
  // 拖动过画布时不触发选中
  if (dragMoved) { dragMoved = false; return; }
  const sys = getSystemAt(e.clientX, e.clientY);
  selectSystem(sys);
});

window.addEventListener("resize", () => {
  resizeCanvas();
  drawStarMap();
});

// ── 缩放与平移 ──
// 坐标纸与星系共用同一套变换，所以缩放时两者的相对位置始终对齐。
// 缩放通过左侧的比例尺滑块与放大 / 缩小 / 回到默认三个按钮操作
//（滑块即时生效、按钮带缓动，两者始终互相同步；默认比例尺既非最大也非最小）。
let dragMoved = false;
let dragFrom = null;

const zoomInBtn = document.getElementById("zoom-in");
const zoomOutBtn = document.getElementById("zoom-out");
const zoomResetBtn = document.getElementById("zoom-reset");
const zoomSlider = document.getElementById("zoom-slider");

/* ── 比例尺滑块 ──
   方向与按钮一致：滑块夹在「−」和「+」之间，
   向左拖 = 缩小（同左侧「−」），向右拖 = 放大（同右侧「+」）。
   映射分两段、各自等比（0..1 线性拖动 = 比例尺按倍数变化），
   于是「默认比例尺」永远落在滑轨正中：左半段从最小到默认，右半段从默认到最大。
   注意不能用「整条等比」，那样默认比例尺会偏左（0.25~1.45 时落在 0.39 处）；
   也不适合用线性，线性时越靠缩小端同样的拖动距离带来的视野变化越大。
   不显示数值：滑块位置本身就是当前比例尺。 */
function zoomFromSliderPos(t, min, max, def) {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped <= 0.5) {
    if (!(def > min)) return min;                        // 退化保护
    return min * Math.pow(def / min, clamped * 2);        // 0 → min，0.5 → def
  }
  if (!(max > def)) return def;
  return def * Math.pow(max / def, (clamped - 0.5) * 2);  // 0.5 → def，1 → max
}

function sliderPosFromZoom(z, min, max, def) {
  let t;
  if (z <= def) {
    t = def > min ? 0.5 * (Math.log(z / min) / Math.log(def / min)) : 0;
  } else {
    t = max > def ? 0.5 + 0.5 * (Math.log(z / def) / Math.log(max / def)) : 1;
  }
  return Math.max(0, Math.min(1, t));
}

function syncZoomSlider() {
  const C = window.SSS_COORD;
  if (!zoomSlider || !C) return;
  const { min, max, def } = C.limits();
  zoomSlider.value = String(sliderPosFromZoom(C.zoom(), min, max, def));
}

if (zoomSlider && window.SSS_COORD) {
  const { min, max, def } = window.SSS_COORD.limits();
  zoomSlider.min = "0";
  zoomSlider.max = "1";
  zoomSlider.step = "0.01";
  syncZoomSlider();

  zoomSlider.addEventListener("input", () => {
    const C = window.SSS_COORD;
    if (!C) return;
    stopWheelZoom();                       // 滑块接管视角
    const lim = C.limits();
    // 滑块用即时缩放（不走缓动），拖动才跟手
    C.setView(zoomFromSliderPos(parseFloat(zoomSlider.value), lim.min, lim.max, lim.def));
  });
}

/* 按钮按下时的金色渐变反馈：pointerdown 点亮，pointerup / 离开后再淡出 */
function bindZoomButton(btn, action) {
  if (!btn) return;
  const light = () => btn.classList.add("is-active");
  const unlight = () => btn.classList.remove("is-active");
  btn.addEventListener("pointerdown", light);
  btn.addEventListener("pointerup", unlight);
  btn.addEventListener("pointerleave", unlight);
  btn.addEventListener("pointercancel", unlight);
  btn.addEventListener("click", () => {
    light();
    clearTimeout(btn._flashTimer);
    btn._flashTimer = setTimeout(unlight, 240);
    action();
  });
}

function syncZoomUI() {
  const C = window.SSS_COORD;
  if (!C) return;
  if (zoomInBtn) zoomInBtn.disabled = !C.canZoomIn();
  if (zoomOutBtn) zoomOutBtn.disabled = !C.canZoomOut();
  /* 已经回到默认比例尺、且原点正好落在视口中心时，默认按钮置灰 */
  if (zoomResetBtn) {
    const def = C.limits().def;
    const pan = C.pan();
    const centered =
      Math.abs(pan[0] - C.w() / 2) < 0.5 && Math.abs(pan[1] - C.h() / 2) < 0.5;
    zoomResetBtn.disabled = Math.abs(C.zoom() - def) < 1e-6 && centered;
  }
  /* 滑块跟着比例尺走：缩放动画每一帧都会走到这里 */
  syncZoomSlider();
}

bindZoomButton(zoomInBtn, () => { stopWheelZoom(); if (window.SSS_COORD) window.SSS_COORD.zoomIn(); });
bindZoomButton(zoomOutBtn, () => { stopWheelZoom(); if (window.SSS_COORD) window.SSS_COORD.zoomOut(); });
bindZoomButton(zoomResetBtn, () => { stopWheelZoom(); if (window.SSS_COORD) window.SSS_COORD.reset(); });

/* ── 鼠标滚轮缩放 ──
   向上滚 = 放大、向下滚 = 缩小（与按钮方向一致），并且锚定在鼠标位置：
   指针底下的那个点在缩放过程中一直停在原地，像地图一样"指着哪儿就往哪儿放大"。
   滚轮事件是离散的（一格上百像素），直接改比例尺会一格一跳，所以这里
   每个事件只更新"目标比例尺"，再由每帧的缓动去逼近（时间常数 70ms 左右），
   鼠标滚轮与触控板都因此变成连续滑动而不是硬跳。 */
const WHEEL_SENS = 0.0016;     // 每像素滚动的缩放指数（120px 一格 ≈ 1.21×）
const WHEEL_TAU = 0.07;        // 缓动时间常数（秒）：约 3τ ≈ 0.2s 到位
const WHEEL_EPS = 0.0008;      // 比例尺收敛阈值

let wheelTarget = null;        // 目标比例尺（null = 不在滚轮缩放中）
let wheelAnchor = null;        // { x, y, gx, gy }：锚点屏幕位置 + 该处的内容坐标
let wheelRaf = 0;
let wheelLast = 0;

function normalizeWheel(e) {
  let d = e.deltaY;
  if (e.deltaMode === 1) d *= 16;                        // 以"行"为单位
  else if (e.deltaMode === 2) d *= window.innerHeight;   // 以"页"为单位
  return d;
}

/* 其它操作（按钮 / 滑块 / 拖动）接管视角时，先停掉滚轮缓动，避免两边互相拉 */
function stopWheelZoom() {
  if (wheelRaf) cancelAnimationFrame(wheelRaf);
  wheelRaf = 0;
  wheelLast = 0;
  wheelTarget = null;
  wheelAnchor = null;
}

function wheelStep(now) {
  wheelRaf = 0;
  const C = window.SSS_COORD;
  if (!C || wheelTarget == null || !wheelAnchor) return;

  const dtSec = wheelLast ? Math.min(0.05, (now - wheelLast) / 1000) : 1 / 60;
  wheelLast = now;

  const current = C.zoom();
  const diff = wheelTarget - current;
  const done = Math.abs(diff) < WHEEL_EPS;
  const next = done ? wheelTarget : current + diff * (1 - Math.exp(-dtSec / WHEEL_TAU));

  /* 锚点不动：锚点处的内容点在屏幕上保持同一像素位置，
     于是每帧只需按当前比例尺反推原点位置 */
  const unit = C.base() * next;
  C.setView(next, wheelAnchor.x - wheelAnchor.gx * unit, wheelAnchor.y - wheelAnchor.gy * unit);

  if (done) {
    wheelLast = 0;
    wheelTarget = null;
    wheelAnchor = null;
    return;
  }
  wheelRaf = requestAnimationFrame(wheelStep);
}

canvas.addEventListener("wheel", (e) => {
  const C = window.SSS_COORD;
  if (!C) return;
  /* 触控板双指捏合会带 ctrlKey：交还给浏览器做页面缩放，不抢这个手势 */
  if (e.ctrlKey) return;
  e.preventDefault();                                    // 星图区域不跟随页面滚动

  const { min, max } = C.limits();
  const from = wheelTarget == null ? C.zoom() : wheelTarget;
  wheelTarget = Math.min(max, Math.max(min, from * Math.exp(-normalizeWheel(e) * WHEEL_SENS)));

  /* 锚点按"当前实际视角"换算，所以中途移动鼠标再滚也依然锚得住 */
  const pan = C.pan();
  const unit = C.base() * C.zoom();
  wheelAnchor = {
    x: e.clientX,
    y: e.clientY,
    gx: (e.clientX - pan[0]) / unit,
    gy: (e.clientY - pan[1]) / unit
  };

  if (!wheelRaf) {
    wheelLast = 0;
    wheelRaf = requestAnimationFrame(wheelStep);
  }
}, { passive: false });

canvas.addEventListener("pointerdown", (e) => {
  if (!window.SSS_COORD) return;
  stopWheelZoom();                         // 拖动接管视角
  dragFrom = { x: e.clientX, y: e.clientY };
  dragMoved = false;
  /* 合成事件（没有真实指针）调用会抛 NotFoundError，这里容错处理 */
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch (err) { /* 忽略 */ }
});

canvas.addEventListener("pointermove", (e) => {
  const C = window.SSS_COORD;
  if (!dragFrom || !C) return;
  const dx = e.clientX - dragFrom.x;
  const dy = e.clientY - dragFrom.y;
  if (Math.abs(dx) + Math.abs(dy) < 2) return;
  dragMoved = true;
  dragFrom = { x: e.clientX, y: e.clientY };
  C.panBy(dx, dy);
  drawStarMap();
});

canvas.addEventListener("pointerup", (e) => {
  dragFrom = null;
  if (canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
    canvas.releasePointerCapture(e.pointerId);
  }
});

// 背景网格重绘后同步重画星图，并刷新按钮状态
window.SSS_ON_ZOOM = function () {
  if (canvas && canvas.width) drawStarMap();
  syncZoomUI();
};

/* ── 星系搜索 ──
   控制条最右边的搜索框：输入中文名或英文名筛选星系，
   结果列表浮在输入框上方；↑↓ 选择、Enter 跳转、Esc 清空。
   跳转 = 把该星系移到视野中心并选中（右侧信息栏随之更新）。 */
const searchInput = document.getElementById("galaxy-search");
const searchList = document.getElementById("galaxy-search-list");
let searchHits = [];
let searchCursor = -1;

function searchKey(text) {
  return String(text == null ? "" : text).trim().toLowerCase();
}

function findGalaxies(query) {
  const q = searchKey(query);
  if (!q) return [];
  return STARMAP_DATA.filter(function (sys) {
    return searchKey(sys.name).indexOf(q) >= 0 || searchKey(sys.nameEn).indexOf(q) >= 0;
  });
}

function renderSearchList() {
  if (!searchList) return;
  searchList.innerHTML = "";

  if (!searchInput.value.trim()) {          // 没输入内容就不弹列表
    searchList.hidden = true;
    return;
  }

  if (!searchHits.length) {
    const empty = document.createElement("div");
    empty.className = "map-search__empty";
    empty.textContent = "没有找到匹配的星系";
    searchList.appendChild(empty);
    searchList.hidden = false;
    return;
  }

  searchHits.forEach(function (sys, i) {
    const row = document.createElement("div");
    row.className = "map-search__item" + (i === searchCursor ? " is-active" : "");
    row.setAttribute("role", "option");
    row.dataset.index = String(i);

    const name = document.createElement("span");
    name.className = "map-search__name";
    name.textContent = sys.name || sys.id || "(未命名)";

    const en = document.createElement("span");
    en.className = "map-search__en";
    en.textContent = sys.nameEn || "";

    const pos = document.createElement("span");
    pos.className = "map-search__pos";
    pos.textContent = "坐标 (" + sys.x + ", " + sys.y + ")";

    row.appendChild(name);
    row.appendChild(en);
    row.appendChild(pos);
    row.addEventListener("mousedown", function (e) {   // mousedown：抢在 blur 之前
      e.preventDefault();
      gotoGalaxy(sys);
    });
    searchList.appendChild(row);
  });

  searchList.hidden = false;
  const active = searchList.querySelector(".is-active");
  if (active && active.scrollIntoView) active.scrollIntoView({ block: "nearest" });
}

function updateSearch() {
  searchHits = findGalaxies(searchInput.value);
  searchCursor = searchHits.length ? 0 : -1;
  renderSearchList();
}

function closeSearchList() {
  if (!searchList) return;
  searchList.hidden = true;
  searchCursor = -1;
}

function moveSearchCursor(step) {
  if (!searchHits.length) return;
  searchCursor = (searchCursor + step + searchHits.length) % searchHits.length;
  renderSearchList();
}

/* 跳到某个星系：移到视野中心 + 选中（地图高亮、右侧信息栏同步） */
function gotoGalaxy(sys) {
  const C = window.SSS_COORD;
  if (C && sys) {
    const cell = C.cell();
    C.setView(null, C.w() / 2 - Number(sys.x) * cell, C.h() / 2 - Number(sys.y) * cell);
  }
  selectSystem(sys);
  drawStarMap();
  closeSearchList();
  if (searchInput) searchInput.blur();
}

if (searchInput && searchList) {
  searchInput.addEventListener("input", updateSearch);
  searchInput.addEventListener("focus", function () {
    if (searchInput.value.trim()) updateSearch();
  });
  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); moveSearchCursor(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveSearchCursor(-1); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (searchHits.length) gotoGalaxy(searchHits[Math.max(0, searchCursor)]);
    } else if (e.key === "Escape") {
      searchInput.value = "";
      searchHits = [];
      closeSearchList();
      searchInput.blur();
    }
  });
  /* 点到别处就收起列表 */
  document.addEventListener("pointerdown", function (e) {
    if (!e.target.closest || !e.target.closest(".map-search")) closeSearchList();
  });
}

// ── 启动 ──
function init() {
  // 背景已在初始化时把视图复位到默认比例尺（既非最大也非最小）
  resizeCanvas();
  drawStarMap();
  syncZoomUI();
  renderSystemInfo(null, true);
  /* 注意：这里原先调用了 buildSystemList()，但全文件并无该函数定义，
     会让 init() 在每次加载时抛 ReferenceError（星图与右侧信息都停在初始态）。
     已移除该调用；若以后需要系统列表，请先补上函数定义。 */
  /* 调试接口：返回每个星系实际绘制到的画布像素位置 */
  window.SSS_STARMAP = {
    positions: function () {
      const size = getCanvasScale();
      return STARMAP_DATA.map(function (sys) {
        const p = systemPixel(sys, size.w, size.h);
        return { id: sys.id, px: p.px, py: p.py };
      });
    }
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}