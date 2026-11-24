# 文档索引

这个仓库的文档都在 `docs/`（只给仓库看，不随站点发布）。**第一次进来先读这一页**，
再按下面的顺序跳。

## 阅读顺序

1. 想知道站点是什么、对访客长什么样 → 根目录 [README.md](../README.md)
2. 想知道文件怎么放、往哪加东西 → [STRUCTURE.md](STRUCTURE.md)
3. 想动手改东西（文章 / 数据 / 档案 / 样式 / 部署）→ [MAINTENANCE.md](MAINTENANCE.md)
4. 要写新页面或调设计 → [DESIGN.md](DESIGN.md)
5. 查迁移细节、DNS、部署决策 → [MIGRATION-CLOUDFLARE.md](MIGRATION-CLOUDFLARE.md)

## 文档清单

| 文档 | 负责什么 | 什么时候要改它 |
| --- | --- | --- |
| [STRUCTURE.md](STRUCTURE.md) | 目录职责、命名规则、新增内容落点、发布面 | **改了目录 / 文件位置 / 发布规则时**（唯一权威版本） |
| [MAINTENANCE.md](MAINTENANCE.md) | 操作手册：本地预览、写文章、改数据、部署、踩坑记录 | 流程或踩坑经验有变化时 |
| [DESIGN.md](DESIGN.md) | 设计语言：定位、色板、排版、组件、动效 | 视觉规范变化时 |
| [MIGRATION-CLOUDFLARE.md](MIGRATION-CLOUDFLARE.md) | Netlify → Cloudflare 的完整准备与执行记录 | 只作历史记录，不再更新 |
| `drafts/` | 未定稿草稿（当前：双语 README 草稿） | 定稿后替换 `README.md` 或直接删除 |
| [../src/csv/README.md](../src/csv/README.md) | CSV 每列含义、编辑与校验约定 | 改了表结构 / 校验规则时 |
| [../assets/uncategorized/_README.md](../assets/uncategorized/_README.md) | 未归类档案目录怎么放文件 | 目录规则变化时 |

## 维护约定

- 一份事情只写在一个地方。**目录结构只写在 `STRUCTURE.md`**，其它文档要提就链接过去。
- 文档之间用相对链接（`docs/` 内部互链不用带 `docs/` 前缀）；引用代码路径用反引号。
- 新文档放 `docs/`，**并在本页登记一行**；临时 / 没定稿的放 `docs/drafts/`。
- `docs/` 在 `.assetsignore` 里，线上是 404 —— 别把要在站点上展示的内容写进文档。
