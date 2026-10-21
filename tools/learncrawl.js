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
    // Walks the unit > week > day tree, opening collapsed weeks as it goes (they load lazily),
    // and reads each lesson page: attached files, preview links and links in the text.
    const out = [], got = {}, visited = {};
    const titleOf = li => { const a = li.querySelector('a.tree-branch-title'); return a ? a.innerText.trim() : ''; };
    const pathOf = li => { const p = []; let x = li.parentElement && li.parentElement.closest('li'); while (x) { const t = titleOf(x); if (t) p.unshift(t); x = x.parentElement && x.parentElement.closest('li'); } return p; };
    const add = (path, name, url) => { if (!url || !/^https?:/.test(url)) return; const k = url + '|' + path; if (got[k]) return; got[k] = 1; out.push({ src: 'Coursework', path, name: String(name || url.split('/').pop()).trim().slice(0, 120), url }); };
    const shown = t => [...document.querySelectorAll('h1,h2,h3,h4,.title,[class*=title]')].some(h => !h.closest('li') && (h.innerText || '').trim() === t);
    for (let guard = 0; guard < 250; guard++) {
      const lis = [...document.querySelectorAll('a.tree-branch-title')].map(a => a.closest('li')).filter(Boolean);
      const li = lis.find(l => !visited[pathOf(l).concat(titleOf(l)).join('>')]);
      if (!li) break;
      const p = pathOf(li), t = titleOf(li); visited[p.concat(t).join('>')] = 1;
      const kids = [...li.querySelectorAll('li')].filter(x => x.offsetParent !== null);
      const exp = [...li.querySelectorAll('[ng-click*="collapsedByUser"]')].find(e => e.closest('li') === li);
      if (exp && !kids.length) { exp.click(); await sleep(2000); }
      const v = [...li.querySelectorAll('[ng-click*="viewNode"]')].find(e => e.closest('li') === li);
      if (!v) continue;
      v.click(); await sleep(1500);
      for (let w = 0; w < 8 && !shown(t); w++) await sleep(500);
      await sleep(800);
      const path = p.concat(t).join(' / ');
      document.querySelectorAll('[ng-click*="openFilePreview(file)"]').forEach(e => { const sc = angular.element(e).scope(); const f = sc && sc.file; if (f) add(path, f.fileOriginalName || f.file, f.url); });
      document.querySelectorAll('[onclick*="filePreviewClick"]').forEach(e => { const m = /filePreviewClick\('([^']+)'/.exec(e.getAttribute('onclick')); if (m) add(path, (e.innerText || '').trim() || m[1].split('/').pop(), m[1]); });
      document.querySelectorAll('.fr-view a[href]').forEach(e => { if (!/studentportal\.educationincites/.test(e.href)) add(path, (e.innerText || '').trim() || e.href, e.href); });
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
      clickable(img).click(); await sleep(3000);
      for (let w = 0; w < 20 && !navBtn(/^library_books/) && !navBtn(/^collections_bookmark/); w++) await sleep(500);
      await sleep(1500);
      rec.items.push(...boardLinks());
      const cw = navBtn(/^library_books/);
      if (cw) { clickable(cw).click(); await sleep(2500); for (let w = 0; w < 16 && !document.querySelector('a.tree-branch-title'); w++) await sleep(500); rec.items.push(...await coursework()); }
      const mr = navBtn(/^collections_bookmark/);
      if (mr) { clickable(mr).click(); await sleep(3500); rec.items.push(...await resources()); }
    } catch (e) { rec.err = String(e).slice(0, 200); }
    window.__all[n] = rec;
    await backToClasses();
  }
  window.__status = 'mapping';
  // Pick the student by the teachers on these class cards. The portal can keep the last
  // student's session in a tab whose header still shows the other name, so the header is a tiebreak only.
  const feed = await fetch(FEED + '?view=family').then(r => r.json());
  const last = t => String(t || '').trim().split(/\s+/).pop().toLowerCase();
  const score = k => names.filter(n => { const t = last(teacherOf[n]); return t && ((feed[k] && feed[k].classes) || []).some(c => String(c.teacher || '').toLowerCase().split(/[\s,]+/).indexOf(t) >= 0); }).length;
  const se = score('ella'), so = score('olivia');
  const kid = se >= 2 && se > so ? 'ella' : so >= 2 && so > se ? 'olivia' : '';
  if (!kid) { window.__status = 'error: could not tell which student this is (' + se + '/' + so + ', header ' + who + ')'; return; }
  const classes = (feed[kid] && feed[kid].classes) || [];
  const out = [];
  names.forEach(n => {
    const items = (window.__all[n] && window.__all[n].items || []).filter(x => x.url);
    if (!items.length) return;
    const t = last(teacherOf[n]);
    const c = classes.filter(k => t && String(k.teacher || '').toLowerCase().split(/[\s,]+/).indexOf(t) >= 0)[0];
    if (!c) return;
    out.push({ period: String(c.period), ctls: n, items: items.slice(0, 120).map(x => ({ src: x.src, path: x.path, name: x.name, url: x.url.replace('https://upload.educationincites.com/gacobb/learn/resources/', '~/') })) });
  });
  // Portal files need the portal's cookies, so each one is copied to Drive once and linked as gd:<Drive id>.
  const post = b => fetch(FEED, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(b) }).then(r => r.json());
  const BASE = 'https://upload.educationincites.com/';
  const full = u => String(u || '').replace(/^~\//, BASE + 'gacobb/learn/resources/');
  const keyOf = u => full(u).split('/').pop().replace(/[^\w.-]/g, '');
  const ids = {};
  try {
    const prevItems = [].concat(...(((feed[kid] && feed[kid].learn && feed[kid].learn.classes) || []).map(c => c.items || [])));
    const keys = [...new Set([].concat(...out.map(c => c.items), prevItems).filter(i => full(i.url).indexOf(BASE) === 0).map(i => keyOf(i.url)))];
    for (let k = 0; k < keys.length; k += 300) Object.assign(ids, (await post({ action: 'mirror_has', keys: keys.slice(k, k + 300) })).ids || {});
  } catch (e) {}
  const toDrive = list => list.forEach(i => { if (full(i.url).indexOf(BASE) === 0 && ids[keyOf(i.url)]) i.url = 'gd:' + ids[keyOf(i.url)]; });
  out.forEach(c => toDrive(c.items));
  // Merge with what is already saved, so a slow page load never drops files
  const prev = (feed[kid] && feed[kid].learn && feed[kid].learn.classes) || [];
  prev.forEach(p => toDrive(p.items || []));
  prev.forEach(p => { const c = out.filter(x => x.period === String(p.period))[0]; if (!c) { out.push(p); return; } const seen = {}; c.items.forEach(i => { seen[i.url + '|' + i.name] = 1; }); (p.items || []).forEach(i => { if (!seen[i.url + '|' + i.name]) c.items.push(i); }); c.items = c.items.slice(0, 120); });
  let doc = { updated: new Date().toISOString(), classes: out };
  while (JSON.stringify(doc).length > 47000) { const big = doc.classes.slice().sort((a, b) => b.items.length - a.items.length)[0]; big.items = big.items.slice(0, Math.floor(big.items.length * 0.8)); }
  if (!out.length) { window.__status = 'error: no classes matched'; return; }
  const save = () => fetch(FEED, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action: 'save_learn', kid: kid, doc: doc }) });
  await save();
  // Copy any portal files not yet in Drive (up to 14 minutes per run), then save again.
  try {
    const portal = [];
    doc.classes.forEach(c => c.items.forEach(i => { if (full(i.url).indexOf(BASE) === 0) portal.push(i); }));
    const t0 = Date.now(); let copied = 0, skipped = 0;
    for (const i of portal) {
      const k = keyOf(i.url);
      if (ids[k]) continue;
      if (Date.now() - t0 > 14 * 60000) break;
      window.__status = 'copying files to Drive (' + copied + ' done)';
      try {
        const r = await fetch(full(i.url), { credentials: 'include' });
        if (!r.ok) { skipped++; continue; }
        const blob = await r.blob();
        if (blob.size > 30 * 1024 * 1024) { skipped++; continue; }
        const b64 = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] || ''); fr.readAsDataURL(blob); });
        let name = i.name; const ext = (k.match(/\.(\w+)$/) || [])[1];
        if (ext && !new RegExp('\\.' + ext + '$', 'i').test(name)) name = name.replace(/\.\w+$/, '') + '.' + ext;
        const res = await post({ action: 'mirror_put', kid: kid, key: k, name: name, mime: blob.type || '', b64: b64 });
        if (res && res.id) { ids[k] = res.id; copied++; } else skipped++;
      } catch (e) { skipped++; }
    }
    doc.classes.forEach(c => toDrive(c.items));
    await save();
    window.__copied = copied + ' copied, ' + skipped + ' skipped';
  } catch (e) { window.__copied = 'copy error ' + String(e).slice(0, 120); }
  window.__status = 'saved ' + kid + (who && who.toLowerCase() !== kid ? ' (header said ' + who + ')' : '') + ' ' + out.map(c => c.period + ':' + c.items.length).join(',') + ' | ' + (window.__copied || '');
})(); 'started';
