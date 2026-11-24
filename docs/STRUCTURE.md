# 仓库结构与规范

> 这份文件是**仓库文件结构的唯一权威版本**。改目录、挪文件、加一类新资源之前，先改这里。
> [MAINTENANCE.md](MAINTENANCE.md) 只讲「怎么操作」，不再抄目录树。

---

## 1. 三条硬规则

1. **仓库根 = 站点根。** `wrangler.jsonc` 里 `assets.directory = "."`，没有构建产物目录，
   也没有 `dist/`。推到 `master` 后 Cloudflare 直接把仓库根目录当静态资源发。
2. **目录路径 ≈ 公开 URL 路径。** `archive/personnel/sxm.html` 对外的地址是
   `/archive/personnel/sxm.html`（Cloudflare 会再 307 到不带扩展名的 `/archive/personnel/sxm`）。
   **挪一个页面 = 改一个公开 URL**，必须同时改：站内链接、`sw.js` 的 `PRECACHE_URLS`、
   `.assetsignore`、README / 文档里的路径。
3. **不是站点资源的东西不进公开面。** 仓库文档进 `docs/`、数据源进 `src/csv/`、构建脚本进
   `src/scripts/`，并在 `.assetsignore` 里排除；`GitHub` 上公开是另一回事，别让它们额外占一份
   站点资源（也免得 `.git/` 这种误发布）。

---

## 2. 目录树

```
.
├── index.html                  首页（ENTER 入口）
├── 404.html                   唯一的错误页：CF 的 404 页 + SW 离线页 + /error/* 的状态展示
├── sw.js                      Service Worker：预缓存清单 + CACHE_VERSION（CI 按内容指纹盖）
├── wrangler.jsonc             Cloudflare 静态资源 Worker 配置（不发布）
├── .assetsignore              发布排除清单：决定哪些仓库文件不会变成站点资源
├── .gitignore                 Git 忽略清单
├── README.md                  面向读者的站点说明（GitHub 首页；公开）
├── LICENSE                    授权全文（CC BY 4.0 + 第三方许可；公开）
│
├── docs/                      仓库文档 —— 只给仓库看，不发布
│   ├── README.md              文档索引（第一次进来先读这页）
│   ├── STRUCTURE.md           本文件：目录职责 / 命名 / 新增内容落点 / 发布面
│   ├── MAINTENANCE.md         维护备忘：写文章、改数据、部署、踩坑记录
│   ├── DESIGN.md              设计语言：定位、色板、排版、组件、动效
│   ├── MIGRATION-CLOUDFLARE.md 迁往 Cloudflare 的准备与执行记录（已完成，留作记录）
│   └── drafts/                未完成草稿（不发布、不被引用）
│
├── main/
│   ├── mainpage.html          主页面：事件列表 + Markdown 阅读器
│   └── cq.html                彩蛋页 CQ（没有站内入口）
├── fleet/index.html           舰队
├── tool/
│   ├── index.html             工具页（星图入口 + 拾色器 / 时间转换 / 罗马数字）
│   └── starmap/index.html     星图（canvas + 数据 + Starmap®OS 启动画面；刻意没有页脚）
├── about/index.html           关于（授权说明与致谢）
├── archive/
│   ├── index.html             档案总览
│   ├── organization/          组织档案：index + 16 个组织页 + 隐藏页 dgam.html
│   ├── personnel/             人员档案：index + sxm / sam / sfm / spm
│   ├── facility/index.html    深空设施档案
│   ├── vessel/index.html      舰船档案
│   ├── biology/               index.html + template.html（模板不发布）
│   ├── document/              index.html + template.html（模板不发布）
│   └── uncategorized/index.html  未归类档案
│
├── assets/
│   ├── css/                   样式：根目录放全站共用（global / boot / error / markdown /
│   │                          archive / cq-entry），其余按页面路径同名分子目录
│   ├── js/                    脚本：按页面同名 + 全站共用（background / cursor / seamless /
│   │                          spa / navtoggle / boot / notice / eggs / org-* …）
│   ├── data/                  页面读的数据 JS —— 生成物，不要手改（见第 6 节）
│   ├── post/                  事件文章 .md + index.json；这个目录本身是 Obsidian 库
│   ├── document/              文件档案源：<来源>/<文件> + .meta.json sidecar
│   ├── uncategorized/         未归类档案源（同一套目录规则；sidecar 可选、编号自动）
│   ├── fonts/                 Sarasa Gothic / Mono 两族共 7 个 woff2
│   ├── img/                   logo、QSL、Deptlogo/、contact/、cursor/、biology/
│   └── audio/                 彩蛋页用的两段 WAV
│
├── src/                       仓库侧的构建物料（不发布）
│   ├── csv/                   CSV 源数据（人直接编辑；说明见 src/csv/README.md）
│   │   ├── personnel/         classes.csv / members.csv
│   │   ├── facility/          affiliations / facilities / unique-parts / common-parts / orgs
│   │   ├── vessel/            sizes / vessels / equipment
│   │   ├── starmap/           systems.csv
│   │   └── README.md          每列含义 + 编辑约定 + 常见操作
│   └── scripts/               构建 / 索引脚本
│       ├── data-csv.mjs       CSV ⇄ JS：build / check / export
│       └── document-index.mjs 扫描两个档案源目录 → assets/data/{document,uncategorized}.js
└── .github/                   CI 与自检（不发布）
    ├── workflows/             build-data / document-index / generate-post-index / stamp-sw-version
    ├── stamp-sw-version.mjs   按预缓存文件内容指纹写 sw.js 的 CACHE_VERSION
    └── verify-site.ps1        线上 URL 契约自检
```

> **源叫 `src/csv/`，生成物才叫 `assets/data/`。** 以前源目录也叫 `data/`，和
> `assets/data/` 同名，很容易搞混「改哪份」。现在全仓库只有一个 `data` 目录（页面读的生成物），
> 源永远是 `src/csv/`：改 CSV → `build` → 页面读 `assets/data/*.js`。源和脚本都收在 `src/`，
> 整个目录不发布。

---

## 3. 命名约定

| 对象 | 规则 | 例子 |
| --- | --- | --- |
| 页面目录 | 全小写、`-` 分词；一个页面一个目录，入口固定 `index.html` | `tool/starmap/index.html` |
| 子页 | 短名 `.html`（放在同一目录里） | `archive/personnel/sxm.html` |
| CSS / JS | 与页面路径同名，放 `assets/css|js/` 下对应子目录 | `assets/css/archive/personnel.css` |
| 数据源 | `src/csv/<档案>/<表名>.csv`，表名用 `-` 分词 | `src/csv/facility/unique-parts.csv` |
| 数据生成物 | `assets/data/<档案>.js`，全局变量 `window.SSS_*` | `assets/data/personnel.js` |
| 事件文章 | `assets/post/<显示标题>.md`，**文件名就是标题** | `assets/post/希望号任务.md` |
| 档案文件 | `assets/document/<来源>/<文件名>.<扩展名>`，一层目录名 = 来源 | `assets/document/资料部独立档案/记录：星能.md` |
| sidecar | 紧跟源文件：`<文件名>.<扩展名>.meta.json` | `记录：星能.md.meta.json` |
| 扫描忽略 | 以 `_` 或 `.` 开头的文件 / 目录，扫描器直接跳过 | `assets/uncategorized/_README.md` |
| 仓库文档 | `docs/` 下大白话文件名；索引固定 `README.md` | `docs/MAINTENANCE.md` |
| 脚本 | `src/scripts/<用途>.mjs`；CI 辅助放 `.github/` | `src/scripts/data-csv.mjs` |

中文文件名是允许的（文章标题、档案来源 / 文件名本来就该是中文）。两个注意点：

- 文件名里的冒号要用**全角 `：`**（Windows 不允许半角 `:`）；URL 会自动百分号编码，
  像 `记录：星能.md` 变成 `%E8%AE%B0%E5%BD%95%EF%BC%9A%E6%98%9F%E8%83%BD.md`。
- **显示标题、编号、日期、密级都由 sidecar 决定**，不受文件名限制；文件名只影响默认标题。

---

## 4. 新增内容往哪放

| 我要加… | 放哪儿 | 之后要做什么 |
| --- | --- | --- |
| 一个新页面 | `<目录>/index.html`，CSS / JS 放 `assets/css|js/<同路径>.css|js` | 做 MAINTENANCE「加新页面时要一起做的八件事」；补 `sw.js` 预缓存 |
| 一篇事件文章 | `assets/post/<标题>.md` | 推上去 CI 重排 `index.json`，不用手改 |
| 一名成员 / 设施 / 舰船 / 星系 | `src/csv/<档案>/*.csv` 对应行 | `node src/scripts/data-csv.mjs build` |
| 一份档案文件 | `assets/document/<来源>/` + sidecar（`number` 必填） | `node src/scripts/document-index.mjs` |
| 一份未归类文件 | `assets/uncategorized/<来源>/` + sidecar（可选） | 同上（编号自动） |
| 一篇仓库文档 | `docs/` | 到 `docs/README.md` 登记一行；不要写成站点页面 |
| 一个构建 / 校验脚本 | `src/scripts/` | 不用动 `.assetsignore`（`src/` 整个目录都不发布） |
| 一张图 / 字体 / 音频 | `assets/img/` `assets/fonts/` `assets/audio/` | 若页面要预缓存，补 `sw.js` |
| 一个新依赖 | **不要** —— 站点是零依赖纯静态 | 真要引入先看 MAINTENANCE「本地预览」 |

---

## 5. 公开面（发布与缓存）

站点只发「页面 + `assets/` 里的资源 + `404.html` + `sw.js` + `README.md` + `LICENSE`」。
下面这些在 `.assetsignore` 里被排除，线上是 404：

| 不发布 | 原因 |
| --- | --- |
| `.git/`、`.github/`、`.gitignore` | 仓库历史 / CI；`.git/` 等于把历史挂到公网 |
| `wrangler.jsonc` | 部署配置 |
| `/docs` | 仓库文档（含本文件、草稿）只给仓库看 |
| `/src` | CSV 源与构建脚本；站点只需要生成出来的 `assets/data/*.js` |
| `archive/biology/template.html`、`archive/document/template.html` | 带占位符的内部模板 |
| `/assets/**/*.meta.json` | sidecar 只是构建输入，页面不读 |
| `assets/uncategorized/_README.md` | 目录说明只给仓库看 |
| `assets/post/.obsidian` | 36 MB 的本地 Obsidian 配置 |
| `.idea/`、`.tmp-shots/`、`node_modules/` 等 | 本地环境 / 工具产物 |

判断某个路径线上是什么状态：

```powershell
curl.exe -sSI https://starlightsacredsanctuary.top/docs/STRUCTURE.md   # 应为 404
curl.exe -sSI https://starlightsacredsanctuary.top/README.md           # 应为 200
```

**缓存**：`sw.js` 预缓存清单里的文件 + `assets/post/**/*.md` 一有字节变化，CI（`stamp-sw-version`）
就会改 `CACHE_VERSION`，浏览器才会装新 SW。改 `docs/`、`src/csv/`、`src/scripts/`、`.assetsignore`
**不**在指纹范围内，不会触发版本号 —— 这是对的，它们不进站点。

---

## 6. 源文件与生成物（别手改生成物）

| 生成物 | 源 | 生成命令 | CI |
| --- | --- | --- | --- |
| `assets/data/personnel.js`、`facility.js`、`vessel.js`、`starmap-data.js` | `src/csv/**/*.csv` | `node src/scripts/data-csv.mjs build` | `build-data.yml`（push `src/csv/**`） |
| `assets/data/document.js`、`uncategorized.js` | `assets/document/**`、`assets/uncategorized/**` | `node src/scripts/document-index.mjs` | `document-index.yml` |
| `assets/post/index.json` | `assets/post/*.md` | 由 CI 的 Python 片段生成 | `generate-post-index.yml` |
| `sw.js` 的 `CACHE_VERSION` | `PRECACHE_URLS` 列出的文件 + 文章正文 | `node .github/stamp-sw-version.mjs` | `stamp-sw-version.yml` |

生成物文件头里写着「不要直接改这里」和对应文档名。要改行为就改生成器
（`src/scripts/*.mjs`），再重新生成 —— 直接改生成物会被下一次 build / CI 覆盖。

---

## 7. 常用命令

```bash
python -m http.server 8000            # 本地预览（不要双击 HTML，file:// 下文章列表读不到）
node src/scripts/data-csv.mjs build       # CSV → assets/data/*.js
node src/scripts/data-csv.mjs check       # 只校验，不写文件（CI 同款）
node src/scripts/data-csv.mjs export      # 反向导出（会覆盖 CSV，慎用）
node src/scripts/document-index.mjs       # 重建两份档案索引
node src/scripts/document-index.mjs --check
node .github/stamp-sw-version.mjs --check
pwsh -File .github/verify-site.ps1    # 线上 URL 契约自检（迁移前后都用它）
```

---

## 8. 文档分工

| 文档 | 写给谁 | 讲什么 | 什么时候读 |
| --- | --- | --- | --- |
| [README.md](../README.md) | 访客 / 读者 | 站点是什么、有哪些页面、授权 | 改读者能看到的东西时 |
| [docs/README.md](README.md) | 自己 | 文档索引与阅读顺序 | 不知道翻哪份时 |
| 本文件 | 自己 | 仓库结构与命名规范 | 加文件 / 挪目录 / 不确定放哪儿时 |
| [MAINTENANCE.md](MAINTENANCE.md) | 自己 | 操作手册 + 踩坑记录 | 写文章、改数据、部署、改样式时 |
| [DESIGN.md](DESIGN.md) | 自己 | 设计语言与组件规范 | 写新页面 / 调样式时 |
| [MIGRATION-CLOUDFLARE.md](MIGRATION-CLOUDFLARE.md) | 自己 | Netlify → Cloudflare 的完整过程 | 查迁移细节或 DNS / 部署决策时 |
| [src/csv/README.md](../src/csv/README.md) | 自己 | CSV 每列含义、编辑与校验约定 | 改数据时 |
| 目录里的 `_README.md` | 自己 | 该源目录怎么放文件 | 往档案目录丢文件时 |

---

## 9. 改结构 / 改路径时的检查清单

动过目录、页面地址、资源路径之后，逐条过一遍：

- [ ] 本文件的目录树同步更新
- [ ] `.assetsignore`（新目录该不该发布）
- [ ] `sw.js` 的 `PRECACHE_URLS`（页面 / CSS / JS / 数据有没有漏）
- [ ] 站内链接与相对路径（各页导航、页脚、侧栏、返回链接）
- [ ] `.github/workflows/*.yml` 里的 `on.push.paths` 与脚本路径
- [ ] 各文档里的路径引用（`grep` 一遍 `MAINTENANCE.md` / `DESIGN.md` / 旧路径）
- [ ] `node src/scripts/data-csv.mjs check`、`node src/scripts/document-index.mjs --check`
- [ ] 推送后等 CI，确认 `CACHE_VERSION` 有没有跟着变
- [ ] `pwsh -File .github/verify-site.ps1` 跑一遍线上契约

---

## 10. 编码与换行

- 文本一律 **UTF-8**；`.gitignore` 里的文件不要加 BOM，**唯一例外**是
  `.github/verify-site.ps1` —— 它必须带 BOM，否则 Windows PowerShell 5.1 会把中文解析坏。
- Git 里存 **LF**；Windows 工作区是 CRLF（`core.autocrlf=true`）。生成脚本按 LF 比较内容，
  所以本地和 CI 得到同一个指纹。
- CSV 用 **UTF-8 带 BOM**，方便 Excel 双击不乱码（见 `src/csv/README.md`）。
- 文章 .md 用 LF 入库即可，Obsidian 写入的换行不影响发布。

---

## 11. 本地约定（不进版本库的东西）

- `.tmp-shots/`：本地冒烟测试截图 / 临时脚本 / 独立 Chrome profile，体积可能上百 MB，
  `.gitignore` + `.assetsignore` 双保险。测完可整个删掉。
- `assets/post/.obsidian/`：本地 Obsidian 库配置，两处 ignore 都有它，别提交。
- `docs/drafts/`：未定稿的仓库文档（当前是双语 README 草稿）。随 `/docs` 不发布。
- **还没 sidecar 的档案草稿不要提交**：文件档案的 `number` 是手写的，缺了 `number` 会让
  `document-index`（以及 CI）直接报错。先在本地补齐 sidecar，再连同索引一起推。
