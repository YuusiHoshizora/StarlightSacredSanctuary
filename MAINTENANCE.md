# 维护备忘

给自己看的操作说明 —— 面向读者那部分在 [README.md](README.md)。
本地怎么预览、怎么加文章、部署怎么走、改完要做什么，都记在这里。

---

## 目录结构

```
.
├── index.html                  首页
├── error.html                  错误页
├── sw.js                       Service Worker：预缓存 + 缓存优先
├── netlify.toml                Netlify 配置（发布根目录、错误页重定向）
│
├── main/mainpage.html          主页面（事件列表 + Markdown 阅读器）
├── starmap/index.html          星图（刻意没有页脚）
├── fleet/index.html            舰队
├── tool/index.html             工具
├── archive/index.html          档案
├── about/index.html            关于（授权说明与致谢）
│
├── assets/
│   ├── css/
│   │   ├── global.css          全站共用：字体声明 + 控件设计令牌（--ctl-*）
│   │   ├── index.css           首页
│   │   ├── error.css           错误页
│   │   ├── archive.css         档案页
│   │   ├── main/mainpage.css   主页面
│   │   ├── starmap/index.css   星图页
│   │   ├── fleet/index.css     舰队页
│   │   ├── tool/index.css      工具页
│   │   └── about/index.css     关于页
│   │
│   ├── js/
│   │   ├── background.js       全站背景（星野 / 六边形网格 / 鼠标激活区）
│   │   ├── notice.js           一次性欢迎通知（localStorage 记已读）
│   │   ├── seamless.js         Service Worker 注册与更新 + 非 Chromium 的预取回退
│   │   ├── main.js             首页打字机效果
│   │   ├── tool.js             工具页（拾色器 + 时间转换）
│   │   ├── starmap-data.js     星系数据（STARMAP_DATA）
│   │   ├── starmap.js          星图绘制与交互
│   │   ├── starmap-bg.js       星图页专用的背景参数
│   │   └── marked.min.js       Markdown 渲染（marked v9.1.6）
│   │
│   ├── fonts/                  Sarasa Gothic SC 等 4 个 woff2（约 30 MB）
│   ├── img/                    （暂时为空）
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

托管在 Netlify，绑定的域名是 `starlightsacredsanctuary.top`。

下面这几条是从仓库里的文件读出来的，**没在 Netlify 后台核对过**，换环境或排查问题时先确认一下：

- `netlify.toml` 里 `publish = "."`、没有 build command → 发布的就是仓库根目录的原样文件
- 404 / 500 / 502 / 503 四种状态都重定向到 `/error.html`
- 推送到 `master` 会自动触发部署（推断：仓库在 GitHub，`netlify.toml` 也在仓库里）

---

## 改了样式或脚本之后

`sw.js` 会预缓存全部页面与静态资源（导航请求「缓存优先 + 后台更新」，静态资源
stale-while-revalidate）。所以**改完 CSS / JS 记得把 `sw.js` 顶部的 `CACHE_VERSION`
往上加一位**（例如 `v4.5` → `v4.6`），否则回过站的浏览器可能还在用旧缓存。

字体文件（约 30 MB）是故意不放进预缓存清单的，第一次真正用到时才缓存。

---

## 授权声明放在哪

站内文字走 **CC BY 4.0**（署名即可转载，允许商用）。声明分散在下面几处，改动时要保持一致：

- **「关于」页**（`about/index.html`）—— 面向读者的正式说明：授权条款 + 第三方致谢。
  改授权口径以这页为准
- **每页底部的 `.site-footer`** —— index / main / fleet / tool / archive / error 共 6 个页面。
  **星图页刻意不放页脚**（整屏地图要沉浸感，页脚 HTML 里留了注释说明）；
  样式在 `assets/css/global.css` 的 `.site-footer`
- 仓库根目录 **`LICENSE`** —— 协议全文 + 不在授权范围内的内容说明
- **`README.md`** 的「授权与致谢」
- **版权年份**：起始年 **2025**（域名注册那年）写死在 7 个页脚与「关于」页授权列表的
  `<span class="copyright-years" data-since="2025">` 里，**结束年由 `assets/js/seamless.js` 末尾那段自动改成当年**。
  另外 `LICENSE` 的 `Copyright (c)` 行和 `README.md` 里的年份是纯文本、**不会自动更新**，跨年时要手动改这两处

### 加新页面时要一起做的三件事

1. 导航栏的 `<nav>` 里加链接（注意各页相对路径不同：根目录页用 `about/`，子目录页用 `../about/`，
   错误页用绝对路径 `/about/`）
2. 页脚：拷一份 `.site-footer`，把「关于本站」链接改成正确的相对路径
3. `sw.js` 的 `PRECACHE_URLS` 里补上新页面和新 CSS（否则离线访问那一页会漏）

### 两个已经踩过的布局坑

- **页脚高度算在 `body` 的竖排 flex 里**，所以页面主体不要再写死 `height: 100vh`
  （页脚会被挤出视口）。要撑满就写 `flex: 1 1 auto` —— 首页 `.hero`、舰队 `.fleet-section`、
  错误页 `.error-container`、星图 `.starmap-layout` 都是这么处理的。
- **带 `margin: 0 auto` 的容器必须同时写 `width: 100%`**（主页面 `.main-layout`、
  档案 `.archive-section`、工具 `.tool-layout`、关于 `.about-section`）。
  它们是 `body` / `main` 这个竖排 flex 容器的 flex 项，而 flex 项在交叉轴上带 auto margin 时
  **不会被拉伸**、宽度会退化成 fit-content —— 主页面「打开文章整栏突然变窄」就是这么来的。

---

## 设计约定

- **配色**：深蓝黑底 + 金色 `#FFD700` 作为唯一的强调色 + 紫色 `#3A3072` 作点缀。
  金色只用于 hover / 键盘聚焦 / 选中，不做默认态，也不引入新颜色
- **控件**：按钮与输入框统一使用 `global.css` 里 `:root` 的 `--ctl-*` 令牌
  （背景、描边、圆角、过渡），不要在页面样式里另写一套
- **字体**：正文与标题用 Sarasa Gothic SC 的三个真实字面（Regular / Bold / Italic），
  界面文字用 Sarasa UI SC；全站 `font-synthesis-weight: none`，粗体一律走真实 Bold 字面，
  不允许浏览器合成（合成粗细在不同浏览器差别很大，文字被选中时还会变）
- **背景**：`background.js` 在 `<div class="background">` 里绘制星野 + 六边形网格 +
  鼠标附近的激活区特效；星图页用 `starmap-bg.js` 覆盖了这套参数
- **页面切换动画**：跨文档 View Transitions（纯 CSS），`seamless.js` 只负责让下一页提前就绪
- **主页面两个动效**（都在 `assets/css/main/mainpage.css` + `main/mainpage.html`）：
  · 切分类：整列卡片 `translateX(-100%)` 从右向左离开，新的一列再从左边进来（`.blog-list.switching` / `.entering`）
  · 点卡片：卡片背景（`.article-morph`）从中栏的绝对定位矩形展开成文章正文的背景，返回时缩回卡片形状。
    展开的目标矩形由 `morphTargetRect()` 算：上边贴在文章头部的分割线上（标题 / 日期 / 分类留在背景之外），
    左右各宽出 `MORPH_SIDE`、底部留 `MORPH_BOTTOM`（两个常量在 `main/mainpage.html`）。
    **改 `.blog-card` 的外观时，`.article-morph` 要跟着一起改** —— 它就是那张卡片的背景。
    坐标用 `offset*` 量、不用 `getBoundingClientRect()`（后者会被文章入场动画的 `translateY(12px)` 带偏）；
    两者都写了 `prefers-reduced-motion` 的降级
- **窄屏**：每页各有自己的断点（768px 为主，工具页 900px，主页面 1024px，星图 420px）
