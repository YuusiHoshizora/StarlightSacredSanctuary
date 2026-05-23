/**
 * 星图·星光圣域
 * 星系数据 + 星图渲染 + 右侧信息交互
 */

// ── 星系数据 ──
const STAR_SYSTEMS = [
  {
    id:"vespera",
    name: "维斯佩拉",
    nameEn: "Vespera",
    starCount: 3,
    planets: 12,
    starType: "B、B、K",
    developmentLevel: "完全",
    description:
      "星光圣域的名义首都所在星系，也是星光圣域舰队最常驻留的位置。目前，星光圣域已经实现了对此星系的完全开发，加上了完善的辅助设施，让维斯佩拉星系能够成为通常宇宙中极为繁华的星系之一。",
    x: 0.25,
    y: 0.35,
  },
  {
    id:"p304",
    name: "P-304脉冲星",
    nameEn: "Pulsar P-304",
    starCount: 1,
    planets: 1,
    starType: "脉冲星",
    developmentLevel: "完全",
    description:
      "星光圣域科研中心所在地。借助脉冲星的脉冲电磁信号，星光圣域能够进行对时间的精细校准和通常宇宙内的导航。",
    x: 0.26,
    y: 0.4,
  },
  {
    id: "nadiris",
    name: "纳迪里斯",
    nameEn: "Nadiris",
    starCount: 2,
    planets: 3,
    starType: "G、G",
    developmentLevel: "完全",
    description:
      "星光圣域的舰队处理星系，大多数不便移动的巨型船坞和绝大多数舰队驻地均位于此星系。同时，进入此星系需要星辰矩阵的通行证明，否则星光圣域有权直接击毁擅自进入纳迪里斯星系引力井的任何舰船。",
    x: 0.21,
    y: 0.33,
  },
  {
    id: "delta",
    name: "德尔塔",
    nameEn: "Delta",
    starCount: 1,
    planets: 12,
    starType: "主序星",
    planetType: "类地行星 · 气态巨行星 · 矮行星",
    developmentLevel: "完全",
    description:
      "庞大的行星系统，十二颗行星中有三颗处于宜居带。德尔塔是圣域人口最密集的星系，星际枢纽站「十字路口」每日吞吐数以万计的飞船。",
    x: 0.85,
    y: 0.6,
  },
  {
    id: "astralis",
    name: "阿斯特拉利斯",
    nameEn: "Astralis",
    starCount: 1,
    planets: 3,
    starType: "G",
    developmentLevel: "完全",
    description:
      "星光圣域的通信枢纽之一，在索拉克分支矩阵“阿斯特拉利斯”的辅助下，阿斯特拉利斯成为全宇宙知名的服务器集群地之一，同时也是星域网的主服务器所在星系。",
    x: 0.29,
    y: 0.32,
  },
  {
    id: "zeta",
    name: "泽塔星系",
    nameEn: "Zeta System",
    starCount: 1,
    planets: 6,
    starType: "红矮星",
    planetType: "气态巨行星 · 冰巨星",
    developmentLevel: "完全",
    description:
      "一颗低温红矮星的家园。气态巨行星「深渊」上空的永久风暴中，采集者驾驶着耐压飞行器提取稀有气体。这里也是星云观测站所在地。",
    x: 0.4,
    y: 0.15,
  },
];

// ── DOM 引用 ──
const canvas = document.getElementById("starmap-canvas");
const ctx = canvas.getContext("2d");
const infoContainer = document.getElementById("system-info");

let selectedId = null;
let hoveredId = null;

// ── 过渡动画参数 ──
const ANIM_SPEED = 0.1;   // 每帧插值步长（越大越快）

// 为每个星系创建动画状态（初始默认态：半透明 #C0C0C0）
const animState = {};
STAR_SYSTEMS.forEach(sys => {
  animState[sys.id] = {
    glowAlpha: 0.05,          // 光晕不透明度
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
  STAR_SYSTEMS.forEach(sys => {
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

  for (const sys of STAR_SYSTEMS) {
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

  for (const sys of STAR_SYSTEMS) {
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
function renderSystemInfo(system) {
  if (!system) {
    infoContainer.innerHTML = `
      <div class="empty-info">
        <p>✦</p>
        <p>选择任一星系以查看详情</p>
      </div>
    `;
    return;
  }

  document.querySelectorAll(".system-list-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.id === system.id);
  });

  infoContainer.innerHTML = `
    <h2 class="system-name">${system.name}</h2>
    <p class="system-description">${system.description}</p>
    <br>
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
  `;
}

// ── 选中星系 ──
function selectSystem(system) {
  selectedId = system ? system.id : null;
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
  renderSystemInfo(null);
  buildSystemList();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}