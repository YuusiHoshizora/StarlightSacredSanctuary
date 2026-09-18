/* =============================================================================
 * starmap-editor.js — 星图数据（assets/js/starmap-data.js）图形化编辑器
 * -----------------------------------------------------------------------------
 * 纯前端、零依赖：
 *   · 打开页面时自动读取站点的 starmap-data.js（同源 fetch），也可手动打开本地文件
 *   · 左侧列表 / 右侧表单 / 中间坐标纸上直接拖动，三处双向同步
 *   · 保存时按原文件的排版重新生成文本，可直接覆盖 starmap-data.js
 *     （Chrome / Edge 支持 File System Access API，可一键写回；其它内核下载文件）
 *
 * 坐标系与站点一致：单位是小格，原点 (0,0) = 维斯佩拉；
 * 中坐标每 5 小格、大坐标每 25 小格（与 starmap-bg.js 的配置保持一致）。
 * ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------- 常量 ------------------------------- */

  var MEDIUM_STEP = 5;         // 中坐标：每 5 个小格
  var MAJOR_STEP = 25;         // 大坐标：每 25 个小格
  var CELL_BASE = 12;          // 编辑预览里 1 小格在 zoom = 1 时的像素边长
  var ZOOM_MIN = 0.35;
  var ZOOM_MAX = 4;
  var ZOOM_STEP = 1.14;
  var DATA_URL = '../assets/js/starmap-data.js';

  /* 数据字段顺序（导出时按这个顺序写，与原文件一致） */
  var FIELDS = [
    { key: 'id', label: 'id（英文标识，需唯一）', type: 'text' },
    { key: 'name', label: '中文名', type: 'text' },
    { key: 'nameEn', label: '英文名', type: 'text' },
    { key: 'starCount', label: '恒星数量', type: 'text' },
    { key: 'planets', label: '行星数量', type: 'text' },
    { key: 'starType', label: '恒星类型', type: 'text' },
    { key: 'developmentLevel', label: '开发程度', type: 'text' },
    { key: 'description', label: '描述', type: 'textarea' }
  ];

  /* 新建星系时的默认值 */
  var BLANK = {
    id: 'new-system',
    name: '新星系',
    nameEn: 'New System',
    starCount: 1,
    planets: 0,
    starType: 'G',
    developmentLevel: '休整阶段',
    description: '（待补充）',
    x: 0,
    y: 0
  };

  /* 原文件开头的说明注释，作为默认文件头保留 */
  var DEFAULT_HEADER = [
    '/* ============================================================',
    '   星图数据',
    '   ------------------------------------------------------------',
    '   坐标单位：小格（坐标纸上最小的一格）。',
    '   坐标系：原点 (0, 0) = 维斯佩拉星系（星光圣域首都），',
    '           x 向右为正、y 向下为正，允许负数。',
    '   刻度：中坐标每 5 小格、大坐标每 25 小格（见 starmap-bg.js）。',
    '   星系都放在小格整数坐标上，所以在任何比例尺下都精确落在小坐标格点上；',
    '   在中坐标 / 大坐标上不一定落在交点，这与坐标纸的用法一致。',
    '',
    '   加新星系时直接写小格整数即可，范围没有限制（例如 x: -120, y: 260），',
    '   超出初始视野的部分拖动 / 缩小比例尺就能看到。',
    '   ============================================================ */'
  ].join('\n');

  /* ------------------------------- 状态 ------------------------------- */

  var state = {
    header: DEFAULT_HEADER,     // 文件头注释（导入时原样保留）
    eol: '\n',                  // 行尾风格（导入时跟随原文件，避免保存后整篇 diff）
    blankAfterHeader: 0,        // 文件头与 const 之间原有的空行数量（0/1）
    trailingNewline: 0,         // 文件末尾是否带换行（0/1）
    list: [],                   // 星系数组（保留原始字段类型，未改动时导出可还原）
    selected: -1,               // 当前选中的下标
    dirty: false,               // 是否有未保存的改动
    history: [],                // 撤销栈（JSON 快照）
    fileHandle: null            // File System Access API 的句柄
  };

  var view = { zoom: 1, panX: 0, panY: 0, ready: false };

  var $ = function (sel) { return document.querySelector(sel); };

  /* --------------------------- 解析 / 序列化 --------------------------- */

  /** 从 starmap-data.js 文本里取出文件头、数组与行尾风格 */
  function parseDataFile(text) {
    var m = text.match(/const\s+STARMAP_DATA\s*=\s*(\[[\s\S]*\])\s*;?/);
    if (!m) throw new Error('没找到 const STARMAP_DATA = [...]');
    var rawHead = text.slice(0, m.index);
    var header = rawHead.replace(/\r\n/g, '\n').replace(/\s+$/, '');
    /* 文件头与 const 之间原本有没有空行：保存时照原样保留，避免多出/少掉一行 */
    var blankAfterHeader = /\n[ \t]*\n[ \t]*$/.test(rawHead) ? 1 : 0;
    /* 这里用 Function 求值的是用户自己的数据文件，等价于浏览器加载它 */
    var list = new Function('return (' + m[1] + ');')();
    if (!Array.isArray(list)) throw new Error('STARMAP_DATA 不是数组');
    return {
      header: header || DEFAULT_HEADER,
      eol: text.indexOf('\r\n') >= 0 ? '\r\n' : '\n',
      blankAfterHeader: blankAfterHeader,
      trailingNewline: /[\r\n]$/.test(text) ? 1 : 0,
      list: list
    };
  }

  /** 字符串按 JSON 规则转义（双引号、与文件一致） */
  function quote(v) {
    return JSON.stringify(v == null ? '' : String(v));
  }

  /** 数字/字符串原样输出：数字不带引号，字符串保留引号（未改动的字段可原样还原） */
  function scalar(v) {
    return typeof v === 'number' && isFinite(v) ? String(v) : quote(v);
  }

  /** 按原文件排版生成 starmap-data.js 文本
      （行尾、文件头后的空行、文件末尾是否换行都跟随原文件，未改动时保存不产生 diff） */
  function serialize(header, list, eol, blankAfterHeader, trailingNewline) {
    var out = [];
    /* 文件头也逐行放入，这样行尾风格对内文同样生效 */
    String(header).replace(/\r\n/g, '\n').split('\n').forEach(function (line) { out.push(line); });
    if (blankAfterHeader) out.push('');
    out.push('const STARMAP_DATA = [');
    list.forEach(function (g) {
      out.push('  {');
      out.push('    id: ' + quote(g.id) + ',');
      out.push('    name: ' + quote(g.name) + ',');
      out.push('    nameEn: ' + quote(g.nameEn) + ',');
      out.push('    starCount: ' + scalar(g.starCount) + ',');
      out.push('    planets: ' + scalar(g.planets) + ',');
      out.push('    starType: ' + quote(g.starType) + ',');
      out.push('    developmentLevel: ' + quote(g.developmentLevel) + ',');
      out.push('    description:');
      out.push('      ' + quote(g.description) + ',');
      out.push('    x: ' + scalar(g.x) + ',');
      out.push('    y: ' + scalar(g.y) + ',');
      out.push('  },');
    });
    out.push('];');
    if (trailingNewline) out.push('');
    return out.join(eol || '\n');
  }

  /* ------------------------------ 撤销 ------------------------------ */

  function snapshot() {
    state.history.push(JSON.stringify(state.list));
    if (state.history.length > 60) state.history.shift();
  }

  function undo() {
    if (!state.history.length) { toast('没有可撤销的操作'); return; }
    state.list = JSON.parse(state.history.pop());
    if (state.selected >= state.list.length) state.selected = state.list.length - 1;
    state.dirty = true;
    renderAll();
    toast('已撤销');
  }

  /* ------------------------------ 校验 ------------------------------ */

  function validate() {
    var errors = [], warnings = [], notes = [];
    var seenId = Object.create(null);
    var seenPos = Object.create(null);
    var vespera = null;

    state.list.forEach(function (g, i) {
      var label = (g.name || g.id || ('第 ' + (i + 1) + ' 个'));
      if (!String(g.id || '').trim()) errors.push(label + '：缺少 id');
      else if (!/^[A-Za-z0-9_-]+$/.test(g.id)) warnings.push(label + '：id 含非常规字符（建议只用字母、数字、- 、_）');
      if (g.id) {
        if (seenId[g.id]) errors.push('id 重复：' + g.id);
        seenId[g.id] = true;
      }
      if (!String(g.name || '').trim()) errors.push(label + '：缺少中文名');
      if (!isFinite(Number(g.x)) || !isFinite(Number(g.y))) errors.push(label + '：坐标不是数字');
      else if (Math.round(g.x) !== Number(g.x) || Math.round(g.y) !== Number(g.y)) {
        warnings.push(label + '：坐标不是整数小格，保存后会吸附到格点');
      }
      var pos = Math.round(g.x) + ',' + Math.round(g.y);
      if (seenPos[pos]) warnings.push(label + '：与另一个星系同在小格 (' + pos + ')');
      seenPos[pos] = true;
      if (g.id === 'vespera') vespera = g;
    });

    if (vespera) {
      if (Number(vespera.x) === 0 && Number(vespera.y) === 0) notes.push('维斯佩拉位于原点 (0, 0)');
      else warnings.push('维斯佩拉不在原点 (0, 0)：星图页会以 (0, 0) 为坐标纸原点，建议把它放回原点');
    } else {
      notes.push('当前数据里没有 id 为 vespera 的星系');
    }
    notes.push('共 ' + state.list.length + ' 个星系');

    return { errors: errors, warnings: warnings, notes: notes };
  }

  /* --------------------------- 渲染：列表 --------------------------- */

  function renderList() {
    var box = $('#list');
    box.innerHTML = '';
    state.list.forEach(function (g, i) {
      var row = document.createElement('div');
      row.className = 'se-row' + (i === state.selected ? ' is-sel' : '');
      row.dataset.index = String(i);

      var dot = document.createElement('span');
      dot.className = 'se-dot' + (g.id === 'vespera' ? ' is-home' : '');
      var main = document.createElement('span');
      main.className = 'se-row-main';
      main.textContent = g.name || g.id || '(未命名)';
      var sub = document.createElement('span');
      sub.className = 'se-row-sub';
      sub.textContent = (g.id || '?') + ' · (' + g.x + ', ' + g.y + ')';

      row.appendChild(dot);
      row.appendChild(main);
      row.appendChild(sub);
      row.addEventListener('click', function () { select(i); });
      box.appendChild(row);
    });
  }

  /* --------------------------- 渲染：表单 --------------------------- */

  function renderForm() {
    var form = $('#form');
    var g = state.list[state.selected];
    var empty = $('#form-empty');
    if (!g) {
      form.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }
    form.classList.remove('hidden');
    empty.classList.add('hidden');
    FIELDS.forEach(function (f) {
      var input = form.querySelector('[data-field="' + f.key + '"]');
      if (input && document.activeElement !== input) input.value = g[f.key] == null ? '' : String(g[f.key]);
    });
    var x = form.querySelector('[data-field="x"]');
    var y = form.querySelector('[data-field="y"]');
    if (x && document.activeElement !== x) x.value = String(g.x);
    if (y && document.activeElement !== y) y.value = String(g.y);
  }

  function renderStatus() {
    var v = validate();
    var box = $('#status');
    var items = [];
    v.errors.forEach(function (t) { items.push('<li class="se-err">✕ ' + esc(t) + '</li>'); });
    v.warnings.forEach(function (t) { items.push('<li class="se-warn">! ' + esc(t) + '</li>'); });
    v.notes.forEach(function (t) { items.push('<li class="se-ok">✓ ' + esc(t) + '</li>'); });
    box.innerHTML = items.join('');
    var dirty = $('#dirty');
    dirty.textContent = state.dirty ? '有未保存的改动' : '与文件一致';
    dirty.className = state.dirty ? 'se-dirty is-on' : 'se-dirty';
    $('#count').textContent = String(state.list.length);
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderAll() {
    renderList();
    renderForm();
    renderStatus();
    drawMap();
  }

  /* --------------------------- 渲染：坐标纸 --------------------------- */

  var map = { canvas: null, ctx: null, drag: null, moved: false };

  function setupMap() {
    map.canvas = $('#map');
    map.ctx = map.canvas.getContext('2d');
    resizeMap();
    window.addEventListener('resize', resizeMap);
  }

  function resizeMap() {
    var c = map.canvas;
    if (!c) return;
    var rect = c.parentElement.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.max(1, Math.round(rect.width * dpr));
    c.height = Math.max(1, Math.round(rect.height * dpr));
    c.style.width = rect.width + 'px';
    c.style.height = rect.height + 'px';
    map.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    map.w = rect.width;
    map.h = rect.height;
    if (!view.ready) {
      view.panX = rect.width / 2;
      view.panY = rect.height / 2;
      view.ready = true;
    }
    drawMap();
  }

  function cellPx() { return CELL_BASE * view.zoom; }

  function toScreen(x, y) {
    var c = cellPx();
    return [view.panX + x * c, view.panY + y * c];
  }

  function toLattice(px, py) {
    var c = cellPx();
    return [(px - view.panX) / c, (py - view.panY) / c];
  }

  function drawMap() {
    var ctx = map.ctx;
    if (!ctx) return;
    var w = map.w, h = map.h, c = cellPx();
    ctx.clearRect(0, 0, w, h);

    var ox = view.panX, oy = view.panY;
    var kx0 = Math.floor(-ox / c), kx1 = Math.ceil((w - ox) / c);
    var ky0 = Math.floor(-oy / c), ky1 = Math.ceil((h - oy) / c);

    function lines(step, color, width) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (var k = Math.ceil(kx0 / step) * step; k <= kx1; k += step) {
        var x = Math.round(ox + k * c) + 0.5;
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
      }
      for (var j = Math.ceil(ky0 / step) * step; j <= ky1; j += step) {
        var y = Math.round(oy + j * c) + 0.5;
        ctx.moveTo(0, y); ctx.lineTo(w, y);
      }
      ctx.stroke();
    }

    /* 三级刻度：与星图页一致的递进显现 */
    if (c >= 9) lines(1, 'rgba(255,255,255,0.07)', 1);
    if (c * MEDIUM_STEP >= 26) lines(MEDIUM_STEP, 'rgba(255,255,255,0.13)', 1);
    if (c * MAJOR_STEP >= 60) lines(MAJOR_STEP, 'rgba(255,255,255,0.22)', 1.5);

    /* 坐标轴 */
    ctx.strokeStyle = 'rgba(150,150,200,0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(Math.round(ox) + 0.5, 0); ctx.lineTo(Math.round(ox) + 0.5, h);
    ctx.moveTo(0, Math.round(oy) + 0.5); ctx.lineTo(w, Math.round(oy) + 0.5);
    ctx.stroke();

    /* 星系 */
    state.list.forEach(function (g, i) {
      var p = toScreen(Number(g.x) || 0, Number(g.y) || 0);
      var sel = i === state.selected;
      var home = g.id === 'vespera';

      ctx.beginPath();
      ctx.arc(p[0], p[1], sel ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = sel ? '#ffd700' : (home ? 'rgba(255,215,0,0.75)' : 'rgba(192,192,192,0.85)');
      ctx.fill();

      if (sel || home) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], sel ? 9 : 7, 0, Math.PI * 2);
        ctx.strokeStyle = sel ? 'rgba(255,215,0,0.65)' : 'rgba(255,215,0,0.3)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.font = '12px "Sarasa", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = sel ? 'rgba(255,215,0,0.95)' : 'rgba(220,220,220,0.7)';
      ctx.fillText(g.name || g.id || '', p[0], p[1] - 10);
    });

    /* 左下角比例尺提示 */
    ctx.textAlign = 'left';
    ctx.font = '12px "Sarasa", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('1 小格 = ' + c.toFixed(1) + 'px　（中坐标 5 小格 / 大坐标 25 小格）', 12, h - 12);
  }

  /* --------------------------- 地图交互 --------------------------- */

  function hitTest(px, py) {
    var best = -1, bestD = 12 * 12;
    state.list.forEach(function (g, i) {
      var p = toScreen(Number(g.x) || 0, Number(g.y) || 0);
      var d = (p[0] - px) * (p[0] - px) + (p[1] - py) * (p[1] - py);
      if (d <= bestD) { bestD = d; best = i; }
    });
    return best;
  }

  function localPoint(e) {
    var rect = map.canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  function bindMap() {
    var c = map.canvas;

    c.addEventListener('pointerdown', function (e) {
      var p = localPoint(e);
      var hit = hitTest(p[0], p[1]);
      map.moved = false;
      if (hit >= 0) {
        select(hit);
        snapshot();
        var g = state.list[hit];
        map.drag = { index: hit, dx: (Number(g.x) || 0) - toLattice(p[0], p[1])[0], dy: (Number(g.y) || 0) - toLattice(p[0], p[1])[1] };
      } else {
        map.drag = { pan: true, x: e.clientX, y: e.clientY };
      }
      c.setPointerCapture(e.pointerId);
    });

    c.addEventListener('pointermove', function (e) {
      if (!map.drag) return;
      var p = localPoint(e);
      if (map.drag.pan) {
        view.panX += e.clientX - map.drag.x;
        view.panY += e.clientY - map.drag.y;
        map.drag.x = e.clientX;
        map.drag.y = e.clientY;
        if (Math.abs(e.clientX - map.drag.x) + Math.abs(e.clientY - map.drag.y) > 1) map.moved = true;
      } else {
        var lat = toLattice(p[0], p[1]);
        var g = state.list[map.drag.index];
        if (!g) return;
        g.x = Math.round(lat[0] + map.drag.dx);
        g.y = Math.round(lat[1] + map.drag.dy);
        map.moved = true;
        state.dirty = true;
        renderForm();
        renderList();
        renderStatus();
      }
      drawMap();
    });

    function endDrag(e) {
      if (map.drag && !map.drag.pan && map.moved) state.dirty = true;
      map.drag = null;
      if (c.hasPointerCapture && c.hasPointerCapture(e.pointerId)) c.releasePointerCapture(e.pointerId);
      renderStatus();
    }
    c.addEventListener('pointerup', endDrag);
    c.addEventListener('pointercancel', endDrag);

    c.addEventListener('dblclick', function (e) {
      var p = localPoint(e);
      if (hitTest(p[0], p[1]) >= 0) return;
      var lat = toLattice(p[0], p[1]);
      addGalaxy(Math.round(lat[0]), Math.round(lat[1]));
    });

    c.addEventListener('wheel', function (e) {
      e.preventDefault();
      var p = localPoint(e);
      var before = toLattice(p[0], p[1]);
      var next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, view.zoom * (e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP)));
      view.zoom = next;
      /* 锚定指针：先把原点按新比例尺反推回去 */
      var c2 = cellPx();
      view.panX = p[0] - before[0] * c2;
      view.panY = p[1] - before[1] * c2;
      drawMap();
    }, { passive: false });
  }

  /* --------------------------- 编辑操作 --------------------------- */

  function select(i) {
    state.selected = i;
    renderAll();
  }

  function addGalaxy(x, y) {
    snapshot();
    var g = JSON.parse(JSON.stringify(BLANK));
    var n = 1;
    var base = g.id;
    while (state.list.some(function (o) { return o.id === g.id; })) g.id = base + '-' + (++n);
    g.x = typeof x === 'number' ? x : 0;
    g.y = typeof y === 'number' ? y : 0;
    g.name = g.name + ' ' + (state.list.length + 1);
    state.list.push(g);
    state.selected = state.list.length - 1;
    state.dirty = true;
    renderAll();
    toast('已新增星系（在右侧改名字与描述）');
  }

  function removeSelected() {
    var g = state.list[state.selected];
    if (!g) { toast('先选中一个星系'); return; }
    if (!window.confirm('删除「' + (g.name || g.id) + '」？')) return;
    snapshot();
    state.list.splice(state.selected, 1);
    if (state.selected >= state.list.length) state.selected = state.list.length - 1;
    state.dirty = true;
    renderAll();
  }

  function duplicateSelected() {
    var g = state.list[state.selected];
    if (!g) { toast('先选中一个星系'); return; }
    snapshot();
    var copy = JSON.parse(JSON.stringify(g));
    copy.id = g.id + '-copy';
    var n = 1;
    while (state.list.some(function (o) { return o.id === copy.id; })) copy.id = g.id + '-copy' + (++n);
    copy.name = g.name + '（副本）';
    copy.x = Number(g.x) + 2;
    copy.y = Number(g.y) + 2;
    state.list.splice(state.selected + 1, 0, copy);
    state.selected += 1;
    state.dirty = true;
    renderAll();
  }

  function moveSelected(delta) {
    var g = state.list[state.selected];
    if (!g) return;
    var to = state.selected + delta;
    if (to < 0 || to >= state.list.length) return;
    snapshot();
    state.list.splice(to, 0, state.list.splice(state.selected, 1)[0]);
    state.selected = to;
    state.dirty = true;
    renderAll();
  }

  /* --------------------------- 表单绑定 --------------------------- */

  function bindForm() {
    var form = $('#form');
    var xInput = form.querySelector('[data-field="x"]');
    var yInput = form.querySelector('[data-field="y"]');

    form.addEventListener('input', function (e) {
      var field = e.target.dataset.field;
      var g = state.list[state.selected];
      if (!g || !field) return;
      if (field === 'x' || field === 'y') {
        var v = e.target.value.trim();
        g[field] = /^-?\d+$/.test(v) ? Number(v) : (v === '' || v === '-' ? 0 : Number(v) || 0);
      } else if (field === 'starCount' || field === 'planets') {
        /* 原来是无引号数字就继续用数字，否则保留字符串写法 */
        var wasNumber = typeof g[field] === 'number';
        var t = e.target.value.trim();
        g[field] = wasNumber && /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : t;
      } else {
        g[field] = e.target.value;
      }
      state.dirty = true;
      renderList();
      renderStatus();
      drawMap();
    });

    form.addEventListener('change', function () {
      if (state.selected >= 0) state.dirty = true;
      renderStatus();
    });
  }

  /* --------------------------- 导入 / 导出 --------------------------- */

  function loadText(text, source) {
    var parsed;
    try {
      parsed = parseDataFile(text);
    } catch (err) {
      toast('解析失败：' + err.message, true);
      return false;
    }
    state.header = parsed.header;
    state.eol = parsed.eol;
    state.blankAfterHeader = parsed.blankAfterHeader;
    state.trailingNewline = parsed.trailingNewline;
    state.list = parsed.list;
    state.selected = state.list.length ? 0 : -1;
    state.dirty = false;
    state.history = [];
    renderAll();
    toast('已载入 ' + state.list.length + ' 个星系' + (source ? '（' + source + '）' : ''));
    return true;
  }

  function currentText() {
    return serialize(state.header, state.list, state.eol, state.blankAfterHeader, state.trailingNewline);
  }

  function download() {
    var blob = new Blob([currentText()], { type: 'text/javascript;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'starmap-data.js';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    state.dirty = false;
    renderStatus();
    toast('已下载 starmap-data.js，覆盖到 assets/js/ 即可');
  }

  async function saveToFile() {
    var text = currentText();
    if (window.showSaveFilePicker) {
      try {
        if (!state.fileHandle || !state.fileHandle.createWritable) {
          state.fileHandle = await window.showSaveFilePicker({
            suggestedName: 'starmap-data.js',
            types: [{ description: 'JavaScript', accept: { 'text/javascript': ['.js'] } }]
          });
        }
        var w = await state.fileHandle.createWritable();
        await w.write(text);
        await w.close();
        state.dirty = false;
        renderStatus();
        toast('已写回 ' + state.fileHandle.name);
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        /* 其它错误（例如权限）回落到下载 */
        toast('写回失败，改为下载：' + err.message, true);
      }
    }
    download();
  }

  function openLocalFile() {
    if (window.showOpenFilePicker) {
      window.showOpenFilePicker({
        types: [{ description: 'JavaScript', accept: { 'text/javascript': ['.js'] } }],
        multiple: false
      }).then(async function (handles) {
        var h = handles[0];
        state.fileHandle = h;
        var f = await h.getFile();
        loadText(await f.text(), h.name);
      }).catch(function () { /* 用户取消 */ });
      return;
    }
    $('#file-input').click();
  }

  async function loadFromSite() {
    try {
      var res = await fetch(DATA_URL + '?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      loadText(await res.text(), '站点文件');
    } catch (err) {
      toast('读取站点数据失败（' + err.message + '），请用「打开本地文件」', true);
    }
  }

  function copyText() {
    var text = currentText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('已复制整个文件内容'); },
        function () { toast('复制失败，请用下载', true); });
    } else {
      toast('浏览器不支持剪贴板写入，请用下载', true);
    }
  }

  /* --------------------------- 小提示 --------------------------- */

  var toastTimer = 0;
  function toast(msg, isError) {
    var el = $('#toast');
    el.textContent = msg;
    el.className = 'se-toast is-show' + (isError ? ' is-error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = 'se-toast'; }, 2600);
  }

  /* --------------------------- 启动 --------------------------- */

  function boot() {
    setupMap();
    bindMap();
    bindForm();

    $('#btn-load-site').addEventListener('click', loadFromSite);
    $('#btn-open').addEventListener('click', openLocalFile);
    $('#btn-save').addEventListener('click', saveToFile);
    $('#btn-download').addEventListener('click', download);
    $('#btn-copy').addEventListener('click', copyText);
    $('#btn-add').addEventListener('click', function () { addGalaxy(0, 0); });
    $('#btn-dup').addEventListener('click', duplicateSelected);
    $('#btn-del').addEventListener('click', removeSelected);
    $('#btn-up').addEventListener('click', function () { moveSelected(-1); });
    $('#btn-down').addEventListener('click', function () { moveSelected(1); });
    $('#btn-undo').addEventListener('click', undo);
    $('#btn-fit').addEventListener('click', fitView);

    $('#file-input').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () { loadText(String(reader.result), file.name); };
      reader.readAsText(file, 'utf-8');
      e.target.value = '';
    });

    document.addEventListener('keydown', function (e) {
      var mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveToFile(); return; }
      if (e.key === 'Delete' && state.selected >= 0 && document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA') {
        removeSelected();
      }
    });

    /* 关窗前提醒未保存 */
    window.addEventListener('beforeunload', function (e) {
      if (!state.dirty) return;
      e.preventDefault();
      e.returnValue = '';
    });

    renderAll();
    loadFromSite();
  }

  /** 把所有星系缩放到视野内 */
  function fitView() {
    if (!state.list.length) return;
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    state.list.forEach(function (g) {
      minX = Math.min(minX, Number(g.x) || 0); maxX = Math.max(maxX, Number(g.x) || 0);
      minY = Math.min(minY, Number(g.y) || 0); maxY = Math.max(maxY, Number(g.y) || 0);
    });
    var pad = 6;
    var spanX = Math.max(1, maxX - minX + pad * 2);
    var spanY = Math.max(1, maxY - minY + pad * 2);
    view.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.min(map.w / (spanX * CELL_BASE), map.h / (spanY * CELL_BASE))));
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    view.panX = map.w / 2 - cx * cellPx();
    view.panY = map.h / 2 - cy * cellPx();
    drawMap();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* 供自动化测试使用的最小接口 */
  window.SE = {
    state: state,
    view: view,
    parse: parseDataFile,
    serialize: serialize,
    currentText: currentText,
    loadText: loadText,
    addGalaxy: addGalaxy,
    removeSelected: removeSelected,
    fitView: fitView,
    validate: validate
  };
})();
