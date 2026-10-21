// CTLS Learn crawler for the Newman School Tracker.
// Run in the Incite Student Portal tab (opened from CTLSParent > student > CTLS Learn), on My Classes.
// Collects class-board links, coursework files and My Resources files, then saves them to the
// Family Hub Sheet Feed (save_learn). Sets window.__status to 'saved ...' when finished.
window.__job = (async function () {
  const FEED = 'https://script.google.com/macros/s/AKfycbxNkbjYQDpXh_BDXwxtEEnqX5JtMm3BAOi9RBpiIptpsfgy3VoU-FP3L4xf0Qo_ng81pQ/exec';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clickable = e => e.closest('a,button,[ng-click],[role=button]') || e;
  const navBtn = re => [...document.querySelectorAll('a,button,[ng-click]')].find(e => re.test((e.innerText || '').trim()));
  const skip = /^(Incite®|Student Portal|CTLS|Class of \d+|ADVISEMENT|Advisement|Homeroom.*|\d+(st|nd|rd|th) Grade( Homeroom)?( \d{4}-\d{4})?)$/i;
  window.__all = {}; window.__status = 'running';

  async function backToClasses() { const b = navBtn(/Back to Digital Classrooms/); if (b) { clickable(b).click(); await sleep(3500); } }
  const fm = () => [...document.querySelectorAll('.file-manager .fm-file')].map(e => { let o = {}; try { o = JSON.parse(decodeURIComponent(e.getAttribute('dataobj') || '%7B%7D')); } catch (x) {} return { name: (e.getAttribute('title') || '').trim(), folder: /fm-type-folder/.test(e.className), el: e, o }; });
  const fmBack = () => [...document.querySelectorAll('.file-manager *')].find(e => e.children.length <= 2 && /^arrow_back\s*Back$|^arrow_back$/.test((e.innerText || '').trim()) && e.closest('button,a,[ng-click],[role=button]'));
  async function resources() {
    const out = [], seen = {};
    const take = path => fm().forEach(x => {
      if (x.folder) return; const r = x.o.resourceData || {};
      const url = r.convertedToPdf || r.filePath || r.url || r.link || (/^https?:/.test(r.fileName || '') ? r.fileName : '');
      const key = (r.resourceId || x.name) + '|' + path.join('/'); if (seen[key] || !url) return; seen[key] = 1;
      out.push({ src: 'Resources', path: path.join(' / '), name: x.name, url: String(url).replace(/[?#].*$/, '') });
    });
    async function rec(path) {
      take(path);
      const fl = fm().filter(x => x.folder).map(x => x.name);
      for (const n of fl) {
        if (path.length > 4) break;
        const el = fm().find(x => x.name === n); if (!el) continue;
        el.el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); await sleep(2800);
        await rec(path.concat([n]));
        const b = fmBack(); if (b) { clickable(b).click(); await sleep(2000); }
      }
    }
    await rec([]);
    return out;
  }
  async function coursework() {
    const out = [];
    const nodes = () => [...document.querySelectorAll('a.tree-branch-title')];
    const titles = nodes().map(a => a.innerText.trim());
    let unit = '';
    for (let i = 0; i < titles.length; i++) {
      const a = nodes()[i]; if (!a) continue;
      const isTop = !!a.closest('.tree-branch-main') && a.closest('li') === a.closest('.tree-branch-main');
      if (isTop) unit = titles[i];
      clickable(a.parentElement.closest('[ng-click]') || a).click(); await sleep(2200);
      const panel = document;
      const seen = {};
      const path = isTop ? titles[i] : unit + ' / ' + titles[i];
      panel.querySelectorAll('[onclick*="filePreviewClick"]').forEach(e => { const m = /filePreviewClick\('([^']+)'/.exec(e.getAttribute('onclick')); if (m && !seen[m[1]]) { seen[m[1]] = 1; out.push({ src: 'Coursework', path, name: (e.innerText || '').trim().slice(0, 120) || m[1].split('/').pop(), url: m[1] }); } });
      panel.querySelectorAll('.fr-view a[href]').forEach(e => { const h = e.href; if (/^https?:/.test(h) && !seen[h]) { seen[h] = 1; out.push({ src: 'Coursework', path, name: (e.innerText || '').trim().slice(0, 120) || h, url: h }); } });
    }
    return out;
  }
  function boardLinks() {
    const out = [], seen = {};
    document.querySelectorAll('[onclick*="filePreviewClick"]').forEach(e => { const m = /filePreviewClick\('([^']+)'/.exec(e.getAttribute('onclick')); if (m && !seen[m[1]]) { seen[m[1]] = 1; out.push({ src: 'Class Board', path: 'Class Board', name: (e.innerText || '').trim().slice(0, 120), url: m[1] }); } });
    document.querySelectorAll('.fr-view a[href]').forEach(e => { const h = e.href; if (/^https?:/.test(h) && !/studentportal\.educationincites/.test(h) && !seen[h]) { seen[h] = 1; out.push({ src: 'Class Board', path: 'Class Board', name: (e.innerText || '').trim().slice(0, 120) || h, url: h }); } });
    return out;
  }

  await backToClasses();
  const cards = [...document.querySelectorAll('img')].filter(i => i.alt && i.closest('[ng-click],a,button'));
  const names = [...new Set(cards.map(i => i.alt))].filter(n => !skip.test(n));
  window.__names = names;
  const lines = document.body.innerText.split('\n').map(x => x.trim());
  const teacherOf = {};
  names.forEach(n => { const i = lines.indexOf(n); if (i >= 0) for (let j = i + 1; j < i + 4; j++) if (/Instructor/.test(lines[j] || '')) { teacherOf[n] = lines[j + 1] || ''; break; } });
  const who = (document.body.innerText.match(/Welcome,\s*(\w+)/) || document.documentElement.innerHTML.match(/(Ella|Olivia) Newman/) || [])[1] || '';
  for (const n of names) {
    const rec = { items: [] };
    try {
      window.__status = 'class ' + n;
      const img = [...document.querySelectorAll('img')].find(i => i.alt === n && i.closest('[ng-click],a,button'));
      clickable(img).click(); await sleep(4000);
      rec.items.push(...boardLinks());
      const cw = navBtn(/^library_books/);
      if (cw) { clickable(cw).click(); await sleep(3500); rec.items.push(...await coursework()); }
      const mr = navBtn(/^collections_bookmark/);
      if (mr) { clickable(mr).click(); await sleep(3500); rec.items.push(...await resources()); }
    } catch (e) { rec.err = String(e).slice(0, 200); }
    window.__all[n] = rec;
    await backToClasses();
  }
  window.__status = 'mapping';
  const kid = /ella/i.test(who) ? 'ella' : /olivia/i.test(who) ? 'olivia' : '';
  if (!kid) { window.__status = 'error: could not tell which student this is'; return; }
  const feed = await fetch(FEED + '?view=family').then(r => r.json());
  const classes = (feed[kid] && feed[kid].classes) || [];
  const last = t => String(t || '').trim().split(/\s+/).pop().toLowerCase();
  const out = [];
  names.forEach(n => {
    const items = (window.__all[n] && window.__all[n].items || []).filter(x => x.url);
    if (!items.length) return;
    const t = last(teacherOf[n]);
    const c = classes.filter(k => t && String(k.teacher || '').toLowerCase().split(/[\s,]+/).indexOf(t) >= 0)[0];
    if (!c) return;
    out.push({ period: String(c.period), ctls: n, items: items.slice(0, 120).map(x => ({ src: x.src, path: x.path, name: x.name, url: x.url.replace('https://upload.educationincites.com/gacobb/learn/resources/', '~/') })) });
  });
  let doc = { updated: new Date().toISOString(), classes: out };
  while (JSON.stringify(doc).length > 47000) { const big = doc.classes.slice().sort((a, b) => b.items.length - a.items.length)[0]; big.items = big.items.slice(0, Math.floor(big.items.length * 0.8)); }
  if (!out.length) { window.__status = 'error: no classes matched'; return; }
  await fetch(FEED, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action: 'save_learn', kid: kid, doc: doc }) });
  window.__status = 'saved ' + kid + ' ' + out.map(c => c.period + ':' + c.items.length).join(',');
})(); 'started';
