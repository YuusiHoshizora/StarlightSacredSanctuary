/* =============================================================================
 * document.js — 文件档案页：读数据 → 渲染名录 / 档案 / 详情面板
 *                 + 搜索 + 选中 / 取消选择 + .md 渲染 + 音轨播放
 * -----------------------------------------------------------------------------
 * 数据来源只有一处：assets/document/。scripts/document-index.mjs 扫描它并生成
 * assets/data/document.js（window.SSS_DOCUMENT），本脚本在页面里把每条记录渲染成
 * 左栏条目 + 右栏档案；页面 HTML 里没有写死的记录。
 *
 * 行为照舰船 / 人员 / 生物档案：
 *   · 点左栏条目选中，右栏显示对应档案；
 *   · 再点一次已选中的条目、点左栏或右栏空白处、点页面最左/最右留白，取消选择；
 *   · 地址栏 #条目代号 可直接选中，前进 / 后退也会跟着切换。
 *
 * 右栏只留预览；文件信息 / 摘要 / 备注在档案头右上角的「详情」面板里，默认收起。
 * .md 文档 fetch 原件后用 marked 渲染（与主页面同一套配置与缩进保留规则）；
 * 音轨用自绘播放条；视频用原生 <video controls>。
 * ========================================================================== */
(function () {
    'use strict';

    var root = document.querySelector('.document-layout');
    if (!root) return;

    var BASE = root.getAttribute('data-archive-base') || '../../assets/document/';
    if (BASE.slice(-1) !== '/') BASE += '/';
    var DATA_GLOBAL = root.getAttribute('data-archive-data') || 'SSS_DOCUMENT';
    var listEl = root.querySelector('[data-doc-list]');
    var scrollEl = root.querySelector('.document-list__scroll');
    var countEl = root.querySelector('[data-doc-count]');
    var detailPane = root.querySelector('.document-detail');
    var empty = root.querySelector('.archive-empty');
    if (!detailPane) return;

    var KIND_ORDER = ['image', 'document', 'audio', 'video', 'other'];
    var KIND = {
        image: { label: '图像', en: 'Image', tag: 'IMG', panel: '预览', panelEn: 'Preview' },
        document: { label: '文档', en: 'Document', tag: 'DOC', panel: '预览', panelEn: 'Preview' },
        audio: { label: '音频', en: 'Audio', tag: 'AUD', panel: '播放', panelEn: 'Playback' },
        video: { label: '视频', en: 'Video', tag: 'VID', panel: '预览', panelEn: 'Preview' },
        other: { label: '其他', en: 'Other', tag: 'FIL', panel: '预览', panelEn: 'Preview' }
    };

    var records = (window[DATA_GLOBAL] && Array.isArray(window[DATA_GLOBAL].records))
        ? window[DATA_GLOBAL].records
        : null;

    function refresh() {
        if (window.__sssArchiveScroll && window.__sssArchiveScroll.refresh) {
            window.__sssArchiveScroll.refresh();
        }
    }

    /* ── 小工具 ── */
    function h(tag, cls, text) {
        var el = document.createElement(tag);
        if (cls) el.className = cls;
        if (text !== undefined && text !== null) el.textContent = text;
        return el;
    }

    function append(parent) {
        for (var i = 1; i < arguments.length; i++) {
            if (arguments[i]) parent.appendChild(arguments[i]);
        }
        return parent;
    }

    function dataUrl(rec) {
        return BASE + rec.url;
    }

    function typeText(rec) {
        return KIND[rec.kind].label + ' · ' + String(rec.ext || '').toUpperCase();
    }

    function mediaCaption(rec, leftText, linkText, linkUrl) {
        var cap = h('p', 'doc-media__caption');
        cap.appendChild(h('span', null, leftText));
        if (linkText) {
            var a = h('a', 'doc-media__link', linkText);
            a.href = linkUrl || dataUrl(rec);
            if (/^https?:|^\.\.\//.test(a.href) || a.href.indexOf('://') > 0) {
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
            }
            cap.appendChild(a);
        } else {
            cap.appendChild(h('span', null, rec.sizeText));
        }
        return cap;
    }

    /* ── 详情面板 ── */
    function metaRow(label, value, mono) {
        var row = h('div', 'org-meta__row');
        row.appendChild(h('dt', null, label));
        row.appendChild(h('dd', mono ? 'doc-mono' : null, value));
        return row;
    }

    function infoSection(title, en, text) {
        var section = h('section', 'doc-info__section');
        var head = h('h3', 'doc-info__title', title);
        head.appendChild(h('span', 'doc-info__en', en));
        section.appendChild(head);
        section.appendChild(h('p', null, text));
        return section;
    }

    function buildInfo(rec) {
        var id = rec.id + '-info';
        var panel = h('div', 'doc-info');
        panel.id = id;
        panel.hidden = true;

        var head = h('p', 'doc-info__head', '文件信息');
        head.appendChild(h('span', 'doc-info__en', 'File Info'));
        panel.appendChild(head);

        var dl = h('dl', 'org-meta');
        dl.appendChild(metaRow('编号', rec.number, true));
        dl.appendChild(metaRow('类型', typeText(rec)));
        dl.appendChild(metaRow('大小', rec.sizeText, true));
        if (rec.width && rec.height) dl.appendChild(metaRow('尺寸', rec.width + ' × ' + rec.height, true));
        if (rec.duration) dl.appendChild(metaRow('时长', rec.duration, true));
        if (rec.lines) dl.appendChild(metaRow('行数', rec.lines + ' 行', true));
        if (rec.date) dl.appendChild(metaRow('收录', rec.date, true));
        if (rec.source) dl.appendChild(metaRow('来源', rec.source));
        if (rec.clearance) dl.appendChild(metaRow('密级', rec.clearance));
        panel.appendChild(dl);

        if (rec.summary) panel.appendChild(infoSection('摘要', 'Abstract', rec.summary));
        if (rec.notes) panel.appendChild(infoSection('备注', 'Notes', rec.notes));

        return panel;
    }

    /* ── 预览：按载体分四种写法 ── */
    function buildImage(rec) {
        var url = dataUrl(rec);
        var fig = h('figure', 'doc-media doc-media--image');

        var link = h('a', 'doc-media__open');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        var img = h('img', 'doc-media__img');
        img.src = url;
        img.alt = rec.title;
        img.loading = 'lazy';
        link.appendChild(img);
        fig.appendChild(link);

        var size = (rec.width && rec.height) ? rec.width + ' × ' + rec.height : String(rec.ext || '').toUpperCase();
        fig.appendChild(mediaCaption(rec, size, '查看原图 ↗', url));
        return fig;
    }

    function buildDocument(rec) {
        var url = dataUrl(rec);
        var isMd = rec.ext === 'md' || rec.ext === 'markdown';
        var wrap = h('div', 'doc-media doc-media--document');
        var sheet = h('div', 'doc-sheet');

        var head = h('div', 'doc-sheet__head');
        head.appendChild(h('span', 'doc-sheet__page', String(rec.ext || '').toUpperCase() + ' · ' + rec.number));
        head.appendChild(h('span', null, isMd ? 'MARKDOWN' : String(rec.ext || '').toUpperCase()));
        sheet.appendChild(head);

        if (isMd) {
            var box = h('article', 'doc-md');
            box.setAttribute('data-doc-md', '');
            box.setAttribute('data-src', url);
            box.appendChild(h('p', 'doc-md__state', '正在读取文档…'));
            sheet.appendChild(box);
        } else {
            /* 只内嵌 .md；PDF / TXT 等给一行说明，原件走右下角「打开原件」 */
            sheet.appendChild(h('p', 'doc-md__state', '此格式不内嵌预览，请打开原件。'));
        }
        wrap.appendChild(sheet);

        var left = String(rec.ext || '').toUpperCase() + ' · ' + rec.sizeText + (rec.lines ? ' · ' + rec.lines + ' 行' : '');
        wrap.appendChild(mediaCaption(rec, left, '打开原件 ↗', url));
        return wrap;
    }

    function buildAudio(rec) {
        var url = dataUrl(rec);
        var wrap = h('div', 'doc-media doc-media--audio');

        var player = h('div', 'doc-player');
        player.setAttribute('data-player', '');

        var toggle = h('button', 'doc-player__toggle');
        toggle.type = 'button';
        toggle.setAttribute('aria-label', '播放');
        toggle.setAttribute('aria-pressed', 'false');
        toggle.setAttribute('data-player-toggle', '');
        var glyph = h('span', 'doc-player__glyph');
        glyph.setAttribute('aria-hidden', 'true');
        toggle.appendChild(glyph);

        var track = h('div', 'doc-player__track');
        var seek = h('input', 'doc-player__seek');
        seek.type = 'range';
        seek.min = '0';
        seek.max = '100';
        seek.step = '0.1';
        seek.value = '0';
        seek.setAttribute('aria-label', '播放进度');
        seek.setAttribute('aria-valuetext', '00:00 / 00:00');
        seek.setAttribute('data-player-seek', '');

        var times = h('p', 'doc-player__times');
        var nowEl = h('span', 'doc-player__time doc-player__time--now', '00:00');
        nowEl.setAttribute('data-player-time', '');
        var sep = h('span', 'doc-player__sep', '/');
        sep.setAttribute('aria-hidden', 'true');
        var durEl = h('span', 'doc-player__time doc-player__time--total', '--:--');
        durEl.setAttribute('data-player-duration', '');
        append(times, nowEl, sep, durEl);
        append(track, seek, times);

        var audio = h('audio', 'doc-player__audio');
        audio.preload = 'metadata';
        audio.src = url;
        audio.setAttribute('data-player-audio', '');

        append(player, toggle, track, audio);
        wrap.appendChild(player);

        var left = String(rec.ext || '').toUpperCase() + ' · ' + rec.sizeText + (rec.duration ? ' · ' + rec.duration : '');
        wrap.appendChild(mediaCaption(rec, left, '下载音频', url));
        return wrap;
    }

    function buildVideo(rec) {
        var url = dataUrl(rec);
        var fig = h('figure', 'doc-media doc-media--video');
        var frame = h('div', 'doc-media__frame');

        var video = h('video');
        video.controls = true;
        video.preload = 'metadata';
        video.setAttribute('playsinline', '');
        video.src = url;
        frame.appendChild(video);
        fig.appendChild(frame);

        var left = String(rec.ext || '').toUpperCase() + ' · ' + rec.sizeText + (rec.duration ? ' · ' + rec.duration : '');
        fig.appendChild(mediaCaption(rec, left, '打开原件 ↗', url));
        return fig;
    }

    function buildOther(rec) {
        var url = dataUrl(rec);
        var wrap = h('div', 'doc-media doc-media--file');
        var box = h('div', 'doc-media__empty');
        var dot = h('span', 'doc-media__empty-dot');
        dot.setAttribute('aria-hidden', 'true');
        append(box, dot, h('p', 'doc-media__empty-text', 'NO / PREVIEW'));
        wrap.appendChild(box);
        wrap.appendChild(mediaCaption(rec, String(rec.ext || '').toUpperCase() + ' · ' + rec.sizeText, '打开原件 ↗', url));
        return wrap;
    }

    function buildPreview(rec) {
        if (rec.kind === 'image') return buildImage(rec);
        if (rec.kind === 'document') return buildDocument(rec);
        if (rec.kind === 'audio') return buildAudio(rec);
        if (rec.kind === 'video') return buildVideo(rec);
        return buildOther(rec);
    }

    /* ── 一条档案 ── */
    function buildProfile(rec) {
        var article = h('article', 'document-profile');
        article.id = rec.id;

        var header = h('header', 'document-profile__head');
        var bar = h('div', 'document-profile__bar');
        var heading = h('div', 'document-profile__heading');

        heading.appendChild(h('p', 'document-profile__kicker',
            KIND[rec.kind].label + ' / ' + KIND[rec.kind].en.toUpperCase() + ' · ' + rec.number));
        heading.appendChild(h('h2', 'document-profile__name', rec.title));
        if (rec.en) heading.appendChild(h('p', 'document-profile__en', rec.en));
        bar.appendChild(heading);

        var info = buildInfo(rec);
        var btn = h('button', 'doc-info-btn');
        btn.type = 'button';
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-controls', info.id);
        btn.setAttribute('aria-label', '查看' + rec.title + '的文件信息');
        btn.setAttribute('data-info-toggle', '');
        var icon = h('span', 'doc-info-btn__icon');
        icon.setAttribute('aria-hidden', 'true');
        append(btn, icon, h('span', 'doc-info-btn__text', '详情'));
        bar.appendChild(btn);

        append(header, bar, info);

        var body = h('div', 'document-profile__body');
        var panel = h('section', 'org-block');
        var panelHead = h('h2', 'org-block__head', KIND[rec.kind].panel);
        panelHead.appendChild(h('span', 'org-block__en', KIND[rec.kind].panelEn));
        append(panel, panelHead, buildPreview(rec));
        body.appendChild(panel);

        append(article, header, body);
        return article;
    }

    /* ── 渲染名录 / 档案 ── */
    function render() {
        if (!records) {
            listEl.appendChild(h('p', 'document-list__empty', '文件数据库无法读取'));
            if (countEl) countEl.textContent = '0';
            return;
        }

        if (countEl) countEl.textContent = String(records.length);

        KIND_ORDER.forEach(function (kind) {
            var group = h('p', 'document-list__group', KIND[kind].label);
            group.appendChild(h('span', 'document-list__group-en', KIND[kind].en));
            listEl.appendChild(group);

            var groupRecords = records.filter(function (r) { return r.kind === kind; });
            if (!groupRecords.length) {
                listEl.appendChild(h('p', 'document-list__empty', '待收录'));
                return;
            }

            groupRecords.forEach(function (rec) {
                var a = h('a', 'document-list__item');
                a.setAttribute('href', '#' + rec.id);
                a.setAttribute('data-id', rec.id);
                a.appendChild(h('span', 'document-list__tag', KIND[kind].tag));
                a.appendChild(h('span', 'document-list__name', rec.title));
                if (rec.en) a.appendChild(h('span', 'document-list__en', rec.en));
                listEl.appendChild(a);
            });
        });

        records.forEach(function (rec) {
            detailPane.appendChild(buildProfile(rec));
        });
    }

    /* 有 [data-doc-list] 的页面读数据渲染；没有的是静态版式页（template.html） */
    if (listEl) render();

    /* ── .md 文档：marked 渲染 ── */
    function preserveLineIndent(mdText) {
        var lines = mdText.split(/\r?\n/);
        var out = [];
        var inFence = false;
        var STRUCT = /^(?:[-+*]\s|\d+[.)]\s|>|#|\||-{3,}$|\*{3,}$|_{3,}$)/;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];

            if (/^\s*(?:```|~~~)/.test(line)) {
                inFence = !inFence;
                out.push(line);
                continue;
            }

            var prevBlank = out.length === 0 || out[out.length - 1].trim() === '';
            var m = inFence ? null : line.match(/^([ \t]+)(\S.*)$/);

            if (m && !prevBlank && !STRUCT.test(m[2])) {
                var width = 0;
                for (var k = 0; k < m[1].length; k++) {
                    width += m[1].charAt(k) === '\t' ? 4 : 1;
                }
                out.push(new Array(width + 1).join('\u00A0') + m[2]);
            } else {
                out.push(line);
            }
        }
        return out.join('\n');
    }

    function renderMarkdown(box) {
        var src = box.getAttribute('data-src');
        if (!src) return;

        if (!window.marked || typeof window.marked.parse !== 'function') {
            box.innerHTML = '<p class="doc-md__failed">Markdown 渲染器未载入，无法显示文档。</p>';
            return;
        }

        window.marked.setOptions({ breaks: true, gfm: true });
        box.setAttribute('aria-busy', 'true');

        fetch(src, { credentials: 'same-origin' })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.text();
            })
            .then(function (text) {
                if (!root.isConnected) return;
                box.innerHTML = '<div class="markdown-body">' + window.marked.parse(preserveLineIndent(text)) + '</div>';
                box.querySelectorAll('.markdown-body a').forEach(function (a) {
                    a.setAttribute('target', '_blank');
                    a.setAttribute('rel', 'noopener noreferrer');
                });
                box.removeAttribute('aria-busy');
                refresh();
            })
            .catch(function () {
                if (!root.isConnected) return;
                box.innerHTML = '<p class="doc-md__failed">数据损坏：文档无法读取。</p>';
                box.removeAttribute('aria-busy');
                refresh();
            });
    }

    Array.prototype.slice.call(root.querySelectorAll('[data-doc-md]')).forEach(renderMarkdown);

    /* ── 右上角详情面板 ── */
    var infoButtons = Array.prototype.slice.call(root.querySelectorAll('[data-info-toggle]'));

    function panelOf(btn) {
        var id = btn.getAttribute('aria-controls');
        return id ? document.getElementById(id) : null;
    }

    function setInfoOpen(btn, open) {
        var panel = panelOf(btn);
        if (!panel) return;
        panel.hidden = !open;
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function closeInfo(except) {
        infoButtons.forEach(function (btn) {
            var panel = panelOf(btn);
            if (panel && panel !== except) setInfoOpen(btn, false);
        });
    }

    infoButtons.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var panel = panelOf(btn);
            if (!panel) return;
            var open = panel.hidden;
            closeInfo(panel);
            setInfoOpen(btn, open);
        });
    });

    function onDocClick(e) {
        if (e.target.closest('.doc-info, [data-info-toggle]')) return;
        closeInfo(null);
    }

    function onDocKeydown(e) {
        if (e.key === 'Escape') closeInfo(null);
    }

    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onDocKeydown);

    /* ── 左栏名录搜索 ── */
    if (window.SSSArchiveSearch) {
        window.SSSArchiveSearch.attach({
            input: root.querySelector('.archive-search__input'),
            empty: root.querySelector('.archive-search__empty'),
            scroll: listEl,
            items: Array.prototype.slice.call(root.querySelectorAll('.document-list__item')),
            groups: Array.prototype.slice.call(root.querySelectorAll('.document-list__group')),
            groupSelector: '.document-list__group'
        });
    }

    /* ── 选中 / 取消选择 ── */
    var items = Array.prototype.slice.call(root.querySelectorAll('.document-list__item'));
    var profiles = Array.prototype.slice.call(root.querySelectorAll('.document-profile'));
    var list = scrollEl;
    var listPane = root.querySelector('.document-list');

    var byId = Object.create(null);
    profiles.forEach(function (p) { byId[p.id] = p; });

    function activate(id) {
        var profile = id ? byId[id] || null : null;

        stopAudio();
        closeInfo(null);

        profiles.forEach(function (p) {
            p.classList.toggle('is-active', p === profile);
        });

        var current = null;
        items.forEach(function (a) {
            var on = !!profile && a.getAttribute('data-id') === profile.id;
            a.classList.toggle('is-active', on);
            if (on) a.setAttribute('aria-current', 'true');
            else a.removeAttribute('aria-current');
            if (on) current = a;
        });

        if (empty) empty.hidden = !!profile;

        if (list && current) {
            var lr = list.getBoundingClientRect();
            var ir = current.getBoundingClientRect();
            if (ir.top < lr.top) list.scrollTop += ir.top - lr.top;
            else if (ir.bottom > lr.bottom) list.scrollTop += ir.bottom - lr.bottom;
        }

        if (profile) {
            var body = profile.querySelector('.document-profile__body');
            if (body) body.scrollTop = 0;
        }

        refresh();
    }

    function setHash(id) {
        if (location.hash === '#' + id) return;
        try {
            history.pushState(null, '', '#' + id);
        } catch (e) {
            /* file:// 等环境 pushState 受限时，至少保证右栏切换 */
        }
    }

    function clearSelection() {
        if (!profiles.some(function (p) { return p.classList.contains('is-active'); })) return;
        try { history.pushState(null, '', location.pathname); } catch (e) { }
        activate('');
    }

    function fromHash() {
        var raw = location.hash ? location.hash.slice(1) : '';
        var id = raw;
        try {
            id = decodeURIComponent(raw);
        } catch (e) { /* 保留原值 */ }
        activate(id || '');
    }

    root.addEventListener('click', function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
        if (!a || !root.contains(a)) return;
        var raw = a.getAttribute('href').slice(1);
        var id = raw;
        try {
            id = decodeURIComponent(raw);
        } catch (e) { /* 保留原值 */ }
        if (!byId[id]) return;
        e.preventDefault();

        if (a.classList.contains('is-active')) {
            clearSelection();
            return;
        }

        setHash(id);
        activate(id);
    });

    window.addEventListener('hashchange', fromHash);
    window.addEventListener('popstate', fromHash);

    if (listPane) {
        listPane.addEventListener('click', function (e) {
            if (e.target.closest('.document-list__item, .archive-search')) return;
            clearSelection();
        });
    }

    if (detailPane) {
        detailPane.addEventListener('click', function (e) {
            if (e.target.closest('.org-block, .document-profile__head, .doc-info, a, button, input, audio, video')) return;
            clearSelection();
        });
    }

    var pageMain = document.querySelector('main');
    if (pageMain) {
        pageMain.addEventListener('click', function (e) {
            if (e.target.closest('.archive-section')) return;
            clearSelection();
        });
    }

    /* ── 音轨播放条 ── */
    var audios = Array.prototype.slice.call(root.querySelectorAll('.document-profile [data-player-audio]'));

    function formatTime(sec) {
        if (!isFinite(sec) || sec < 0) return '--:--';
        var total = Math.round(sec);
        var m = Math.floor(total / 60);
        var s = total % 60;
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function setupPlayer(player) {
        var audio = player.querySelector('[data-player-audio]');
        var toggle = player.querySelector('[data-player-toggle]');
        var seek = player.querySelector('[data-player-seek]');
        var nowEl = player.querySelector('[data-player-time]');
        var durEl = player.querySelector('[data-player-duration]');
        if (!audio || !toggle || !seek) return;

        var broken = false;

        function paint() {
            var d = audio.duration;
            var pct = d > 0 ? (audio.currentTime / d) * 100 : 0;
            seek.value = String(pct);
            seek.style.setProperty('--doc-progress', pct.toFixed(2) + '%');
            if (nowEl) nowEl.textContent = formatTime(audio.currentTime);
            seek.setAttribute('aria-valuetext', formatTime(audio.currentTime) + ' / ' + formatTime(d));
        }

        function setPlaying(on) {
            player.classList.toggle('is-playing', on);
            toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
            toggle.setAttribute('aria-label', on ? '暂停' : '播放');
        }

        toggle.addEventListener('click', function () {
            if (broken) return;
            if (audio.paused) {
                var p = audio.play();
                if (p && p.catch) p.catch(function () { /* 解码失败由 error 事件接手 */ });
            } else {
                audio.pause();
            }
        });

        seek.addEventListener('input', function () {
            if (broken || !(audio.duration > 0)) return;
            audio.currentTime = (Number(seek.value) / 100) * audio.duration;
            paint();
        });

        audio.addEventListener('loadedmetadata', function () {
            if (durEl) durEl.textContent = formatTime(audio.duration);
            paint();
        });

        audio.addEventListener('timeupdate', paint);
        audio.addEventListener('play', function () { setPlaying(true); });
        audio.addEventListener('pause', function () { setPlaying(false); });

        audio.addEventListener('ended', function () {
            audio.currentTime = 0;
            paint();
            setPlaying(false);
        });

        audio.addEventListener('error', function () {
            broken = true;
            player.classList.add('is-broken');
            toggle.disabled = true;
            seek.disabled = true;
            if (nowEl) nowEl.textContent = '--:--';
            if (durEl) durEl.textContent = '--:--';
            setPlaying(false);
        });

        if (audio.readyState >= 1) {
            if (durEl) durEl.textContent = formatTime(audio.duration);
            paint();
        }
    }

    Array.prototype.slice.call(root.querySelectorAll('[data-player]')).forEach(setupPlayer);

    function stopAudio() {
        audios.forEach(function (audio) {
            if (!audio.paused) {
                try { audio.pause(); } catch (e) { /* 忽略 */ }
            }
        });
    }

    /* 首次进入：有 #条目代号 就选中，没有就显示空白态 */
    fromHash();
    refresh();

    if (window.__sssPageCleanup) {
        window.__sssPageCleanup.add('document', function () {
            stopAudio();
            window.removeEventListener('hashchange', fromHash);
            window.removeEventListener('popstate', fromHash);
            document.removeEventListener('click', onDocClick);
            document.removeEventListener('keydown', onDocKeydown);
        });
    }
})();
