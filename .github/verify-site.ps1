<#
.SYNOPSIS
    站点 URL 契约自检 —— 迁移到 Cloudflare 前后都用它。

.DESCRIPTION
    逐条核对 MIGRATION-CLOUDFLARE.md 第 8 节那份「切换后必须验的清单」。
    判定标准全部来自仓库里的文件（error.html、sw.js、assets/），不写死内容。

    放在 .github/ 下是故意的：两个托管（Netlify 与 Cloudflare Pages 的构建命令）
    都不会把它发布出去，所以它对线上站点零影响。

.EXAMPLE
    # 1) 迁移前基线（Netlify）
    pwsh -File .github\verify-site.ps1

    # 2) Cloudflare 预览域名先验 —— 还没动 DNS 时最关键的一步
    pwsh -File .github\verify-site.ps1 -BaseUrl https://你的项目.pages.dev -SkipDomainChecks

    # 3) 切换后全量（连短域名跳转一起验）
    pwsh -File .github\verify-site.ps1 -ShortUrl https://stsas.top -WwwUrl https://www.starlightsacredsanctuary.top

.NOTES
    退出码 0 = 全通过；1 = 有 FAIL。WARN 不算失败，但请看一眼。

    ⚠️ 这个文件必须保持「UTF-8 带 BOM」。Windows PowerShell 5.1 会把无 BOM 的 UTF-8
    当 ANSI 读，里面的中文会直接把脚本解析坏（报 AmpersandNotAllowed 之类的假错）。
    改完用这条确认前三字节是 EF BB BF：

        [System.IO.File]::ReadAllBytes('.github\verify-site.ps1')[0..2] | ForEach-Object { '{0:X2}' -f $_ }
#>
param(
    [string]$BaseUrl = 'https://starlightsacredsanctuary.top',
    [string]$ShortUrl = '',          # 例如 https://stsas.top （留空则跳过短域名跳转检查）
    [string]$WwwUrl = '',            # 例如 https://www.starlightsacredsanctuary.top
    [string]$ShortTargetUrl = 'https://starlightsacredsanctuary.top',
    [switch]$SkipDomainChecks
)

$ErrorActionPreference = 'Continue'
$RepoRoot = Split-Path $PSScriptRoot -Parent
$curl = (Get-Command curl.exe -ErrorAction SilentlyContinue).Source
if (-not $curl) { Write-Host '找不到 curl.exe，无法继续' -ForegroundColor Red; exit 1 }

$results = New-Object System.Collections.ArrayList
function Add-Result([string]$level, [string]$name, [string]$expect, [string]$actual) {
    [void]$results.Add([pscustomobject]@{ Level = $level; Name = $name; Expect = $expect; Actual = $actual })
}

function Get-Head([string]$url) {
    $raw = (& $curl -sS -k -I --max-redirs 0 --connect-timeout 20 $url 2>&1 | Out-String)
    $code = 0
    $m = [regex]::Match($raw, 'HTTP/[\d.]+\s+(\d{3})')
    if ($m.Success) { $code = [int]$m.Groups[1].Value }
    $loc = ''
    $m2 = [regex]::Match($raw, '(?im)^\s*location:\s*(\S+)')
    if ($m2.Success) { $loc = $m2.Groups[1].Value.Trim() }
    return @{ Code = $code; Location = $loc; Raw = $raw }
}

function Get-Body([string]$url, [string]$outFile) {
    $meta = (& $curl -sS -k -o $outFile --connect-timeout 60 -w '%{http_code} %{size_download}' $url 2>&1 | Out-String).Trim()
    $parts = @($meta -split '\s+')
    if ($parts.Count -lt 2 -or $parts[0] -notmatch '^\d+$') {
        return @{ Code = 0; Size = 0 }
    }
    return @{ Code = [int]$parts[0]; Size = [int]$parts[1] }
}

function Test-Path-Code([string]$path, [int[]]$expect, [string]$label) {
    $url = $BaseUrl.TrimEnd('/') + $path
    $h = Get-Head $url
    $level = 'FAIL'
    if ($expect -contains $h.Code) { $level = 'PASS' }
    $actual = "$($h.Code)"
    if ($h.Location) { $actual += " -> $($h.Location)" }
    Add-Result $level $label ("[" + ($expect -join '/') + "]") $actual
}

Write-Host ""
Write-Host "站点 URL 契约自检" -ForegroundColor Cyan
Write-Host "  BaseUrl : $BaseUrl"
if ($ShortUrl) { Write-Host "  ShortUrl: $ShortUrl  (应 301 到 $ShortTargetUrl)" }
if ($WwwUrl)   { Write-Host "  WwwUrl  : $WwwUrl" }
Write-Host "  RepoRoot: $RepoRoot"
Write-Host ""

# ── 1. 各页面可达性 ────────────────────────────────────────────────
Test-Path-Code '/'            @(200) '首页'
Test-Path-Code '/about/'      @(200) '关于页'
Test-Path-Code '/archive/'    @(200) '档案页'
Test-Path-Code '/tool/'       @(200) '工具页'
Test-Path-Code '/starmap/'    @(200) '星图页'
Test-Path-Code '/fleet/'      @(200) '舰队页'
Test-Path-Code '/error'       @(200) '错误页（去扩展名）'
Test-Path-Code '/sw.js'       @(200) 'Service Worker'
Test-Path-Code '/assets/post/index.json' @(200) '文章索引'

# 尾斜杠形态：Netlify 是 301、Cloudflare Pages 是 307（或直接 200），都算正常
Test-Path-Code '/about'       @(200, 301, 307, 308) '关于页（无尾斜杠）'

# ── 2. 关键：404 必须仍是 404 + 自定义错误页 ───────────────────────
#    如果 Pages 上没有顶层 404.html，这里会变成「200 + 首页」——这是最需要抓的回归。
$tmp404 = Join-Path $env:TEMP ('verify-site-404-' + [guid]::NewGuid().ToString('N') + '.html')
$r404 = Get-Body ($BaseUrl.TrimEnd('/') + '/no-such-page-verify-script') $tmp404
if ($r404.Code -eq 404) {
    $localError = Join-Path $RepoRoot 'error.html'
    if ($r404.Size -lt 100) {
        # 实测过的真实故障形态：Pages 上没有可用的顶层 404.html 时，
        # 返回 404 但响应体是空的 —— 访问者看到一片空白。
        Add-Result 'FAIL' '不存在的路径' '[404 + 自定义错误页]' "404，但响应体是空的（$($r404.Size) B）—— 缺顶层 404.html"
    } elseif (Test-Path $localError) {
        # 注意：工作区是 CRLF、部署出去的 blob 是 LF（core.autocrlf），
        # 必须先归一化行尾再比，否则永远不相等（5972 B vs 6092 B）。
        $localText  = ([System.IO.File]::ReadAllText($localError)) -replace "`r`n", "`n"
        $remoteText = ([System.IO.File]::ReadAllText($tmp404))     -replace "`r`n", "`n"
        if ($localText -ceq $remoteText) {
            Add-Result 'PASS' '不存在的路径' '[404 + 自定义错误页]' "404，内容与 error.html 完全一致（$($r404.Size) B）"
        } else {
            Add-Result 'WARN' '不存在的路径' '[404 + 自定义错误页]' "404，但内容与 error.html 不一致（$($r404.Size) B）—— 可能被压缩/注入了，人工看一眼"
        }
    } else {
        Add-Result 'WARN' '不存在的路径' '[404 + 自定义错误页]' '404，但本地找不到 error.html 无法比对'
    }
} elseif ($r404.Code -eq 200) {
    Add-Result 'FAIL' '不存在的路径' '[404 + 自定义错误页]' "200 —— 未匹配路径返回了首页，说明顶层 404.html 缺失（Pages 会当 SPA 处理）"
} else {
    Add-Result 'FAIL' '不存在的路径' '[404 + 自定义错误页]' "$($r404.Code)"
}
Remove-Item $tmp404 -Force -ErrorAction SilentlyContinue

# ── 3. 文章索引是合法 JSON，且能读出条数 ───────────────────────────
$tmpJson = Join-Path $env:TEMP ('verify-site-index-' + [guid]::NewGuid().ToString('N') + '.json')
$rj = Get-Body ($BaseUrl.TrimEnd('/') + '/assets/post/index.json') $tmpJson
if ($rj.Code -eq 200) {
    try {
        $arr = Get-Content -LiteralPath $tmpJson -Raw -Encoding UTF8 | ConvertFrom-Json
        Add-Result 'PASS' '文章索引内容' '[合法 JSON 数组]' "$($arr.Count) 篇"
    } catch {
        Add-Result 'FAIL' '文章索引内容' '[合法 JSON 数组]' '解析失败：' + $_.Exception.Message
    }
} else {
    Add-Result 'FAIL' '文章索引内容' '[合法 JSON 数组]' "$($rj.Code)"
}
Remove-Item $tmpJson -Force -ErrorAction SilentlyContinue

# ── 4. 字体真的能整包下载（带宽爆掉的就是它） ──────────────────────
$tmpFont = Join-Path $env:TEMP ('verify-site-font-' + [guid]::NewGuid().ToString('N') + '.woff2')
$rf = Get-Body ($BaseUrl.TrimEnd('/') + '/assets/fonts/SarasaGothicSC-Regular.woff2') $tmpFont
if ($rf.Code -eq 200 -and $rf.Size -gt 5MB) {
    Add-Result 'PASS' '字体下载' '[200 且 > 5 MB]' ("200, {0:N2} MB" -f ($rf.Size / 1MB))
} else {
    Add-Result 'FAIL' '字体下载' '[200 且 > 5 MB]' ("$($rf.Code), {0:N2} MB" -f ($rf.Size / 1MB))
}
Remove-Item $tmpFont -Force -ErrorAction SilentlyContinue

# ── 5. 域级跳转 ────────────────────────────────────────────────────
if (-not $SkipDomainChecks) {
    if ($ShortUrl) {
        $h = Get-Head ($ShortUrl.TrimEnd('/') + '/')
        $ok = ($h.Code -eq 301 -and $h.Location -like "$ShortTargetUrl*")
        $level = 'FAIL'; if ($ok) { $level = 'PASS' }
        Add-Result $level '短域名根路径' "[301 -> $ShortTargetUrl]" "$($h.Code) $($h.Location)"

        # 路径 + 查询串必须原样带过去
        $probe = '/archive/index.html?a=1&b=2'
        $h2 = Get-Head ($ShortUrl.TrimEnd('/') + $probe)
        $want = $ShortTargetUrl.TrimEnd('/') + $probe
        $ok2 = ($h2.Code -eq 301 -and $h2.Location.TrimEnd('/') -eq $want.TrimEnd('/'))
        $level2 = 'FAIL'; if ($ok2) { $level2 = 'PASS' }
        Add-Result $level2 '短域名路径+查询串保持' "[301 -> $want]" "$($h2.Code) $($h2.Location)"
    }

    if ($WwwUrl) {
        $h = Get-Head ($WwwUrl.TrimEnd('/') + '/')
        $ok = ($h.Code -eq 301 -and $h.Location.TrimEnd('/') -eq $ShortTargetUrl.TrimEnd('/'))
        $level = 'FAIL'; if ($ok) { $level = 'PASS' }
        Add-Result $level 'www 跳裸域' "[301 -> $ShortTargetUrl]" "$($h.Code) $($h.Location)"
    }
}

# ── 6. 发布范围：这些文件本来就不该被托管出去 ──────────────────────
#    Netlify 从不发布 netlify.toml 与点开头的目录；Pages 只有在构建命令生效时才不发布。
#    这两条 FAIL 通常意味着 Pages 项目的「构建命令 / 构建输出目录」没配对。
Test-Path-Code '/netlify.toml' @(404) 'netlify.toml 未被发布'
Test-Path-Code '/.github/workflows/generate-post-index.yml' @(404) '.github/ 未被发布'
# 资源目录如果在仓库根目录，.git/ 会被一起托管出去（实测过 /  .git/HEAD = 200）。
# 这一条是安全回归测试：必须靠 .assetsignore 排除掉。
Test-Path-Code '/.git/HEAD' @(404) '.git/ 未被发布（安全）'

# ── 汇总 ───────────────────────────────────────────────────────────
Write-Host ("{0,-6} {1,-26} {2,-28} {3}" -f '结果', '检查项', '期望', '实际') -ForegroundColor Cyan
Write-Host ('-' * 104)
foreach ($r in $results) {
    $color = 'Green'
    if ($r.Level -eq 'FAIL') { $color = 'Red' }
    elseif ($r.Level -eq 'WARN') { $color = 'Yellow' }
    Write-Host ("{0,-6} {1,-26} {2,-28} {3}" -f $r.Level, $r.Name, $r.Expect, $r.Actual) -ForegroundColor $color
}
Write-Host ('-' * 104)

$fail = @($results | Where-Object { $_.Level -eq 'FAIL' }).Count
$warn = @($results | Where-Object { $_.Level -eq 'WARN' }).Count
$pass = @($results | Where-Object { $_.Level -eq 'PASS' }).Count
Write-Host ("PASS {0} / WARN {1} / FAIL {2}" -f $pass, $warn, $fail) -ForegroundColor Cyan
Write-Host ""
Write-Host "浏览器里还要人工确认两件事（脚本验不了）：" -ForegroundColor DarkGray
Write-Host "  1. 打开首页 → 控制台看 Service Worker 是否正常注册/更新" -ForegroundColor DarkGray
Write-Host "  2. 星图页 / 工具页的交互是否正常（背景、拾色器、时间转换）" -ForegroundColor DarkGray

if ($fail -gt 0) {
    Write-Host ""
    Write-Host "排错第一步：某项若显示「0」或完全无响应，先怀疑解析缓存，别急着改配置 ——" -ForegroundColor Yellow
    Write-Host "  递归解析器会把「记录不存在」的负答案缓存住（实测被坑过两轮）。查权威 NS 才准：" -ForegroundColor DarkGray
    Write-Host "    Resolve-DnsName stsas.top -Type A -Server ignacio.ns.cloudflare.com" -ForegroundColor DarkGray
    Write-Host "  本机仍显示旧的，就 ipconfig /flushdns 后再跑一次本脚本。" -ForegroundColor DarkGray
}

if ($fail -gt 0) { exit 1 } else { exit 0 }
