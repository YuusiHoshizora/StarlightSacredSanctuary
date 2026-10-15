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

## 3. ⚠️ DNS 记录清单（已导出核对完毕；这是最容易断邮箱的一步）

`stsas.top` 上有 **QQ 企业邮箱**，而且**不只是 MX**：NS 一改，下面这些记录必须已经在
Cloudflare 上存在且一字不差，否则轻则收不到信、重则进垃圾箱。

### 3.1 两个 zone 的完整记录（来自 Netlify 后台导出 CSV，权威）

**`starlightsacredsanctuary.top`（4 条；这个域名没有邮箱）**

| Netlify 类型 | 名称 | 值 |
| --- | --- | --- |
| `NETLIFY` | `@` | `starlightsacredsanctuary.netlify.app` |
| `NETLIFY` | `www` | 同上 |
| `NETLIFYv6` | `@` | 同上 |
| `NETLIFYv6` | `www` | 同上 |

**`stsas.top`（10 条）**

| Netlify 类型 | 名称 | 值 |
| --- | --- | --- |
| `NETLIFY` / `NETLIFYv6` | `@`、`www` | `starlightsacredsanctuary.netlify.app` |
| `MX` | `@` | `mxbiz1.qq.com`(5)、`mxbiz2.qq.com`(10) |
| `CNAME` | `qqmail33f0a580` | `mail.qq.com` |
| `TXT` | `qsjb2609._domainkey` | DKIM，234 字符（下面全文），已实测在线 `[实测]` |
| `TXT` | `@` | `v=spf1 include:spf.mail.qq.com ~all` |
| `TXT` | `_dmarc` | `v=DMARC1; p=none; rua=mailto:astra@stsas.top; fo=1; adkim=r; aspf=r` |

> 后两条（`qqmail33f0a580` 的 CNAME、`qsjb2609._domainkey` 的 DKIM）是**导出 CSV 才发现的** ——
> 公网查询只找到过 `default._domainkey`（不存在）。这就是这一步必须导出核对的原因。

DKIM 全文（公钥，本来就在公开 DNS 里，放这里方便复制）：

```
v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDXFmFVg1X5+fMLIC13V5wKOamuGwaGLgvZ6eDcIsuHGk2FndTpWtd0UepLOoowkgFpwAkv+CSJ6/ZxwhrtjKh9LA+mP7aNTIW7R8j4f8wagbc8c9qm6Z4EukaFIZTCPnRyGwBqN6fAYSJQXKCQssc7dMG8ZBS2qWC00689fE1rjwIDAQAB
```

### 3.2 Cloudflare 上应该建成什么（照这张表建，别照搬 Netlify 的类型）

| 来源（Netlify） | Cloudflare 里怎么处理 | 代理状态 |
| --- | --- | --- |
| 长域名的 `NETLIFY` / `NETLIFYv6`（`@` 与 `www`；CF 扫成 4 条 A + 4 条 AAAA） | **直接删掉** —— 走第 7 节最短路径，不保留 Netlify 的解析；加自定义域时 Pages 会自动建那条 CNAME | —（删掉就不用管） |
| 5 条邮件记录（MX ×2、`qqmail33f0a580` CNAME、`qsjb2609._domainkey` DKIM、SPF、DMARC） | 原样照抄 | **一律「仅 DNS」**（MX 本来就不能代理；那个 CNAME 被代理会让邮箱验证失效） |
| `stsas.top` / `www.stsas.top` 的 `NETLIFY*` | **删掉**，改建第 6 节那两条 `192.0.2.1` 占位 | **已代理**（跳转规则要求） |

两条实测结论支撑上表 `[实测]`：

- Netlify 的 `NETLIFY` / `NETLIFYv6` 本质是「指向站点主机名的扁平化别名」，
  但**它按解析来源分发不同的 IP** —— 这是实测撞上的：
  - 本机递归解析 apex：`52.74.6.109` / `13.215.239.219`（AWS 新加坡段）
  - **Cloudflare 扫描导入的**：apex `18.208.88.157` / `98.84.224.111`（美东）、
    www `13.52.188.95` / `52.52.192.191`（美西），外加上面 4 条 AAAA
  - 站点主机名 `starlightsacredsanctuary.netlify.app` 本机解析出来也是那两条新加坡 IP
  → 结论：**这些 IP 不必手建、也不必校真** —— 既然走最短路径要整批删掉，
    唯一要做的是确认「删的是 Netlify 那 8 条」而不是邮件记录
- ⚠️ 我最初「`NETLIFYv6` 不产出 AAAA、CF 上不用建 IPv6」的判断是**错的**：本机查 AAAA
  为空只是因为解析来源不同，CF 扫描实际拿到了 4 条 AAAA。删记录时**别把 4 条 AAAA 漏掉**
  以为「反正没 IPv6」

> ⚠️ Cloudflare 扫描导入的记录**默认是「已代理」（橙云）**。对**邮件记录**这个默认值必须
> 改掉（一律「仅 DNS」）；长域名的 web 记录按最短路径整批删掉，不必管它的代理状态。

---

## 4. 仓库侧要准备什么：结论是**几乎不用改**

### 4.1 必须有顶层 `404.html`

Pages 找不到文件时：**如果没有顶层 `404.html`，它会当成 SPA，把所有未匹配路径用 200 返回首页** `[docs]`。
本站现在 `/main` 是 404（`main/` 里只有 `mainpage.html`，没有 `index.html`）`[实测]` ——
没有 `404.html` 的话它会变成「200 + 首页」，对 SEO 和体验都是坏的。

同时 `_redirects` **不支持 404 规则**（能力表里 rewrites/其它状态码是 ❌）`[docs]`，
所以不能照搬 Netlify 的 `/* → /error.html 404`。

### 4.2 构建命令（已选方案：glob 排除，行为与今天一致）

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

**备选变体**（白名单写法，**本轮已决定不采用** —— 采用上面的 glob 方案）：
发布内容更干净，代价是每加一个顶层目录都得记得加进来。

```bash
mkdir -p _site && cp -r index.html error.html sw.js about archive assets fleet main starmap tool _site/ && cp _site/error.html _site/404.html
```

这个变体会顺带**不发布** `MAINTENANCE.md` / `README.md` / `LICENSE` / 本文档
（注意：这几个现在在 Netlify 上是**公开可读的** `[实测]`，glob 方案会保持这个现状）。

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

## 7. 切换顺序（最短路径 —— 已确认不介意短暂中断）

前提：本站实际只有本人测试访问，**短暂中断可以接受** → 不再需要「先把 DNS 搬过去、
仍由 Netlify 供站」这个中间态，走最短路径。

但有两件事**与访问量无关、必须保证**：

1. **邮箱不能断** —— MX / SPF / DKIM / DMARC 原样搬，一个字都不能改
2. **短域名跳转与 404 行为正确** —— 那是站点的功能，不是可用性问题

还有一条绕不过去的事实：Pages 的自定义域要等证书验证通过才生效，而验证要求
`http://<域名>/.well-known/acme-challenge/*` 能回到 Cloudflare —— NS 还指着 Netlify 时
它验证不了，自定义域会停在 **Pending** `[推断]`（依据 Pages Known issues）。所以顺序仍是
「**先加自定义域 → 再改 NS**」，只是中间不再需要保留 Netlify 的解析记录。

### 步骤 1 —— 两个 zone 的记录改成最终形态（此时线上毫无变化）

`starlightsacredsanctuary.top`：

- **删掉扫描进来的 8 条 Netlify A/AAAA**。它们不是回滚的必需品：值已存档在导出的 CSV
  和第 3.1 节里，真要退回去，1 分钟就能重新加两条
- web 记录不用手建 —— 加自定义域时 Pages 会自动创建那条 CNAME `[docs]`
- 想更保险也可以先「留着 + 仅 DNS」，等 Pages 自定义域 Active 之后再删；
  但那样加自定义域时可能撞上「记录冲突」，需要先删再加 —— 直删更省事

`stsas.top`：

- 删掉 4 条指向 Netlify 的 A/AAAA → **2 条 A `192.0.2.1`，且必须「已代理」（橙云）**
  —— 这是跳转规则能触发的前提（第 6 节）
- **6 条邮件记录（MX ×2、`qqmail33f0a580` CNAME、`qsjb2609._domainkey` DKIM、SPF、DMARC）
  原样保留、一律「仅 DNS」**
- Redirect Rule 现在就建好：zone 不生效时完全无害，等 NS 一翻过去立刻是活的

两个 zone 都：⚠️ **别碰 Email Routing** —— 它会接管并改写 MX 记录，QQ 企业邮当场断。

### 步骤 2 —— 建 Pages 项目 + 加自定义域

- 建项目（第 5 节参数），先在 `xxx.pages.dev` 上跑：
  `verify-site.ps1 -BaseUrl https://xxx.pages.dev -SkipDomainChecks` → 应全 PASS。
  这步免费，能把 404 / 跳转的问题提前挑出来，值得做
- 加自定义域：`starlightsacredsanctuary.top` + `www.starlightsacredsanctuary.top`
  → 此时状态是 **Pending**，**这是正常的**（证书要等 NS 指过来才能验证），别当失败。
  如果是 apex，CF 也可能提示「等 NS 生效后自动创建记录」，同样正常 `[docs]`
- 建 `www → 裸域` 的跳转规则（第 6 节末）

### 步骤 3 —— 改 NS（先 `stsas.top`，再主域名）

先改 `stsas.top` 不是为了可用性，而是**把邮箱问题和站点问题分开**：

- 等生效后：`verify-site.ps1 -ShortUrl https://stsas.top` 应全 PASS
- 抽查邮件记录还在：`Resolve-DnsName stsas.top -Type MX`、
  `Resolve-DnsName qsjb2609._domainkey.stsas.top -Type TXT`
- **发一封测试信到 `astra@stsas.top`** —— 确认没断，再动主域名

再改主域名的 NS。等几分钟到十几分钟，Pages 自定义域会从 Pending 自动变 **Active**
（证书签发完成），站点就活了。

**回滚点**：这条路径下回滚 = 在注册商把 NS 改回 Netlify 的四个 nsone 地址（几分钟生效）。
Netlify 侧什么都还没拆，所以随时能退。

### 步骤 4 —— 收尾

- 全量验证：
  `verify-site.ps1 -ShortUrl https://stsas.top -WwwUrl https://www.starlightsacredsanctuary.top`
  → 应全 PASS（当前基线 PASS 16 / WARN 0 / FAIL 0，任何 FAIL 都是真回归）
- **Purge Everything 一次**（Caching → Configuration → Purge Everything），清掉可能残留的旧内容 `[docs]`
- 观察几天（站点、邮件、Service Worker）→ 回 Netlify 移除两个 custom domain（或直接关站）
- 改写 `MAINTENANCE.md` 的「部署」一节、删掉本文、`netlify.toml` 可以删掉
- （可选）`sw.js`：`OFFLINE_URL` 改成 `/404`、`CACHE_VERSION` +1

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
| 邮件 | MX ×2 / DKIM(`qsjb2609._domainkey`) / SPF / DMARC 都在 QQ 企业邮 `[实测]` | 四条记录都还能解析 + 发一封测试信到 `astra@stsas.top` |

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

## 10. 已定事项与待办

**本轮已定**：

- 发布范围走 **glob 排除方案**（第 4.2 节那条命令）；白名单变体仅作备选
- **不介意短暂中断**（实际只有本人测试访问）→ 走第 7 节的**最短路径**：不再保留
  「DNS 搬完但仍由 Netlify 供站」的中间态，主域名 zone 里扫描进来的 8 条 Netlify
  A/AAAA 直接删掉（值已存档，回滚只需 1 分钟）
- Cloudflare 已有账号；`starlightsacredsanctuary.top` zone 已添加，扫描导入 8 条待处理

**还需要你提供 / 确认** `[待核对]`：

1. ~~Netlify DNS 的完整记录表~~ —— 已拿到（两个 zone 共 14 条，见第 3.1 节），
   并据此发现两条公网看不到的记录：`qqmail33f0a580` CNAME 与 `qsjb2609._domainkey` DKIM
2. **注册商**：DNSSEC 是否未启用；NS 是否可自由修改
   （公网查不到 DS 记录，但注册商侧可能另有开关）
3. `stsas.top` zone 添加后，把两个 zone 的 **导出 CSV** 发回来做最后一次对照（第 3.1 / 3.2 节）

---

## 11. 实际执行记录（进行中）

**已经完成的** `[实测]`：

- 两个域名的 **NS 都已指向 Cloudflare**（`ignacio.ns.cloudflare.com` / `carol.ns.cloudflare.com`）
- **主站已由 Cloudflare Pages 提供服务**：`https://starlightsacredsanctuary.top/` 返回 200，
  响应头里没有 `x-nf-request-id`，且有 Pages 特征的
  `Cache-Control: public, max-age=0, must-revalidate` → 源站不再是 Netlify
- `/main` 返回 404、`/error` 返回 200，站点本身正常
- `stsas.top` 的 apex 已建 `192.0.2.1` 占位（公网解析到 CF 的 `104.21/172.67` 段 = 已代理）
- 线上 `assets/post/index.json` 与仓库一致（5 篇）
- 邮件侧 MX、SPF、DMARC 都在

**还没做完 / 已发现的问题**（按紧急程度）：

1. **`stsas.top` / `www.stsas.top` 的 Redirect Rule 还没建** → 短域名现在返回 **530**
   （CF 收到请求但找不到源站）。规则一建立刻正常，见第 6 节
2. **`www.stsas.top` 连 DNS 记录都没有** → 公网完全解析不出来。必须补一条
   `A 192.0.2.1`（**已代理**），否则规则匹配不到它
3. **两条邮件记录丢了**（CF 已是权威，公网已解析不到 `[实测]`）：
   `qqmail33f0a580` CNAME → `mail.qq.com`、`qsjb2609._domainkey` 的 DKIM TXT。
   值见第 3.1 节。MX 还在所以**收信没断**，但 DKIM 失效会影响送达率/进垃圾箱
4. **404 页是空响应**：不存在的路径返回 404 但响应体 0 字节 —— 原因是 Pages 项目
   **没有用第 4.2 节的构建命令**（现在发布的是仓库根目录的原样文件）。
   仓库里已补一份 `404.html`（`error.html` 的逐字节拷贝）作保险；
   彻底修法是回 Pages 项目设置里把「构建命令 / 构建输出目录」按第 5 节配对
5. 同一原因导致 **`/netlify.toml`、`/.gitignore`、`/.github/...` 现在公开可读** `[实测]`
   （Netlify 从来不发布它们）。构建命令配好后自动恢复
6. **`www.starlightsacredsanctuary.top` 没有记录** → 主站的 www 现在是死的。
   修法：把它加成 Pages 自定义域（CF 会自动建 CNAME）+ 建一条 www→裸域 规则

**自检对比**（`.github/verify-site.ps1`）：

- 迁移前（Netlify）：**PASS 16 / WARN 0 / FAIL 0**
- 现在：**PASS 12 / WARN 0 / FAIL 3**（空 404 页、`netlify.toml` 被发布、`.github/` 被发布）
- 脚本这轮加了两条「发布范围」检查，并把 Pages 的 **307** 尾斜杠跳转算作正常
  （Netlify 是 301、Pages 是 307 —— 不是故障）

**一个与迁移无关、但值得记住的行为**：`generate-post-index.yml` 提交 index.json 时带
`[skip ci]`，而 **Cloudflare Pages 与 Netlify 一样会跳过这次部署**。如果哪天发现文章列表
没更新，先想到这一点（目前线上 index.json 与仓库一致，暂无问题）。

