# 站点数据（CSV 源文件）

站点上的人员 / 深空设施 / 舰船 / 星图数据，**源文件在 `data/` 下的 CSV**；
`assets/data/*.js` 只是给页面读的生成物。

```
data/personnel/*.csv   ──┐
data/facility/*.csv      ├─ node scripts/data-csv.mjs build ─→ assets/data/*.js ─→ 页面
data/vessel/*.csv        │
data/starmap/*.csv     ──┘
```

改数据只改 CSV，不要手改 JS。

```bash
node scripts/data-csv.mjs build    # CSV → assets/data/*.js（改完数据跑这个）
node scripts/data-csv.mjs check    # 只检查 JS 是否与 CSV 一致，不写文件（CI 用）
node scripts/data-csv.mjs export   # 反向：把当前 JS 导回 CSV（会覆盖 CSV，慎用）
```

推送到 `master` 并且改到 `data/**` 时，GitHub Actions 会自动跑 `build`
并提交生成结果（同时更新 `sw.js` 的缓存版本号），本地忘了跑也不会漏。

---

## 一、编辑约定

1. **编码**：UTF-8（带 BOM）+ 逗号分隔。这样 Excel 双击打开不会乱码。
   保存时保持「CSV UTF-8（逗号分隔）」，别存成 GBK / xls。
2. **一个单元格里写多行 = 多条内容**。凡是一段一段的字段（`intro` / `roles` /
   `awards` / `desc` / `items` …），在单元格里换行分隔即可：
   Excel 用 `Alt+Enter`，VS Code 里直接回车。
   空单元格 = 空列表（页面上按「数据损坏」处理，这是有意的缺失口径）。
3. **顺序就是页面上看到的顺序**。成员名录、设施名录、舰船名录、配件、装备，
   都按文件里行的先后排列；批量排序前先想清楚，别把名录顺序排乱。
4. **不要改表头、不要加列**。列的顺序可以动，列名必须一字不差。
   真要加字段，得同时改 `scripts/data-csv.mjs`。
5. 记录之间不要插空行（空行会被跳过，但别依赖这个行为）。
6. 引号与逗号不用手写转义，表格软件会自己加引号。手写 CSV 时：
   内容里有逗号、双引号或换行，整个单元格用双引号包住，里面的 `"` 写成 `""`。

> ⚠ **用 Excel 打开时要小心自动转换**：`anchor` / `identity`（17 位身份编号）、
> `birth`（`410/10/27` 这种）会被 Excel 改成科学计数法或日期，存一次就毁了。
> 用 Excel 请走「数据 → 获取数据 → 从文本/CSV」，把这几列的类型设成**文本**；
> 或者干脆用 VS Code（可装 Rainbow CSV 插件）编辑。
> `build` 会对这些列做格式检查并报错提示。

---

## 二、文件与列

### `data/personnel/` —— 人员档案

| 文件 | 一行是什么 |
| --- | --- |
| `classes.csv` | 一个授权等级（SXM / SAM / SFM / SPM） |
| `members.csv` | 一名成员 |

`classes.csv`：`key`（`sxm` 等，等级页地址就是它）· `code`（`SXM`）· `name` ·
`en` · `desc`

`members.csv`：

| 列 | 含义 |
| --- | --- |
| `class` | 等级 key，必须是 `classes.csv` 里有的 |
| `anchor` | 锚点，唯一；页面链接 `#anchor` 靠它，发布后别改 |
| `identity` | 身份编号（纯数字，可以留空） |
| `name` / `latin` | 中文名 / 拉丁名 |
| `gender` / `birth` / `race` | 性别 / 生日（`年/月/日`）/ 种族 |
| `fleet` | 所属舰队 |
| `residenceLabel` / `residence` | 居住地标签（一般是「居住地」）/ 居住地路径 |
| `roles` | 职务，一行一条 |
| `relatives` | 亲属，一行一条，写「关系：姓名」（姓名能和库内成员对上就会自动链过去） |
| `awards` / `research` / `feedback` | 荣誉 / 科研 / 反馈，都是内容，一行一条 |

### `data/facility/` —— 深空设施档案

| 文件 | 一行是什么 |
| --- | --- |
| `affiliations.csv` | 一个归属势力：`name` · `abbr`（名录分组标题与排序用） |
| `facilities.csv` | 一项设施（主表） |
| `unique-parts.csv` | 一项独特配件（或它的一个子配件） |
| `common-parts.csv` | 一套通用配件（一个系统） |
| `orgs.csv` | 一个参与组织 |

`facilities.csv` 主要列：`id`（锚点，唯一）· `parent`（父设施 id，留空 = 顶层）·
`name` · `kind` / `kindEn`（设施类型中文 / 英文）· `en`（英文全名）· `abbr`（缩写）·
`affiliation`（归属，建议先在 `affiliations.csv` 登记）· `plan`（所属计划）·
`clearance`（授权等级 SXM/SAM/SFM/SPM）· `foreign`（`true` = 非星光圣域设施）·
`damaged` + `damagedNote`（整条记录损坏 / 说明）· `intro`（简介，一行一段）·
`response`（应对措施，一行一段）· `partsNote`（没有配件的说明，一行一段）。

**`partsUnique` / `partsCommon` 三个取值**，用来区分「这一节不存在」和「这一节存在但读不到」：

| 值 | 含义 |
| --- | --- |
| `none` | 这一节不存在（例如非星光圣域设施没有独特 / 通用配件） |
| `damaged` | 这一节存在，但内容读不到 → 页面显示「数据损坏」 |
| `list` | 这一节有内容，到子表里逐行写 |

`unique-parts.csv`：`facility`（设施 id）· `parent`（留空 = 一级配件；写上一级配件的**名字** =
挂在它下面的子配件）· `name` · `en` · `meta`（子配件的附注，如「占用安装节点数：1」）·
`note`（单行说明，如「这不是索拉克分支矩阵的原生装置」）· `desc`（一行一段）。

子配件必须写在它的一级配件**后面**，`parent` 要一字不差等于一级配件的 `name`。

`common-parts.csv`：`facility` · `label`（系统名，如「武器系统」）· `items`（一行一条；
空 = 这套系统存在但读不到；`N/A` 原样显示）。

`orgs.csv`：`facility` · `name` · `desc`（一行一段）。

### `data/vessel/` —— 舰船档案

| 文件 | 一行是什么 |
| --- | --- |
| `sizes.csv` | 一个尺寸分类：`name` · `en`（名录分组顺序就是这里的顺序） |
| `vessels.csv` | 一艘舰船 |
| `equipment.csv` | 一套详细装备 |

`vessels.csv`：`id`（唯一）· `name` · `en` · `kind`（舰种）· `size`（必须是 `sizes.csv`
里的名字）· `iteration`（迭代次数，可空）· `damaged` + `damagedNote` ·
`intro`（一行一段）· `equipmentNote`（装备清单的替代说明，一行一段）。

`equipment.csv`：`vessel`（舰船 id）· `label`（系统名）· `items`（一行一条；空 = 这套系统
存在但读不到）。

### `data/starmap/` —— 星图

`systems.csv`，一个星系一行：`id` · `name` · `nameEn` · `starCount`（恒星数）·
`planets`（行星数）· `starType`（恒星类型）· `developmentLevel`（开发程度）·
`description`（资料文本）· `x` / `y`（小格坐标，原点 = 维斯佩拉星系，x 向右、y 向下）。

---

## 三、常见操作

- **加一名成员**：`members.csv` 末尾加一行。`class` 选 `sxm` / `sam` / `sfm` / `spm`；
  `anchor` 不能和已有重复（身份编号还没定的，按现有惯例写 `pending-英文名`）。
- **加一项设施**：`facilities.csv` 加一行。要配件就把 `partsUnique` / `partsCommon`
  写成 `list`，再去 `unique-parts.csv` / `common-parts.csv` 加对应行（`facility` 填设施 id）。
  子设施把 `parent` 填成父设施的 id。
- **加一艘舰船**：`vessels.csv` 加一行，`size` 必须是 `sizes.csv` 里已有的名字；
  详细装备写到 `equipment.csv`，`vessel` 填舰船 id。
- **加一个星系**：`systems.csv` 加一行，`x` / `y` 写小格整数坐标。
- **改文案**：直接改单元格。一段一段的字段别把两段挤进同一行 —— 会变成一段。
- **删一条**：删掉主表的行，同时删掉子表里 `facility` / `vessel` 指向它的行。
  忘了删子表行，`build` 会报「找不到对应的设施 / 舰船」。

---

## 四、校验

`build` 会检查这些，出错就停下并指出 **文件名 + 行号 + 列名**：

- 表头缺列 / 多出未知列
- 必填列空着、`id` / `anchor` 重复
- `class` / `size` / `affiliation` / `parent` 指向不存在的东西
- `partsUnique` / `partsCommon` 写了 `list` 却没有子表行，或反过来
- 子配件的 `parent` 找不到对应的一级配件
- `anchor` / `identity` / `birth` 被表格软件改成了科学计数法 / 日期

`check` 用于确认 `assets/data/*.js` 与 CSV 一致（CI 和本地提交前都可以跑）。

---

## 五、为什么不让页面直接读 CSV

站点是纯静态、零运行时依赖的：页面用 `<script defer>` 按顺序同步拿
`window.SSS_PERSONNEL` / `window.SSS_FACILITY` / `window.SSS_VESSEL` / `STARMAP_DATA`，
渲染脚本一执行就有数据。改成运行时 `fetch` CSV 会把这些脚本全变成异步、
并牵动 Service Worker 的预缓存清单，收益只是省掉一次 `build`。
所以这里把「编辑格式」和「加载格式」分开：CSV 给人，JS 给浏览器。

数据量很小（合成后的 JS 约 100 KB），每次 build 是毫秒级，不构成负担。

---

## 六、别做的事

- 不要手改 `assets/data/*.js` —— 下次 `build` 会整个覆盖，改动直接没。
- 不要把资料库的 wiki 链接（`[[…]]`）或资料库路径写进数据；录入时先展开成显示文本。
- 不要在没有备份的情况下跑 `export` —— 它会用当前 JS 覆盖 `data/` 下所有 CSV。
  真跑错了就用 `git checkout -- data/` 找回来。
