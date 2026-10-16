# 星光圣域 · 设计语言

> 这份文件是给**别的对话**（或别的协作者）看的：读完它就该能写出与本站一致的新页面，
> 不需要再去翻一遍 CSS。**权威来源永远是代码**，本文只是导航 —— 有冲突时以
> `assets/css/global.css` 的 `:root` 与各页样式表为准。

---

## 一、定位与基调

一个**科幻世界观站点**（"星光圣域"）。视觉上要传达的是：深空、寂静、精密仪器。

- **底色**：黑（`body`）之上叠深蓝黑的星野与六边形网格，再压一层黑色渐变压暗
- **材质**：玻璃面板（半透明 + 1px 淡描边 + 背景模糊），不要实心色块
- **强调**：**只有金色**。它代表"被点亮 / 被选中 / 已完成"，**不做默认态**
- **语气**：克制。动效短、幅度小；文字用字距和留白做层次，不靠加粗和加大
- **反例**：霓虹渐变、毛玻璃彩虹、大面积高饱和色、投影糊脸 —— 都不属于这个站

---

## 二、色彩与令牌

全站控件**只用这一套**（定义在 `global.css` 的 `:root`，别再各写各的）：

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| `--ctl-bg` | `rgba(255,255,255,0.04)` | 控件默认底 |
| `--ctl-bg-strong` | `rgba(255,215,0,0.15)` | **强调态**底 |
| `--ctl-bg-focus` | `rgba(255,215,0,0.08)` | 输入框聚焦底 |
| `--ctl-border` | `rgba(255,255,255,0.12)` | 默认描边 |
| `--ctl-border-hover` | `#FFD700` | 强调态描边 |
| `--ctl-fg` | `#ffffff` | 主要文字 |
| `--ctl-fg-dim` | `rgba(255,255,255,0.5)` | 次要文字 / 图标按钮 |
| `--ctl-fg-hover` | `#FFD700` | 强调态文字 |
| `--ctl-radius` | `4px` | **按钮 / 输入框**圆角 |
| `--ctl-panel-radius` | `16px` | **面板 / 卡片**圆角 |
| `--ctl-err` | `#ff6b6b` | **仅用于失败提示 / 破坏性操作**（复用错误页那支红）|
| `--ctl-ease` | `0.25s` | ⚠️ 是**时长**，不是缓动函数（见第 11 节）|
| `--ctl-transition` | `color/bg/border` 各 `var(--ctl-ease)` | 控件的标准过渡 |

其它既有色：

- **金色 `#FFD700`** —— 唯一的强调色（上面几个令牌已覆盖绝大部分用法）
- **紫色 `rgba(58,48,114,·)`** —— 背景六边形激活区、`::selection`
- 文字层次：主 `rgba(255,255,255,0.82~0.9)`、次 `0.5`、说明 `0.35`

**规则**：不引入新颜色。要"更醒目"就把金色拿出来，要"更弱"就降不透明度。

---

## 三、字体与排版

```css
/* 正文字体（全站） */
font-family: "Sarasa Gothic SC", "Sarasa Gothic", system-ui, sans-serif;
/* 代码 / 读数：优先系统等宽栈，避免为一块读数拉下 5MB 的 Sarasa Mono */
font-family: ui-monospace, "Cascadia Mono", Consolas, "Sarasa Mono", monospace;
```

- **`font-display: block`（不是 `swap`）**：字体没到就不画字，**绝不允许字体突变**
- 中文排版：`letter-spacing: 1~2px`、`line-height: 1.8~1.9`；小字（12px）字距 2px
- 标题：`font-weight: 400`（不用粗体）、大字距、金色
- 字号梯度：34（页标题）/ 16（卡片标题）/ 15（正文）/ 13-14（控件）/ 12（说明）
- 字重只有 400 与 700（Sarasa 只装了这两档）

---

## 四、页面骨架（新页面照着做）

每一页都应包含：

1. **`<head>` 的"启动三件套"**：`boot.css` + `boot.js` + 那段决定是否显示加载屏的内联脚本
   （见 `MAINTENANCE.md` 的"七件事"，以及第 8 节）
2. **favicon**：`<link rel="icon" type="image/svg+xml" href="…/assets/img/logo_SSS.svg">`
3. **导航栏**：`<nav id="site-nav">` 六个链接 + 紧随其后的折叠按钮 + `navtoggle.js`
4. **内容容器**：必须是 `<main>` 或 `.main-layout`（跨页过渡靠它选择，见第 8 节）
5. **页脚** `.site-footer`
6. **`<html>` 初始带 `no-js`**，由脚本换成 `js`

容器宽度写法（**有坑**）：

```css
.section {
    width: 100%;              /* 必须写死：body/main 是竖排 flex 容器， */
    max-width: 760px;         /* 带 margin:auto 的 flex 项在交叉轴上不会拉伸， */
    margin: 0 auto;           /* 只写 max-width 会退化成 fit-content */
    flex: 1 1 auto;           /* 高度交给 flex，不写 100vh（会把页脚挤出视口）*/
    padding: 120px 24px 80px; /* 顶栏 72px + 呼吸 */
}
```

**导航栏是全站唯一的"常驻外壳"**：背景画布与它跨页不变，所以它带
`view-transition-name: site-navbar`，跨页过渡时它不动、只有内容在换。

---

## 五、组件约定

### 按钮 / 输入框
```css
.btn {
    min-height: 44px;                    /* 手指点得着 */
    padding: 10px 20px;
    color: var(--ctl-fg);
    background: var(--ctl-bg);
    border: 1px solid var(--ctl-border);
    border-radius: var(--ctl-radius);    /* 4px —— 全站都是这个，别改成胶囊 */
    transition: var(--ctl-transition);
}
.btn:hover, .btn:focus-visible {
    color: var(--ctl-fg-hover);
    background: var(--ctl-bg-strong);
    border-color: var(--ctl-border-hover);
}
.btn[aria-pressed="true"] { /* 选中态 = 常驻强调 */ }
```

### 面板 / 卡片
```css
.panel {
    padding: 26px 28px;
    background: rgba(20, 20, 50, 0.45);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--ctl-panel-radius);
    backdrop-filter: blur(8px);
}
```

**可点击的整块卡片**（`.archive-card` / `.fleet-card` / `.org-card` / `.org-supreme` /
`.about-card--action` …）hover 与键盘聚焦**只做「描边转金 / 阴影加深 / 文字变色」，不做位移**：
不要写 `transform: translateY(…)` 把卡片抬起来，`transition` 里也别再挂 `transform` —— 各页保持一致。
基准就是「档案」主页的 `.archive-card`（只有描边 + 阴影）。

> **唯一的例外：工具页的二级入口 `.tool-entry`。** 它是"列表条目"而不是卡片，选中态照
> **主页面左栏的分类列表**（`.left-panel nav.vertical-nav a`）—— 整块**向右挪 5px**，
> 同时左侧亮起一条 **3px 实心金色竖线**。这条线落在**卡片外面**（`::before`：`left:-8px`、
> `top/bottom:13px`，底色直接取 `--ctl-border-hover`，不做渐变）。
> 右侧箭头只把颜色转金，不再另外横向滑动。

### 正文里的链接
```css
a { text-decoration: underline;
    text-decoration-color: rgba(255, 215, 0, 0.35);
    text-underline-offset: 3~4px; }
a:hover { color: #FFD700; text-decoration-color: currentColor; }
```
⚠️ 若要**去掉**链接下划线，必须提高权重（例：`.about-card .egg-row__name`），
否则会被 `.about-card a` 盖掉 —— 也别同时再画一条 `border-bottom`，那样是**两条线**。

### 小方点（"通电 / 已完成"指示）
7px 方块、`border-radius: 1px`、`background: #FFD700` + `box-shadow: 0 0 8px rgba(255,215,0,.85)`。
加载屏的每一步、解析台信号灯、底部提示都用它。

### 开关
方角轨道（`--ctl-radius`）+ 12px 方块滑钮；开 = 金色描边 + 金块。

### 状态文字
`font-size: 12px; letter-spacing: 1~2px; color: rgba(255,255,255,0.35~0.5)`。

---

## 六、动效

- **时长**：淡入 0.35–0.5s；位移 4–8px；不要弹跳、不要旋转
- **缓动**：显式写 `ease` / `ease-out`（**不要**用 `var(--ctl-ease)`，见第 11 节）
- **文字逐条出现**：一条一条（间隔约 340ms），不要整块一起冒出来
- **`prefers-reduced-motion: reduce`**：直接给终态，不做动画
- **背景**：星野闪烁 + 六边形网格 + 鼠标附近的激活区（半径 `CFG.RADIUS = 260`），
  点击会在原地留一圈金色波纹。**星野必须用固定种子**（`background.js` 的 `starRnd`），
  否则每次刷新星空都不一样

---

## 七、可见性用 `hidden` 还是 opacity？

- 一块**出现后就不再消失**的内容（如某段演出）：用 `hidden` → `display:none`，
  这样它不占高度。⚠️ 若该元素自身写了 `display:flex`，必须补一条
  `.sel[hidden]{display:none}` 把 UA 规则救回来。
- 只是**淡入**（位置本来就要占着，或需要过渡）：用 `opacity/visibility` 类，
  例如 `.is-pending` → `.is-in`。
- 千万别用 `opacity: 0` 藏一个"还没轮到"的大块 —— 它仍然占高度，会留一大片空白。

---

## 八、加载屏与跨页过渡

**加载屏**（结构与逻辑在 `assets/js/boot.js`）满足**任一**条件才显示：

1. `?boot=1`（强制重播，调试用）
2. 没有 `sss-booted` 标记（这台浏览器没走过加载流程）
3. `!navigator.serviceWorker.controller`（不是从 SW 缓存来的：首次访问、
   **Ctrl+F5 硬刷新**、清过站点数据）
4. 有 `sss-boot-next` 标记（刚部署过新版本，`seamless.js` 在 `controllerchange` 时留下）

⚠️ 光看 `sss-booted` 是不够的：它只记"走过加载流程"，硬刷新时"标记还在"与
"资源确实没走缓存"会分叉。
⚠️ 判断字体是否就绪**只能用 `document.fonts.load()` + `document.fonts.ready`**，
`document.fonts.check()` 在缓存已热时也返回 false，不能用来做判断。

**跨页过渡**：`<head>` 里判断 referrer 是否同源 → 给 `<html>` 加 `sss-switch`
（内容先藏），`boot.js` 末尾的 IIFE 在**骨架就绪**（`DOMContentLoaded` + 一帧）时
换成 `sss-switch-in` 淡入。

⚠️ **千万不要改成"等字体就绪再揭幕"**：`sss-switch` 藏的是整块内容
（`main` / `.main-layout` / `.site-footer`），等字体等于让整页空掉 0.3–0.7 秒，
看起来就是一次黑屏。文字那边已经由 `font-display: block` 管着了。

---

## 九、本地存储键

| 键 | 含义 |
| --- | --- |
| `sss-booted` | 这台浏览器走过加载流程 |
| `sss-boot-next` | 刚部署过新版本，下次导航补弹一次加载屏 |
| `sss.eggs` | 已发现的彩蛋 id（**数组顺序 = 发现先后**）|
| `sss.eggs.off` | 入口被关闭的彩蛋 id |
| `sss.cq-dot` | （CQ 彩蛋自己的状态）首页那个点已经被扫出来过 |

彩蛋机制见 `assets/js/eggs.js`：清单里加一条 + 那个页面 `<body>` 写
`data-egg="同样的 id"` 就自动登记；也可以不写 `data-egg`、改由脚本在
"真正发现的那一刻"调 `SSS_EGGS.findWhenActive(id)` 登记（CQ 就是后者）。
**id 一旦发布不可改**（改 id = 清空所有人进度）；显示名 `name` 随时可改。

---

## 十、明确的例外

**`main/cq.html`（CQ 彩蛋页）是世界观里的"额外页面"，允许偏离上面的语言**：

- 可以有**终端日志**（`[  ok  ]` / `[ warn ]` 之类）、可以逐行打字、可以折叠
- 控件可以是**朴素的 `<a>`**（外观与正文一致，只多一条下划线与 hover 变色）
- 可以出现等宽读数、进度、信号灯

但**底色与强调色仍沿用全站那套**（深蓝黑 + 金色 + `--ctl-*`），别跳出这个站。
其余所有页面都必须守上面那些约定。

---

## 十一、反面清单（都是真踩过的）

1. **`--ctl-ease` 是时长（0.25s），不是缓动函数**。
   写 `transition: left .25s var(--ctl-ease)` 会变成"延迟 0.25s"。要缓动就显式写 `ease`。
2. **`.foo[hidden]` 会被 `.foo{display:flex}` 盖掉** —— 必须显式补 `[hidden]{display:none}`。
3. **别给链接叠两条下划线**（`text-decoration` + `border-bottom`）；去线时注意权重。
4. **别用 `opacity: 0` 藏还没轮到的大块内容**（占高度 → 大片空白）。
5. **跨页过渡不要等字体**（第 8 节）。
6. **星野必须固定种子**，否则每次刷新不一样。
7. **`sw.js` 的 `CACHE_VERSION` 必须跟着改**：动过 HTML/CSS/JS 就要 +1，
   新增资源要加进 `PRECACHE_URLS`。**大文件不进预缓存**（字体 43MB、`QSL.png` 10MB、wav 5MB）。
8. **HTML 用 CRLF、无 BOM**（`assets/js/*.js` 习惯 LF，但 git 会按 `core.autocrlf` 归一化）。
9. **带中文的 `.ps1` 必须存成 UTF-8 with BOM**，否则 PowerShell 5.1 按 ANSI 解析、直接语法错。
   `verify-site.ps1` 就是这个原因。
10. **PowerShell 5.1 没有 `String.Replace(a,b,count)` 三参重载**；`$home` 等自动变量只读。
11. **SW 缓存里不能放重定向过的响应**：`/main/mainpage.html` 会被 307 到 `/main/mainpage`，
    直接 `cache.put` 会让导航打不开。`sw.js` 里的 `asDirectResponse()` 就是干这个的。

---

## 十二、交付前自查

- [ ] 新控件的圆角/颜色/过渡**全部来自 `--ctl-*`**，没有自创值
- [ ] 金色只出现在 hover / 聚焦 / 选中 / 关键读数上
- [ ] 键盘可达：可点的东西都能 Tab 到、有可见的 `:focus-visible`
- [ ] 可点击卡片 hover 时**没有位移**（只换描边 / 阴影 / 文字颜色；唯一例外是工具页的 `.tool-entry`：右移 5px + 左侧金竖线）
- [ ] 窄屏（≤768px）看过一眼：顶栏折叠、按钮不溢出、点得着
- [ ] `prefers-reduced-motion` 下没有动画
- [ ] 改过 HTML/CSS/JS → `sw.js` 的 `CACHE_VERSION` 已 +1、新资源已进预缓存
- [ ] 没有在仓库里留下临时脚本/预览图；起过的进程都收了
- [ ] `MAINTENANCE.md`（维护手册）与本文如有一方变了，另一方跟着改
