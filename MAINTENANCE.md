# 维护备忘

给自己看的操作说明 —— 面向读者那部分在 [README.md](README.md)。
本地怎么预览、怎么加文章、部署怎么走、改完要做什么，都记在这里。

---

## 目录结构

```
.
├── index.html                  首页
├── 404.html                    错误页（唯一的源）：CF 静态资源 Worker 的 404 页，也是 SW 的离线页
├── sw.js                       Service Worker：预缓存 + 缓存优先
├── wrangler.jsonc              部署配置：资源目录 = 仓库根、未匹配路径回 404.html
├── .assetsignore               不上传清单（.git/、内部文档、编辑器与工具产物…）
├── MIGRATION-CLOUDFLARE.md     迁往 Cloudflare 的迁移手册（收尾完成后可删）
│
├── main/mainpage.html          主页面（事件列表 + Markdown 阅读器）
├── main/cq.html                彩蛋：CQ（无入口页，见「设计约定 · 彩蛋」）
├── starmap/index.html          星图（刻意没有页脚）
├── fleet/index.html            舰队
├── tool/index.html             工具
├── archive/index.html          档案（分类导航）
├── archive/organization/index.html  组织档案（组织名录导航：官方 / 半官方 / 非官方三类，目前只有官方组织有内容）
├── archive/organization/cam.html    管理成员议会（最高权力机构；3 列 × 4 位议员）
├── archive/organization/dgam.html   管理成员讨论组（机密彩蛋页，无入口、无站内跳转）
├── about/index.html            关于（授权说明与致谢）
│
├── assets/
│   ├── css/
│   │   ├── global.css          全站共用：字体声明 + 控件设计令牌（--ctl-*）
│   │   ├── index.css           首页
│   │   ├── error.css           错误页
│   │   ├── archive.css         档案页
│   │   ├── archive/organization.css  组织档案页
│   │   ├── main/mainpage.css   主页面
│   │   ├── main/cq.css         彩蛋页 CQ
│   │   ├── starmap/index.css   星图页
│   │   ├── fleet/index.css     舰队页
│   │   ├── tool/index.css      工具页
│   │   └── about/index.css     关于页
│   │
│   ├── js/
│   │   ├── background.js       全站背景（星野 / 六边形网格 / 鼠标激活区）
│   │   ├── notice.js           一次性欢迎通知（localStorage 记已读）
│   │   ├── seamless.js         Service Worker 注册与更新 + 非 Chromium 的预取回退
│   │   ├── navtoggle.js        窄屏顶栏折叠（汉堡按钮 + 下拉面板）
│   │   ├── org-member.js       组织详情页的成员名录：点名字弹「成员数据库拒绝访问」小窗
│   │   ├── eggs.js             彩蛋登记册（记已发现 + 填「关于」页那张卡片）
│   │   ├── main.js             首页打字机效果
│   │   ├── tool.js             工具页（拾色器 + 时间转换）
│   │   ├── starmap-data.js     星系数据（STARMAP_DATA）
│   │   ├── starmap.js          星图绘制与交互
│   │   ├── starmap-bg.js       星图页专用的背景参数
│   │   └── marked.min.js       Markdown 渲染（marked v9.1.6）
│   │
│   ├── fonts/                  Gothic / Mono 两族共 7 个 woff2（约 43 MB）
│   ├── img/                    logo_SSS.svg（站点图标 + 导航栏 logo，见「设计约定」）
│   │                           QSL.png（彩蛋页用，2854×2008）
│   ├── audio/                  彩蛋页用的两段 WAV（cq.wav / QSL-sstv.wav，共约 5 MB）
│   └── post/                   事件正文 .md + 自动生成的 index.json
│
└── .github/workflows/generate-post-index.yml
```

---

## 本地预览

仓库根目录就是网站根目录，不需要安装任何东西。但**不要直接双击 HTML 打开**：主页面要用
`fetch` 读取 `assets/post/index.json` 和文章正文，`file://` 协议下会被浏览器拦掉，
文章列表只会显示「无法加载文章列表」。

在仓库根目录起一个本地服务器（任选一种）：

```bash
python -m http.server 8000     # 然后打开 http://localhost:8000/
npx serve .                    # 或者用 Node 生态的静态服务器
```

> 用 `localhost` / `127.0.0.1` 预览时，`sw.js` 会主动不插手（见文件里的 `DEV_HOST`），
> 改完 CSS / JS 刷新一次就能看到效果。
> 但如果在手机上用 `192.168.x.x` 这类局域网地址预览，Service Worker 会照常接管，
> 改动没生效时强制刷新（Ctrl + F5）一下。

---

## 写一篇新的事件（文章）

文章就是 `assets/post/` 下的 Markdown 文件。这个目录本身是一个 Obsidian 库，直接用
Obsidian 写最省事（`.obsidian/` 已经在 `.gitignore` 里，不会被部署）。

新建 `assets/post/你的标题.md`，**去掉 `.md` 的文件名就是列表里显示的标题**，
文件内容固定成三段式：

```markdown
#航行手记
2025-06-30
这里开始是正文，支持 GitHub 风格 Markdown（表格、引用、代码块都行）。

## 小节标题
- 列表项、**加粗**、> 引用……
```

- **第 1 行**：`#` 加分类名。分类必须和主页面左侧的分类**完全一致**，否则点分类筛不出来：
  `重要通知` / `本地日志` / `观测报告` / `技术文档` / `航行手记`
- **第 2 行**：日期，原样显示在卡片和文章头部。列表排序看这一行的**行首数字**
  （年份会补足 4 位再比较大小），所以写成 `2025-06-30` 这种格式最省事
- **第 3 行起**：正文。前面这两行在渲染时会被自动剥掉，不会出现在正文里
- **行首缩进会被保留**（写日志那种树形结构直接缩进就行）：紧跟在上一行后面、
  中间不空行的「段落续行」，行首的制表符 / 空格会原样保留，一个制表符按 4 个空格显示，
  `**粗体**` 之类的行内语法照常生效。实现见 `main/mainpage.html` 的 `preserveLineIndent()`。
  **代价：「用 4 个空格缩进」这种代码块写法失效**（会被当成正文）—— 代码块请一律用 ``` 围栏，
  围栏内部不受影响。另外，列表、引用、标题、表格、分隔线这些行首有结构含义的写法一律不碰

> **不要手动改 `assets/post/index.json`。**
> 它由 GitHub Actions 自动生成：只要 push 里包含 `assets/post/**` 的改动，
> `.github/workflows/generate-post-index.yml` 就会按日期倒序重排它并自动提交回来。
> 也可以在仓库的 Actions 页面手动 `workflow_dispatch` 触发一次。

---

## 时间转换的设定（星纪元 S.E.）

换算规则与设定值写在 `assets/js/tool.js` 的注释里：

- 公元 **2110-01-01 00:00:00 UTC** = 星纪元 **1 年 1 月 1 日 00:00:00**
- 星纪元一年 **12 个月、每月 30 天**，一年恒为 **360 天**，没有闰年、闰月
- 只换算日期，时 / 分 / 秒两边都是 `00:00:00`
- 公元 2110 年之前的日期落在纪元之前，星纪元年份记作 **0 或负数**（前星纪元）

---

## 部署

托管在 **Cloudflare Workers（纯静态资源 Worker）**，Worker 名 `starlight-sacred-sanctuary`，
绑定域名 `starlightsacredsanctuary.top`（短域名 `stsas.top` 与其 `www` 由 Cloudflare 的
Redirect Rule 301 过来，见下）。

> 🚧 **刚从 Netlify 迁过来，正在收尾**：原托管是 Netlify，免费版 100 GB/月带宽被 43 MB
> 字体包打爆。现状、遗留问题与待办见 [MIGRATION-CLOUDFLARE.md](MIGRATION-CLOUDFLARE.md) 第 11 节。

发布配置在**仓库里**，不在后台：

- **`wrangler.jsonc`** —— `assets.directory = "."`，资源目录就是仓库根目录
- ⚠️ **`assets.not_found_handling` 必须是 `"404-page"`**：本项目没有 Worker 脚本，
  纯静态资源 Worker 不写这一项时，未匹配路径会返回 **404 空响应**（响应体 0 字节、
  访问者看到白屏）—— 这是实测踩过的
- **`.assetsignore`** —— 排除不该发布的东西。⚠️ **没有它，资源目录里的 `.git/` 会被
  原样公开托管**：`/.git/HEAD`、`/.git/config`、`/.git/index`、`.git/logs/HEAD` 实测都能
  匿名下载；`.github/`、`.gitignore` 也一样
- 2026-10 又补进清单的（补之前实测都是 200 公开可读）：**`wrangler.jsonc`、
  `MAINTENANCE.md`、`MIGRATION-CLOUDFLARE.md`**，以及发布目录里那份 36 MB 的
  `assets/post/.obsidian` —— 它在 cwd 里，哪天用本地 `wrangler deploy` 会整个传上去
- 后台「设置 → 构建」：**构建命令「无」**、部署命令 `npx wrangler deploy`、根目录 `/`；
  推送到 `master` 自动构建部署（每次约 30–50 秒）
- ⚠️ 带 `[skip ci]` 的提交（Actions 那个 index.json 自动提交）**会跳过部署** ——
  Netlify 与 Cloudflare 都是这个行为
- 错误页只有一份 `404.html`（原先 `error.html` + `404.html` 两份内容相同，已合并成一份）：
  CF 的 404 页与 SW 的离线页都用它；自检脚本会把线上 404 响应与它逐字比对（不一致报 WARN）
- 自检：`powershell -NoProfile -ExecutionPolicy Bypass -File .github\verify-site.ps1`
  （可加 `-ShortUrl https://stsas.top -WwwUrl https://www.starlightsacredsanctuary.top`）。
  迁移前基线 PASS 16 / FAIL 0；出现 FAIL 都值得查

### 短域名 `stsas.top` 跳到长域名

现在由 **Cloudflare 的 Redirect Rule**（zone `stsas.top`）实现，不在仓库里配置：

- 前提：`stsas.top` 与 `www.stsas.top` **各有一条 A `192.0.2.1`、且「已代理」（橙云）**
  的占位记录 —— 规则只对经过 Cloudflare 边缘的请求生效，记录不代理就不触发
- 规则匹配 `(http.host eq "stsas.top" or http.host eq "www.stsas.top")`，动态重定向到
  `concat("https://starlightsacredsanctuary.top", http.request.uri.path)`，301 +
  Preserve query string。完整写法见迁移手册第 6 节
- ⚠️ 别碰 Cloudflare 的 **Email Routing**：`stsas.top` 上有 QQ 企业邮，开启会改写 MX

（历史：迁移前这段靠 `netlify.toml` 顶部那四条 domain-level redirect 实现；
那四条规则只在 Netlify 仍是源站时才有意义。）

验证（应看到 `301` + `Location: https://starlightsacredsanctuary.top/`）：

```powershell
curl.exe -sSI https://stsas.top/ | Select-String -Pattern 'HTTP/|location'
curl.exe -sSI https://stsas.top/archive/ | Select-String -Pattern 'HTTP/|location'
curl.exe -sSI https://stsas.top/no-such-page | Select-String -Pattern 'HTTP/|location'
```

改 `.assetsignore` / `wrangler.jsonc` / 本文档**不需要**动 `sw.js` 的 `CACHE_VERSION`（那不是页面资源）。

---

## 改了样式或脚本之后

`sw.js` 会预缓存全部页面与静态资源（导航请求「缓存优先 + 后台更新」，静态资源
stale-while-revalidate）。所以**只要动了页面 HTML、CSS 或 JS，就要把 `sw.js` 顶部的
`CACHE_VERSION` 往上加一位**（例如 `v4.8` → `v4.9`）。

⚠️ 页面 HTML 也算 —— **漏掉它的后果最容易被误判成"没推送成功"**：文件明明已经在线上，
但老访客的 SW 还在拿上一版的缓存页面，改动就是"看不见"。判断办法：`CACHE_VERSION`
有没有跟着这次改动一起加。（这个坑已经踩过一次：改了 8 个页面但忘了加版本号。）

字体文件（7 个 woff2、约 43 MB）是故意不放进预缓存清单的，第一次真正用到时才缓存 ——
所以一个页面只会下载它实际用到的字面（例如文章正文用等宽，就只拉 Mono 的 Regular + Bold）。

### ⚠️ `.html` 地址 + Service Worker 的重定向坑（踩过，真机复现过）

**症状**：首页点 **ENTER** 进不去主页面，浏览器报「无法访问此网站」（`chrome-error://chromewebdata/`），
但把地址栏里的 `.html` 去掉、手打 `/main/mainpage` 就能进。

**成因**（两段叠加）：

1. **Cloudflare 静态资源会把 `.html` 地址 307 到不带扩展名的规范地址**：
   `/main/mainpage.html` → `307` → `/main/mainpage` → `200`。这是托管方的默认行为
   （`wrangler.jsonc` 没写 `html_handling`，走默认值）。直接请求没问题，浏览器会自动跟。
2. `sw.js` 的**预缓存**当时用裸的 `cache.put(url, response)` 存盘（绕过了 `putSafely` 里
   `response.redirected` 的检查），于是把「跟过 307 的响应」原样存进了缓存。
   而 **fetch 规范禁止用 `response.redirected === true` 的响应满足导航请求** ——
   一旦这么返回，整次导航直接失败，连站内 404 页都出不来，只有浏览器自己的错误页。

**修法**：`sw.js` 里的 `asDirectResponse()` —— 用 `new Response(response.body, {status, statusText, headers})`
重建一份等价但 `redirected === false` 的响应，出入缓存前后各洗一次（对没被重定向的响应是空操作）。
`putSafely` 也要**先 clone 再洗**，否则会把调用方那份的 body 抽走。

**改这里时要一起想的事**：

- 任何往缓存里写响应的地方（预缓存循环、`putSafely`）都必须过一遍 `asDirectResponse`
- 任何把响应交给导航请求的出口（`handleNavigate` 的 cached / network 两条路）也要过一遍
- 修完记得升 `CACHE_VERSION`：老访客的旧缓存里有被污染的条目，只有换缓存名才会被 `activate` 清掉
- 只动 `sw.js` 的注释不影响发布，但**动了逻辑就要升版本号**，否则老访客的 SW 永远不会更新

---

## 授权声明放在哪

站内文字走 **CC BY 4.0**（署名即可转载，允许商用）。声明分散在下面几处，改动时要保持一致：

- **「关于」页**（`about/index.html`）—— 面向读者的正式说明：授权条款 + 第三方致谢。
  改授权口径以这页为准
- **每页底部的 `.site-footer`** —— index / main / fleet / tool / archive（含 archive/organization）/ about / error
  共 8 个页面。
  **星图页刻意不放页脚**（整屏地图要沉浸感，页脚 HTML 里留了注释说明）；
  样式在 `assets/css/global.css` 的 `.site-footer`
- 仓库根目录 **`LICENSE`** —— 协议全文 + 不在授权范围内的内容说明
- **`README.md`** 的「授权与致谢」
- **版权年份**：起始年 **2025**（域名注册那年）写死在 7 个页脚与「关于」页授权列表的
  `<span class="copyright-years" data-since="2025">` 里，**结束年由 `assets/js/seamless.js` 末尾那段自动改成当年**。
  另外 `LICENSE` 的 `Copyright (c)` 行和 `README.md` 里的年份是纯文本、**不会自动更新**，跨年时要手动改这两处

### 加新页面时要一起做的七件事

1. `<head>` 里加加载屏三件套：那段内联判断脚本 + `<link ... boot.css>` + `<script defer ... boot.js>`
   （路径按页面深度调整），`<body>` 开头放一个空的 `<div class="boot" id="boot"></div>`
2. `<head>` 里加站点图标：`<link rel="icon" type="image/svg+xml" href="…/assets/img/logo_SSS.svg">`
   （根目录页 `assets/img/…`、子目录页 `../assets/img/…`、`error.html` 用绝对路径 `/assets/img/…`）
3. 导航栏 logo：`<span class="logo__mark" aria-hidden="true"></span>` 放在「星光圣域」前面
   （它是个 CSS mask，颜色自动跟随文字，不用管图本身是什么颜色）
4. 导航栏的 `<nav id="site-nav">` 里加链接（注意各页相对路径不同：根目录页用 `about/`，子目录页用 `../about/`，
   错误页用绝对路径 `/about/`）。**`id="site-nav"` 不能漏**，窄屏的折叠面板就是这块 `<nav>` 本身
5. 导航栏的折叠按钮：在 `</nav>` **之后**、`</header>` 之前插一份 `<button class="navbar__toggle">`
   （见任何一页的现成写法），并在 `<head>` 里加 `<script defer src="…/assets/js/navtoggle.js"></script>`。
   ⚠️ 按钮必须是 `.navbar` 自己的子元素 —— **放进 `<nav>` 里就会被那块竖排面板当成一个条目**
6. 页脚：拷一份 `.site-footer`，把「关于本站」链接改成正确的相对路径
7. `sw.js` 的 `PRECACHE_URLS` 里补上新页面和新 CSS/JS（否则离线访问那一页会漏）

### 工具页左栏的两个测试入口

「公告测试」「加载测试」是调试用的入口，**会随站点一起发布，访客也能看到**：

· 公告测试 —— `tool/index.html` 里发一个 `sss:notice` 事件，`notice.js` 收到就弹公告
· 加载测试 —— 普通链接 `../?boot=1`；各页 `<head>` 里那段判断见到 `boot` 参数就重播一次加载屏

不想要了，就把左栏那两个 `.tool-entry` 和 `tool/index.html` 末尾那段脚本一起删掉
（`?boot=1` 这个开关本身可以留着，它就是个调试入口）。

### 三个已经踩过的布局坑

- **页脚高度算在 `body` 的竖排 flex 里**，所以页面主体不要再写死 `height: 100vh`
  （页脚会被挤出视口）。要撑满就写 `flex: 1 1 auto` —— 首页 `.hero`、舰队 `.fleet-section`、
  错误页 `.error-container`、星图 `.starmap-layout` 都是这么处理的。
- **带 `margin: 0 auto` 的容器必须同时写 `width: 100%`**（主页面 `.main-layout`、
  档案 `.archive-section`、工具 `.tool-layout`、关于 `.about-section`）。
  它们是 `body` / `main` 这个竖排 flex 容器的 flex 项，而 flex 项在交叉轴上带 auto margin 时
  **不会被拉伸**、宽度会退化成 fit-content —— 主页面「打开文章整栏突然变窄」就是这么来的。
- **`backdrop-filter` 会让元素成为 fixed 后代的定位包含块**。顶栏 `.navbar` 带
  `backdrop-filter:blur(12px)`，所以窄屏折叠面板（`.navbar` 里的 `#site-nav`）无论写
  `fixed` 还是 `absolute`，`top:100%` 都是相对那 60px 高的导航栏算的 ——
  写 `fixed + bottom:0` 高度会**塌成 0**（只剩内容高度）。现在的写法是
  `position:absolute; top:100%; height:calc(100svh - var(--navbar-h))`，
  栏高由 `--navbar-h`（`global.css` 的 ≤768px 块里定义）统一给出。

### 窄屏导航折叠（`assets/js/navtoggle.js`）

≤768px 时 6 个链接会跟 logo 挤在同一行，所以窄屏把它们收进一块从栏下缘铺到屏底的面板。
结构（每页都要有，见「加新页面时」第 4、5 条）：

```html
<header class="navbar">
    <div class="logo">…</div>
    <nav id="site-nav">…6 条链接…</nav>
    <button class="navbar__toggle" type="button" aria-label="导航菜单"
            aria-controls="site-nav" aria-expanded="false">
        <span class="navbar__toggle__bars" aria-hidden="true"></span>
    </button>
</header>
```

- **外观全在 CSS**（`global.css` 的 ≤768px 块）：按钮桌面 `display:none`（所以不进 Tab 顺序）、
  窄屏 `display:flex`；`#site-nav` 变成竖排面板，靠 `.navbar` 上的 `.is-menu-open`
  用 `clip-path` 开合。**别再给 `#site-nav` 写 `position:fixed + bottom:0`**（见上一个坑）。
- **所有选择器都写 `#site-nav`，别写裸的 `nav`**：主页面左栏还有 `<nav class="vertical-nav">`，
  裸 `nav` 会把那块也一起变成全屏面板。
- **按钮必须是 `.navbar` 自己的子元素**：放进 `<nav>` 里就会被那块竖排面板当成一个条目。
- **JS 只做三件事**：切 `.is-menu-open` 与 `aria-expanded`；展开时锁 `body` 滚动，
  并在点链接 / 按 Esc（焦点还给按钮）/ 窗口拉宽回桌面时收起；按当前地址给命中的那条链接加
  `aria-current="page"`（面板里那条显示金色竖条）。路径比较用 `URL` 解析 + 归一化，
  **不要用 `[href="…"]` 去猜** —— 各页写法不同（`.` / `..` / `starmap/` / `/about/`），
  字符串比会同时命中首页和子目录页的父级链接。
- 禁 JS 时按钮不出现（HTML 里没有 `hidden`，显隐由 CSS 控制），导航退化成改前那样的一行，
  不会出现「点了没反应」的死按钮。
- ⚠️ **写 HTML 注释务必用 `-->` 结尾**。曾把 `-->` 误写成 `*/`，整段 `<button>` 就被当成
  注释内容吃掉了：页面上按钮消失、`document.querySelectorAll('button').length` 为 0，
  但 `outerHTML` 里还能搜到 `navbar__toggle` 字样 —— 静态检查与构建都不会报，只有真浏览器看得出。

---

## 设计约定

- **配色**：深蓝黑底 + 金色 `#FFD700` 作为唯一的强调色 + 紫色 `#3A3072` 作点缀。
  金色只用于 hover / 键盘聚焦 / 选中，不做默认态，也不引入新颜色
- **控件**：按钮与输入框统一使用 `global.css` 里 `:root` 的 `--ctl-*` 令牌
  （背景、描边、圆角、过渡），不要在页面样式里另写一套
- **字体**：正文、标题与界面都用 Sarasa Gothic SC 的三个真实字面（Regular / Bold / Italic），
  **全站等宽只有一支：Sarasa Mono SC**（`assets/fonts/SarasaMonoSC-*.woff2`，@font-face 见
  `global.css`）—— 凡是要等宽的地方一律写 `"Sarasa Mono", "Sarasa", monospace`，
  别再退到系统等宽栈（`ui-monospace` / `Consolas` / `Courier New` / `Cascadia Mono` 都已清掉）：
  · Markdown 正文与行内代码：`global.css` 的 `.markdown-body, .markdown-body *` +
    `mainpage.css` 的 `.markdown-body code`
  · CQ 彩蛋页的控制台与准备日志：`main/cq.css` 的 `.cq-console, .cq-console *`、`.cq-log, .cq-log *`
  · 组织档案页右上角的部门代号：`archive/organization.css` 的 `.org-card__no`
  · 加载屏的读数：`boot.css` 的 `.boot__inner, .boot__inner *`
  ⚠️ **写法上要连后代一起写**：`global.css` 顶部那条 `* { font-family: "Sarasa" }` 给
  **每个元素**都直接指定了 Gothic，只写在容器上等于只改了容器自己的文字节点，里面的元素
  还是 Gothic —— 而且这样等宽字面根本不会被下载（`document.fonts` 里一直 `unloaded`）。
  与 `.markdown-body` 同一套路。`font-size` / `line-height` 这种别跟着写成 `X *`，
  每条规则只管一件事。
  全站 `font-synthesis-weight: none`，粗体一律走真实 Bold 字面，
  不允许浏览器合成（合成粗细在不同浏览器差别很大，文字被选中时还会变）。
  界面原先还单独用了一份 "Sarasa UI" 字面（等于每页多下 8 MB），已去掉，全站统一 Gothic。
- **字体载入策略：`@font-face` 一律 `font-display: block`，别改回 `swap`**。
  `swap` 是「先用回退字体把字画出来、字体到位再换掉」—— 那正是肉眼可见的**字体突变**；
  而 Sarasa 是 8 MB 级 CJK 字体，实测**每个页面文档都要重新解码一次**（HTTP 缓存命中
  也还要 0.3–0.7 秒，再叠一次回源校验），所以用 `swap` 就是每次翻页都突变。
  `block` 让文字先不显示、等字体就绪再一起出现，没有字形替换过程。
  · 首次访问这段由加载屏盖住；之后各页是「骨架先出现、文字稍后浮现」
  · 用到大字面的那一页要在 `<head>` 里自己写 `<link rel="preload" as="font" crossorigin>`
    （目前只有 CQ 页给 `SarasaMonoSC-Regular.woff2` 写了一条）：`block` 期内文字是空的，
    等 CSS 决定要用字体才开下，往往就晚了半拍 —— 控制台日志会先空一下
  · **加载屏的读数本身也是 Sarasa Mono**：那是第一次绘制、又赶上 `block`，所以
    `boot.js` 在**要显示加载屏时**把这一份加进 `sssFontFaces()` 一起等（不显示加载屏就不等）
  · **别用 `document.fonts.check()` 判断"字体在不在缓存里"**：实测缓存命中也返回 `false`
    （`FontFace` 只要没真正 load 过就是 `unloaded`），拿它做判断会每次导航都误弹加载屏
  · ⚠️ 线上字体响应头是 `Cache-Control: public, max-age=0, must-revalidate`（Cloudflare
    静态资源默认值），等于**每次用字体都要回源校验一次**。想把这 0.3–0.7 秒压下去，
    可以给 `/assets/fonts/*` 加长缓存（Cloudflare 的 Cache Rule，或资源目录里的 `_headers`）
- **背景**：`background.js` 在 `<div class="background">` 里绘制星野 + 六边形网格 +
  鼠标附近的激活区特效；星图页用 `starmap-bg.js` 覆盖了这套参数。
  ⚠️ **星星必须用固定种子生成**（`newStar()` 里的 `starRnd`），**不要用 `Math.random()`**：
  背景要在各页面之间长得一模一样，否则每次翻页星位重排、切换时那片星空会跳一下，
  「外壳常驻、只换内容」的跨页过渡立刻露馅。六边形网格与星云本来就是确定的，只有星星是随机的；
  换一片星空就改那个种子
- **页面切换动画**：跨文档 View Transitions（纯 CSS），`seamless.js` 只负责让下一页提前就绪；
   navbar 是共享元素（`view-transition-name:site-navbar`），所以它"钉住"不动。
  另有「内容先藏、字体就绪再淡入」这一层（`sss-switch` / `sss-switch-in`）：
  · 各页 `<head>` 里同步判断这次是不是**站内跳转**（`document.referrer` 同源），是就给
    `<html>` 挂 `sss-switch` —— 只让内容区（`main` / `.main-layout` / `.site-footer`）透明，
    **背景画布与顶栏完全不参与**，于是看起来就是"外壳不动、内容淡入"
  · `assets/js/boot.js` 末尾那个独立 IIFE 在**骨架就绪**（DOMContentLoaded + 下一帧）时
    换成 `sss-switch-in` 淡入，随后把两个类都摘掉；`<head>` 里另有 5 秒兜底。
  · ⚠️ **千万别改成"等字体就绪再揭幕"**。`sss-switch` 藏的是**整块内容**
    （`main` / `.main-layout` / `.site-footer`），不只是文字；而字体要解码 0.3–0.7 秒，
    等字体就等于让整页内容空掉整整一个字体周期 —— 看起来就是一次黑屏（实测空白 475ms）。
    文字那边已经由 `font-display: block` 管着了：字体没到就不显示文字，骨架照常先出来。
    现在的实测是：内容藏起 24ms → 骨架淡入 189ms（空白 165ms）→ 字体就绪 461ms 文字浮现
  · 加新页面时内容容器要能被上面那三个选择器覆盖到（要么用 `<main>`，要么用 `.main-layout`）
- **首屏加载屏**（**全站每页都有**）：资源还没进缓存时（首次访问 / 缓存被清掉）显示，
  等就绪后上下两扇门滑开、露出页面；已就绪的页面不显示。
  · 判断在**各页 `<head>` 里那段内联脚本**（必须同步、首次绘制前决定，否则会闪一下）。
    **四个条件满足任一就弹**（实测过）：
    ① `?boot=1` 强制重播（调试用）
    ② 没有 `sss-booted` 标记 —— 这台浏览器还没走过加载流程
    ③ `!navigator.serviceWorker.controller` —— 这一次不是从 SW 缓存里拿的。
       首次访问、**Ctrl+F5 硬刷新**（硬刷新会连 SW 一起绕过）、清过站点数据都属于这种。
       ⚠️ 别只看 `sss-booted`：它只记「走过加载流程」，硬刷新时「标记还在」与
       「资源确实没走缓存」会分叉 —— 光看标记的话硬刷新不会弹，那是错的
    ④ `sss-boot-next` 标记 —— 刚部署过新版本。`seamless.js` 在新 SW 接管
       （`controllerchange`）时写下它，各页读到就补弹一次、读走即清。
       首次安装不算（本来就没控制器，那趟已经弹过了）
  · `sss-booted` 由 `boot.js` 的 `open()` 在开完门后写入；清掉站点数据会一并清掉它
  · `file://` 打开、不支持 SW 的浏览器直接不显示
  · 样式 `assets/css/boot.css`，结构与逻辑 `assets/js/boot.js`；
    页面里只放一个空的 `<div class="boot" id="boot"></div>`（内容由 boot.js 生成，8 页不用重复）
  · 三个读数都是真实事件，且各有上限（SW 预缓存失败也不会把人卡住）；
    `main.js` 的打字机等 `sss:booted` 事件 —— 否则动画会在加载屏后面白白播完
  · ⚠️ **「载入字体」这个读数必须用 `document.fonts.load('400 16px "Sarasa"')` 显式去要**，
    不能只 `await document.fonts.ready`：实测那一刻还没有任何字体进入加载流程，
    `ready` 是个**已完成的 promise**，`.then` 立刻就跑 —— 读数形同虚设，门会开在字体前面，
    露出的正是字体突变。现在它会在字体真正加载完成后 4ms 内才打勾。
    字面按页取：界面/正文是 Sarasa，页面上有 `.markdown-body`（主页面）才多等 Sarasa Mono
  · 收尾必须 `classList.remove('sss-boot','boot-open')`：**用字符串 `replace` 会漏掉开头那个类**，
    而 `html.sss-boot main{ opacity:.5 }` 会一直生效（页面永久半透明）
- **公告**：第一次访问自动弹一次（关掉后同一浏览器不再弹），「关于」页的「站点公告」卡片可随时重看。
  实现：`notice.js` 的 `start()` 负责首次自动弹，并监听 `document` 上的 `sss:notice` 事件
  （关于页卡片、工具页「公告测试」都发这个事件）调 `show(true)`。
  · **想对所有人再弹一次：把 `NOTICE.id` 改成新值** —— 「已读」是按 id 记的，换 id 就是一条新公告
  · 首次访问若加载屏还盖着，它会等 `sss:booted` 再弹（否则公告藏在加载屏后面）
  · 自动化环境不弹：`navigator.webdriver` 为真、或页面里设了 `window.__SSS_NO_NOTICE = true`
- **彩蛋**：站点里藏着**不与导航相连**的页面，靠知道地址才会来。目前只有一个：
  `main/cq.html`（业余无线电：呼号音频 + SSTV 解码出 QSL 卡片）。
  · ⚠️ **别在「关于」页这类公开页面写彩蛋页的名字或实现细节**（公告、致谢、友链都算）——
    那是剧透。致谢只写公开的资源名 + 「用途 · 许可证」，能署名的照常署名。
  · 清单在 `assets/js/eggs.js` 的 `LIST` 里（id / name / href / desc）。
    **加新彩蛋**：① 往 LIST 加一条；② 在那个页面的 `<body>` 上写 `data-egg="同样的 id"`
    —— eggs.js 见到就自动登记「已发现」，别的什么都不用做
  · 「已发现」按 id 存在 localStorage 的 `sss.eggs` 里。⚠️ **id 一旦发布就别改**，改 id 等于
    把所有人的进度清零；清掉站点数据也会一并清掉
  · 登记走 `findWhenActive()`：预渲染中的页面（speculation rules 悬停即渲染）要等真正
    激活才记，否则"鼠标扫过去"就算发现了
  · 「关于」页最下面那张「已发现的彩蛋」卡片写在 `about/index.html` 里、**默认 `hidden`**，
    由 eggs.js 填内容并放行；**一个都没发现时它就保持 hidden，整张卡片不出现**
  · 彩蛋页的音频与图片体积都不小（约 5 MB + 10 MB），**故意不进 SW 预缓存**，
    点了才下（`preload="none"` + `loading="lazy"`）；页面的 HTML/CSS/JS 照常进预缓存
  · **入口**（CQ 那个）：首页左下角藏一个点（`index.html` 的 `#cq-dot`），默认不可见、也点不到，
    名字 `???`。在首页任意处**点一下**，背景会画一圈扩散到 `CFG.RADIUS` 的金色波纹；
    `assets/js/cq-entry.js` 用**同一个半径**做判定（半径从 `window.SSSHex.cfg.RADIUS` 现读，
    所以"看到的扫描"和"判定"永远是同一个数）—— 点在范围内就被扫出来，现身并保持、
    顺手很小声（volume 0.16）放一遍 `cq.wav`。点它进 CQ 页；之后名字变成 `73`。
    · 「已扫出」记在 `sss.cq-dot`，「已发现」记在 `sss.eggs`（eggs.js），两者独立
    · 想调难易：改 `background.js` 的 `RADIUS`（或只改首页那份 CFG 覆盖），判定跟着变
  · **卡片上每条彩蛋一条设置行**（结构与样式都由 `eggs.js` 注入，关于页只需引那一行脚本）：
    · 顶上只报数：**全发现**（`found.length >= LIST.length`）→「所有彩蛋已发现」，
      否则 →「目前已发现彩蛋数：X」。两个数字都从清单长度算，加彩蛋不用改文案
    · 列表**按发现先后**排（`sss.eggs` 数组的顺序就是发现顺序，不是清单顺序）
    · 每条只有名字（可点进彩蛋页）+ 一个**开关** + 一个**重置**，不写说明文字
    · **开关**：开 = 入口正常显示；关 = 把入口元素从站点上撤掉（清单里的 `entry` 选择器，
      例如首页那个点），记在 `sss.eggs.off` —— 关掉之后入口彻底不出现（连扫也扫不出来），
      但「已发现」还留着
    · **重置**：清掉这一条的「已发现」「已关闭」以及它自己的状态键（清单里的 `resetKeys`），
      **一键生效、不做二次确认**
    · 列表最下面**「重置所有彩蛋」** —— 这个**要二次确认**（第一下把文案换成
      「确认重置全部？」，4 秒不点自动退回）；清完"一个都没发现"时整张卡片隐藏
    · 加新彩蛋时按需写 `entry` / `resetKeys` 两个字段即可，逻辑不用改
- **首帧保护（防"闪一帧裸 HTML"）**：预渲染被提前激活时（悬停后马上点击），浏览器可能先把
  「样式表还在路上」的页面画出来。各页 `<head>` 里因此有两段内联脚本：
  · 前面那段：给 `<html>` 加 `js`，并留一个 2s 兜底（`html{background:black}` 让这段空窗
    是站点底色而不是白屏）
  · `</head>` 前那段：加 `css-ready` —— **它会被它前面的样式表阻塞，所以执行时样式一定已应用**
  两者配合 `html.js:not(.css-ready) body{visibility:hidden}` 把内容藏到样式就位；
  禁用 JS 时不会加 `js` 类，等于没这段。**这两段别当冗余代码删掉。**
  ⚠️ 那段空窗底色**必须**写成 `html.js:not(.css-ready){ background:black }`，不能写成裸的
  `html{ background:black }`：**html 一旦有背景，body 的黑色就不再传播到画布**，
  负 z-index 的背景层（`.hex-bg` 是 -9、`.background` 是 -2）会被 body 自己那层黑盖住，
  表现就是"整站背景全没了"。（这个坑已经踩过一次。）
- **主页面两个动效**（都在 `assets/css/main/mainpage.css` + `main/mainpage.html`）：
  · 切分类：整列卡片 `translateX(-100%)` 从右向左离开，新的一列再从左边进来（`.blog-list.switching` / `.entering`）
  · 点卡片：卡片背景（`.article-morph`）从中栏的绝对定位矩形展开成文章正文的背景，返回时缩回卡片形状。
    展开的目标矩形由 `morphTargetRect()` 算：上边贴在文章头部的分割线上（标题 / 日期 / 分类留在背景之外），
    左右各宽出 `MORPH_SIDE`、底部留 `MORPH_BOTTOM`（两个常量在 `main/mainpage.html`）。
    **改 `.blog-card` 的外观时，`.article-morph` 要跟着一起改** —— 它就是那张卡片的背景。
    坐标用 `offset*` 量、不用 `getBoundingClientRect()`（后者会被文章入场动画的 `translateY(12px)` 带偏）；
    两者都写了 `prefers-reduced-motion` 的降级
- **图标**：`assets/img/logo_SSS.svg` 是照 1024px 画的细线图（描边只有 5/1024），
  缩到 30px 上下会明显偏淡、16px 几乎只剩一个点 —— 想在小尺寸更清楚，得另外出一版加粗描边的，
  或把小尺寸处用大一点的尺寸。用途有两处：
  · **导航栏**：当 CSS mask 用（`.logo__mark`），**只取形状、颜色跟随文字** ——
    改 SVG 里的颜色不会影响导航栏（黑底上也是靠这个才看得见）
  · **标签页图标**：直接引用该 SVG；靠文件内部 `<style>` 的 `prefers-color-scheme`
    在深色主题下把描边转成白色（否则黑线在深色标签栏上等于看不见）
- **窄屏**：每页各有自己的断点（768px 为主，工具页 900px，主页面 1024px，星图 420px）

---
## 设计语言另见

新页面 / 新组件怎么写、颜色与动效的约定、以及一份「踩过的坑」清单，
见根目录的 [DESIGN.md](DESIGN.md)。

---

## CQ 彩蛋的中途状态保存（已实现）

退出再进来要接得上（需求按退出时的落点分七条）：

| 退出时的落点 | 下次进来 |
| --- | --- |
| 第一个「开始」按下**前** | 从头走一遍流程 |
| 第一个「开始」按下后、**不是暂停**（还在播） | 显示第一个控制台，内容为「错误：意料之外的退出，状态未保存」 |
| ↑ 这种情况下再直接退出 | 不变（仍是那句话）—— 恢复时**不写**任何状态 |
| ↑ 这种情况下按下「开始」 | 重新开始解析（从头） |
| 第一个「开始」按下后、**处于暂停** | 恢复上次进度（画面停在原处，按钮为「开始」，按下继续） |
| 「异常信号解析完成。」出现之后、第二个「开始」按下**前** | 从「异常信号解析完成。」之后继续加载（第二段演出接着走） |
| 第二个「开始」按下后 | 与第一个同理：播放中 → 控制台2 显示同样那句错误；暂停 → 恢复进度 |

- 键：`sss.cq.flow` = `{ s: 0..4, t: 秒, playing: bool }`，读写都在 `main/cq.html` 第一段脚本的
  `window.__cqFlow`（`read` / `write` / `clear`）里
  - `0` 没按过第一个「开始」；`1` 摩斯段进行中；`2` 摩斯已完（第二段演出中 / 待按第二个「开始」）；
    `3` SSTV 段进行中；`4` 全解完。**`s < 1` 一律当没存过**
- **写入点**：两段的 `sync()`（play / pause 各记一次；⚠️ **没按过「开始」就不记** ——
  用一个 `started` 标志挡住初始化时那一次 `sync()` 调用，解析完再由 `done` 挡一次）；
  摩斯 `finish()` 记 `2`；SSTV `finish()` 记 `4`；两个点击回调里把 `started` 置真
- **读取点**（页面加载时）：第一段脚本先算出一个 `window.__cqBack`（`null` = 从头走一遍），
  两段脚本只吃它、不各自读一遍 storage —— 免得 `cq-restored` 与流里的 `s` 打架
  - `html.cq-restored`（已发现）优先：直接当 `s = 4` 用，并把流 `clear()` 掉
  - 否则看 `sss.cq.flow`
  - 有 `back`：第一段（文字 + 「开始」按钮）**一次性摆好**（`window.__cqShowAll`），
    两个控制台与各自的进度由摩斯 / SSTV 两个脚本接着摆；没有：从头走逐条演出
  - `s >= 1`：第一段的文字与按钮**一次性摆好**，不再走逐条演出
  - `s === 1`：摩斯段 `box.hidden = false`；`playing` → 控制台那行改成错误文案
    （`.is-error` + `--ctl-err`）；否则 `audio.currentTime = t` + `render(t * 1000)`
  - `s === 2`：放出第二段整块，第一行「异常信号解析完成。」直接 `is-in`，
    其余用 `window.__cqRunSteps(steps.slice(1))` 接着逐条走
  - `s === 3`：第二段整块与其步骤一次性摆好；控制台2 同上（错误文案 / 恢复进度）
  - `s === 4`：先静默解一遍把画面补出来，再走收尾：
    `loadPcm(function () { render(99999); finish(99999); })`
- **"全解完"那一屏不删历史**：已发现过（`cq-restored`）与 `s === 4` 都是把整页摆成
  解完的样子 —— 两段文字、两个控制台、240 行行日志全留着 —— 然后用
  `window.__cqCenterShot()` 把那张卡滚到视口正中（往上滚还能看回前面的记录）。
  页面里跑到完（SSTV `finish()`）也一样：等那两句/图摆好（约 800 ms）再平滑滚过去；
  `prefers-reduced-motion` 时不滚动画。滚之前先等图 `load` 与 `document.fonts.ready`，
  否则上面的文字换字面之后高度会变，位置就偏了。
  · ⚠️ 页面底下那条收尾基本就是最后一屏：**不补空白，"正中"根本到不了**（滚到页底会被
    夹住）。所以 `.cq-shot-pad` 平时 0 高，`__cqCenterShot()` 量出卡下方缺多少就补多少
  · 已发现过的页面按 `s = 4` 摆，但**不把 `s = 4` 写回** storage（那种页面不该再留这个键）
- 四处踩过的坑（代码里都有注释）：
  · `loadPcm()` 收一个完成回调（恢复进度与 `s === 4` 的静默补解都要等 PCM 到位）
  · **站上这两段音频在线上不能 seek**：静态响应没有 `Accept-Ranges`（Range 请求一律回
    `200` + 全量文件），浏览器就把这条流当"不可 seek"的流 —— 赋 `currentTime` 直接被丢掉。
    本地 python http.server 反而能用（一口气下完就能跳），**这个坑本地测不出来**，
    是拿部署后的真站跑冒烟才发现的。所以"恢复进度"改成：按「开始」那一刻先把这一段
    取回来做成 `blob:` URL 再挂上去（`seekableSource()`）—— blob 一定可 seek，
    而且这一段本来就要播放。SSTV 那段与 PCM 共用同一个请求（`fetchAudio()`），
    注意 `decodeAudioData` 会 detach 传进去的 ArrayBuffer，所以给它的是 `buf.slice(0)`
  · SSTV 的 `finish()` 会按 `audio.currentTime` 重画，恢复时它是 0、直接调会把整幅清掉 ——
    所以 `finish(t)` 多收一个显式的渲染位置
- 清键的两处：点开那张图（= 彩蛋发现）时清掉；`eggs.js` 里这条彩蛋的 `resetKeys`
  也带着它，所以「关于」页重置之后是从头再来，而不是接在"全解完"上
- ⚠️ 动过这一页就要 **`sw.js` 的 `CACHE_VERSION` +1**（HTML/CSS/JS 全在预缓存里，
  不加版本号访问者拿到的还是旧页面）

