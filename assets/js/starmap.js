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
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}

// ── 画布坐标 → 逻辑坐标 ──
function getCanvasScale() {
  const rect = canvas.getBoundingClientRect();
  return { w: rect.width, h: rect.height };
}

// ── 绘制星图（使用动画插值） ──
function drawStarMap() {
  const { w, h } = getCanvasScale();
  ctx.clearRect(0, 0, w, h);

  for (const sys of STARMAP_DATA) {
    const s = animState[sys.id];
    const px = sys.x * w;
    const py = sys.y * h;
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
    const px = sys.x * w;
    const py = sys.y * h;
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
  const sys = getSystemAt(e.clientX, e.clientY);
  selectSystem(sys);
});

window.addEventListener("resize", () => {
  resizeCanvas();
  drawStarMap();
});

// ── 启动 ──
function init() {
  resizeCanvas();
  drawStarMap();
  renderSystemInfo(null, true);
  buildSystemList();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}