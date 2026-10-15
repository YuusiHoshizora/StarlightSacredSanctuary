# 迁移到 Cloudflare —— 准备清单与执行手册

> **状态：尚未执行。** 本文只是准备与执行手册；迁移完成后把 `MAINTENANCE.md` 的「部署」
> 一节改写掉，本文就可以删。
>
> **起因**：Netlify 免费版 100 GB/月带宽被 43 MB 字体包打爆。
>
> **事实标注约定**（延续 `MAINTENANCE.md` 的习惯）：
> - `[docs]` 官方文档明确写的，附出处
> - `[实测]` 本次从命令行实测到的（DNS / HTTP 响应）
> - `[推断]` 从文档规则推出来的，切换后要实测确认
> - `[待核对]` 必须登录后台/注册商才能确认
>
> 主要出处：Cloudflare Pages [Limits](https://developers.cloudflare.com/pages/platform/limits/)、
> [Redirects](https://developers.cloudflare.com/pages/configuration/redirects/)、
> [Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/)、
> [Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)、
> [Migrating from Netlify](https://developers.cloudflare.com/pages/migrations/migrating-from-netlify/)、
> [URL forwarding](https://developers.cloudflare.com/rules/url-forwarding/)。

---

## 1. 先确认「搬得动」

| 项目 | 现状 | Pages 免费版上限 | 结论 |
| --- | --- | --- | --- |
| tracked 文件数 | 53 个 `[实测]` | 20,000 | 通过 |
| 仓库总体积 | 43.2 MB `[实测]` | — | — |
| 最大单文件 | 8.22 MB `SarasaGothicSC-Bold.woff2` `[实测]` | **25 MiB** | 通过（余量充足） |
| 构建 | 无（纯静态，`exit 0` 即可） | 500 次/月，同时 1 个，20 分钟超时 `[docs]` | 通过 |

**带宽**：Pages 免费版的限制列表里**没有**带宽和请求数 —— 这正是这次的解药。
但有个反直觉的点：**一旦用了 Pages Functions，请求就落到 Workers 免费额度（10 万请求/天）上** `[docs]`。
本站是纯静态（无 SSR、无表单、无服务端逻辑），所以下面全部刻意只用静态能力，一个 Function 都不写。

---

## 2. 硬前提：两个域名都必须变成 Cloudflare 上的 zone

- 主域名是 apex（裸域）。Pages 文档明确：**apex 自定义域必须是同一个 Cloudflare 账号下的 zone**
  → 必须在注册商处把 NS 改成 Cloudflare 的 `[docs]`
- 现在的 NS 是 Netlify DNS：`dns1~4.p07.nsone.net`（主域名）/ `dns1~4.p04.nsone.net`（stsas.top）`[实测]`
  → 改 NS 意味着**连 DNS 托管一起搬**，这是本次迁移风险最高的动作（见第 3 节：有邮箱）
- `stsas.top` 的 301 也得在 CF 上重做，因为 Pages 的 `_redirects` **不支持**带主机名的
  domain-level redirect（官方能力表里明确是 ❌）`[docs]` —— 而 Redirect Rule 是 zone 级的，
  所以两个域名一起搬反而是顺路的

**DNSSEC**：注册局（.top / ZDNS-KNET）侧查不到 DS 记录 `[实测]` → 说明没开 DNSSEC，
换 NS 不会因此断解析。**但 `[待核对]`**：仍请在注册商后台确认 DNSSEC 状态是「未启用」，
如果哪天开过，必须**先关掉 DNSSEC 再改 NS**，否则整个域名解析会挂。

---

## 3. ⚠️ 迁移前必须抄全的 DNS 记录（最容易断邮箱的一步）

`stsas.top` 上有 **QQ 企业邮箱**（MX + SPF + DMARC）`[实测]`。NS 一改，这些记录必须已经在
Cloudflare 上存在，否则**邮箱立刻收不到信**。

**实测到的记录（已确认存在的部分）：**

| 类型 | 名称 | 值 | 备注 |
| --- | --- | --- | --- |
| A | `stsas.top` | `52.74.6.109` / `13.215.239.219` | Netlify 的，迁移后**删掉**（见第 6 节占位记录） |
| A | `www.stsas.top` | 同上 | 同上 |
| A | `starlightsacredsanctuary.top` | 同上 | 加自定义域时由 Pages 换成 CNAME |
| A | `www.starlightsacredsanctuary.top` | 同上 | 同上 |
| MX | `stsas.top` | `mxbiz1.qq.com`(5) / `mxbiz2.qq.com`(10) | **原样搬** |
| TXT | `stsas.top` | `v=spf1 include:spf.mail.qq.com ~all` | **原样搬** |
| TXT | `_dmarc.stsas.top` | `v=DMARC1; p=none; rua=mailto:astra@stsas.top; fo=1; adkim=r; aspf=r` | **原样搬** |

**还没找到、但 Netlify DNS 里可能有的 `[待核对]`**（我只能在公网查到上面这些，剩下的必须进后台看）：

- DKIM 记录（QQ 企业邮的可选配置，常见于 `xxx._domainkey`，selector 名各家不同）
- 其它 TXT：企业邮箱/搜索平台/监控的域名验证字符串
- 其它 CNAME：`autodiscover`、`mail`、`smtp` 之类
- 主域名 `starlightsacredsanctuary.top` 上是否有 MX/TXT（公网查询未见 `[实测]`，应该是没有邮箱）

**做法**：Netlify 后台 → Domains → 打开该 zone → 记录表逐条抄（或整体截图）。
Cloudflare 添加 zone 时会**自动扫描并导入**现有记录，但：

> ⚠️ 导入进来的 A 记录默认是「**已代理**」（橙色云）状态、值仍指向 Netlify 的 IP。
> 这样请求会先到 CF 再回 Netlify，等于没搬。**必须删掉这四条 A 记录**
> （或让「加自定义域」流程把它们覆盖成 Pages 的 CNAME）。

---

## 4. 仓库侧要准备什么：结论是**几乎不用改**

### 4.1 必须有顶层 `404.html`

Pages 找不到文件时：**如果没有顶层 `404.html`，它会当成 SPA，把所有未匹配路径用 200 返回首页** `[docs]`。
本站现在 `/main` 是 404（`main/` 里只有 `mainpage.html`，没有 `index.html`）`[实测]` ——
没有 `404.html` 的话它会变成「200 + 首页」，对 SEO 和体验都是坏的。

同时 `_redirects` **不支持 404 规则**（能力表里 rewrites/其它状态码是 ❌）`[docs]`，
所以不能照搬 Netlify 的 `/* → /error.html 404`。

### 4.2 构建命令（推荐方案：glob 排除，行为与今天一致）

```bash
mkdir -p _site && for f in *; do [ "$f" = "_site" ] || cp -r "$f" "_site/"; done && rm -f _site/netlify.toml && cp _site/error.html _site/404.html
```

这一行同时解决四件事：

1. `for f in *` **不匹配点开头的名字** → 天然排除 `.git/`、`.github/`、`.gitignore`、`.venv/`
   （Netlify 也是不发布的，`/.gitignore`、`/.github/...` 现在都是 404 `[实测]`）
2. `rm -f _site/netlify.toml` → Netlify 从不发布自己的配置文件，这里保持一致
3. `cp error.html 404.html` → **仓库里不用放重复文件**，`error.html` 仍是唯一源头
4. 输出目录是 `_site`，所以仓库根目录的结构完全不用动

**已实测 `[实测]`**（在 Git Bash 里原样跑了一遍）：`_site/404.html` 生成成功；
`.git`、`.github`、`.venv`、`netlify.toml` 都没进 `_site`；`assets/post/index.json`
和 7 个字体都在。两个注意点：

- Pages 的构建环境是**干净 clone**，`*` 只会看到 tracked 文件；但**本地直接跑这条命令**
  会把 `graphflow-out/` 这类 `.gitignore` 掉的未跟踪目录也带上（实测本地 `_site` 83 MB / 193 个文件，
  而 CI 里只有 53 个文件 / 43 MB）—— 用 Direct Upload 时留意
- 命令里 `[ "$f" = "_site" ]` 这个判断不能省，否则 `_site` 会被复制进自己

**变体**（白名单写法，发布内容更干净，但代价是每加一个顶层目录都得记得加进来）：

```bash
mkdir -p _site && cp -r index.html error.html sw.js about archive assets fleet main starmap tool _site/ && cp _site/error.html _site/404.html
```

这个变体会顺带**不发布** `MAINTENANCE.md` / `README.md` / `LICENSE` / 本文档
（注意：这几个现在在 Netlify 上是**公开可读的** `[实测]`，见第 8 节）。

### 4.3 不需要的东西

- **不需要 `_redirects`**：本站没有路径级跳转（只有错误页 + 域级跳转，前者走 `404.html`，后者走 CF 规则）
- **不需要 `_headers`**（可选）：如果想让 8 MB 的字体在浏览器里长缓存，可以加
  `/assets/fonts/*` → `Cache-Control: public, max-age=31536000, immutable`。
  但**不要**给 HTML 加 Cache Rule —— Pages 文档明确警告自定义缓存会导致部署后旧内容 `[docs]`
- **`sw.js` 不用改**：SW 绑的是同源域名，内容没变，它的后台更新会自己去新主机取。
  唯一的细节：Pages 会把 `/error.html` 跳成 `/error`（内容相同，`[推断]` 自「HTML 页面会被
  重定向到去扩展名的形式」这条规则 `[docs]`），SW 预缓存那次 fetch 会跟随跳转，不影响离线兜底。
  **等 Netlify 彻底下线后**（可选收尾）：把 `OFFLINE_URL` 改成 `/404`、`CACHE_VERSION` +1

---

## 5. Cloudflare 侧建项目的确切参数

| 配置项 | 值 | 说明 |
| --- | --- | --- |
| 生产分支 | `master` | Pages 默认是 `main`，本站是 `master`，**别漏** |
| 构建命令 | 第 4.2 节那一行 | 不要用 `exit 0`，否则没有 `404.html` |
| 构建输出目录 | `_site` | |
| 框架预设 | None | |

建完之后：

- 先拿到 `xxx.pages.dev`，**在这个域名上把整站验一遍**（第 8 节清单），再碰自定义域和 NS
- 加自定义域：`starlightsacredsanctuary.top` + `www.starlightsacredsanctuary.top`
- SSL/TLS 模式设 **Full (strict)**，开启 **Always Use HTTPS**（替代 Netlify 的 Force SSL）
- **关掉**这些会破坏本站 JS/SW 的优化项：Rocket Loader、Auto Minify、Email Obfuscation
- `[docs]` 新账号在 48 小时内创建项目数量受限，如果被挡，等窗口过去即可

---

## 6. `stsas.top` 的 301 在 CF 上怎么做

Single Redirects：免费版 **10 条/zone**、支持通配符、不支持正则 `[docs]`。
前提：**记录必须开启代理**（橙色云），否则规则不会触发 `[docs]`。

**占位记录**（规则在回源前就终止请求，占位 IP 永远不会被访问到；官方 www→apex 的 how-to 就是这么写的 `[docs]`）：

| 类型 | 名称 | 值 | 代理状态 |
| --- | --- | --- | --- |
| A | `stsas.top` | `192.0.2.1` | 已代理 |
| A | `www.stsas.top` | `192.0.2.1` | 已代理 |

**规则（表达式写法，推荐）**：

- 匹配：`(http.host eq "stsas.top" or http.host eq "www.stsas.top")`
- 动态重定向到：`concat("https://starlightsacredsanctuary.top", http.request.uri.path)`
- 状态码 `301`，勾选 **Preserve query string**

**或者通配符写法**（官方「从一个域名跳到另一个域名」示例，`${2}` 就是捕获到的路径 `[docs]`）：

- Request URL `http*://stsas.top/*` → 目标 `https://starlightsacredsanctuary.top/${2}`，`www` 再加一条

**`www.长域名 → 裸域`**：同样配一条规则（官方 how-to 用的是 Bulk Redirects，免费版
15 条规则 / 5 个列表 / 10000 条 URL `[docs]`，二选一即可）。

---

## 7. 切换顺序（每步都有回滚点）

0. **抄全 DNS 记录**（第 3 节）。这一步没做完，不要动 NS
1. Cloudflare 加两个 zone（**先不改 NS**）→ 逐条核对导入的记录 → 删掉指向 Netlify IP 的四条 A 记录
2. 建 Pages 项目（第 5 节参数）→ 在 `xxx.pages.dev` 上跑完第 8 节清单
3. 给 Pages 加自定义域（apex + www）→ Custom domains 里显示 Active、证书签发完成
4. 注册商处改 NS。**建议先只改 `stsas.top`**（它只有跳转和邮箱，问题好定位），
   观察 24 小时正常后再改主域名；嫌麻烦也可以一起改，但一起出问题时不好二分
5. 全量验证（第 8 节），特别是邮箱（发一封测试信到 `astra@stsas.top`）
6. 观察 3–7 天，一切正常后再回 Netlify 移除两个 custom domain（或直接关站）
7. 收尾：改写 `MAINTENANCE.md` 的「部署」一节、删掉本文、`netlify.toml` 可以删掉

**回滚点**：第 4 步之前，随时可以在注册商把 NS 改回 Netlify 的四个 nsone 地址，
Netlify 那边什么都别拆就行。第 6 步之后 Netlify 才真正失去意义。

---

## 8. 切换后必须逐条验的清单

**这一段已经脚本化了**：`.github/verify-site.ps1`（放在 `.github/` 下是故意的 ——
两个托管都不会发布它，对线上站点零影响）。它把下面整张表逐条跑一遍：

```powershell
# 1) 迁移前基线（现在跑过：PASS 16 / WARN 0 / FAIL 0）
powershell -NoProfile -ExecutionPolicy Bypass -File .github\verify-site.ps1 `
  -ShortUrl https://stsas.top -WwwUrl https://www.starlightsacredsanctuary.top

# 2) Cloudflare 预览域名先验 —— 还没动 DNS 时最关键的一步
powershell -NoProfile -ExecutionPolicy Bypass -File .github\verify-site.ps1 `
  -BaseUrl https://你的项目.pages.dev -SkipDomainChecks

# 3) 切换后再跑一次第 1 条，应仍是全 PASS
```

脚本会真的下载 8 MB 那个字体、解析 `index.json`、并把 404 页与 `error.html` 逐字比对
（已处理工作区 CRLF / 部署 LF 的差异），还会校验短域名的路径与查询串是否原样带过去。
退出码 0 = 全通过。浏览器里的 Service Worker 注册、星图/工具页交互仍需人工点一遍（脚本验不了）。

> 改脚本时注意：`verify-site.ps1` 必须保持 **UTF-8 带 BOM**，否则 Windows PowerShell 5.1
> 会把中文当 ANSI 读、解析直接报假错。

**下面是原始清单**（脚本就是照它实现的，手工排查时也照这个看）：

**URL 契约**（「现在」列是本次在 Netlify 上的实测值）：

| 路径 | 现在（Netlify）`[实测]` | CF 上期望 |
| --- | --- | --- |
| `/` | 200 | 200 |
| `/about/` | 200 | 200 |
| `/about` | 301 → `/about/` | 200 或 301 都算正常（Pages 不做尾斜杠跳转 `[推断]`） |
| `/about/index.html` | 200 | 301 → `/about/`（可接受） |
| `/error` | 200 | 200 |
| `/error.html` | 200 | 301 → `/error`（内容相同，可接受） |
| `/tool/`、`/starmap/`、`/fleet/`、`/archive/` | 200 | 200 |
| `/main` | **404 + 自定义错误页** | **必须仍是 404 + 自定义页**（这是 `404.html` 是否生效的判定） |
| `/assets/post/index.json` | 200 | 200 |
| `/sw.js` | 200 | 200 |
| `/assets/fonts/SarasaGothicSC-Regular.woff2` | 200 | 200（8 MB 那个，字体能下就行） |
| `stsas.top/*` | 301 → 长域名同名路径+查询串 | 301（规则验证） |
| `www.starlightsacredsanctuary.top/*` | 301 → 裸域 | 301 |
| 邮件 | MX 在 QQ 企业邮 | 发一封测试信到 `astra@stsas.top` |

**顺带确认发布范围**：`/MAINTENANCE.md`、`/README.md`、`/LICENSE` 现在**是公开可读的** `[实测]`
（`/netlify.toml`、`/.gitignore`、`/.github/...` 不是）。第 4.2 节的默认方案会保持这个现状；
如果不想公开这几个文件，就用白名单变体。

---

## 9. Netlify → Cloudflare 能力对照

| Netlify | Cloudflare | 备注 |
| --- | --- | --- |
| `publish = "."` | 构建命令 + 输出目录 `_site` | |
| Force SSL | Always Use HTTPS | |
| `netlify.toml` 的 domain-level redirect | Single Redirect Rule（zone 级） | `_redirects` 不支持域级跳转 `[docs]` |
| `/* → /error.html 404` | 顶层 `404.html` | `_redirects` 不支持 404 规则 `[docs]` |
| 500/502/503 自定义错误页 | **不支持** | CF 用自己的错误页；纯静态站基本碰不到 |
| Netlify DNS | Cloudflare DNS（改注册商 NS） | 有邮箱，务必按第 3 节搬全 |
| Netlify Forms / Functions | 不支持 / Pages Functions | 本站都没用 |
| 自动 `www → apex` | 自己配一条规则 | |
| `_headers` | `_headers`（语法兼容） | |

---

## 10. 待办：需要你本人确认的三件事 `[待核对]`

1. **Netlify DNS 里两个 zone 的完整记录表**（尤其 `stsas.top` 有没有 DKIM / 其它 TXT / CNAME）
   —— 这是唯一可能让邮箱断掉的信息，我无法从公网看全
2. **注册商**：DNSSEC 是否未启用；NS 是否可自由修改
3. **发布范围**：用默认的 glob 方案（与今天一致，`MAINTENANCE.md` 等继续公开）
   还是白名单方案（只发布站点文件）
