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
├── starmap/index.html          旧地址重定向 → /tool/starmap/
├── fleet/index.html            舰队
├── tool/index.html             工具
├── tool/starmap/index.html     星图（canvas + 数据 + Starmap®OS 启动画面；刻意没有页脚）
├── archive/index.html          档案（分类导航）
├── archive/organization/index.html  组织档案（组织名录导航：官方 / 半官方 / 非官方三类，目前只有官方组织有内容）
├── archive/organization/cam.html    管理成员议会（最高权力机构；3 列 × 4 位议员）
├── archive/organization/dgam.html   管理成员讨论组（机密彩蛋页，无入口、无站内跳转）
├── archive/organization/res.html    科研部（部门页模板：题图 / 概要 / 详情 / 四个下属局）
├── archive/organization/ind.html    工业部（题图 / 概要 / 详情 / 下属「数据损坏」占位）
├── archive/organization/adm.html    管理部（题图 / 概要 / 详情 / 下属「数据损坏」）
├── archive/organization/int.html    情报部（题图 / 概要 / 详情 / 下属「数据损坏」）
├── archive/organization/dip.html    外交部（题图 / 概要 / 下属「数据损坏」）
├── archive/organization/col.html    收集部（题图 / 概要 / 下属「数据损坏」）
├── archive/organization/log.html    后勤部（题图 / 概要 / 下属「数据损坏」）
├── archive/organization/flo.html    舰队后勤部（题图 / 概要 / 下属「数据损坏」）
├── archive/organization/arc.html    资料部（题图 / 概要 / 详情 / 下属「数据损坏」）
├── archive/organization/eco.html    经济部（题图 / 概要 / 下属「数据损坏」）
├── archive/organization/lif.html    生命部（题图 / 概要 / 详情 / 下属「数据损坏」）
├── archive/organization/edu.html    教育部（题图 / 概要 / 下属「数据损坏」）
├── archive/organization/inv.html    调查部（题图 / 概要 / 下属「数据损坏」）
├── archive/organization/pla.html    规划部（题图 / 概要 / 下属「数据损坏」）
├── archive/organization/tas.html    战术战略部（题图 / 概要 / 下属「数据损坏」）
├── archive/personnel/index.html 人员档案（四个等级入口；卡片人数由数据渲染）
├── archive/personnel/sxm.html   管理成员（SXM）：HTML 壳，名单/档案由数据渲染
├── archive/personnel/sam.html   高级成员（SAM）：HTML 壳，名单/档案由数据渲染
├── archive/personnel/sfm.html   正式成员（SFM）：HTML 壳，名单/档案由数据渲染
├── archive/personnel/spm.html   预备成员（SPM）：HTML 壳，名单/档案由数据渲染
├── archive/facility/index.html 深空设施档案（无分类：左栏设施名录 + 右栏档案，全由数据渲染）
├── archive/vessel/index.html     舰船档案（按尺寸分类：左栏舰船名录 + 右栏档案，全由数据渲染）
├── about/index.html            关于（授权说明与致谢）
│
├── assets/
│   ├── css/
│   │   ├── global.css          全站共用：字体声明 + 控件设计令牌（--ctl-*）
│   │   ├── index.css           首页
│   │   ├── error.css           错误页
│   │   ├── archive.css         档案页
│   │   ├── archive/organization.css  组织档案页
│   │   ├── archive/personnel.css     人员档案页
│   │   ├── archive/facility.css      深空设施档案页
│   │   ├── archive/vessel.css          舰船档案页
│   │   ├── main/mainpage.css   主页面
│   │   ├── main/cq.css         彩蛋页 CQ
│   │   ├── starmap/index.css   星图 + Starmap®OS 启动画面
│   │   ├── fleet/index.css     舰队页
│   │   ├── tool/index.css      工具页
│   │   └── about/index.css     关于页
│   │
│   ├── js/
│   │   ├── background.js       全站背景（星野 / 六边形网格 / 鼠标激活区）
│   │   ├── cursor.js           指针动效：自绘指针 + 图形自转（精细指针 + 非 reduced-motion）
│   │   ├── fleet.js            舰队页：悬停卡片时把整页主题色（紫）切到该舰队的颜色（含背景 / 顶栏）
│   │   ├── notice.js           一次性欢迎通知（localStorage 记已读）
│   │   ├── seamless.js         Service Worker 注册与更新 + 非 Chromium 的预取回退
│   │   ├── spa.js              站内同文档导航（除星图 / 彩蛋外全站）
│   │   ├── navtoggle.js        窄屏顶栏折叠（汉堡按钮 + 下拉面板）
│   │   ├── archive-scroll.js   档案页：给能滚的容器挂 .is-scrollable 并连续写上下淡出长度
│   │   ├── archive-list-search.js 档案页左栏名录搜索：按名称过滤（外观与交互照星图搜索）
│   │   ├── personnel.js        人员档案：从 personnel.js 数据渲染首页卡片 / 等级页名录与档案 + 亲属跳转（# 不滚页）
│   │   ├── facility.js         深空设施档案：左栏名录 / 右栏档案（# 不滚页）
│   │   ├── vessel.js           舰船档案：左栏名录 / 右栏档案（# 不滚页）
│   │   ├── org-member.js       未建档成员名的提示条（已建档的名字直接链到人员档案）
│   │   ├── org-secret.js       组织档案页的隐藏入口：三张部门卡拖到议会卡上解锁 DGAM
│   │   ├── eggs.js             彩蛋登记册（记已发现 + 填「关于」页那张卡片）
│   │   ├── main.js             首页打字机效果
│   │   ├── tool.js             工具页（拾色器 + 时间转换 + 罗马数字）
│   │   ├── starmap.js          星图绘制与交互（渲染脚本，页面在 tool/starmap/index.html 直接引用）
│   │   ├── starmap-bg.js       星图页专用的背景参数
│   │   └── marked.min.js       Markdown 渲染（marked v9.1.6）
│   │
│   ├── data/                   页面读的数据 JS —— **生成物**，源文件是仓库根目录的 data/**/*.csv
│   │   ├── personnel.js        人员数据（SXM/SAM/SFM/SPM 名单 / 身份 / 亲属 / 科研 / 反馈；亲属名在库内自动链到成员）
│   │   ├── facility.js         深空设施数据（名录 / 归属 / 配件 / 应对措施；正文纯文本，不写资料库 wiki 链接）
│   │   ├── vessel.js           舰船数据（尺寸分类 / 舰种 / 迭代次数 / 简介 / 详细装备；正文纯文本）
│   │   └── starmap-data.js     星系数据（STARMAP_DATA）
│   │
│   ├── fonts/                  Gothic / Mono 两族共 7 个 woff2（约 43 MB）
│   ├── img/                    logo_SSS.svg（站点图标 + 导航栏 logo，见「设计约定」）
│   │                           logo_SSS_boot.svg（加载屏徽记用；同上图，四周多留 6px 画布，
│   │                           否则外圈描边被 viewBox 裁掉，放大后圆边会平切）
│   │                           QSL.png（彩蛋页用，2854×2008）
│   │                           cursor/ 24 个 32×32 SVG 指针（星芒家族：默认星芒、金星 +
│   │                           轨道环、文本菱、准星、拖拽、缩放、禁止、复制…由 global.css 的 --cur-* 引用）
│   ├── audio/                  彩蛋页用的两段 WAV（cq.wav / QSL-sstv.wav，共约 5 MB）
│   └── post/                   事件正文 .md + 自动生成的 index.json
│
├── data/                       数据源（CSV，人直接编辑；说明见 data/README.md）
│   ├── personnel/              classes.csv / members.csv
│   ├── facility/               affiliations / facilities / unique-parts / common-parts / orgs
│   ├── vessel/                 sizes / vessels / equipment
│   ├── starmap/                systems.csv
│   └── README.md               每列含义 + 编辑约定 + 常见操作
│
├── scripts/
│   └── data-csv.mjs            CSV ⇄ JS：build / check / export
│
└── .github/workflows/generate-post-index.yml
```

---

## 数据怎么改：改 CSV，然后 build

人员 / 深空设施 / 舰船 / 星图的数据源在 `data/` 下的 CSV，`assets/data/*.js` 是
`node scripts/data-csv.mjs build` 从 CSV 生成的。**改数据不要碰 `assets/data/*.js`**，
下次 build 会整个覆盖。

```bash
node scripts/data-csv.mjs build    # CSV → assets/data/*.js
node scripts/data-csv.mjs check    # 只校验是否一致（CI 同款），不写文件
```

- 一个单元格里换行 = 多条内容（简介的一段一段、角色的分条、装备的逐条）
- 表格软件能用，但 Excel 会把 `anchor` / `identity` 这类长数字、`410/10/27` 这种生日
  自动改成科学计数法 / 日期 —— 用 Excel 要按「文本」导入，细节见 `data/README.md`
- 推送到 master 且改到 `data/**` 时，GitHub Actions 会自动 build 并提交生成结果
  （连同 `sw.js` 的 CACHE_VERSION），本地忘了跑也不会漏
- 每列的含义、子表（配件 / 装备 / 组织）怎么挂、加一条数据要动哪几个文件，
  全部写在 [data/README.md](data/README.md)，这里不重复

---

## 人员档案：缺失数据一律写成「数据损坏」

考虑到世界观完善性，站点上所有未完成 / 看不全的数据，除页面明确写明「全部」外，一律按「数据损坏导致无法访问」处理：

- 单个字段为空 → 显示「数据损坏」；
- 整份档案缺失 / 打不开 → 数据损坏、无法访问；
- 页面、数据文件和代码注释里不要写「待补」「暂无」这类现实口径。

人员数据在 `data/personnel/*.csv`（build 生成 `assets/data/personnel.js`）；`personnel.js` 渲染时把空字段统一换成「数据损坏」。

---

## 档案页左栏名录：与右栏内容同高、下界对齐

人员档案等级页、舰船档案、深空设施档案的版式是「左名录 + 右档案」两栏。
这 6 个页面（4 个人员等级页 + 舰船 + 深空设施）的 `<body>` 写
`data-archive="split"`：名录与内容装进同一个 `1fr` 网格行、两栏都是 `height: 100%`，
所以**两栏的上下界严格对齐**，下界以名录这一栏为基准。

- 名录高度沿用 `--archive-list-height`，但在视口框里被改成 `100%`
  （不再是 `100vh - 300px` 的估算值）—— 它现在等于网格行高；
- **左栏**：固定的「名录 N + 搜索框」（`.xxx-list__head`）在上面，
  下面 `.xxx-list__scroll` 自己滚 —— 标题和搜索不会跟着名录滚走；
- **右栏**：固定的档案标题（`.xxx-profile__head`）在上面，
  下面 `.xxx-profile__body` 自己滚 —— 标题不会跟着正文滚走；
- **默认空白**：没有 `#…` / `?person=` 时什么条目都不选（左栏没有 `.is-active`，
  右栏也不预开第一条），右栏显示 `.archive-empty` 占位面板，读数为 **NO / INFO**；
  点条目、搜索回车或带深链进来才激活。页面脚本在 `activate()` 里同时切换
  `.is-active` 和 `empty.hidden`；没有有效 id 时回到空白态；
- **点空白处取消选择**：左栏点条目 / 搜索 / 展开按钮以外的地方、右栏点面板 /
  档案头 / 链接按钮以外的地方，都会清空当前选择回到 NO / INFO；
  **页面最左 / 最右的留白**（`main` 铺满视口、正文 `.archive-section` 居中，
  点在这段 section 外的留白上）同样取消；**再点一次已经高亮的条目也会取消选择**
  （切换开关语义）；清除时用 `pushState` 去掉 `#…` / `?person=`（浏览器后退能回到原选择）；
- **切换动画**：新档案 / 空白态用 220ms 的淡入 + 从右侧 8px 横向滑入
  （`archive-swap-in`，方向照星图的星系介绍）；旧档案同时向左 180ms 淡出
  （`archive-swap-out`），浮在新内容上做交叉淡化，190ms 后由脚本收掉 ——
  取消选择时旧档案也是淡出而不是瞬间消失。离场层只在桌面 ≥901px 且
  不减少动态效果时启用；窄屏直接换，不做上下跳动；
- 两栏各自按滚动状态淡出；名录的淡出长度比内容短
  （桌面 56px / 窄屏 40px，内容栏是 120px / 80px），见下面「滚动淡出」；
- 页面本身与 `.archive-body` 都不滚，只有上面这两个内层容器滚；
- ≤900px 两栏退回上下排：名录摊成网格、`height: auto`，由 `.archive-body` 整页滚。

### 左栏名录搜索

6 个两栏页的左栏都有搜索框，用来过滤下面的名录：

- 搜索框在「名录 N」下面，属于 `.xxx-list__head`，**不随名录滚动**；
- 按名称过滤（中文名 / 英文名 / 拉丁名），匹配是**就地隐藏**不匹配的条目，
  不是像星图那样弹结果层 —— 这里搜的就是下面这份名录本身；
- 外观与交互照星图搜索（`tool/starmap/` 的 `.map-search`）：放大镜图标、
  聚焦金边、原生清除按钮；`Esc` 清空、`Enter` 打开第一条匹配、
  `↓` 把焦点交给第一条匹配；没有匹配时显示「没有找到匹配的条目」；
- 分组标题跟随组内是否还有可见条目一起隐藏；设施页的父子文件夹
  （`.facility-list__branch`）在有子条目命中时自动展开，清空后恢复原来的开合状态；
- 实现：`assets/js/archive-list-search.js`（页面在 data 脚本和页面脚本之间引入），
  页面脚本渲染完后调 `window.SSSArchiveSearch.attach({…})`，把 input / items /
  groups / branches / 滚动容器交给它。**新加带左栏名录的页面时别忘了这个脚本。**

---

## 档案页的视口框：页头常驻 / 页脚常驻 / 内容两端淡出

**这是档案页的版式规范**（2026-11 起）：`archive/` 下**所有**页面都不整页滚动，
而是像一块仪表屏 ——

1. **页头常驻**：面包屑 + 标题（h1 / 部门题图）+ 英文副题 + 简介在滚动区**外面**，
   页面怎么滚，它们都不动；
2. **页脚常驻**：`body` 高度锁在视口高度（`100dvh`），页脚仍是竖排 flex 的最后一格，
   所以它**始终贴着视口底部**，不会随内容滚走；
3. **内容在中间滚**：标题以下的一切包进 `.archive-body`。普通档案页由它自己滚；
   `data-archive="split"` 的两栏页里它不滚，改由左栏名录列表和右栏档案正文
   各自滚 —— 右栏的档案标题固定在正文外面，不跟着滚（见上一节）；
4. **两端淡出**：滚动容器在**还有内容可滚**的方向上淡出
   （内容栏最大 120px；窄屏 80px），由 `assets/js/archive-scroll.js` 连续控制：
   - 能滚才加 `.is-scrollable`（只在"能滚 / 不能滚"切换时变一次，不在滚动中变）；
   - 上端 `--fade-top` 从 0 开始，按 2 倍滚动距离长到 `--archive-fade`
     （滚 60px 就长满），面板框进入视口时已经被压得很淡；
   - 下端 `--fade-bottom` 随剩余距离收缩，但内容栏保留 `--archive-fade-min`
     （64px；窄屏 40px），滚到最底部也不会把面板背景框硬切掉；
   - 短内容没有 `.is-scrollable`，不挂 mask，不会被压暗。
   因为长度是**连续变化**的，开始滚 / 滚到底不会突然挂上或摘掉整条 mask，
   标题和面板框不会"突变"（Firefox 下尤其明显）。
   **左栏名录的淡出更短**：`--archive-fade: 56px`（窄屏 40px）、
   `--archive-fade-min: 0`；它只是索引，不需要跟右栏内容一样长的渐变。
   **渐变曲线是前段压得很低、后段才抬起来的（不是线性）**：面板背景 / 1px 描边
   刚进入过渡带时几乎看不见，不会留下一条硬边。
   **渐变长度与留白是两个变量**：`--archive-fade` 管渐变长度，`--archive-pad`
   管内容与盒边的呼吸留白，别混在一起。

实现全在 `assets/css/archive.css` 末尾的「档案页视口框」块，页面侧只有两处标记：

```html
<body data-archive>                 <!-- 两栏页写 data-archive="split" -->
    …
    <main>
        <section class="archive-section（或 .org-section）">
            <nav class="crumb">…</nav>
            <header class="archive-head（或 .org-head）">
                <h1>…</h1>
                <p class="archive-sub（或 .org-sub）">…</p>
            </header>

            <div class="archive-body">
                <!-- 这一页会滚动的内容全放这里；两栏页里是 .xxx-layout -->
            </div>
        </section>
    </main>
    <footer class="site-footer">…</footer>
</body>
```

- **`data-archive` 必须写成 body 的 `data-*` 属性，不要写成 class**：
  站内同文档换页（`spa.js`）只把目标页的 `data-*` 搬到 body（`syncBody()`），
  换页进出档案页时这套版式才会自动切换。写成 class 会在换页后残留 / 丢失，
  表现为「从档案页跳到别的页后页面不滚 / 进了档案页却仍整页滚动」。
  `data-archive` 的值也会跟着搬，所以两栏页进出站内换页同样会自动切对。
- **别把滚动内容放到 `.archive-body` 外面**：`.archive-body` 之外的部分不会滚，
  超出一屏会被 `overflow: hidden` 直接裁掉（页头和页脚本来就要留在外面）。
- **别把滚动容器的上下 padding 改成 0**：`--archive-pad` 是内容与盒边的呼吸留白，
  改小会让第一行贴着页头 / 页脚。渐变长度是另一个变量 `--archive-fade`，
  只在 `archive.css` 的 `body[data-archive]` 上改。
- **`mask-image` 必须同时写 `-webkit-mask-image`**（Safari 只认带前缀的那条）；
  mask 的渐变坐标相对容器的边框盒，所以它固定在窗口两端。
- **滚动淡出靠 `assets/js/archive-scroll.js`**：它只给能滚的容器加
  `.is-scrollable`，并连续写 `--fade-top` / `--fade-bottom`；短内容不挂 mask。
  **每个档案页都要引它**，放在页面自己的脚本之后（人员 / 设施 / 舰船是
  `.xxx.js` 之后）；切换条目后页面脚本会调
  `window.__sssArchiveScroll.refresh()` 重算。
- 窄屏**不退回整页滚动**（普通档案页）：`100dvh` 保证页脚始终可见；
  两栏页在 ≤900px 才退回整页滚动，名录摊成网格（`height: auto`）；
  ≤768px 渐变缩到 80px、留白缩到 16px。
- `body[data-archive]` 下 `main` / `section` 都要带 `min-height: 0`（flex 子项默认
  `min-height: auto`，不给的话内部滚动区会被内容撑高、页脚重新被顶出视口）。

### 跟这个框有关的几个联动点

- **两栏页的名录**（人员等级页 / 舰船 / 深空设施）：两栏同高（`--archive-list-height: 100%`），
  名录不再 `position: sticky`，它本身就是固定高度的滚动容器；≤900px 退回 `height: auto`。
- **`#设施代号` / `#舰船代号` 深链与切换条目后的回滚**：`facility.js` / `vessel.js`
  在桌面两栏页里滚右栏（`.facility-detail` / `.vessel-detail`），窄屏滚
  `.archive-body`（顶部留出过渡区，标题不会落进淡出带里）；`.facility-profile` /
  `.vessel-profile` 的 `scroll-margin-top` 也改成了 `var(--archive-fade)`。
- **加新的档案页**：除了「加新页面时要一起做的八件事」，再补三步 ——
  ① `<body data-archive>`（两栏版式再加 `="split"`）；② 用 `.archive-body` 包住标题以下的内容
  （放在页头之后、`</section>` 之前）；③ 引入 `assets/js/archive-scroll.js`
  （放在页面自己的脚本之后）。两栏页如果也有左栏名录，再引入
  `assets/js/archive-list-search.js`（放在页面脚本之前）。别忘 `sw.js` 的 `PRECACHE_URLS`。
- 这一页的滚动位置**不参与浏览器的整页滚动恢复**（滚的是内层容器）。
  从站内导航回来时内容从顶部开始；带 `#` / `?person=` 的深链仍由页面脚本定位。

---

## 深空设施档案：一个页面，左名录右档案

深空设施 = 巨构 / 超级武器，**不设分类层级**：`archive/facility/index.html` 一页就是全部档案，
左栏设施名录（按归属分组）、右栏选中设施的档案，链接用 `#设施代号` 定位（与人员档案等级页同一套交互）。

- 数据在 `data/facility/*.csv`（build 生成 `assets/data/facility.js`）；渲染在 `assets/js/facility.js`；样式在 `assets/css/archive/facility.css`
- 名录按归属分组：星光圣域（SSS）固定第一，其余按 `affiliations` 里的缩写首字母排；
  没有缩写的势力排在带缩写之后，归属为空的条目归入「数据损坏」组、排最后
- 父子设施用 `parent` 字段（如四个分支矩阵挂在 索拉克矩阵 下、标准灯塔 / P-304 挂在 标准灯塔系统 下）：
  子设施在左栏缩进到父设施下面，父设施那一行是「文件夹」——点父设施同时选中它并展开，
  右侧箭头只负责开合；子设施不再单独出现在归属分组里（分组按父设施算），
  子设施属于别的势力时，英文类型后面补一个缩写（SSS / HTL …）
- 每条名录显示设施类型（`kind`）+ 英文类型（`kindEn`）；同一类型有多条时（索拉克分支矩阵 ×4）
  自动补上各自的名字，避免左栏出现一模一样的条目
- 组内顺序 = `facilities` 数组的书写顺序（只看顶层设施）
- 加一条设施：追加一项、`id` 唯一即可 —— 名录 / 档案 / 锚点都会自动出来
- 正文是纯文本：**不要把资料库的 wiki 链接（`[[…]]`）或资料库路径写进数据**，
  录入时先把链接展开成显示文本（计划名用 “” 括起来，免得和上下文粘在一起）
- 简介里不再重复「所属计划」：计划只在「基本信息」写一次，资料库正文里
  「…为…计划的成果 / 内容」这类句子在录入时删掉
- 授权等级用 `SXM / SAM / SFM / SPM`（与人员档案同一套）；
  「机密」是保护等级（旧说法，正在淘汰），**不是授权等级**，别写进 `clearance`
- 缺失口径与人员档案一致：空字段、截断的段落一律渲染成「数据损坏」；
  整条记录截断的，在「基本信息」底部写「记录状态：数据损坏 —— <原因>」
- 非星光圣域的设施（资料库开头写明「不是星光圣域的巨构」）在档案头标「非星光圣域设施」，
  `foreign: true`；它们没有星光圣域的独特 / 通用配件，写进 `parts.note` 说明，别留成「数据损坏」
- 原文照抄资料库（含原文里的英文拼写与错字），**不要在站点上顺手改写设定**：
  要改先改资料库，再同步到这里

---

## 舰船档案：一个页面，左名录右档案，按尺寸分类

`archive/vessel` 一页收录资料库「军事 / 舰队作战 / 舰船舰体」下的全部舰船，
左栏舰船名录（按尺寸分类分组）、右栏选中舰船的档案，链接用 `#舰船代号` 定位（与深空设施档案同一套交互）。

- 数据在 `data/vessel/*.csv`（build 生成 `assets/data/vessel.js`）；渲染在 `assets/js/vessel.js`；样式在 `assets/css/archive/vessel.css`
- 名录分组按 `sizes` 数组的顺序：巨型 / 大型 / 中型 / 小型；组内顺序 = `vessels` 的书写顺序
- 尺寸分类以资料库的目录归属为准（`舰船舰体/巨型舰船` 等四个目录）。
  资料库「分类.md」写明尺寸分类不是严谨的分类，个别舰船的目录归属与舰种分类表并不一致
  （“奥罗拉”级在 `中型舰船` 但舰种是战列巡洋舰；两型引导舰在 `小型舰船` 但分类表写中型）——
  **照目录录入，不在站点上替资料库裁决**
- 每条名录显示舰船名 + 舰船英文名（`en`）；档案头写舰种（`kind`），
  「基本信息」写尺寸分类与迭代次数（资料库没写迭代次数就不出现这一行）
- 英文名是站点对中文名的译名（资料库没有英文舰名）；通用舰种型（科研舰、两型引导舰）
  没有独立的舰名，直接用舰种英文名
- 详细装备按系统一行一套（`equipment[]` 的 `{ label, items[] }`）：
  `items` 为空 = 这一套系统存在但读不到，渲染成「数据损坏」；`N/A` 原样显示
- DSRCPSys 自主设计的舰船没有通用设计接口：说明写进 `equipmentNote`，
  它会替代整份装备清单，而不是留成「数据损坏」
- 加一条舰船：追加一项、`id` 唯一、`size` 用 `sizes` 里已有的名字即可 ——
  名录 / 档案 / 锚点都会自动出来
- 正文是纯文本：不要把资料库的 `[[…]]` 链接或资料库路径写进数据，录入时把链接展开成显示文本；
  原文照抄（含原文里的英文拼写与错字），要改先改资料库，再同步到这里
- 缺失口径与人员 / 深空设施档案一致：截断的整条记录标 `damaged: true` 并写 `damagedNote`

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

> IDE 内置服务器的预览地址会多一层子路径（例如 WebStorm 的
> `http://localhost:63342/项目名/tool/index.html`）。`boot.js` / `seamless.js`
> 按「自己脚本的地址」推算站点根，所以首屏的字体预热、`index.json` 与
> Service Worker 注册在子路径下也能正确解析；部署在域名根时行为不变。

### 自动化测试时：不要关掉用户正在用的浏览器

用脚本跑冒烟测试（无头 Chrome / Firefox）时，**收尾禁止按进程名全杀**：

```powershell
# ❌ 绝对不要：会把用户正开着的窗口一起关掉
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process firefox -ErrorAction SilentlyContinue | Stop-Process -Force
taskkill /IM firefox.exe /F
```

`--headless` 也不能让"按名杀"变得安全 —— 无头进程和用户的窗口是同一个进程名。
正确做法：

1. **永远用独立的 profile / 数据目录**：Chrome `--user-data-dir=<临时目录>`，
   Firefox `--profile <临时目录>`。不要碰默认 profile（那里有用户的登录态和标签页）
2. 启动时用 `Start-Process ... -PassThru` 拿到 **PID**，收尾只结束它：
   ```powershell
   $p = Start-Process -FilePath $exe -ArgumentList @(...) -PassThru
   # …测试…
   Stop-Process -Id $p.Id -Force
   ```
3. 万一有子进程残留，**只按临时 profile 路径过滤**，不要按名字：
   ```powershell
   Get-CimInstance Win32_Process -Filter "Name='firefox.exe'" |
     Where-Object { $_.CommandLine -like "*$profile*" } |
     ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
   ```
4. 收尾删掉那个临时 profile

> 这条是踩出来的：两次按进程名清理，把本机正在用的浏览器窗口一起关了（用户当时的
> 标签页直接消失）。测试脚本宁可多留一个进程几秒，也不要按名字扫射。

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
  `assets/post/.obsidian` —— 它在 cwd 里，哪天用本地 `wrangler deploy` 会整个传上去；
  数据源 `data/` 与构建脚本 `scripts/` 也在清单里（线上只需要生成出来的 `assets/data/*.js`）
- 后台「设置 → 构建」：**构建命令「无」**、部署命令 `npx wrangler deploy`、根目录 `/`；
  推送到 `master` 自动构建部署（每次约 30–50 秒）。
  数据 CSV → JS 的那一步不在这边跑，交给 `.github/workflows/build-data.yml`
  （见上文「数据怎么改」），所以这边的构建命令仍然保持「无」
- ⚠️ **带 `[skip ci]` 的提交会跳过部署**（Netlify 与 Cloudflare 都是这个行为，实测踩过）。
  2026-10 的现场：`Generate Post Index` 那个动作把 index.json 提交回去时用了
  `chore: update post index [skip ci]` —— Actions 确实跑了、也确实把提交推上去了，
  但**这一次推送没有触发部署**：仓库里的 index.json 是新的，线上那份一直是旧的，
  表现就是「文章列表不自动更新」，而 Actions 那边还显示 success（每个 step 都成功）。
  现在那个工作流不再用任何 skip 标记，改成在 job 上加
  `if: github.actor != 'github-actions[bot]'` 来防止自己触发自己
  （`.github/workflows/generate-post-index.yml`）
- 文章索引 `assets/post/index.json` 在 SW 里走**网络优先**（其余静态资源是
  stale-while-revalidate）：它每次文章变动都会被重写，缓存优先会让新文章晚一次访问
  才出现在列表里；网络不通时再退回缓存（离线照样能看列表）
- 错误页只有一份 `404.html`（原先 `error.html` + `404.html` 两份内容相同，已合并成一份）：
  CF 的 404 页与 SW 的离线页都用它；自检脚本会把线上 404 响应与它逐字比对（不一致报 WARN）
- 同一份 `404.html` 也承担状态码展示：`/error/403`、`/error/500` 这类路径（静态托管会把未匹配
  路径交给本页）或 `?code=403` 会换用页内 `STATES` 表里对应的文案。**静态托管只发得出 404
  状态**，真正的 403 / 500 需要 Worker 或 Cloudflare 自定义错误页来触发；SW 的离线兜底
  也用这份文件，地址仍是请求时的 URL，所以离线打开 `/error/503` 同样显示 503。
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
stale-while-revalidate）。而浏览器只在 **`sw.js` 的字节变化**时才安装新 SW，所以改完页面
必须让版本号跟着变 —— 现在这件事**自动做**：

- `.github/workflows/stamp-sw-version.yml` 在每次推送后跑
  `.github/stamp-sw-version.mjs`：对 `PRECACHE_URLS` 列出的文件 + `assets/post/**/*.md`
  算内容指纹（换行统一成 LF；排除 `sw.js` 自己与自动生成的 `index.json`），
  写进 `const CACHE_VERSION = 'v5.72+<10 位 hash>'`，**有变化才提交**。
- 于是：任何页面/资源变动 → 换版本号 → 新 SW 装好并换掉旧缓存 →
  `controllerchange` 写下 `sss-boot-next` → **下次进入任意页面补弹一次加载屏**。
  没变动 → 不提交、不部署、不弹，站内切换继续走缓存。
- 手改 `CACHE_VERSION` 仍然有效，但不再是必需的纪律：语义部分（`v5.72`）会保留，
  指纹追加在后面。CI 自己推的版本号提交靠 job 上的 `if:` 防自触发。

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

### 加新页面时要一起做的八件事

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
7. `sw.js` 的 `PRECACHE_URLS` 里补上新页面和新 CSS/JS（否则离线访问那一页会漏，
   内容指纹也不会覆盖它 —— 改这一页就不会触发版本号与加载屏）
8. `<head>` 里加指针动效脚本：`<script defer src="…/assets/js/cursor.js"></script>`
   （自绘指针 + 图形自转；只在精细指针、未开 reduced-motion / forced-colors 时启动。
   漏了不会坏，只是那一页退回静态 SVG 指针）

### 工具页的目录与测试入口

工具页左栏是目录：**通用工具**（星图）在上，**测试工具**（公告测试 / 加载测试）在下；右栏是「便捷转换」，
拾色器 / 时间转换 / 罗马数字 三张工具卡都放在里面。

· 星图已经从顶栏撤下，入口只在工具页「通用工具」里（`tool/starmap/`，旧地址 `/starmap/` 会重定向过去）
· 公告测试 —— `tool/index.html` 里发一个 `sss:notice` 事件，`notice.js` 收到就弹公告
· 加载测试 —— 普通链接 `../?boot=1`；各页 `<head>` 里那段判断见到 `boot` 参数就重播一次加载屏（`spa.js` 会跳过带 `boot` 参数的 URL，
  交给整页加载，否则会被同文档导航吃掉、加载屏不播）

不想要测试入口了，就把左栏那两个 `.tool-entry` 和 `tool/index.html` 末尾那段脚本一起删掉
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
- ⚠️ **三条杠变 × 的动画要分两段，且别把 `--ctl-ease` 当缓动**：它是**时长**，
  写进 `transition` 简写会变成延迟（`transform .28s var(--ctl-ease)` = 干等 250ms）。
  早先收起时两条斜线先原地停 250ms，页面上就留着个「〉」（窄屏收菜单时能截到）。
  现在收起是「先原地转平（`transform` 立即）→ 再上下滑开（`top` 延后 0.12s）→ 中间那条最后淡入」，
  展开反过来「先并到中线 → 再转成 ×」。两个方向的 `transition` 各写一份，
  顺序或延迟一改，中间帧就会又出现「〉」。
- **所有选择器都写 `#site-nav`，别写裸的 `nav`**：主页面左栏还有 `<nav class="vertical-nav">`，
  裸 `nav` 会把那块也一起变成全屏面板。
- **按钮必须是 `.navbar` 自己的子元素**：放进 `<nav>` 里就会被那块竖排面板当成一个条目。
- **JS 只做三件事**：切 `.is-menu-open` 与 `aria-expanded`；展开时锁 `body` 滚动，
  并在点链接 / 按 Esc（焦点还给按钮）/ 窗口拉宽回桌面时收起；按当前地址给命中的那条链接加
  `aria-current="page"`（面板里那条显示金色竖条）。路径比较用 `URL` 解析 + 归一化，
  **不要用 `[href="…"]` 去猜** —— 各页写法不同（`.` / `..` / `starmap/` / `/about/`），
  字符串比会同时命中首页和子目录页的父级链接。
- ⚠️ **当前页标记必须在换页后重标**：`.navbar` 在 `<main>` 外面，`spa.js` 的同文档换页
  不会碰它 —— 标记不重算的话，窄屏汉堡面板在站内跳转后会一直亮着**上一页**。
  所以 `markCurrent()` 除了首次加载，还监听 `spa.js` 换页后派发的 `sss:swap` 和 `popstate`
  （前进 / 后退）。新增「当前页」类 UI 时同理：要么放 `<main>` 里让它一起被换掉，
  要么自己挂 `sss:swap`。
- 禁 JS 时按钮不出现（HTML 里没有 `hidden`，显隐由 CSS 控制），导航退化成改前那样的一行，
  不会出现「点了没反应」的死按钮。
- ⚠️ **写 HTML 注释务必用 `-->` 结尾**。曾把 `-->` 误写成 `*/`，整段 `<button>` 就被当成
  注释内容吃掉了：页面上按钮消失、`document.querySelectorAll('button').length` 为 0，
  但 `outerHTML` 里还能搜到 `navbar__toggle` 字样 —— 静态检查与构建都不会报，只有真浏览器看得出。

---

## 设计约定

- **档案页的视口框**：`archive/` 下所有页面的标题与英文副题不随页面滚动、页脚常驻
  视口底部，只有中间的内容滚动并在窗口两端淡出。做法、结构与踩点见
  「档案页的视口框」一节；别在单个档案页里另写一套。
- **配色**：深蓝黑底 + 金色 `#FFD700` 作为唯一的强调色 + 紫色 `#3A3072` 作点缀。
  金色只用于 hover / 键盘聚焦 / 选中，不做默认态，也不引入新颜色
- **控件**：按钮与输入框统一使用 `global.css` 里 `:root` 的 `--ctl-*` 令牌
  （背景、描边、圆角、过渡），不要在页面样式里另写一套
- **指针**：全站鼠标光标是 `assets/img/cursor/` 里的 24 个 SVG（34 个 `--cur-*` 令牌，
  含全部 CSS 光标关键字），由 `global.css` 统一引用。默认不是系统箭头，是一枚星芒；
  白 = 普通，金 = 可点 / 进行中 / 取点。
  **精细指针下由 `cursor.js` 隐藏系统光标、按 1:1 坐标自绘同一张图并让图形自转**
  （文本 / 准星 / 拖拽 / 复制 / 禁止保持静止）；状态靠每条 cursor 规则旁的
  `--cursor-kind` 传给脚本。reduced-motion / forced-colors / 图片没就绪时保持系统光标。
  写法、热点、尺寸与「为什么阅读区单独给文本光标」见 [DESIGN.md](DESIGN.md) 的「指针」；
  新增图形记得补 `sw.js` 的 `PRECACHE_URLS`，新增 cursor 规则时一并写 `--cursor-kind`
- **字体**：正文、标题与界面都用 Sarasa Gothic SC 的三个真实字面（Regular / Bold / Italic），
  **全站等宽只有一支：Sarasa Mono SC**（`assets/fonts/SarasaMonoSC-*.woff2`，@font-face 见
  `global.css`）—— 凡是要等宽的地方一律写 `"Sarasa Mono", "Sarasa", monospace`，
  别再退到系统等宽栈（`ui-monospace` / `Consolas` / `Courier New` / `Cascadia Mono` 都已清掉）：
  · Markdown 正文与行内代码：`global.css` 的 `.markdown-body, .markdown-body *` +
    `mainpage.css` 的 `.markdown-body code`
  · CQ 彩蛋页的控制台与准备日志：`main/cq.css` 的 `.cq-console, .cq-console *`、`.cq-log, .cq-log *`
  · 组织档案页右上角的部门代号：`archive/organization.css` 的 `.org-card__no`
  · 加载屏的读数：`boot.css` 的 `.boot, .boot *`（四角读数在 `.boot__inner` 之外，所以连根元素一起给）
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
- **舰队页主题色**：`fleet.js` 监听三张卡片的鼠标悬停与键盘聚焦，把页面的**紫色主题色** ——
  天空底色 / 激活区描边 / 柔光 / 极光、`::selection`、顶栏底色 —— 平滑换成该舰队的颜色；
  **银色的六边形网格线保持银色**，**强调色金色保持不动**（导航 / 页脚 hover、焦点、卡片标题、背景圆点 /
  连线 / 金环 / 掠光 / 点击波纹仍是金色）。
  背景画布通过 `window.SSSHex.setTone()` 换色，天空以初始配置为基准做线性偏移
  （`shiftColor`，tone 回到紫色时精确复原，不会越换越偏）；顶栏用 `--fleet-nav-bg`。
  移出卡片后恢复紫色。**颜色只写在卡片的 `data-fleet-color` 上**，与 CSS 里该卡片的 hover 描边同色。
  `background.js` 里强调色（`THEME`）与主题色（`TONE`）是两套独立变量，别再合并。
  点击卡片目前没有目标页，底部会弹 `.fleet-toast`（「错误：拒绝访问：无法连接至星域网。」）：
  形式照彩蛋页的底部提示条，5.2 秒自动收起，点提示条或按 Esc 也可关闭。
- **页面切换动画**：跨文档 View Transitions（纯 CSS），`seamless.js` 只负责让下一页提前就绪；
   navbar 是共享元素（`view-transition-name:site-navbar`），所以它"钉住"不动。
  · ⚠️ **交叉淡化只让新快照淡入**（`::view-transition-old(root){animation:none}`，新快照 220ms 淡入）。
    两页同时半透明时，中间会透出页面的黑底 —— 那就是"切换时淡黑一下"；旧实现是 old 180ms 淡出 +
    new 240ms 淡入，两条曲线错开，必然会暗一下（实测中间亮度比两端低约 22%）。
    旧快照保持不透明垫在下面，新快照在上面淡入，合成结果始终不透明。
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
  · **Firefox 等没有跨文档 View Transitions 的内核**：**不要**做"先淡出再跳转"。
    实测点链接后旧文档约 20ms 就被卸载，淡出只来得及渲染一帧（内容接近全透明），
    后面等待新页面的那段时间就剩一块空内容区 —— 用户感觉到的"卡一下"就是它。
    现在交给浏览器：旧页面一直显示到新文档可以绘制为止，再靠 `sss-switch` 把新内容淡入；
    这类内核里 `MIN_MS` 改成 0。`seamless.js` 只保留预取回退，不再拦链接点击。
    ⚠️ 判断支持性**只能用 `sssSupportsCrossDocVT()`**（把 `@view-transition` 塞进样式表看
    会不会被解析）。Firefox 158 实测：`document.startViewTransition` 有、`view-transition-name`
    属性也认，但 `@view-transition` 整条被丢掉 —— 拿属性判断会把兜底判成"不需要"，动画全没了
    （以前那段 `@supports not (view-transition-name:none)` 就是这么变成死代码的）
  · **站内同文档导航（`assets/js/spa.js`）**：试点页之间点链接不再整页加载 —— 拦截点击 →
    并行 fetch 目标页 HTML + 页面脚本源码 → 预挂 CSS → `document.startViewTransition()` 里
    换内容根（`.main-layout` 或 `<main>`）与 `.site-footer`、**同步执行目标页脚本**、改标题与 URL。
    所以 Firefox 里也是**真交叉淡化**（同文档过渡），数据驱动的页面在新快照里已经渲染好。
    只接管「当前页和目标页都在 `PILOT` 里」的普通左键点击；唯一的例外是星图
    （`/tool/starmap/`）：它自带 Starmap®OS 启动序列、坐标画布与成套 rAF，仍走整页跳转。
    **现在连两个彩蛋页（DGAM / CQ）也在试点里**，所以站内链接基本都不再整页加载了。
    · **彩蛋页也在试点里**：DGAM（`/archive/organization/dgam`）与 CQ（`/main/cq`）的前提是
      ① 登记靠 `<body data-egg>`，换页后由 `syncBody()` 搬到 body、`eggs.js` 在 `sss:swap` 补登记
         （CQ 是"点开解出来的图"才算发现，登记由它自己的脚本调 `SSS_EGGS.findWhenActive`）
      ② 弹窗 / 提示条写在该页 `<main>` **里面**（`#dgam-toast`、`#cq-modal`、`#cq-toast`），
         跟着内容一起换进换出 —— 写在 `<main>` 外面的话，经由站内导航进来时它不会被带进来，
         离开时还会残留到别的页面上
      ③ 有画布 / 音频 / 循环的页面（CQ）必须自己登记清理，见下面「CQ 页的生命周期」
    · 星图只有一页：进页面自动跑 Starmap®OS 启动画面，第一帧画好后启动画面淡出、六边形背景淡出、
      坐标背景淡入，随后操作按钮与右栏出现；时序在页面末尾那段内联脚本里
    · 星图本体走 Starmap®OS 一套视觉：`body.starmap-os-page` 作用域下的覆盖块在
      `assets/css/starmap/index.css` 末尾（等宽字 / 发丝线 / 金色读数 / 方块控件），
      改主站风格不会带偏星图
    · 星图是「离线版本」：文案一律写本地存档 / 星域快照，不写「无法访问主数据库」；
      页面没有导航栏；退出 = 信息栏右上角的 × 按钮（复用左下角控件样式，随面板一起滑入 / 收起）
    · 左上读数：进入后显示 `Connecting...`（白色、点呼吸），5 秒后切 `Offline Mode`（红色）；
      `STARMAP®OS` 20px，下面不再跟 STARCHART / SECTOR 0。
      `.map-readout` 是**竖排**（`flex-direction: column; align-items: flex-start; gap: 8px`）：
      `STARMAP®OS` 在上，状态行在它正下方并与它左对齐（不是并排在同一行）
    · 右侧信息栏：未选中时标题 `NOTICE`、选中星系后 `SYSTEM INFO`；面板外侧的箭头切换展开/收起，
      箭头和面板都装在 `.starmap-panel-wrap` 里一起 translateX，保证同步；进场时整块从右侧滑入
    · **窄屏（≤900px）信息栏改到底部**：桌面是右侧栏（translateX），窄屏是底部抽屉（translateY），
      两套规则都在 `assets/css/starmap/index.css` 末尾的「窄屏：信息栏从右侧栏改成底部抽屉」块里，
      且都带 `.starmap-os-page` 前缀 —— 不带前缀的同名规则会被它盖掉，别在别处重复写
      · 尺寸由 `--sheet-h`（`clamp(200px, 42svh, 460px)`）与 `--sheet-handle`（34px）两个变量给出，
        抽屉高度、控制条位置、收起位移都引用它们；改一个就够了
      · 抽屉 `position:absolute` 贴在 `.starmap-layout` 底部（布局 `overflow:hidden` 负责裁掉滑出去的部分），
        画布仍是整屏；收起 = `translateY(100%)`，卡片全部滑出、只有把手留在屏幕底边
      · 把手（`.starmap-panel-toggle`）在抽屉顶边外侧 34px、水平居中，常驻可见；同一个箭头转 90°：
        展开态 `›` 朝下、收起态 `‹` 朝上。收起后把手再抬一个 `env(safe-area-inset-bottom)`，
        别压在 iPhone 底部横条上
      · 比例尺控制条永远浮在抽屉上方（`bottom: 抽屉高 + 把手 + 12px`），抽屉收起 / 全面浏览时
        落回屏幕底部；≤420px 再收一档尺寸，否则搜索框会被挤出屏幕
      · 窄屏没有「面板外缘」，`.starmap-edge-arrow` 直接隐藏
    · 窄屏断点就是 **900px**（不是 768/420）：768 那块只剩字号与触摸微调，版式都在 900 那块
    · 搜索选定星系：调用 `SSS_COORD.panTo`（只平移、保持比例尺），与「回到默认」共用 background 的 `RESET_MS` 指数缓动；不再有单独的 easeOutCubic
    · 选中星系不在可见地图里时，在「视角中点 → 星系」射线与可见区域边缘的交点显示金色箭头；
      信息栏展开时取面板左缘、收起时取画布右缘；面板滑动期间用 rAF 逐帧跟随（箭头内缩 52px 避开把手），
      滑动中若选中星系进入视野，箭头立即隐藏
    · 全面浏览：左下角最左的按钮（再按一次退回进入前视角）；`overviewFit` 取全部星系的包围盒算出适配比例尺，
      用 `SSS_COORD.setViewRaw` 绕过 ZOOM_MIN；进入 / 退出用 `flyView`（与「回到默认」同一条 RESET_MS 指数缓动）。
      期间缩放（含比例尺条）/ 拖动 / 星系点击禁用，信息栏**收起**（与点面板上的箭头同一个
      `translateX(100%)` 滑出动作，不是淡出；窄屏是底部抽屉，改由窄屏那块滑成 `translateY(100%)`；
      把手在全面浏览里也藏起来 —— 面板收着，点它不会有反应）；点地图任意位置 → 该点为新中心、
      比例尺回到 ZOOM_MIN，恢复控制；通过搜索选中星系会自动退出并把星系居中。
      **这一屏里鼠标划过星系不高亮**（`handleMouseMove` 开头就 `overviewMode` 直接返回；
      进入时也把 `hoveredId` 清掉，光标准停在星系上按按钮也不会留下一个亮的）。
      只有"选中的那一颗"仍然保持金色 —— 那是状态，不是悬停反馈
    · 缩放锚点：`+` / `-` 按钮与比例尺条都以**当前视角中心**为锚点（`zoomTweenStep` / `setCoordView`）；
      滚轮 / 双指捏合仍以鼠标 / 双指中点为锚点，回到默认仍把原点飞回中心
      进场时信息栏从右侧滑入（`html.starmap-ui .starmap-right` 的 translateX）；
      窄屏改成从底部滑入，见上面那条「窄屏信息栏改到底部」
    · 页面脚本的全局监听/定时器必须在结束处登记清理：
      `window.__sssPageCleanup.add('名字', function(){ … })`，换页前统一跑一遍
      （personnel / facility / vessel / tool / main / org-secret 已登记；org-member 改成只绑一次）
    · 往试点加页面：`PILOT` 里加归一化路径（去 `.html` / 尾斜杠）+ 页面里加
      `<script defer src="…/assets/js/spa.js">`（放在 seamless.js 之后）+ 确认页面脚本可重跑
      （顶层别留 `const` / `let`，有全局监听就登记清理）
    · 内容根取 `.main-layout` 或 `<main>`；换进来的相对链接按目标页 URL 转绝对地址；
      顶栏与样式表在进入试点时固化成绝对地址（否则 `href="."` 会解析到新页面，
      表现为「本页跳一下」）；点当前页自己回到顶部、不重载
    · 换页只换 `<main>` 与页脚，所以 **`<body>` 上的 `data-*` 会按目标页同步**
      （`syncBody()`：彩蛋页的 `data-egg` 靠它），目标页**正文里的**内联脚本照常执行；
      `<head>` 里那两支加载屏守卫按"位置"跳过（只该在整页加载时跑）
    · 关于页的公告卡由它自己的内联脚本重跑绑定；彩蛋卡由 eggs.js 监听 `sss:swap` 补渲染，
      并把当前页 `<body data-egg>` 的彩蛋登记掉；`pageshow`（bfcache 恢复）时也会重画一次
- **首屏加载屏**（**全站每页都有**）：资源还没进缓存时（首次访问 / 缓存被清掉）显示，
  等**真正要用到的资源**都到手后上下两扇门滑开、露出页面；已就绪的页面不显示。
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
       首次安装不算（本来就没控制器，那趟已经弹过了）。
       「有没有新版本」由 CI 自动判定（内容指纹写进 `CACHE_VERSION`，见「改了样式或脚本之后」），
       不需要人记着手改版本号
  · ⚠️ **预渲染（speculationrules）的隐藏文档里不判定**：判定推迟到 `prerenderingchange`，
    `boot.js` 也等那一刻才启动。否则门会在后台放完（激活后用户看不到），
    `sss-boot-next` 还会被「用户最后没点」的那份预渲染吃掉 —— 表现为「该弹的时候没弹」
  · `sss-booted` 由 `boot.js` 的 `open()` 在开完门后写入；清掉站点数据会一并清掉它
  · `file://` 打开、不支持 SW 的浏览器直接不显示
  · 样式 `assets/css/boot.css`，结构与逻辑 `assets/js/boot.js`；
    页面里只放一个空的 `<div class="boot" id="boot"></div>`（内容由 boot.js 生成，20 页不用重复）
  · **进门前真的把东西拿全**（不是"等几个事件"），四个阶段：
    ① 本地缓存：等 SW `ready`，并等 `clients.claim()` 真正接管本页，顺带数一下缓存里有多少项
    ② 字体：按 `boot.js` 的 `FONTS` 清单（7 个字面 ≈ 42.8 MB）逐个
       `document.fonts.load()` + `fetch()`（后者拿准确字节数，并把响应写进字体缓存）
    ③ 数据：`assets/post/index.json` + 最新一篇 `.md`，ENTER 进主页面时不再现拉
    ④ 页面：`window load` —— ⚠️ 它可能在字体还没下完时就到了，所以屏上第 4 步
       常常早于「02 字体」亮起，这是**如实显示**，不是顺序错；这一步也不要改叫「就绪」
    最后再等资源活动安静 500ms（最多 4s），确认没有漏网之鱼
    进度条按任务数走（11 项），百分比 / 总数 / 字节数 / 当前文件都来自真实事件；
    `PerformanceObserver` 收 Resource Timing 只用来判断"资源还在不在动"（开门前等安静），
    **不再在屏上列明细** —— 加载屏只放数据，不放任何说明性文案
  · **视觉是战前简报式的 HUD**：四角读数 / 刻度尺 / 角部斜纹 / 细网格 / 扫描线，
    中央一枚徽记（金环 + 刻度环 + 反向扫掠弧 + 雷达扫光 + 沿外圆爬升的进度弧）。
    进度弧的长度由 `boot.js` 每帧写进 `--boot-p`，所以是连续爬升而不是一格一格跳
  · ⚠️ **金环 / 进度弧 / 刻度环 / 扫掠弧的半径不是随手写的**：`boot.css` 的
    `--boot-r-out: 0.602%` 与 `--boot-r-in: 3.789%` 是 logo 自带两圈描边的位置
    （viewBox 1036，外圆 r=511.765、内圆 r=478.748）。改了 logo 图形就要重算这两个值，
    否则弧会和背景的圆框错开
  · ⚠️ **徽记用的是 `assets/img/logo_SSS_boot.svg`，不是 `logo_SSS.svg`**：
    原图外圈描边正好压在 0/1024 画布边上，5px 描边有一半被 viewBox 裁掉，
    放大约 78vh 后圆的最外缘会变成一段平直的切口。加边版只把画布四周各扩 6px、
    图形坐标不动，外圈才是完整的正圆。改 logo 时要同步复制一份加边版
  · **字体跨版本缓存**：字体太占更新流量，不进 SW 预缓存；改放 `starlight-fonts-v1`
    （`sw.js` 的 `FONT_CACHE` 与 `boot.js` 里的同名常量，**改一边必须改另一边**）。
    页面自己也会往里写：首次访问时 SW 还没接管，那时 `document.fonts.load` 拿到的字体
    SW 存不下来。⚠️ 真的换字体文件（同名覆盖）时把 `FONT_CACHE` 的版本 +1，否则一直吃旧的
  · ⚠️ **加载屏自己的字面是 `SSS Boot Mono`**（`boot.css` 里单独一条 `@font-face`，
    `font-display: swap`）：全站的 `block` 会让读数区在字体到之前整个空着（实测 2.2s
    时几乎全黑）。它和 `Sarasa Mono` 是同一个文件，只下一次；`FONTS` 第一项用的就是
    这个字面 —— 同一份 5 MB 不会因为"加载屏要一份、预热再要一份"发两次请求
  · ⚠️ **「载入字体」必须显式 `document.fonts.load()`**，不能只 `await document.fonts.ready`：
    实测那一刻还没有任何字体进入加载流程，`ready` 是个**已完成的 promise**，`.then` 立刻
    就跑 —— 读数形同虚设，门会开在字体前面。字面清单见 `FONTS`
  · 上限：单任务 20s、等缓存 30s、总兜底 60s（网络卡死也会放人进去，字体继续在后台下）
  · `main.js` 的打字机等 `sss:booted` 事件 —— 否则动画会在加载屏后面白白播完
  · 收尾必须 `classList.remove('sss-boot','boot-open')`：**用字符串 `replace` 会漏掉开头那个类**，
    而 `html.sss-boot main{ opacity:.5 }` 会一直生效（页面永久半透明）
- **公告**：第一次访问自动弹一次（关掉后同一浏览器不再弹），「关于」页的「站点公告」卡片可随时重看。
  实现：`notice.js` 的 `start()` 负责首次自动弹，并监听 `document` 上的 `sss:notice` 事件
  （关于页卡片、工具页「公告测试」都发这个事件）调 `show(true)`。
  · **想对所有人再弹一次：把 `NOTICE.id` 改成新值** —— 「已读」是按 id 记的，换 id 就是一条新公告
  · 首次访问若加载屏还盖着，它会等 `sss:booted` 再弹（否则公告藏在加载屏后面）
  · 自动化环境不弹：`navigator.webdriver` 为真、或页面里设了 `window.__SSS_NO_NOTICE = true`
- **彩蛋**：站点里藏着**不与导航相连**的页面，靠知道地址才会来。目前两个：
  · `main/cq.html` —— 业余无线电：呼号音频 + SSTV 解码出 QSL 卡片（id `cq`）
  · `archive/organization/dgam.html` —— 机密组织 DGAM，入口是组织档案页的隐藏手势（id `dgam`，见下）
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
  · ⚠️ **`eggs.js` 是外壳脚本，每一页都必须引**（放在 `navtoggle.js` 之后）。
    `spa.js` 的 `SHELL_SCRIPTS` 不会重跑它，只靠「进入的那一页恰好引了」是不行的：
    从没引它的页面（档案 / 舰队 / 工具 / 人员 / 主页面…）站内换页到「关于」页，
    卡片会一直保持 `hidden`（表现为「彩蛋菜单失效」）；经由同文档换页进彩蛋页也不会被登记。
    加新页面时别忘了这一行 —— 和 `navtoggle.js` 同级要求。
  · 彩蛋提示条（DGAM 的 `#dgam-toast`）必须写在**该页 `<main>` 里面**，
    理由见上面「站内同文档导航」那条（`<main>` 外面的东西换页搬不过去）
  · 彩蛋页的音频与图片体积都不小（约 5 MB + 10 MB），**故意不进 SW 预缓存**，
    点了才下（`preload="none"` + `loading="lazy"`）；页面的 HTML/CSS/JS 照常进预缓存
  · **入口（DGAM 那个）**：组织档案页（`archive/organization/index.html`）里，把**科研部（RES）、
    工业部（IND）、战术战略部（TAS）**三张部门卡依次拖到「星光圣域管理成员议会」那张卡上
    （顺序无关，拖动时指针靠近**实际滚动容器 `.archive-body`** 的上下边缘会自动滚动；
    档案页整页不滚，不能再对 `window` 调 `scrollBy`）。三张都到位后议会卡右侧浮出一个小圆形
    切换按钮（`.org-switch`），按一下卡片就换成 DGAM 那张，再按一下换回来。
    · 切换按钮 `right: -14px` 压在卡片右边缘上；组织档案页的 `.archive-body` 带
      `.org-index-body` 类，留 20px 右内边距，按钮才不会被视口框的 `overflow` 裁掉。
    · 拖动经过议会卡时，卡片边缘用**被拖那个部门的颜色**高亮（不是金色）：
      科研部 `#50F2E0` / 工业部 `#EB7B25` / 战术战略部 `#EE0034`（写在各卡 `data-color` 上，
      经 `--drag-color` 交给 CSS）
    · 逻辑在 `assets/js/org-secret.js`；解锁状态记在 `sss-dgam`（`resetKeys` 里挂着，
      「关于」页重置这条彩蛋会一并清掉，重置后要重新拖一次）
    · 进来（DGAM 页）就算发现：页面底部弹「彩蛋已发现：星光圣域机密组织DGAM」，
      金色那支 `.org-toast--egg`（报错才用红）；登记照旧靠 `<body data-egg="dgam">`
    · 入口被「关于」页那个开关关掉后（`sss.eggs.off` 含 `dgam`），切换按钮永远不出现 ——
      `org-secret.js` 直接读这个键，与 `cq-entry.js` 读的是同一套
  · **入口**（CQ 那个）：首页左下角藏一个点（`index.html` 的 `#cq-dot`），默认不可见、也点不到，
    名字 `???`。在首页任意处**点一下**，背景会画一圈扩散到 `CFG.RADIUS` 的金色波纹；
    `assets/js/cq-entry.js` 用**同一个半径**做判定（半径从 `window.SSSHex.cfg.RADIUS` 现读，
    所以"看到的扫描"和"判定"永远是同一个数）—— 点在范围内就被扫出来，现身并保持、
    顺手很小声（volume 0.16）放一遍 `cq.wav`。点它进 CQ 页；之后名字变成 `73`。
    · 「已扫出」记在 `sss.cq-dot`，「已发现」记在 `sss.eggs`（eggs.js），两者独立
    · CQ 页的"完成"（点开解出来的那张图）**每次都以 `sss.eggs` 为准**，不在载入时算一次：
      页面可能在「关于」页重置之前就开着（bfcache / 另一个标签页），只算一次会把重置后的
      第一次完成吃掉，首页与「关于」页都不更新
    · `#cq-dot` **必须写在首页的 `<main>` 里面**（`.cq-dot` 是 `position:fixed`，位置不变）。
      站内同文档换页只换 `<main>` 与页脚：写在 `<main>` 外面的话，从别的页面经由站内链接
      「回首页」时这个元素根本不在文档里 —— 曾经的现场就是「首页 → 星图 → 工具页 → 首页」
      之后 CQ 入口彻底失效（扫也扫不出来）。
    · `cq-entry.js` 每次运行都**按 storage 同步一次 DOM**（首次加载 / SPA 换回首页 /
      bfcache 恢复都算），离开首页时登记清理函数把挂在 `document` / `window` 上的监听撤掉
      （元素本身随 `<main>` 销毁）。别把状态只算一次
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
- **窄屏**：每页各有自己的断点（768px 为主，工具页 900px，主页面 1024px，星图 900px）

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

### CQ 页的生命周期（它现在在 `PILOT` 里，站内换页会换掉它）

整页换掉 `<main>` 不会替你停掉定时器、rAF、音频 —— 这些必须页面自己登记。改这一页记住五条：

1. **代号**：第一段脚本开头把 `window.__cqGen` 加一，`window.__cqAlive()` 用它判断
   "这一轮还算数吗"。所有异步回调（定时器、`img` 的 `load`、`fetch`/`decodeAudioData`
   的 `.then`、`document.fonts.ready`）**先核对代号再动手**，否则换页之后旧回调会去动
   新页面的 DOM（`__cqRunSteps` 这类全局函数已经是新一轮的了）
2. **定时器统一用 `window.__cqLater(fn, ms)`**（内部就是带代号保护的 `setTimeout`，
   并把 id 记进 `window.__cqTimers`），别直接写 `window.setTimeout`
3. **`__sssPageCleanup` 登记四份**：
   - `cq-page`：代号作废、清掉所有定时器、摘掉 `<html>` 上的 `cq-restored` / `cq-modal-open`
     （这两个类挂的是 `<html>`，不会随 `<main>` 换掉，不摘就带到别的页面上了）
   - `cq-morse` / `cq-sstv`：**`audio.pause()`**（不暂停的话换到别的页面它还在后台响，
     这是最容易漏的一条）、`stopLoop()` 取消 rAF、`URL.revokeObjectURL(seekSrc)` 释放 blob
   - `cq-modal`：摘掉挂在 **`document`** 上的 Esc 监听（它不会随 `<main>` 消失）
4. **弹窗与提示条必须在 `<main>` 里**（`#cq-modal` / `#cq-toast`），换页才带得进带得走
5. **`cq-restored` 要按 storage 再对齐一次**：整页加载时它由 `<head>` 里那段同步脚本打
   （首次绘制前决定，不会闪），可站内换页不跑 `<head>` 脚本。所以第一段正文脚本要
   `document.documentElement.classList.toggle('cq-restored', foundNow)` ——
   否则经由站内导航进来会从头演一遍，而不是直接摆出"全解完"

- ⚠️ 动过这一页就要 **`sw.js` 的 `CACHE_VERSION` +1**（HTML/CSS/JS 全在预缓存里，
  不加版本号访问者拿到的还是旧页面）；CI 的 `stamp-sw-version.yml` 会按内容变动自动打，
  一般不用手动改

