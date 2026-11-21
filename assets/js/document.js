/* =============================================================================
 * document.js — 文件档案页：左栏名录搜索 + 选中 / 取消选择 + 详情面板
 *                 + .md 文档渲染 + 音轨播放条
 * -----------------------------------------------------------------------------
 * 行为照舰船 / 人员 / 生物档案：
 *   · 点左栏条目选中，右栏显示对应档案；
 *   · 再点一次已选中的条目、点左栏或右栏空白处、点页面最左/最右留白，
 *     都取消选择并回到 NO / INFO 空白态；
 *   · 地址栏 #条目代号 可直接选中，前进 / 后退也会跟着切换。
 *
 * 另外管三件事：
 *   1. 「详情」按钮：文件信息 / 摘要 / 备注默认都收在右上角的小按钮里，
 *      按下展开、再按收起；点面板外或按 Esc 也收起（一次只开一个）。
 *   2. .md 文档：fetch 原件 → marked 渲染成 .markdown-body
 *      （与主页面同一套渲染配置和缩进保留规则，视觉在 assets/css/markdown.css）。
 *   3. 音轨播放条：播放键 + 进度条 + 读数；换条目时把播着的音轨停掉。
 * 视频走浏览器原生控件（<video controls>），本脚本不接管。
 * ========================================================================== */
(function () {
    'use strict';

    var root = document.querySelector('.document-layout');
    if (!root) return;

    function refresh() {
        if (window.__sssArchiveScroll && window.__sssArchiveScroll.refresh) {
            window.__sssArchiveScroll.refresh();
        }
    }

    /* ── 左栏名录搜索 ── */
    if (window.SSSArchiveSearch) {
        window.SSSArchiveSearch.attach({
            input: root.querySelector('.archive-search__input'),
            empty: root.querySelector('.archive-search__empty'),
            scroll: root.querySelector('.document-list__scroll'),
            items: Array.prototype.slice.call(root.querySelectorAll('.document-list__item')),
            groups: Array.prototype.slice.call(root.querySelectorAll('.document-list__group')),
            groupSelector: '.document-list__group'
        });
    }

    /* ── 选中 / 取消选择 ── */
    var items = Array.prototype.slice.call(root.querySelectorAll('.document-list__item'));
    var profiles = Array.prototype.slice.call(root.querySelectorAll('.document-profile'));
    var empty = root.querySelector('.archive-empty');
    var list = root.querySelector('.document-list__scroll');
    var listPane = root.querySelector('.document-list');
    var detailPane = root.querySelector('.document-detail');

    var byId = Object.create(null);
    profiles.forEach(function (p) { byId[p.id] = p; });

    /* ── 右上角详情面板 ──
       一次只开一个；点按钮以外的地方、按 Esc、换条目都收起。
       事件挂在 document 上，站内换页时在 cleanup 里摘掉。 */
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

    /* ── .md 文档：marked 渲染 ──
       marked 的配置与主页面完全一致（breaks + gfm）；缩进保留规则也照抄，
       否则日志类文档里靠行首缩进撑起来的树形结构会被 Markdown 吃掉。 */
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

        window.marked.setOptions({
            breaks: true,
            gfm: true
        });

        box.setAttribute('aria-busy', 'true');

        fetch(src, { credentials: 'same-origin' })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.text();
            })
            .then(function (text) {
                if (!root.isConnected) return;   // 站内换页后旧 DOM 已摘掉，别再往里写
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

        /* 只滚左栏自己的滚动条，页面保持原位 */
        if (list && current) {
            var lr = list.getBoundingClientRect();
            var ir = current.getBoundingClientRect();
            if (ir.top < lr.top) list.scrollTop += ir.top - lr.top;
            else if (ir.bottom > lr.bottom) list.scrollTop += ir.bottom - lr.bottom;
        }

        /* 换条目时把右栏正文送回到开头 */
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

    /* 名录条目：选中；再点已选中的条目 = 取消选择 */
    root.addEventListener('click', function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
        if (!a || !root.contains(a)) return;
        var id = a.getAttribute('href').slice(1);
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

    /* 点左栏 / 右栏空白处取消选择 */
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

    /* 页面最左 / 最右留白：点在 .archive-section 外面的 main 上取消选择 */
    var pageMain = document.querySelector('main');
    if (pageMain) {
        pageMain.addEventListener('click', function (e) {
            if (e.target.closest('.archive-section')) return;
            clearSelection();
        });
    }

    /* 首次进入：有 #条目代号 就选中，没有就显示空白态 */
    fromHash();

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
