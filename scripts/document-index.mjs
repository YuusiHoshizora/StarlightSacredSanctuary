/* =============================================================================
 * document-index.mjs — 文件档案：扫描 assets/document/ 生成页面数据
 * -----------------------------------------------------------------------------
 * 文件档案的「来源」只有一处：assets/document/。目录结构就是来源：
 *
 *   assets/document/<来源>/<文件名>.<扩展名>
 *   assets/document/<来源>/<文件名>.<扩展名>.meta.json   （可选，覆盖标题 / 日期 / 摘要等）
 *
 * 分类只看扩展名（.md → 文档、.png/.jpg… → 图像、音频、视频，其余进「其他」），
 * 所以加文件只需要丢进这个目录，然后跑一次：
 *
 *   node scripts/document-index.mjs           # 重建 assets/data/document.js
 *   node scripts/document-index.mjs --check   # 只检查是否最新（CI 用）
 *
 * 生成物是 assets/data/document.js（window.SSS_DOCUMENT），页面直接读它；
 * 推送到 master 时 .github/workflows/document-index.yml 会自动跑并提交结果。
 *
 * 元数据 sidecar（全部可选）：
 *   title / en / number / kind / date / source / clearance / summary / notes /
 *   width / height / duration / lines
 * 不写 source 时，来源取第一层目录名；不写标题时用文件名（连字符换空格）。
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC_REL = 'assets/document';
const SRC = path.join(ROOT, SRC_REL);
const OUT = path.join(ROOT, 'assets', 'data', 'document.js');
const CHECK = process.argv.includes('--check');

const KIND_ORDER = ['image', 'document', 'audio', 'video', 'other'];
const PREFIX = { image: 'IMG', document: 'DOC', audio: 'AUD', video: 'VID', other: 'FIL' };
const EXT_KIND = {
    md: 'document', markdown: 'document', pdf: 'document', txt: 'document',
    png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', gif: 'image', svg: 'image', avif: 'image',
    mp3: 'audio', wav: 'audio', ogg: 'audio', flac: 'audio', m4a: 'audio', aac: 'audio',
    mp4: 'video', webm: 'video', mov: 'video', m4v: 'video'
};

/* ------------------------------- 遍历目录 ------------------------------- */

function walk(dir, rel) {
    let out = [];
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
        console.error('[document] 读不到目录：' + dir);
        process.exit(1);
    }
    for (const entry of entries) {
        const name = entry.name;
        if (name.charAt(0) === '.' || name.charAt(0) === '_') continue;
        if (name === 'Thumbs.db' || name === 'desktop.ini') continue;
        const nextRel = rel ? rel + '/' + name : name;
        if (entry.isDirectory()) {
            out = out.concat(walk(path.join(dir, name), nextRel));
        } else if (entry.isFile()) {
            if (name.toLowerCase().endsWith('.meta.json')) continue;
            out.push(nextRel);
        }
    }
    return out;
}

/* ------------------------------- 元数据 ------------------------------- */

function readMeta(rel) {
    const metaPath = path.join(SRC, ...rel.split('/')) + '.meta.json';
    if (!fs.existsSync(metaPath)) return {};
    let text;
    try {
        text = fs.readFileSync(metaPath, 'utf8');
    } catch (err) {
        throw new Error('读不到元数据：' + rel + '.meta.json');
    }
    let data;
    try {
        data = JSON.parse(text);
    } catch (err) {
        throw new Error('元数据不是合法 JSON：' + rel + '.meta.json（' + err.message + '）');
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('元数据必须是对象：' + rel + '.meta.json');
    }
    return data;
}

/* ------------------------------- 工具 ------------------------------- */

function stripExt(rel) {
    return rel.replace(/\.[^./]+$/, '');
}

function baseTitle(rel) {
    const base = stripExt(rel.split('/').pop());
    return base.replace(/[-_]+/g, ' ').trim() || base;
}

function slugify(rel) {
    const raw = stripExt(rel)
        .toLowerCase()
        .replace(/[^\p{L}\p{N}_-]+/gu, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    return raw || 'file';
}

function sizeText(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB';
}

function formatDuration(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h ? h + ':' + mm + ':' + ss : mm + ':' + ss;
}

function readHead(file, bytes) {
    const fd = fs.openSync(file, 'r');
    try {
        const buf = Buffer.alloc(bytes);
        const n = fs.readSync(fd, buf, 0, bytes, 0);
        return buf.subarray(0, n);
    } finally {
        fs.closeSync(fd);
    }
}

/* --------------------------- 图像尺寸 / WAV 时长 --------------------------- */

function imageSize(buf, ext) {
    if (ext === 'png') {
        if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) {
            return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
        }
        return null;
    }
    if (ext === 'jpg' || ext === 'jpeg') {
        let i = 2;
        while (i + 9 < buf.length) {
            if (buf[i] !== 0xff) { i++; continue; }
            const marker = buf[i + 1];
            if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
            const len = buf.readUInt16BE(i + 2);
            if (len < 2) return null;
            if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
                return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
            }
            i += 2 + len;
        }
        return null;
    }
    if (ext === 'gif') {
        if (buf.length >= 10 && buf.toString('ascii', 0, 3) === 'GIF') {
            return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
        }
        return null;
    }
    if (ext === 'webp') {
        if (buf.length >= 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
            const chunk = buf.toString('ascii', 12, 16);
            if (chunk === 'VP8X') {
                return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
            }
        }
        return null;
    }
    return null;
}

function svgSize(file) {
    let text;
    try {
        text = fs.readFileSync(file, 'utf8');
    } catch (err) {
        return null;
    }
    const head = text.slice(0, 4096);
    const w = /\bwidth\s*=\s*["']?([\d.]+)/i.exec(head);
    const h = /\bheight\s*=\s*["']?([\d.]+)/i.exec(head);
    if (w && h) return { width: Math.round(Number(w[1])), height: Math.round(Number(h[1])) };
    const vb = /viewBox\s*=\s*["']([^"']+)["']/i.exec(head);
    if (vb) {
        const parts = vb[1].trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
            return { width: Math.round(parts[2]), height: Math.round(parts[3]) };
        }
    }
    return null;
}

function wavDuration(file) {
    const buf = readHead(file, 65536);
    if (buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return null;
    let i = 12;
    let byteRate = 0;
    let dataSize = 0;
    while (i + 8 <= buf.length) {
        const id = buf.toString('ascii', i, i + 4);
        const size = buf.readUInt32LE(i + 4);
        if (id === 'fmt ' && i + 20 <= buf.length) byteRate = buf.readUInt32LE(i + 16);
        if (id === 'data') { dataSize = size; break; }
        i += 8 + size + (size & 1);
    }
    if (!byteRate || !dataSize) return null;
    return formatDuration(dataSize / byteRate);
}

/* ------------------------------- 生成记录 ------------------------------- */

function build() {
    if (!fs.existsSync(SRC)) {
        console.error('[document] 找不到目录：' + SRC_REL);
        process.exit(1);
    }

    const files = walk(SRC, '').sort();
    const usedIds = Object.create(null);
    const counters = Object.create(null);
    const records = [];

    for (const rel of files) {
        const ext = (path.extname(rel).slice(1) || '').toLowerCase();
        const meta = readMeta(rel);
        let kind = EXT_KIND[ext] || 'other';
        if (meta.kind) {
            if (KIND_ORDER.indexOf(meta.kind) < 0) {
                throw new Error('sidecar 的 kind 只能是 ' + KIND_ORDER.join(' / ') + '：' + rel + '.meta.json');
            }
            kind = meta.kind;
        }
        const abs = path.join(SRC, ...rel.split('/'));
        const stat = fs.statSync(abs);
        const size = stat.size;

        let id = slugify(rel);
        if (usedIds[id]) {
            let n = 2;
            while (usedIds[id + '-' + n]) n++;
            id = id + '-' + n;
        }
        usedIds[id] = true;

        counters[kind] = (counters[kind] || 0) + 1;
        const autoNumber = PREFIX[kind] + '-' + String(counters[kind]).padStart(4, '0');

        let width = Number(meta.width) ? Number(meta.width) : null;
        let height = Number(meta.height) ? Number(meta.height) : null;
        if (kind === 'image') {
            const parsed = ext === 'svg' ? svgSize(abs) : imageSize(readHead(abs, 262144), ext);
            if (parsed) {
                width = width || parsed.width || null;
                height = height || parsed.height || null;
            }
        }

        let duration = meta.duration ? String(meta.duration) : '';
        if (!duration && ext === 'wav') duration = wavDuration(abs) || '';

        let lines = null;
        if (ext === 'md' || ext === 'markdown') {
            const text = fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '');
            lines = text ? text.split('\n').length : 0;
        } else if (Number(meta.lines)) {
            lines = Number(meta.lines);
        }

        const source = meta.source ? String(meta.source) : (rel.includes('/') ? rel.split('/')[0] : '未分类');

        records.push({
            id: id,
            file: rel,
            url: SRC_REL + '/' + rel.split('/').map(encodeURIComponent).join('/'),
            kind: kind,
            ext: ext,
            title: meta.title ? String(meta.title) : baseTitle(rel),
            en: meta.en ? String(meta.en) : '',
            number: meta.number ? String(meta.number) : autoNumber,
            size: size,
            sizeText: sizeText(size),
            width: width,
            height: height,
            duration: duration,
            lines: lines,
            date: meta.date ? String(meta.date) : '',
            source: source,
            clearance: meta.clearance ? String(meta.clearance) : '公开',
            summary: meta.summary ? String(meta.summary) : '',
            notes: meta.notes ? String(meta.notes) : ''
        });
    }

    records.sort(function (a, b) {
        const ka = KIND_ORDER.indexOf(a.kind);
        const kb = KIND_ORDER.indexOf(b.kind);
        if (ka !== kb) return ka - kb;
        return a.file < b.file ? -1 : a.file > b.file ? 1 : 0;
    });

    const header = `/* =============================================================================
 * 文件档案数据 —— 星光圣域
 * -----------------------------------------------------------------------------
 * ⚠️ 生成文件：由 \`node scripts/document-index.mjs\` 扫描 assets/document/ 生成。
 *   不要直接改这里 —— 加 / 删 / 改文件后重跑脚本（GitHub Actions 也会跑）。
 *   目录结构、sidecar 元数据写法见 MAINTENANCE.md 的「文件档案」。
 * ========================================================================== */
`;

    const text = header + 'window.SSS_DOCUMENT = ' + JSON.stringify({ records: records }, null, 2) + ';\n';
    return { text: text, records: records };
}

/* ------------------------------- 主流程 ------------------------------- */

let result;
try {
    result = build();
} catch (err) {
    console.error('[document] ' + err.message);
    process.exit(1);
}

const exists = fs.existsSync(OUT);
const old = exists ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';

if (CHECK) {
    if (old === result.text) {
        console.log('[document] 已是最新（' + result.records.length + ' 条）');
        process.exit(0);
    }
    console.error('[document] assets/data/document.js 不是最新，请运行 node scripts/document-index.mjs');
    process.exit(1);
}

fs.writeFileSync(OUT, result.text, 'utf8');

const counts = Object.create(null);
result.records.forEach(function (r) { counts[r.kind] = (counts[r.kind] || 0) + 1; });
console.log('[document] 扫描 ' + SRC_REL + '：' + result.records.length + ' 条');
KIND_ORDER.forEach(function (k) {
    if (counts[k]) console.log('  ' + k + ': ' + counts[k]);
});
console.log('[document] 写入 assets/data/document.js');
