(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  document.getElementById('yr').textContent = new Date().getFullYear();
  const GS = !!(window.gsap && window.ScrollTrigger) && !reduce;
  if (GS) document.documentElement.classList.add('has-gsap');

  /* ---------- Flowing line pattern (hero + closing CTA) ---------- */
  function makeFlow(cv, { lines = 24, peach = [7, 15] } = {}) {
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, on = false;
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = now => {
      const t = reduce ? 0 : now / 1000;
      ctx.clearRect(0, 0, w, h);
      const step = Math.max(12, w / 100);
      for (let k = 0; k < lines; k++) {
        const f = k / (lines - 1);
        const base = h * (.08 + f * .84);
        const amp = h * (.03 + .045 * Math.sin(f * 3.1));
        const g = ctx.createLinearGradient(0, 0, w, 0);
        const c = peach.includes(k) ? '244,185,156' : '255,255,255';
        const a = peach.includes(k) ? .55 : .05 + .11 * Math.sin(f * Math.PI);
        g.addColorStop(0, `rgba(${c},0)`); g.addColorStop(.3, `rgba(${c},${a})`);
        g.addColorStop(.7, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`);
        ctx.strokeStyle = g; ctx.lineWidth = peach.includes(k) ? 1.2 : 1;
        ctx.beginPath();
        for (let x = -step; x <= w + step; x += step) {
          const u = x / w;
          const y = base
            + Math.sin(u * 6.2 + t * .35 + f * 2.4) * amp
            + Math.sin(u * 13.5 - t * .22 + f * 5.1) * amp * .28
            - Math.cos((u - .5) * Math.PI) * h * .05 * Math.sin(t * .15 + f * 1.7);
          x === -step ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      if (on && !reduce) requestAnimationFrame(draw);
    };
    size();
    new IntersectionObserver(([en]) => {
      const was = on; on = en.isIntersecting;
      if (on && !was) requestAnimationFrame(draw);
    }).observe(cv);
    let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { size(); if (!on || reduce) requestAnimationFrame(draw); }, 150); });
    requestAnimationFrame(draw);
  }
  makeFlow(document.getElementById('flow'));
  makeFlow(document.getElementById('flow2'), { lines: 18, peach: [6, 12] });

  /* ---------- Dashboard: cash chart, gauge, count-ups ---------- */
  const dash = document.getElementById('dash');
  const hero = document.getElementById('hero');
  const ACT = [62, 70, 58, 74, 68, 81, 77];        // Jan–Jul actual, % of plot height
  const FC = [72, 79, 70, 84, 88];                  // Aug–Dec forecast
  const BAL = [48, 52, 49, 55, 58, 61, 60, 63, 66, 64, 69, 72];
  document.querySelector('.chart__bars').innerHTML = [...ACT, ...FC].map((h, i) =>
    `<i class="${i >= ACT.length ? 'f' : ''}" style="--h:${h}%;--i:${i}"></i>`).join('');
  const pts = BAL.map((b, i) => [(1.6 + (i + .5) * (100 - 3.2) / 12) * 1.2, 100 - b]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2;
    d += ` C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`;
  }
  document.getElementById('balLine').setAttribute('d', d);
  document.querySelector('.chart__today').style.setProperty('--x', (1.6 + 6.5 * (100 - 3.2) / 12) + '%');

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
    if (dashIn || GS) return; dashIn = true;
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

    if (dash.getBoundingClientRect().top < vh * .7) playDash();

    const r = scrub.getBoundingClientRect();
    const sp = clamp((vh * .85 - r.top) / (r.height + vh * .35));
    const lit = Math.round(sp * words.length);
    words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

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

  /* ---------- GSAP ScrollTrigger scenes ---------- */
  if (GS) {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    // Industry marquee that speeds up with scroll velocity
    const marquee = gsap.to(gsap.utils.toArray('.strip__row'), { xPercent: -100, duration: 34, ease: 'none', repeat: -1 });
    ScrollTrigger.create({
      onUpdate: self => {
        const v = Math.min(Math.abs(self.getVelocity()) / 250, 6);
        gsap.to(marquee, { timeScale: 1 + v, duration: .2, overwrite: true });
        gsap.to(marquee, { timeScale: 1, duration: 1.2, delay: .25, overwrite: false });
      }
    });

    // Floating files: idle drift (independent of scroll)
    const docs = gsap.utils.toArray('.doc');
    docs.forEach(d => {
      const inn = d.querySelector('.doc__in');
      const r = parseFloat(d.style.getPropertyValue('--r')) || 0;
      gsap.set(inn, { rotation: r });
      gsap.to(inn, { y: gsap.utils.random(-16, 16), x: gsap.utils.random(-8, 8), rotation: r + gsap.utils.random(-4, 4),
        duration: gsap.utils.random(2.2, 3.8), ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });

    mm.add({ desk: '(min-width: 900px)', mob: '(max-width: 899px)' }, ctx => {
      const { desk } = ctx.conditions;

      /* 1. Hero: pinned, the MacBook rises, opens, then the dashboard builds itself */
      const bars = gsap.utils.toArray('.chart__bars i');
      const cash = document.querySelector('.cash strong'), days = document.querySelector('.gauge__n [data-count]');
      const num = { c: 0, d: 0 };
      gsap.set('#mbpLid', { rotationX: -84 });
      gsap.set(bars, { scaleY: 0 });
      gsap.set('#balLine', { clipPath: 'inset(0 100% 0 0)' });
      gsap.set('.chart__today, .alert', { autoAlpha: 0 });
      gsap.set('.alert', { y: 12 });
      gsap.set('#gaugeVal', { strokeDasharray: `0 ${GL}` });
      gsap.set('.br i', { '--p': 0 });
      const paintNums = () => { cash.textContent = '$' + Math.round(num.c).toLocaleString('en-US'); days.textContent = Math.round(num.d); };
      paintNums();
      const mbpEl = document.getElementById('mbp'), wrapEl = document.getElementById('dashWrap');
      const endScale = desk ? .9 : 1, startScale = desk ? .74 : .92;
      // start with the closed laptop's hinge just below the buttons, in the first screen
      const peek = () => {
        const h = mbpEl.offsetHeight, hinge = wrapEl.offsetTop + h * (1 + startScale) / 2;
        return Math.min(0, innerHeight * (desk ? .9 : .94) - hinge);
      };
      // move the laptop so it ends centred in the viewport (scale is applied from its centre)
      const lift = () => {
        const h = mbpEl.offsetHeight, target = Math.max(76, (innerHeight - h * endScale) / 2 + 24);
        return target - wrapEl.offsetTop - h * (1 - endScale) / 2;
      };
      gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: desk ? '+=170%' : '+=130%', pin: true, scrub: .7, anticipatePin: 1, invalidateOnRefresh: true } })
        .to('.hero__copy', { yPercent: -25, autoAlpha: 0, duration: .55, ease: 'power1.in' }, 0)
        .fromTo('#mbp', { y: peek, scale: startScale }, { y: lift, scale: endScale, duration: .8, ease: 'power2.out' }, 0)
        .to('#mbpLid', { rotationX: 0, duration: .9, ease: 'power2.inOut' }, .2)
        .to(bars, { scaleY: 1, duration: .45, stagger: .04, ease: 'power2.out' }, 1.05)
        .to(num, { c: 1214800, d: 39, duration: .9, ease: 'power1.out', onUpdate: paintNums }, 1.05)
        .to('#gaugeVal', { strokeDasharray: `${GL * 39 / 60} ${GL}`, duration: .8, ease: 'power2.out' }, 1.1)
        .to('#balLine', { clipPath: 'inset(0 0% 0 0)', duration: .8, ease: 'none' }, 1.25)
        .to('.chart__today', { autoAlpha: 1, duration: .2 }, 1.55)
        .to('.br i', { '--p': 1, duration: .5, stagger: .08, ease: 'power2.out' }, 1.3)
        .to('.alert', { autoAlpha: 1, y: 0, duration: .3, stagger: .15 }, 1.6)
        .to({}, { duration: .35 });
      gsap.to('.sky__grid', { yPercent: 20, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });

      /* 2. Feature cards fan in */
      gsap.fromTo('.fcard', { y: i => 90 + i * 30, rotation: i => (i - 1.5) * (desk ? 3 : 0) },
        { y: 0, rotation: 0, ease: 'none', scrollTrigger: { trigger: '.fgrid', start: 'top 95%', end: 'top 45%', scrub: .6 } });

      /* 3. Floating files: flags flip to fixed, files fly into MTK, a clean ledger comes out */
      const stage = document.getElementById('chaosStage');
      const toX = d => stage.clientWidth / 2 - (d.offsetLeft + d.offsetWidth * (desk ? 1 : .62) / 2);
      const toY = d => stage.clientHeight / 2 - (d.offsetTop + d.offsetHeight * (desk ? 1 : .62) / 2);
      const core = { n: 0 }, coreN = document.getElementById('coreN');
      gsap.set('#res', { autoAlpha: 0, y: 40, scale: .9 });
      gsap.set('#res p', { autoAlpha: 0, x: -14 });
      gsap.set('.doc__flag .v', { yPercent: 100, autoAlpha: 0 });
      const ctl = gsap.timeline({ scrollTrigger: { trigger: '#chaos', start: 'top top', end: desk ? '+=230%' : '+=200%', pin: true, scrub: .8, anticipatePin: 1, invalidateOnRefresh: true } });
      docs.forEach((d, i) => {
        const at = .15 + i * .11, flag = d.querySelector('.doc__flag');
        ctl.to(flag.querySelector('.x'), { yPercent: -100, autoAlpha: 0, duration: .25 }, at)
           .to(flag.querySelector('.v'), { yPercent: 0, autoAlpha: 1, duration: .25 }, at)
           .to(flag, { backgroundColor: '#7fd3a6', color: '#0c0c0e', boxShadow: '0 6px 16px -6px rgba(127,211,166,.7)', duration: .25 }, at)
           .to(d.querySelectorAll('.err'), { backgroundColor: '#dcf5e6', color: '#166534', boxShadow: 'inset 0 0 0 1.5px #22c55e', duration: .25 }, at);
      });
      ctl.to(docs, { x: (i, d) => toX(d), y: (i, d) => toY(d), scale: .12, autoAlpha: 0, duration: 1, ease: 'power3.in', stagger: .08 }, 1.5)
         .to(core, { n: 10, duration: 1.6, ease: 'none', onUpdate: () => { coreN.textContent = Math.round(core.n); } }, 1.5)
         .fromTo('.core__tile', { scale: 1 }, { scale: 1.14, duration: .2, ease: 'power1.inOut', yoyo: true, repeat: 7 }, 1.6)
         .to('#core', { scale: .5, autoAlpha: 0, duration: .4 }, 3.3)
         .to('#res', { autoAlpha: 1, y: 0, scale: 1, duration: .5, ease: 'back.out(1.4)' }, 3.4)
         .to('#res p', { autoAlpha: 1, x: 0, duration: .25, stagger: .12 }, 3.6)
         .to({}, { duration: .5 });

      /* 4. How it works: pinned on laptops, per-card on phones */
      if (desk) {
        gsap.timeline({ scrollTrigger: { trigger: '#how', start: 'bottom bottom', end: '+=110%', pin: true, scrub: .6 } })
          .fromTo('.step', { yPercent: 70, opacity: 0, scale: .9 }, { yPercent: 0, opacity: 1, scale: 1, stagger: .45, ease: 'power2.out' });
      } else {
        gsap.utils.toArray('.step').forEach(el => gsap.fromTo(el, { scale: .86, y: 60 }, { scale: 1, y: 0, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 98%', end: 'top 55%', scrub: .5 } }));
      }

      /* 5. Panels expand from an inset card to the full section */
      const inset = desk ? 'inset(8% 12% 8% 12% round 56px)' : 'inset(4% 5% 4% 5% round 36px)';
      gsap.utils.toArray('.explorer__panels, .fx').forEach(el => {
        gsap.fromTo(el, { clipPath: inset }, { clipPath: 'inset(0% 0% 0% 0% round 28px)', ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 30%', scrub: .5 } });
      });

      /* 6. Devices assemble */
      gsap.timeline({ scrollTrigger: { trigger: '.devices', start: 'top 95%', end: 'top 30%', scrub: .6 } })
        .fromTo('.mac', { scale: .82, y: 40 }, { scale: 1, y: 0, ease: 'none' }, 0)
        .fromTo('.ipad', { xPercent: -70, rotation: -8 }, { xPercent: 0, rotation: 0, ease: 'none' }, 0)
        .fromTo('.phone', { xPercent: 90, rotation: 8 }, { xPercent: 0, rotation: 0, ease: 'none' }, 0);

      /* 7. Closing CTA expands, its content rises in */
      gsap.fromTo('.cta', { clipPath: desk ? 'inset(0% 14% 0% 14% round 64px)' : 'inset(0% 4% 0% 4% round 36px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 28px)', ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top 95%', end: 'top 25%', scrub: .5 } });
      gsap.fromTo('.cta__in > *', { y: 60, opacity: 0 }, { y: 0, opacity: 1, stagger: .08, ease: 'power3.out', duration: 1,
        scrollTrigger: { trigger: '.cta', start: 'top 60%' } });

      /* 8. Headings lift as they pass, footer wordmark grows */
      gsap.utils.toArray('.section__head h2, .faq-h').forEach(h => gsap.fromTo(h, { y: 50 }, { y: 0, ease: 'none',
        scrollTrigger: { trigger: h, start: 'top 100%', end: 'top 55%', scrub: .5 } }));
      gsap.fromTo('.footer__word', { yPercent: 40, scale: .8, opacity: .2 }, { yPercent: 0, scale: 1, opacity: 1, ease: 'none',
        scrollTrigger: { trigger: '.footer', start: 'top 80%', end: 'bottom bottom', scrub: .6 } });
    });

    document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
    document.addEventListener('langchange', () => ScrollTrigger.refresh());
  }
})();
