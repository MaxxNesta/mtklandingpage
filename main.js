(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  document.getElementById('yr').textContent = new Date().getFullYear();

  /* ---------- Seeded random so the treeline is the same on every load ---------- */
  const rng = seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  /* ---------- Dusk treeline (SVG) ---------- */
  const TONES = [
    ['#6a5068', '#7d5f74', '#94707f'],                        // far, hazy
    ['#8a4d5c', '#a95f69', '#c97a7c', '#e39b8f', '#f3bba6'],  // mid, sun-lit blossom
    ['#3a1d2a', '#5e2f3f', '#8a4655', '#b9686b', '#e6998a'],  // near
    ['#140a10', '#2c1520', '#55293a', '#93505a', '#d8897f', '#eeb19c']  // foreground, lit from above
  ];
  function buildCanopy(svg, seed, opts = {}) {
    const W = 1600, H = 500, r = rng(seed);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const gap = opts.gap ?? .3;  // empty share of the width kept clear in the middle
    let out = `<defs><linearGradient id="cf${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#050506" stop-opacity="0"/><stop offset=".85" stop-color="#050506" stop-opacity=".7"/><stop offset="1" stop-color="#050506"/></linearGradient>`
      + `<filter id="leaf${seed}" x="-5%" y="-10%" width="110%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="${seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="9"/></filter></defs>`;
    TONES.forEach((tones, li) => {
      const base = H - 30 - (3 - li) * 40;   // farther layers sit higher
      const size = 6 + li * 3;
      let g = '';
      const clusters = 10 + li * 4;
      for (let c = 0; c < clusters; c++) {
        // keep trees toward the edges so the middle of the dashboard stays visible
        const t = r(), side = r() < .5 ? 0 : 1;
        let x = side ? W * (.5 + gap / 2 + t * (.5 - gap / 2)) : W * (t * (.5 - gap / 2));
        const edge = Math.min(x, W - x) / (W / 2);           // 0 at the edges, 1 in the centre
        const lift = (1 - edge) ** 1.4 * (110 + li * 34);
        const spread = size * (4 + r() * 2.2);
        const cy = base - lift * (.65 + r() * .35) - spread * .3;
        const n = 70 + (r() * 40 | 0);
        const puffs = [];
        for (let k = 0; k < n; k++) {
          const a = r() * Math.PI * 2, dd = Math.sqrt(r()) * spread;
          const px = x + Math.cos(a) * dd * 1.25, py = cy + Math.sin(a) * dd * .75;
          const pr = size * (.8 + r() * .8);
          // sun from above and in front: higher puffs catch more light
          const v = 1.12 - (py - (cy - spread * .75)) / (spread * 1.25) + (r() - .5) * .3;
          const tone = tones[Math.round(clamp(v) * (tones.length - 1))];
          puffs.push([py, `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${pr.toFixed(1)}" fill="${tone}"/>`]);
        }
        puffs.sort((a, b) => b[0] - a[0]).forEach(([, c2]) => { g += c2; });
      }
      if (li === 3) g += `<path d="M0 ${base + 6} C${W * .25} ${base - 6} ${W * .4} ${base + 14} ${W / 2} ${base + 8} S${W * .8} ${base - 4} ${W} ${base + 4} V${H} H0Z" fill="${tones[0]}"/>`;
      out += `<g class="layer" data-depth="${(li + 1) * .25}"><g filter="url(#leaf${seed})">${g}</g></g>`;
    });
    out += `<rect width="${W}" height="${H}" fill="url(#cf${seed})"/>`;
    svg.innerHTML = out;
    return [...svg.querySelectorAll('.layer')];
  }
  const canopyLayers = buildCanopy(document.getElementById('canopy'), 11, { gap: .46 });
  buildCanopy(document.getElementById('canopy2'), 29, { gap: .5 });

  /* ---------- Flowing contour lines across the sky ---------- */
  const sc = document.getElementById('flow');
  const sctx = sc.getContext('2d');
  let sw = 0, sh = 0, sOn = true;
  const LINES = 26;
  function sizeStars() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    sw = sc.clientWidth; sh = sc.clientHeight;
    sc.width = sw * dpr; sc.height = sh * dpr; sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function drawStars(now) {
    const t = reduce ? 0 : now / 1000;
    sctx.clearRect(0, 0, sw, sh);
    const fade = sctx.createLinearGradient(0, 0, sw, 0);
    fade.addColorStop(0, 'rgba(255,255,255,0)');
    fade.addColorStop(.25, 'rgba(255,236,224,.9)');
    fade.addColorStop(.75, 'rgba(255,236,224,.9)');
    fade.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.strokeStyle = fade;
    sctx.lineWidth = 1;
    const step = Math.max(14, sw / 90);
    for (let k = 0; k < LINES; k++) {
      const f = k / (LINES - 1);
      const base = sh * (.16 + f * .7);
      const amp = sh * (.035 + .05 * Math.sin(f * 3.1));
      sctx.globalAlpha = .1 + .26 * Math.sin(f * Math.PI);
      sctx.beginPath();
      for (let x = -step; x <= sw + step; x += step) {
        const u = x / sw;
        // two travelling waves plus a slow swell that bends the lines toward the centre
        const y = base
          + Math.sin(u * 6.2 + t * .35 + f * 2.4) * amp
          + Math.sin(u * 13.5 - t * .22 + f * 5.1) * amp * .28
          - Math.cos((u - .5) * Math.PI) * sh * .06 * Math.sin(t * .15 + f * 1.7);
        x === -step ? sctx.moveTo(x, y) : sctx.lineTo(x, y);
      }
      sctx.stroke();
    }
    sctx.globalAlpha = 1;
    if (sOn && !reduce) requestAnimationFrame(drawStars);
  }
  sizeStars(); requestAnimationFrame(drawStars);

  /* ---------- Dashboard: cash chart, gauge, count-ups ---------- */
  const dash = document.getElementById('dash');
  const hero = document.getElementById('hero');
  const ACT = [62, 70, 58, 74, 68, 81, 77];        // Jan–Jul actual, % of plot height
  const FC = [72, 79, 70, 84, 88];                  // Aug–Dec forecast
  const BAL = [48, 52, 49, 55, 58, 61, 60, 63, 66, 64, 69, 72];
  document.querySelector('.chart__bars').innerHTML = [...ACT, ...FC].map((h, i) =>
    `<i class="${i >= ACT.length ? 'f' : ''}" style="--h:${h}%;--i:${i}"></i>`).join('');
  const step = 100 / 12;
  const pts = BAL.map((b, i) => [(1.6 + (i + .5) * (100 - 3.2) / 12) * 1.2, 100 - b]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2;
    d += ` C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`;
  }
  document.getElementById('balLine').setAttribute('d', d);
  document.querySelector('.chart__today').style.setProperty('--x', (1.6 + 6.5 * (100 - 3.2) / 12) + '%');
  void step;

  const gauge = document.getElementById('gaugeVal');
  const GL = gauge.getTotalLength();
  const countUp = el => {
    const end = +el.dataset.count, pre = el.dataset.prefix || '';
    const t0 = performance.now(), dur = reduce ? 1 : 1600;
    const tick = now => {
      const p = clamp((now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + Math.round(end * e).toLocaleString('en-US');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  let dashIn = false;
  function playDash() {
    if (dashIn) return; dashIn = true;
    dash.classList.add('is-in');
    gauge.style.strokeDasharray = `${GL * 39 / 60} ${GL}`;
    dash.querySelectorAll('[data-count]').forEach(countUp);
  }
  setTimeout(playDash, reduce ? 0 : 1300);

  /* ---------- Industry marquee: duplicate the row for a seamless loop ---------- */
  const row = document.querySelector('.strip__row');
  const clone = row.cloneNode(true); clone.setAttribute('aria-hidden', 'true');
  row.after(clone);

  /* ---------- Feature card spotlight ---------- */
  document.querySelectorAll('.fcard').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }));

  /* ---------- How it works: live posting feed ---------- */
  const FEED = [
    ['Sales invoice INV‑2089', '+$1,240', 'pos', 64], ['Stock transfer TR‑77', '24 u', '', 40],
    ['Customer receipt RCPT‑904', '+$3,800', 'pos', 82], ['Depreciation JV‑3108', '−$420', 'neg', 30],
    ['Goods receipt GRN‑552', '+120 u', '', 56], ['Supplier invoice INV‑S‑2042', '−$2,150', 'neg', 46]
  ];
  const feedRows = document.getElementById('feedRows');
  let fi = 0, feedTimer = null;
  function feedTick() {
    const [n, v, c, w] = FEED[fi++ % FEED.length];
    const p = document.createElement('p');
    p.innerHTML = `<span>${n}</span><b class="${c}">${v}</b><i style="--w:${w}%"></i>`;
    feedRows.prepend(p);
    while (feedRows.children.length > 3) feedRows.lastElementChild.remove();
  }
  if (!reduce) new IntersectionObserver(([en]) => {
    clearInterval(feedTimer);
    if (en.isIntersecting) feedTimer = setInterval(feedTick, 2200);
  }).observe(feedRows);

  /* ---------- Scroll-driven bits ---------- */
  const nav = document.getElementById('nav');
  const scrub = document.getElementById('scrub');
  const { t } = window.I18N;
  let words = [];
  function buildScrub() {
    const txt = scrub.textContent.trim();
    const zh = window.I18N.lang === 'zh';
    const parts = zh ? txt.match(/MTK|\s+|./gu).filter(s => s.trim()) : txt.split(/\s+/);
    scrub.innerHTML = parts.map(w => `<span class="w${w === 'MTK' ? ' is-key' : ''}">${w}</span>`).join(zh ? '' : ' ');
    words = [...scrub.querySelectorAll('.w')];
  }
  buildScrub();

  let ticking = false;
  function onScroll() {
    ticking = false;
    const vh = innerHeight, y = scrollY;
    nav.classList.toggle('is-scrolled', y > 24);

    // dashboard flattens as it scrolls into view
    const dr = dash.getBoundingClientRect();
    const p = reduce ? 1 : clamp(1 - (dr.top - vh * .18) / (vh * .55));
    dash.style.setProperty('--tilt', (14 * (1 - p)).toFixed(2) + 'deg');
    if (dr.top < vh * .7) playDash();

    // treeline parallax + stars pause once the hero is gone
    if (y < hero.offsetHeight) {
      canopyLayers.forEach(l => { l.style.transform = `translateY(${(-y * +l.dataset.depth * .18).toFixed(1)}px)`; });
      if (!sOn) { sOn = true; requestAnimationFrame(drawStars); }
    } else sOn = false;

    const r = scrub.getBoundingClientRect();
    const sp = clamp((vh * .85 - r.top) / (r.height + vh * .35));
    const lit = Math.round(sp * words.length);
    words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(sizeStars, 150); });

  /* ---------- Module explorer ---------- */
  const explorer = document.getElementById('explorer');
  const tabs = [...explorer.querySelectorAll('[role="tab"]')];
  const DWELL = 7000;
  let current = 0, timer = null, auto = !reduce;
  explorer.style.setProperty('--dwell', DWELL + 'ms');

  function show(i, focus) {
    current = (i + tabs.length) % tabs.length;
    tabs.forEach((t, j) => {
      const on = j === current;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      panel.hidden = !on;
      panel.classList.remove('is-play');
      if (on) requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('is-play')));
    });
    if (focus) tabs[current].focus();
    const list = tabs[0].parentElement, t = tabs[current];
    if (list.scrollWidth > list.clientWidth) list.scrollTo({ left: t.offsetLeft - (list.clientWidth - t.offsetWidth) / 2, behavior: 'smooth' });
    schedule();
  }
  function schedule() {
    clearTimeout(timer);
    if (auto) timer = setTimeout(() => show(current + 1), DWELL);
  }
  function stopAuto() { auto = false; clearTimeout(timer); explorer.classList.add('is-paused'); }
  tabs.forEach((t, i) => t.addEventListener('click', () => { stopAuto(); show(i); }));
  explorer.querySelector('[role="tablist"]').addEventListener('keydown', e => {
    const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (d) { e.preventDefault(); stopAuto(); show(current + d, true); }
  });
  if (reduce) explorer.classList.add('is-paused');
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting) { if (!timer) show(current); }
    else { clearTimeout(timer); timer = null; }
  }, { threshold: .3 }).observe(explorer);

  /* ---------- String art in panels ---------- */
  document.querySelectorAll('svg[data-strings]').forEach((svg, n) => {
    const W = 1600, H = 800, flip = n % 2;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    let out = '';
    for (let k = 0; k < 16; k++) {
      const y0 = H * (.05 + k * .055), y1 = H * (.95 - k * .05);
      const c1x = W * (.3 + k * .01), c2x = W * (.62 - k * .008);
      let d = `M-40 ${y0} C${c1x} ${H * .95} ${c2x} ${H * .08} ${W + 40} ${y1}`;
      if (flip) d = `M-40 ${H - y0} C${c1x} ${H * .05} ${c2x} ${H * .92} ${W + 40} ${H - y1}`;
      const cls = k % 5 === 2 ? 'p' : '';
      out += `<path class="${cls}" d="${d}"/>`;
      if (k === 2 || k === 9) out += `<path class="pulse${k === 9 ? ' y' : ''}" d="${d}"/>`;
    }
    svg.innerHTML = out;
  });
  const hhmm = () => new Date().toTimeString().slice(0, 5);

  /* ---------- Time-saved calculator ---------- */
  const TASKS = [
    { k: 'inv', share: .35, m: 6, a: .5 },
    { k: 'chk', share: .35, m: 4, a: .3 },
    { k: 'dep', share: .10, m: 3, a: 0 },
    { k: 'lc', share: .05, m: 25, a: 1.5 },
    { k: 'tr', share: .15, m: 8, a: .3 }
  ];
  const MAXM = Math.max(...TASKS.map(x => x.m));
  const rowsEl = document.getElementById('calcRows');
  let rowEls = [];
  function renderRows() {
    rowsEl.innerHTML = TASKS.map(x => `
    <div class="row">
      <div class="row__t"><b>${t(`task.${x.k}.t`)}</b><span>${t(`task.${x.k}.d`)}</span></div>
      <div class="row__n"><b>0</b><span>${t('u.docs')}</span></div>
      <div class="row__bars"><i class="m" style="width:${x.m / MAXM * 100}%"></i><i class="a" style="width:${Math.max(x.a / MAXM * 100, .8)}%"></i><span>${t('u.each', { m: x.m, a: x.a })}</span></div>
      <div class="row__s"><b></b><span>${t('u.saved')}</span></div>
    </div>`).join('');
    rowEls = [...rowsEl.children];
  }
  renderRows();
  const range = document.getElementById('docs');
  const fmt = n => n.toLocaleString('en-US');
  const set = (id, v) => { document.getElementById(id).textContent = v; };
  function calc() {
    const docs = +range.value;
    range.style.setProperty('--fill', ((docs - range.min) / (range.max - range.min) * 100) + '%');
    set('docsOut', fmt(docs));
    let before = 0, after = 0;
    TASKS.forEach((x, i) => {
      const n = Math.round(docs * x.share);
      before += n * x.m; after += n * x.a;
      rowEls[i].querySelector('.row__n b').textContent = fmt(n);
      rowEls[i].querySelector('.row__s b').textContent = t('u.h', { n: (n * (x.m - x.a) / 60).toFixed(1) });
    });
    const saved = (before - after) / 60;
    set('sDocs', fmt(docs));
    set('sBefore', (before / docs).toFixed(1));
    set('sAfter', (after / docs).toFixed(1));
    set('sHours', fmt(Math.round(saved)));
    const bh = before / 60, ah = after / 60;
    set('hBefore', t('u.h', { n: fmt(Math.round(bh)) }));
    set('hAfter', t('u.h', { n: ah < 10 ? ah.toFixed(1) : fmt(Math.round(ah)) }));
    document.getElementById('cmpBefore').style.width = '100%';
    document.getElementById('cmpAfter').style.width = Math.max(ah / bh * 100, 1.5) + '%';
    set('sPct', Math.round((1 - after / before) * 100));
  }
  range.addEventListener('input', calc);
  calc();

  /* ---------- Document trace map ---------- */
  const NODES = [
    { id: 'po', c: 0, r: 0, n: 'PO‑8842' },
    { id: 'lcb', c: 0, r: 1, n: 'BILL‑310' },
    { id: 'grn', c: 1, r: 0, n: 'GRN‑551' },
    { id: 'lcv', c: 1, r: 1, n: 'JV‑3107' },
    { id: 'sinv', c: 2, r: 0, n: 'INV‑S‑2041' },
    { id: 'sale', c: 2, r: 1, n: 'INV‑2088' },
    { id: 'pay', c: 3, r: 0, n: 'PAY‑118' },
    { id: 'rcpt', c: 3, r: 1, n: 'RCPT‑903' }
  ];
  const EDGES = [['po', 'grn'], ['po', 'lcb'], ['lcb', 'lcv'], ['grn', 'lcv'], ['grn', 'sinv'], ['sinv', 'pay'], ['grn', 'sale'], ['sale', 'rcpt']];
  const map = document.getElementById('traceMap');
  const traceSvg = document.getElementById('traceLines');
  const nodeEls = {};
  NODES.forEach(nd => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tnode';
    b.style.gridColumn = nd.c + 1; b.style.gridRow = nd.r + 1;
    b.innerHTML = `<span></span><b>${nd.n}</b>`;
    b.addEventListener('click', () => select(nd.id));
    map.append(b);
    nodeEls[nd.id] = b;
  });
  const walk = (id, dir, acc = new Set()) => {
    EDGES.forEach(([f, t]) => {
      const [from, to] = dir === 'up' ? [t, f] : [f, t];
      if (from === id && !acc.has(to)) { acc.add(to); walk(to, dir, acc); }
    });
    return acc;
  };
  let selected = 'grn';
  function drawLines() {
    const mr = map.getBoundingClientRect();
    traceSvg.setAttribute('viewBox', `0 0 ${mr.width} ${mr.height}`);
    const up = walk(selected, 'up'), down = walk(selected, 'down');
    traceSvg.innerHTML = EDGES.map(([f, t]) => {
      const a = nodeEls[f].getBoundingClientRect(), b = nodeEls[t].getBoundingClientRect();
      const vertical = Math.abs(a.left - b.left) < 4;
      const x1 = vertical ? a.left + a.width / 2 - mr.left : a.right - mr.left;
      const y1 = vertical ? a.bottom - mr.top : a.top + a.height / 2 - mr.top;
      const x2 = vertical ? b.left + b.width / 2 - mr.left : b.left - mr.left;
      const y2 = vertical ? b.top - mr.top : b.top + b.height / 2 - mr.top;
      const dx = (x2 - x1) * .5;
      if (vertical) return `<path class="${down.has(t) && (down.has(f) || f === selected) ? 'down' : up.has(f) && (up.has(t) || t === selected) ? 'up' : ''}" d="M${x1} ${y1} L${x2} ${y2}"/>`;
      const cls = down.has(t) && (down.has(f) || f === selected) ? 'down'
        : up.has(f) && (up.has(t) || t === selected) ? 'up' : '';
      return `<path class="${cls}" d="M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}"/>`;
    }).join('');
  }
  function select(id) {
    selected = id;
    const up = walk(id, 'up'), down = walk(id, 'down');
    NODES.forEach(nd => {
      const el = nodeEls[nd.id];
      el.className = 'tnode' + (nd.id === id ? ' is-sel' : up.has(nd.id) ? ' is-up' : down.has(nd.id) ? ' is-down' : ' is-dim');
      el.setAttribute('aria-pressed', nd.id === id);
    });
    const nd = NODES.find(x => x.id === id);
    NODES.forEach(x => { nodeEls[x.id].firstChild.textContent = t(`n.${x.id}`); });
    document.getElementById('traceRead').innerHTML = t('trace.read', {
      n: `<b>${nd.n}</b>`, u: up.size, d: down.size, us: up.size === 1 ? '' : 's', ds: down.size === 1 ? '' : 's'
    });
    drawLines();
  }
  new ResizeObserver(drawLines).observe(map);
  select('grn');

  /* ---------- Automation playback ---------- */
  const autoEl = document.getElementById('automation');
  const steps = [...autoEl.querySelectorAll('.auto__step')];
  const lines = [...autoEl.querySelectorAll('.auto__line')];
  let runTimers = [];
  function runRule() {
    runTimers.forEach(clearTimeout); runTimers = [];
    steps.forEach(s => s.classList.remove('is-active'));
    lines.forEach(l => l.classList.remove('is-flow'));
    const gap = reduce ? 0 : 750;
    steps.forEach((s, i) => {
      runTimers.push(setTimeout(() => {
        if (i === steps.length - 1) document.getElementById('autoTime').textContent = hhmm();
        s.classList.add('is-active');
        if (lines[i]) { void lines[i].offsetWidth; lines[i].classList.add('is-flow'); }
      }, 200 + i * gap));
    });
  }
  document.getElementById('replay').addEventListener('click', runRule);
  new IntersectionObserver(([en], ob) => { if (en.isIntersecting) { runRule(); ob.disconnect(); } }, { threshold: .4 }).observe(autoEl);

  /* ---------- Interactive access matrix ---------- */
  const LABEL = v => t({ e: 'acc.e', v: 'acc.v', '': 'acc.h0' }[v]);
  const NEXT = { e: 'v', v: '', '': 'e' };
  const ths = [...document.querySelectorAll('#matrix thead th')];
  const log = document.getElementById('log');
  const painters = [];
  document.querySelectorAll('#matrix tbody td[data-v]').forEach(td => {
    const isOwner = td.parentElement.dataset.role === 'Owner';
    const roleName = () => td.parentElement.cells[0].textContent;
    const modName = () => ths[td.cellIndex].textContent;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = '<i></i>';
    const paint = () => {
      const v = td.dataset.v;
      btn.firstChild.className = v;
      btn.setAttribute('aria-label', `${roleName()}, ${modName()}: ${LABEL(v)}`);
      if (isOwner) btn.title = t('acc.owner');
    };
    if (isOwner) btn.disabled = true;
    btn.addEventListener('click', () => {
      td.dataset.v = NEXT[td.dataset.v];
      paint();
      btn.classList.add('pop'); setTimeout(() => btn.classList.remove('pop'), 250);
      const p = document.createElement('p');
      p.innerHTML = `<time>${hhmm()}</time>`;
      const s = document.createElement('span');
      s.textContent = t('acc.log', { role: roleName(), label: LABEL(td.dataset.v), mod: modName() });
      p.append(s);
      log.prepend(p);
      while (log.children.length > 3) log.lastElementChild.remove();
    });
    paint();
    painters.push(paint);
    td.append(btn);
  });

  /* ---------- Ask an AI about MTK ---------- */
  const AI_URL = {
    chatgpt: q => `https://chatgpt.com/?q=${q}`,
    claude: q => `https://claude.ai/new?q=${q}`,
    gemini: q => `https://gemini.google.com/app?q=${q}`,
    grok: q => `https://grok.com/?q=${q}`
  };
  const aiBtns = [...document.querySelectorAll('.askai__btn')];
  const aiToast = document.getElementById('aiToast');
  function setAiLinks() {
    const q = encodeURIComponent(t('ai.prompt'));
    aiBtns.forEach(b => { b.href = AI_URL[b.dataset.ai](q); });
  }
  aiBtns.forEach(b => b.addEventListener('click', () => {
    if (navigator.clipboard) navigator.clipboard.writeText(t('ai.prompt')).catch(() => {});
    aiToast.textContent = t('ai.copied');
    aiToast.classList.add('is-on');
    clearTimeout(aiToast._t);
    aiToast._t = setTimeout(() => aiToast.classList.remove('is-on'), 5000);
  }));
  setAiLinks();

  /* ---------- Re-render on language change ---------- */
  document.addEventListener('langchange', () => {
    buildScrub(); onScroll();
    renderRows(); calc();
    select(selected);
    painters.forEach(p => p());
    setAiLinks();
  });

  /* ---------- Reveals ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: .18, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();
