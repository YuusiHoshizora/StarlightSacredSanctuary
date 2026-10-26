/* =============================================================================
 * stamp-sw-version.mjs — 把"页面内容"的指纹写进 sw.js 的 CACHE_VERSION
 * -----------------------------------------------------------------------------
 * 为什么需要它
 *   浏览器只有在 sw.js 的字节发生变化时才会安装新版 Service Worker。
 *   而站内导航是缓存优先的，一旦 sw.js 没变，改了页面也等于没改：老访客继续吃旧缓存，
 *   也不会触发加载屏（新 SW → activate 换缓存 → controllerchange → 各页 <head>
 *   读到 sss-boot-next → 下次进入任意页面补弹一次加载屏）。
 *   以前这一下靠人记得手改 CACHE_VERSION（踩过：改了 8 个页面忘了加版本号）。
 *   这里改成自动：内容变了，版本号一定变；内容没变，版本号一定不变。
 *
 * 指纹范围（只取"会进预缓存、决定页面能否整块换新"的东西）
 *   · sw.js 里 PRECACHE_URLS 列出的每个文件（全部页面 / CSS / JS / 数据 / 索引）
 *   · assets/post/**\/*.md（文章正文；不进预缓存，但改了也算内容变动）
 *   排除：
 *   · sw.js 自己 —— 它本来就会被浏览器逐字节比对，不需要靠版本号发现
 *   · assets/post/index.json —— 由 generate-post-index 工作流异步重写，
 *     用 .md 集合就能代表文章变动，混进它只会让版本号来回抖
 *
 * 换行归一化
 *   仓库 blob 是 LF，Windows 工作区是 CRLF（core.autocrlf=true）。
 *   哈希前统一成 LF，本地跑和 CI 跑得到同一个值。
 *
 * 用法
 *   node .github/stamp-sw-version.mjs           # 有变化就改写 sw.js（CI 用）
 *   node .github/stamp-sw-version.mjs --check   # 只报是否已是最新，不改写、不用工作区状态
 * ========================================================================== */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SW_PATH = join(ROOT, 'sw.js');
const CHECK_ONLY = process.argv.includes('--check');

const toPosix = (p) => p.split('\\').join('/');
const lf = (buf) => Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');

/* ------------------------- 1. 从 sw.js 里读预缓存清单 ------------------------- */

const swText = readFileSync(SW_PATH, 'utf8');
const listMatch = swText.match(/const\s+PRECACHE_URLS\s*=\s*\[([\s\S]*?)\n\];/);
if (!listMatch) {
    console.error('[stamp] 在 sw.js 里找不到 PRECACHE_URLS 数组');
    process.exit(1);
}
const urls = [...listMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
if (!urls.length) {
    console.error('[stamp] PRECACHE_URLS 解析为空');
    process.exit(1);
}

/* URL → 仓库内相对路径（同一条 URL 会同时存在目录形式与 .html 形式） */
function urlToFile(url) {
    let p = url.replace(/^\/+/, '');
    if (p === '') return 'index.html';
    if (p.endsWith('/')) return p + 'index.html';
    if (!/\.[^/]+$/.test(p)) return p + '.html';
    return p;
}

const skip = new Set(['assets/post/index.json', 'sw.js']);

const files = new Set();
for (const url of urls) {
    const rel = urlToFile(url);
    if (!skip.has(rel)) files.add(rel);
}

/* --------------------------- 2. 文章正文（.md） --------------------------- */

function walk(dir) {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
        if (entry.name === '.obsidian') continue;
        const rel = posix.join(dir.split('\\').join('/'), entry.name);
        if (entry.isDirectory()) walk(rel);
        else if (entry.name.toLowerCase().endsWith('.md')) files.add(rel);
    }
}
walk('assets/post');

/* ------------------------------ 3. 算指纹 ------------------------------ */

const sorted = [...files].sort();
const hash = createHash('sha256');
const missing = [];

for (const rel of sorted) {
    let buf;
    try {
        buf = readFileSync(join(ROOT, ...rel.split('/')));
    } catch (err) {
        missing.push(rel);
        continue;
    }
    hash.update(rel, 'utf8');
    hash.update('\0');
    hash.update(lf(buf));
    hash.update('\0');
}

if (missing.length) {
    console.error('[stamp] 预缓存清单里的文件在仓库里不存在：\n  ' + missing.join('\n  '));
    process.exit(1);
}

const digest = hash.digest('hex').slice(0, 10);

/* --------------------------- 4. 写进 CACHE_VERSION --------------------------- */

const versionMatch = swText.match(/const\s+CACHE_VERSION\s*=\s*'([^']+)';/);
if (!versionMatch) {
    console.error('[stamp] 在 sw.js 里找不到 CACHE_VERSION');
    process.exit(1);
}

const oldVersion = versionMatch[1];
const base = oldVersion.split('+')[0];          // 手写的语义版本部分保留（v5.72）
const newVersion = `${base}+${digest}`;         // 指纹跟在后面：内容一变它必变

console.log(`[stamp] 参与指纹的文件 ${sorted.length} 个，摘要 ${digest}`);
console.log(`[stamp] CACHE_VERSION: ${oldVersion} → ${newVersion}`);

if (oldVersion === newVersion) {
    console.log('[stamp] 已是最新，不用改写');
    process.exit(0);
}

if (CHECK_ONLY) {
    console.error('[stamp] --check：版本号已过期');
    process.exit(1);
}

// 只替换那一处字面量，其余字节（含换行风格）原样保留
const next = swText.replace(versionMatch[1], newVersion);
writeFileSync(SW_PATH, next, 'utf8');
console.log('[stamp] 已改写 sw.js');
