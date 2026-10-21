import { spawn } from 'node:child_process';
import { rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9364;
const OUT = 'E:\\CodeThings\\StarlightSacredSanctuary.top\\.tmp-shots';
const PROFILE = OUT + '\\edge-profile';
const BASE = 'http://127.0.0.1:8090/';
const FILE = 'file:///E:/CodeThings/StarlightSacredSanctuary.top/archive/personnel/sam.html';

mkdirSync(PROFILE, { recursive: true });
const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--allow-file-access-from-files', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, 'about:blank'], { stdio: 'ignore' });
async function waitPort() { for (let i = 0; i < 100; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch {} await sleep(100); } throw new Error('no port'); }
function rpc(ws) { let id = 0; const pending = new Map(); const events = []; ws.addEventListener('message', (ev) => { const msg = JSON.parse(ev.data); if (msg.id != null && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result); } else if (msg.method) events.push(msg); }); return { send(method, params = {}) { const mid = ++id; return new Promise((resolve, reject) => { pending.set(mid, { resolve, reject }); ws.send(JSON.stringify({ id: mid, method, params })); }); }, events }; }
async function waitEvent(cli, method, timeout = 15000) { const s = Date.now(); while (Date.now() - s < timeout) { const i = cli.events.findIndex((e) => e.method === method); if (i >= 0) return cli.events.splice(i, 1)[0]; await sleep(50); } throw new Error('timeout ' + method); }
async function load(cli, url) {
  await cli.send('Page.navigate', { url: 'about:blank' });
  await waitEvent(cli, 'Page.loadEventFired');
  await cli.send('Page.navigate', { url });
  await waitEvent(cli, 'Page.loadEventFired');
  await sleep(1100);
}
async function report(cli) {
  return (await cli.send('Runtime.evaluate', {
    expression: `JSON.stringify((() => {
      const t = document.body.innerText;
      return { active: document.querySelector('.personnel-profile.is-active .personnel-profile__name')?.textContent,
        damage: (t.match(/数据损坏/g) || []).length,
        daibu: (t.match(/待补/g) || []).length,
        zanwu: (t.match(/暂无/g) || []).length,
        queshi: (t.match(/缺失/g) || []).length,
        scrollY, scrollH: document.documentElement.scrollHeight, innerH: innerHeight,
        relatives: [...document.querySelectorAll('.personnel-profile.is-active .personnel-relative')].map(a => a.textContent) };
    })())`,
    returnByValue: true,
  })).result.value;
}

try {
  await waitPort();
  const created = await (await fetch(`http://127.0.0.1:${PORT}/json/new`, { method: 'PUT' })).json();
  const ws = new WebSocket(created.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const cli = rpc(ws);
  await cli.send('Page.enable'); await cli.send('Runtime.enable');
  await cli.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__SSS_NO_NOTICE = true;' });
  await cli.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 961, deviceScaleFactor: 1, mobile: false });

  await load(cli, BASE + 'archive/personnel/sam.html');
  console.log('SAM', await report(cli));
  let shot = await cli.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(`${OUT}\\c-sam.png`, Buffer.from(shot.data, 'base64'));

  await load(cli, BASE + 'archive/personnel/sxm.html#10101389110909795');
  console.log('SXM', await report(cli));
  shot = await cli.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(`${OUT}\\c-sxm.png`, Buffer.from(shot.data, 'base64'));

  await load(cli, BASE + 'archive/personnel/');
  let idx = await cli.send('Runtime.evaluate', { expression: `JSON.stringify({ lead: document.querySelector('.archive-lead')?.innerText, cards: [...document.querySelectorAll('.personnel-card')].map(a => a.querySelector('.personnel-card__meta')?.textContent), damage: (document.body.innerText.match(/数据损坏/g)||[]).length, daibu: (document.body.innerText.match(/待补/g)||[]).length })`, returnByValue: true });
  console.log('INDEX', idx.result.value);
  shot = await cli.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(`${OUT}\\c-index.png`, Buffer.from(shot.data, 'base64'));

  await load(cli, FILE);
  console.log('FILE', await report(cli));
  shot = await cli.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(`${OUT}\\c-file.png`, Buffer.from(shot.data, 'base64'));

  ws.close();
} finally {
  proc.kill();
  await sleep(200);
  try { rmSync(PROFILE, { recursive: true, force: true }); } catch {}
}
