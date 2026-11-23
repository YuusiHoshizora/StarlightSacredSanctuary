# 未归类档案 · 源文件目录

暂时无法归入其它档案的文件放这里：

```
assets/uncategorized/<来源>/<文件名>.<扩展名>
assets/uncategorized/<来源>/<文件名>.<扩展名>.meta.json   （可选）
```

分类只看扩展名（.md → 文档、.png/.jpg… → 图像、音频、视频，其余 → 其他）。
第一层目录名就是「来源」；sidecar 可覆盖标题 / 日期 / 来源 / 摘要等。
编号按载体自动排（IMG-0001 / DOC-0001 …）；想指定就写 sidecar 的 `number`。

文件 / 目录名以 `_` 或 `.` 开头的会被扫描器忽略（本文件就是）。

加完后跑 `node scripts/document-index.mjs`，或推送到 master 交给
`.github/workflows/document-index.yml` 自动重建。
