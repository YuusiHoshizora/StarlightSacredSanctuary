#!/usr/bin/env node
/* =============================================================================
 * data-csv.mjs — 站点数据：CSV（人读 / 表格软件编辑）⇄ JS（站点读取）
 * -----------------------------------------------------------------------------
 * 数据源在 data/ 下的 CSV；站点读的 assets/data/*.js 是**生成物**。
 *
 *   node scripts/data-csv.mjs build     CSV → assets/data/*.js（日常用这个）
 *   node scripts/data-csv.mjs check     只检查 JS 是否和 CSV 一致（CI 用，不写文件）
 *   node scripts/data-csv.mjs export    assets/data/*.js → CSV（会覆盖 CSV，慎用）
 *
 * CSV 约定（详见 data/README.md）：
 *   - UTF-8（带 BOM，Excel 直接双击不乱码），逗号分隔，CRLF
 *   - 单元格里可以写换行（Excel 里是 Alt+Enter），表示「段落列表」
 *   - 同一份记录的多行子表（配件 / 装备 / 组织）按文件中的先后顺序渲染
 * ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');
const JS_DIR = path.join(ROOT, 'assets', 'data');

const BOM = '\uFEFF';

/* ========================================================================== *
 * 一、CSV 读写
 * ========================================================================== */

function parseCsv(text) {
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    let line = 1;
    const lines = [];
    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') { cell += '"'; i += 1; } else { inQuotes = false; }
            } else {
                if (ch === '\n') line += 1;
                cell += ch;
            }
            continue;
        }
        if (ch === '"') { inQuotes = true; continue; }
        if (ch === ',') { row.push(cell); cell = ''; continue; }
        if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i += 1;
            row.push(cell); cell = '';
            rows.push(row);
            lines.push(line);
            row = [];
            line += 1;
            continue;
        }
        cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); lines.push(line); }
    return { rows, lines };
}

function csvCell(value) {
    const s = value == null ? '' : String(value);
    if (s === '') return '';
    return /[",\r\n]|^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function writeCsv(rel, columns, records) {
    const out = [columns.join(',')];
    for (const rec of records) out.push(columns.map((c) => csvCell(rec[c])).join(','));
    const abs = path.join(DATA_DIR, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, BOM + out.join('\r\n') + '\r\n', 'utf8');
}

/* -- 读取：按列名映射，行号带进报错信息 -------------------------------- */
function readTable(rel, columns) {
    const abs = path.join(DATA_DIR, rel);
    if (!fs.existsSync(abs)) throw new Error(`缺少文件 data/${rel}（先跑 export，或从 git 恢复）`);
    const { rows, lines } = parseCsv(fs.readFileSync(abs, 'utf8'));
    if (!rows.length) throw new Error(`data/${rel} 是空文件`);
    const header = rows[0].map((h) => h.trim());
    const dup = header.filter((h, i) => h && header.indexOf(h) !== i);
    if (dup.length) throw new Error(`data/${rel}:1 表头重复：${[...new Set(dup)].join(', ')}`);
    const missing = columns.filter((c) => !header.includes(c));
    const unknown = header.filter((h) => h && !columns.includes(h));
    if (missing.length) throw new Error(`data/${rel}:1 表头缺列：${missing.join(', ')}（需要：${columns.join(', ')}）`);
    if (unknown.length) throw new Error(`data/${rel}:1 表头有未知列：${unknown.join(', ')}（拼错了？可选列：${columns.join(', ')}）`);

    const out = [];
    for (let r = 1; r < rows.length; r += 1) {
        const cells = rows[r];
        if (cells.every((c) => c === '')) continue;
        if (cells.length > header.length) {
            throw new Error(`data/${rel}:${lines[r]} 列数比表头多（表头 ${header.length} 列，这一行 ${cells.length} 列）`);
        }
        const rec = { __file: rel, __line: lines[r] };
        for (const c of columns) {
            const idx = header.indexOf(c);
            // 行尾的换行符只是单元格写法的残留（表格软件 / 手写 CSV 常见），不是内容
            rec[c] = (idx >= 0 && idx < cells.length ? cells[idx] : '').replace(/[\r\n]+$/, '');
        }
        out.push(rec);
    }
    return out;
}

function where(rec) { return `data/${rec.__file}:${rec.__line}`; }

/* Excel 会把长数字 / 日期样子的文本自动改写，这里专门抓回来 */
function looksLikeExcelNumber(v) { return /^\s*-?\d+(\.\d+)?[eE][+-]?\d+\s*$/.test(v); }

function excelHint(rec, col, raw) {
    return `${where(rec)} 列「${col}」被改成了「${raw}」——像是被表格软件自动转换了（长数字变科学计数法 / 日期被改写）。` +
        `用 Excel 的话请「数据 → 从文本/CSV」导入并把这一列设为「文本」，或者直接用 VS Code 编辑。`;
}

function text(rec, col) { return rec[col]; }

function required(rec, col) {
    const v = rec[col];
    if (v === '') throw new Error(`${where(rec)} 列「${col}」不能为空`);
    return v;
}

/* 单元格 → 段落数组：一行一段，空行忽略 */
function paragraphs(rec, col) {
    const raw = rec[col];
    if (!raw) return [];
    return raw.split(/\r?\n/).filter((s) => s !== '');
}

/* 单元格 → 单行数组（舰船装备条目、配件清单），允许内容里的换行被当成两条 */
function lines(rec, col) { return paragraphs(rec, col); }

function bool(rec, col) {
    const v = rec[col].trim().toLowerCase();
    if (v === '' || v === 'false' || v === '0' || v === '否') return false;
    if (v === 'true' || v === '1' || v === '是') return true;
    throw new Error(`${where(rec)} 列「${col}」要写 true / false，现在是「${rec[col]}」`);
}

function number(rec, col) {
    const v = rec[col].trim();
    const n = Number(v);
    if (v === '' || !Number.isFinite(n)) {
        throw new Error(`${where(rec)} 列「${col}」要写数字，现在是「${rec[col]}」`);
    }
    return n;
}

/* 数值如果原样能写成数字就写成数字，否则保留字符串（星图里的 starCount 两种都有） */
function looseNumber(rec, col) {
    const v = rec[col].trim();
    return /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
}

/* 'none' | 'damaged' | 'list' —— 区分「这一节不存在」与「这一节存在但内容损坏」 */
function sectionState(rec, col) {
    const v = rec[col].trim().toLowerCase();
    if (v === '' || v === 'none') return 'none';
    if (v === 'damaged') return 'damaged';
    if (v === 'list') return 'list';
    throw new Error(`${where(rec)} 列「${col}」只能写 none / damaged / list，现在是「${rec[col]}」`);
}

function groupBy(records, keyCol, tableRel) {
    const map = new Map();
    for (const rec of records) {
        const key = required(rec, keyCol);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(rec);
    }
    return map;
}

function rowsOf(map, key) {
    const rows = map.get(key);
    if (!rows) return [];
    return rows;
}

function assertNoStrayRows(map, knownKeys, tableRel, col) {
    for (const key of map.keys()) {
        if (!knownKeys.has(key)) throw new Error(`data/${tableRel}: 找不到对应的${col}「${key}」，这一行的归属写错了？`);
    }
}

/* ========================================================================== *
 * 二、四份数据的列定义
 * ========================================================================== */

const COLUMNS = {
    'personnel/classes.csv': ['key', 'code', 'name', 'en', 'desc'],
    'personnel/members.csv': ['class', 'anchor', 'identity', 'name', 'latin', 'gender', 'birth', 'race', 'fleet', 'residenceLabel', 'residence', 'roles', 'relatives', 'awards', 'research', 'feedback'],
    'facility/affiliations.csv': ['name', 'abbr'],
    'facility/facilities.csv': ['id', 'parent', 'name', 'kind', 'kindEn', 'en', 'abbr', 'affiliation', 'plan', 'clearance', 'foreign', 'damaged', 'damagedNote', 'partsUnique', 'partsCommon', 'intro', 'response', 'partsNote'],
    'facility/unique-parts.csv': ['facility', 'parent', 'name', 'en', 'meta', 'note', 'desc'],
    'facility/common-parts.csv': ['facility', 'label', 'items'],
    'facility/orgs.csv': ['facility', 'name', 'desc'],
    'vessel/sizes.csv': ['name', 'en'],
    'vessel/vessels.csv': ['id', 'name', 'en', 'kind', 'size', 'iteration', 'damaged', 'damagedNote', 'intro', 'equipmentNote'],
    'vessel/equipment.csv': ['vessel', 'label', 'items'],
    'starmap/systems.csv': ['id', 'name', 'nameEn', 'starCount', 'planets', 'starType', 'developmentLevel', 'x', 'y', 'description'],
};

const MEMBER_LISTS = ['roles', 'relatives', 'awards', 'research', 'feedback'];

/* 不致命但值得看一眼的问题，build / check 结束前统一打印 */
const warnings = [];

/* ========================================================================== *
 * 三、build：CSV → JS
 * ========================================================================== */

function buildPersonnel() {
    const classes = readTable('personnel/classes.csv', COLUMNS['personnel/classes.csv']).map((r) => ({
        key: required(r, 'key'),
        code: text(r, 'code'),
        name: text(r, 'name'),
        en: text(r, 'en'),
        desc: text(r, 'desc'),
    }));
    const classKeys = new Set(classes.map((c) => c.key));
    const seen = new Set();
    const members = readTable('personnel/members.csv', COLUMNS['personnel/members.csv']).map((r) => {
        const cls = required(r, 'class');
        if (!classKeys.has(cls)) throw new Error(`${where(r)} 列「class」= ${cls} 不在 classes.csv 里`);
        const anchor = required(r, 'anchor');
        if (seen.has(anchor)) throw new Error(`${where(r)} anchor 重复：${anchor}`);
        if (looksLikeExcelNumber(anchor) || /\s/.test(anchor)) throw new Error(excelHint(r, 'anchor', anchor));
        seen.add(anchor);

        const identity = text(r, 'identity');
        if (identity !== '' && !/^\d+$/.test(identity)) {
            throw new Error(looksLikeExcelNumber(identity)
                ? excelHint(r, 'identity', identity)
                : `${where(r)} 列「identity」只能是数字或留空，现在是「${identity}」`);
        }
        const birth = text(r, 'birth');
        if (birth !== '' && !/^\d+\/\d+\/\d+$/.test(birth)) {
            throw new Error(excelHint(r, 'birth', birth) + '（生日写成 410/10/27 这种「年/月/日」）');
        }

        const member = {
            class: cls,
            anchor,
            identity,
            name: text(r, 'name'),
            latin: text(r, 'latin'),
            gender: text(r, 'gender'),
            birth,
            race: text(r, 'race'),
            fleet: text(r, 'fleet'),
            residenceLabel: text(r, 'residenceLabel'),
            residence: text(r, 'residence'),
        };
        for (const f of MEMBER_LISTS) member[f] = paragraphs(r, f);
        return member;
    });

    return {
        file: 'personnel.js',
        text: jsModule('window.SSS_PERSONNEL', { classes, members }, '人员数据 —— 星光圣域', 'data/personnel/*.csv'),
    };
}

/* 独特配件：parent 为空 = 一级配件；parent 写了名字 = 挂在同名一级配件下面的子配件 */
function buildUniqueParts(rows, facilityId) {
    const top = [];
    for (const p of rows) {
        const parentName = text(p, 'parent');
        if (parentName === '') {
            const name = required(p, 'name');
            if (top.some((t) => t.name === name)) {
                throw new Error(`${where(p)} ${facilityId} 的一级配件重名：${name}（子配件的 parent 会分不清挂在谁下面）`);
            }
            const part = { name, en: text(p, 'en'), desc: paragraphs(p, 'desc') };
            const note = text(p, 'note');
            if (note !== '') part.note = note;
            top.push(part);
            continue;
        }
        const host = top.find((t) => t.name === parentName);
        if (!host) {
            throw new Error(`${where(p)} 子配件的 parent「${parentName}」必须是同一设施里、写在它前面的的一级配件`);
        }
        const child = { name: required(p, 'name') };
        if (text(p, 'en') !== '') child.en = text(p, 'en');
        if (text(p, 'meta') !== '') child.meta = text(p, 'meta');
        child.desc = paragraphs(p, 'desc');
        if (!host.children) host.children = [];
        host.children.push(child);
    }
    return top;
}

function buildFacility() {
    const affiliationRows = readTable('facility/affiliations.csv', COLUMNS['facility/affiliations.csv']);
    const affiliations = {};
    for (const r of affiliationRows) {
        const name = required(r, 'name');
        if (Object.prototype.hasOwnProperty.call(affiliations, name)) throw new Error(`${where(r)} 归属重复：${name}`);
        affiliations[name] = { abbr: text(r, 'abbr') };
    }

    const uniqueParts = groupBy(readTable('facility/unique-parts.csv', COLUMNS['facility/unique-parts.csv']), 'facility', 'facility/unique-parts.csv');
    const commonParts = groupBy(readTable('facility/common-parts.csv', COLUMNS['facility/common-parts.csv']), 'facility', 'facility/common-parts.csv');
    const orgs = groupBy(readTable('facility/orgs.csv', COLUMNS['facility/orgs.csv']), 'facility', 'facility/orgs.csv');

    const facilityRows = readTable('facility/facilities.csv', COLUMNS['facility/facilities.csv']);
    const ids = new Set();
    for (const r of facilityRows) {
        const id = required(r, 'id');
        if (ids.has(id)) throw new Error(`${where(r)} 设施 id 重复：${id}`);
        ids.add(id);
    }
    assertNoStrayRows(uniqueParts, ids, 'facility/unique-parts.csv', '设施 id');
    assertNoStrayRows(commonParts, ids, 'facility/common-parts.csv', '设施 id');
    assertNoStrayRows(orgs, ids, 'facility/orgs.csv', '设施 id');

    const facilities = facilityRows.map((r) => {
        const id = r.id;
        const parent = text(r, 'parent');
        if (parent !== '' && !ids.has(parent)) throw new Error(`${where(r)} 列「parent」= ${parent} 不在 facilities.csv 里`);
        if (parent === id) throw new Error(`${where(r)} 设施不能把自己写成 parent`);
        const affiliation = text(r, 'affiliation');
        if (affiliation !== '' && !Object.prototype.hasOwnProperty.call(affiliations, affiliation)) {
            warnings.push(`${where(r)} 列「affiliation」= ${affiliation} 没在 affiliations.csv 里登记缩写（站上会按「无缩写」处理）`);
        }

        const stateU = sectionState(r, 'partsUnique');
        const stateC = sectionState(r, 'partsCommon');
        const uRows = rowsOf(uniqueParts, id);
        const cRows = rowsOf(commonParts, id);
        if (stateU === 'list' && !uRows.length) throw new Error(`${where(r)} partsUnique=list，但 unique-parts.csv 里没有 ${id} 的条目`);
        if (stateU !== 'list' && uRows.length) throw new Error(`${where(r)} unique-parts.csv 里写了 ${id}，但 partsUnique 不是 list`);
        if (stateC === 'list' && !cRows.length) throw new Error(`${where(r)} partsCommon=list，但 common-parts.csv 里没有 ${id} 的条目`);
        if (stateC !== 'list' && cRows.length) throw new Error(`${where(r)} common-parts.csv 里写了 ${id}，但 partsCommon 不是 list`);

        const parts = {};
        let hasParts = false;
        if (stateU !== 'none' || stateC !== 'none' || paragraphs(r, 'partsNote').length) hasParts = true;
        if (hasParts) {
            parts.unique = stateU === 'list' ? buildUniqueParts(uRows, id) : (stateU === 'damaged' ? [] : null);
            parts.common = stateC === 'list'
                ? cRows.map((p) => ({ label: text(p, 'label'), items: lines(p, 'items') }))
                : (stateC === 'damaged' ? [] : null);
            const partsNote = paragraphs(r, 'partsNote');
            if (partsNote.length) parts.note = partsNote;
        }

        const facility = { id };
        if (parent !== '') facility.parent = parent;
        facility.name = required(r, 'name');
        facility.kind = text(r, 'kind');
        facility.kindEn = text(r, 'kindEn');
        facility.en = text(r, 'en');
        facility.abbr = text(r, 'abbr');
        facility.affiliation = affiliation;
        facility.plan = text(r, 'plan');
        facility.clearance = text(r, 'clearance');
        facility.foreign = bool(r, 'foreign');
        facility.damaged = bool(r, 'damaged');
        facility.damagedNote = text(r, 'damagedNote');
        facility.intro = paragraphs(r, 'intro');
        facility.parts = hasParts ? parts : null;
        facility.response = paragraphs(r, 'response');
        facility.orgs = (orgs.get(id) || []).map((o) => ({ name: required(o, 'name'), desc: paragraphs(o, 'desc') }));
        return facility;
    });

    return {
        file: 'facility.js',
        text: jsModule('window.SSS_FACILITY', { affiliations, facilities }, '深空设施数据 —— 星光圣域', 'data/facility/*.csv'),
    };
}

function buildVessel() {
    const sizes = readTable('vessel/sizes.csv', COLUMNS['vessel/sizes.csv']).map((r) => ({
        name: required(r, 'name'),
        en: text(r, 'en'),
    }));
    const sizeNames = new Set(sizes.map((s) => s.name));

    const equipment = groupBy(readTable('vessel/equipment.csv', COLUMNS['vessel/equipment.csv']), 'vessel', 'vessel/equipment.csv');

    const vesselRows = readTable('vessel/vessels.csv', COLUMNS['vessel/vessels.csv']);
    const ids = new Set();
    for (const r of vesselRows) {
        const id = required(r, 'id');
        if (ids.has(id)) throw new Error(`${where(r)} 舰船 id 重复：${id}`);
        ids.add(id);
    }
    assertNoStrayRows(equipment, ids, 'vessel/equipment.csv', '舰船 id');

    const vessels = vesselRows.map((r) => {
        const id = r.id;
        const size = required(r, 'size');
        if (!sizeNames.has(size)) throw new Error(`${where(r)} 列「size」= ${size} 不在 sizes.csv 里（可选：${sizes.map((s) => s.name).join(' / ')}）`);
        return {
            id,
            name: required(r, 'name'),
            en: text(r, 'en'),
            kind: text(r, 'kind'),
            size,
            iteration: text(r, 'iteration'),
            intro: paragraphs(r, 'intro'),
            equipmentNote: paragraphs(r, 'equipmentNote'),
            equipment: (equipment.get(id) || []).map((e) => ({ label: text(e, 'label'), items: lines(e, 'items') })),
            damaged: bool(r, 'damaged'),
            damagedNote: text(r, 'damagedNote'),
        };
    });

    return {
        file: 'vessel.js',
        text: jsModule('window.SSS_VESSEL', { sizes, vessels }, '舰船数据 —— 星光圣域', 'data/vessel/*.csv'),
    };
}

function buildStarmap() {
    const seen = new Set();
    const systems = readTable('starmap/systems.csv', COLUMNS['starmap/systems.csv']).map((r) => {
        const id = required(r, 'id');
        if (seen.has(id)) throw new Error(`${where(r)} 星系 id 重复：${id}`);
        seen.add(id);
        return {
            id,
            name: required(r, 'name'),
            nameEn: text(r, 'nameEn'),
            starCount: looseNumber(r, 'starCount'),
            planets: looseNumber(r, 'planets'),
            starType: text(r, 'starType'),
            developmentLevel: text(r, 'developmentLevel'),
            description: text(r, 'description'),
            x: number(r, 'x'),
            y: number(r, 'y'),
        };
    });

    return {
        file: 'starmap-data.js',
        text: '/* =============================================================================\n' +
            ' * 星图数据\n' +
            ' * -----------------------------------------------------------------------------\n' +
            ' * ⚠ 生成文件：由 `node scripts/data-csv.mjs build` 从 data/starmap/systems.csv 生成，\n' +
            ' *   不要直接改这里 —— 改 CSV 再 build。字段说明见 data/README.md。\n' +
            ' * 坐标单位：小格；原点 = 维斯佩拉星系，x 向右为正、y 向下为正。\n' +
            ' * ========================================================================== */\n' +
            `const STARMAP_DATA = ${JSON.stringify(systems, null, 2)};\n`,
    };
}

function jsModule(globalName, data, title, source) {
    return '/* =============================================================================\n' +
        ` * ${title}\n` +
        ' * -----------------------------------------------------------------------------\n' +
        ` * ⚠ 生成文件：由 \`node scripts/data-csv.mjs build\` 从 ${source} 生成，\n` +
        ' *   不要直接改这里 —— 改 CSV 再 build。字段说明见 data/README.md。\n' +
        ' * ========================================================================== */\n' +
        `${globalName} = ${JSON.stringify(data, null, 2)};\n`;
}

/* ========================================================================== *
 * 四、export：JS → CSV（一次性迁移 / 重新导出）
 * ========================================================================== */

function loadJs(rel, pick) {
    const code = fs.readFileSync(path.join(JS_DIR, rel), 'utf8');
    const ctx = { window: {} };
    vm.createContext(ctx);
    vm.runInContext(`${code}\n;globalThis.__out = ${pick};`, ctx, { filename: rel });
    return ctx.__out;
}

/* 段落列表写成单元格：断言原文里不含换行，否则往返会丢信息 */
function cellFor(label, value) {
    const arr = Array.isArray(value) ? value : [];
    for (const item of arr) {
        if (typeof item !== 'string') throw new Error(`${label} 里有非字符串条目：${JSON.stringify(item)}`);
        if (/[\r\n]/.test(item)) throw new Error(`${label} 的条目里含换行，无法无损放进 CSV：${JSON.stringify(item.slice(0, 40))}`);
    }
    return arr.join('\n');
}

function exportData() {
    /* 人员 */
    const P = loadJs('personnel.js', 'window.SSS_PERSONNEL');
    writeCsv('personnel/classes.csv', COLUMNS['personnel/classes.csv'], P.classes);
    writeCsv('personnel/members.csv', COLUMNS['personnel/members.csv'], P.members.map((m) => {
        const row = { ...m };
        for (const f of MEMBER_LISTS) row[f] = cellFor(`members/${m.anchor}.${f}`, m[f]);
        return row;
    }));

    /* 设施 */
    const F = loadJs('facility.js', 'window.SSS_FACILITY');
    writeCsv('facility/affiliations.csv', COLUMNS['facility/affiliations.csv'],
        Object.entries(F.affiliations).map(([name, v]) => ({ name, abbr: v.abbr })));
    const uniqueRows = [];
    const commonRows = [];
    const orgRows = [];
    writeCsv('facility/facilities.csv', COLUMNS['facility/facilities.csv'], F.facilities.map((f) => {
        const parts = f.parts;
        const unique = parts ? parts.unique : undefined;
        const common = parts ? parts.common : undefined;
        const note = parts && parts.note ? parts.note : [];
        if (Array.isArray(unique)) {
            unique.forEach((p) => {
                const label = `facilities/${f.id}.unique.${p.name}`;
                if (p.note != null && /[\r\n]/.test(p.note)) throw new Error(`${label}.note 里含换行，CSV 存不下：${JSON.stringify(p.note.slice(0, 40))}`);
                uniqueRows.push({
                    facility: f.id,
                    parent: '',
                    name: p.name,
                    en: p.en,
                    meta: '',
                    note: p.note == null ? '' : p.note,
                    desc: cellFor(`${label}.desc`, p.desc),
                });
                (p.children || []).forEach((c) => {
                    uniqueRows.push({
                        facility: f.id,
                        parent: p.name,
                        name: c.name,
                        en: c.en == null ? '' : c.en,
                        meta: c.meta == null ? '' : c.meta,
                        note: '',
                        desc: cellFor(`${label}.children.${c.name}.desc`, c.desc),
                    });
                });
            });
        }
        if (Array.isArray(common)) {
            common.forEach((p) => commonRows.push({ facility: f.id, label: p.label, items: cellFor(`facilities/${f.id}.common`, p.items) }));
        }
        (f.orgs || []).forEach((o) => orgRows.push({ facility: f.id, name: o.name, desc: cellFor(`facilities/${f.id}.orgs`, o.desc) }));
        return {
            id: f.id,
            parent: f.parent || '',
            name: f.name,
            kind: f.kind,
            kindEn: f.kindEn,
            en: f.en,
            abbr: f.abbr,
            affiliation: f.affiliation,
            plan: f.plan,
            clearance: f.clearance,
            foreign: f.foreign,
            damaged: f.damaged,
            damagedNote: f.damagedNote,
            partsUnique: unique === null || unique === undefined ? 'none' : (unique.length ? 'list' : 'damaged'),
            partsCommon: common === null || common === undefined ? 'none' : (common.length ? 'list' : 'damaged'),
            intro: cellFor(`facilities/${f.id}.intro`, f.intro),
            response: cellFor(`facilities/${f.id}.response`, f.response),
            partsNote: cellFor(`facilities/${f.id}.note`, note),
        };
    }));
    writeCsv('facility/unique-parts.csv', COLUMNS['facility/unique-parts.csv'], uniqueRows);
    writeCsv('facility/common-parts.csv', COLUMNS['facility/common-parts.csv'], commonRows);
    writeCsv('facility/orgs.csv', COLUMNS['facility/orgs.csv'], orgRows);

    /* 舰船 */
    const V = loadJs('vessel.js', 'window.SSS_VESSEL');
    writeCsv('vessel/sizes.csv', COLUMNS['vessel/sizes.csv'], V.sizes);
    const equipRows = [];
    writeCsv('vessel/vessels.csv', COLUMNS['vessel/vessels.csv'], V.vessels.map((s) => {
        (s.equipment || []).forEach((e) => equipRows.push({ vessel: s.id, label: e.label, items: cellFor(`vessels/${s.id}.equipment`, e.items) }));
        return {
            id: s.id,
            name: s.name,
            en: s.en,
            kind: s.kind,
            size: s.size,
            iteration: s.iteration,
            damaged: s.damaged,
            damagedNote: s.damagedNote,
            intro: cellFor(`vessels/${s.id}.intro`, s.intro),
            equipmentNote: cellFor(`vessels/${s.id}.equipmentNote`, s.equipmentNote),
        };
    }));
    writeCsv('vessel/equipment.csv', COLUMNS['vessel/equipment.csv'], equipRows);

    /* 星图 */
    const S = loadJs('starmap-data.js', 'STARMAP_DATA');
    writeCsv('starmap/systems.csv', COLUMNS['starmap/systems.csv'], S);

    console.log(`已从 assets/data/*.js 导出 ${Object.keys(COLUMNS).length} 个 CSV 到 data/`);
}

/* ========================================================================== *
 * 五、入口
 * ========================================================================== */

const BUILDS = [buildPersonnel, buildFacility, buildVessel, buildStarmap];

function main() {
    const cmd = process.argv[2] || 'build';
    if (cmd === 'export') {
        exportData();
        return;
    }
    if (cmd !== 'build' && cmd !== 'check') {
        console.error(`用法：node scripts/data-csv.mjs <build|check|export>`);
        process.exitCode = 2;
        return;
    }

    const outputs = BUILDS.map((fn) => fn());
    for (const w of warnings) console.warn(`! ${w}`);
    if (cmd === 'check') {
        let dirty = 0;
        for (const out of outputs) {
            const abs = path.join(JS_DIR, out.file);
            const current = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
            if (current !== out.text) {
                dirty += 1;
                console.error(`✗ assets/data/${out.file} 与 data/ 下的 CSV 不一致`);
            } else {
                console.log(`✓ assets/data/${out.file}`);
            }
        }
        if (dirty) {
            console.error('\n先跑 `node scripts/data-csv.mjs build` 再提交。');
            process.exitCode = 1;
        }
        return;
    }

    for (const out of outputs) {
        fs.writeFileSync(path.join(JS_DIR, out.file), out.text, 'utf8');
        console.log(`✓ assets/data/${out.file}`);
    }
    console.log('build 完成：assets/data/*.js 已按 data/ 下的 CSV 重写。');
}

try {
    main();
} catch (err) {
    console.error(`\n✗ ${err.message}`);
    if (process.env.DATA_CSV_DEBUG) console.error(err.stack);
    process.exitCode = 1;
}
