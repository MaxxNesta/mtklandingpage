(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  document.getElementById('yr').textContent = new Date().getFullYear();

  /* ---------- Halftone monogram ---------- */
  // Inlined so the canvas stays readable (untainted) even when opened from file://
  const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="30 25 255 250"><defs><mask id="m"><rect width="320" height="300" fill="white"/><polygon points="208.79,190.50 201.00,195.00 193.21,190.50 193.21,181.50 201.00,177.00 208.79,181.50" fill="black"/></mask></defs><g fill="#0b4737"><path d="M49 45H71L147 121 127 141 77 91V254H49Z"/><path d="M93 129 121 157 244 45H267V254H239V91L140 177 219 254H179L121 198V254H93Z"/></g><g fill="#ffdb54"><g mask="url(#m)"><circle cx="201" cy="186" r="15"/><polygon points="201.00,160.00 204.06,167.79 212.41,168.29 205.95,173.61 208.05,181.71 201.00,177.20 193.95,181.71 196.05,173.61 189.59,168.29 197.94,167.79"/><polygon points="223.52,173.00 218.30,179.54 222.04,187.03 214.21,184.09 208.24,189.96 208.62,181.60 201.19,177.75 209.26,175.52 210.63,167.26 215.24,174.25"/><polygon points="223.52,199.00 215.24,197.75 210.63,204.74 209.26,196.48 201.19,194.25 208.62,190.40 208.24,182.04 214.21,187.91 222.04,184.97 218.30,192.46"/><polygon points="201.00,212.00 197.94,204.21 189.59,203.71 196.05,198.39 193.95,190.29 201.00,194.80 208.05,190.29 205.95,198.39 212.41,203.71 204.06,204.21"/><polygon points="178.48,199.00 183.70,192.46 179.96,184.97 187.79,187.91 193.76,182.04 193.38,190.40 200.81,194.25 192.74,196.48 191.37,204.74 186.76,197.75"/><polygon points="178.48,173.00 186.76,174.25 191.37,167.26 192.74,175.52 200.81,177.75 193.38,181.60 193.76,189.96 187.79,184.09 179.96,187.03 183.70,179.54"/></g><polygon points="201.00,149.00 202.75,152.97 207.06,152.50 204.50,156.00 207.06,159.50 202.75,159.03 201.00,163.00 199.25,159.03 194.94,159.50 197.50,156.00 194.94,152.50 199.25,152.97"/><polygon points="226.98,164.00 228.73,167.97 233.04,167.50 230.48,171.00 233.04,174.50 228.73,174.03 226.98,178.00 225.23,174.03 220.92,174.50 223.48,171.00 220.92,167.50 225.23,167.97"/><polygon points="226.98,194.00 228.73,197.97 233.04,197.50 230.48,201.00 233.04,204.50 228.73,204.03 226.98,208.00 225.23,204.03 220.92,204.50 223.48,201.00 220.92,197.50 225.23,197.97"/><polygon points="201.00,209.00 202.75,212.97 207.06,212.50 204.50,216.00 207.06,219.50 202.75,219.03 201.00,223.00 199.25,219.03 194.94,219.50 197.50,216.00 194.94,212.50 199.25,212.97"/><polygon points="175.02,194.00 176.77,197.97 181.08,197.50 178.52,201.00 181.08,204.50 176.77,204.03 175.02,208.00 173.27,204.03 168.96,204.50 171.52,201.00 168.96,197.50 173.27,197.97"/><polygon points="175.02,164.00 176.77,167.97 181.08,167.50 178.52,171.00 181.08,174.50 176.77,174.03 175.02,178.00 173.27,174.03 168.96,174.50 171.52,171.00 168.96,167.50 173.27,167.97"/><polygon points="201.00,180.50 202.38,184.10 206.23,184.30 203.23,186.73 204.23,190.45 201.00,188.35 197.77,190.45 198.77,186.73 195.77,184.30 199.62,184.10"/></g></svg>`;

  const cv = document.getElementById('halftone');
  const ctx = cv.getContext('2d');
  const hero = document.querySelector('.hero');
  const img = new Image();
  let dots = [], W = 0, H = 0, dpr = 1, start = 0, running = false, visible = true;
  const mouse = { x: -1e4, y: -1e4 };

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    if (!W || !H) return;
    cv.width = W * dpr; cv.height = H * dpr;

    const small = W < 560;
    const step = small ? 7 : 9;
    const S = Math.min(W * (small ? .78 : .6), H * .78);
    const lx = small ? (W - S) / 2 : W * .04;
    const ly = small ? 30 : (H - S) / 2 - H * .02;

    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const o = off.getContext('2d', { willReadFrequently: true });
    o.drawImage(img, lx, ly, S, S * (250 / 255));
    let data;
    try { data = o.getImageData(0, 0, W, H).data; } catch (e) { data = null; }

    const cx = lx + S / 2, cy = ly + S / 2;
    dots = [];
    for (let y = step / 2; y < H; y += step) {
      for (let x = step / 2; x < W; x += step) {
        const i = ((y | 0) * W + (x | 0)) * 4;
        const a = data ? data[i + 3] : 0;
        const d = Math.hypot(x - cx, y - cy);
        if (a > 30) {
          const yellow = data[i] > 170;
          const shade = .62 + .38 * Math.random();
          dots.push({ x, y, ox: 0, oy: 0, r: step * .47 * (a / 255) * shade, c: yellow ? 1 : 0, d });
        } else {
          const fall = 1 - clamp(d / (S * .9));
          if (fall > 0 && Math.random() < fall * .9) {
            dots.push({ x, y, ox: 0, oy: 0, r: step * (.08 + .12 * fall * Math.random()), c: 2, d });
          }
        }
      }
    }
    if (!data) {
      // Fallback: draw the logo itself if pixel reads are blocked
      dots = [];
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(img, lx, ly, S, S * (250 / 255));
    }
  }

  const COLORS = ['#cfe9d8', '#ffdb54', 'rgba(185,226,201,.28)'];
  function frame(t) {
    if (!start) start = t;
    const el = t - start;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const R = W < 560 ? 70 : 110;
    const paths = [new Path2D(), new Path2D(), new Path2D()];
    for (const p of dots) {
      let tx = 0, ty = 0;
      const dx = p.x - mouse.x, dy = p.y - mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < R && dist > .01) {
        const f = (1 - dist / R) ** 2 * 30;
        tx = dx / dist * f; ty = dy / dist * f;
      }
      p.ox += (tx - p.ox) * .12;
      p.oy += (ty - p.oy) * .12;
      const intro = reduce ? 1 : clamp((el - p.d * 2.2) / 700);
      const wave = reduce ? 1 : 1 + .14 * Math.sin(el / 650 - (p.x + p.y) / 70);
      const r = p.r * intro * wave;
      if (r < .2) continue;
      const x = p.x + p.ox, y = p.y + p.oy;
      paths[p.c].moveTo(x + r, y);
      paths[p.c].arc(x, y, r, 0, Math.PI * 2);
    }
    for (let c = 2; c >= 0; c--) { ctx.fillStyle = COLORS[c]; ctx.fill(paths[c]); }
    if (running && visible) requestAnimationFrame(frame); else running = false;
  }
  function kick() { if (!running && dots.length) { running = true; requestAnimationFrame(frame); } }

  img.onload = () => { build(); kick(); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(LOGO);

  hero.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e4; });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }).observe(cv);
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (img.complete) { build(); kick(); } }, 150); });

  /* ---------- Notched stage shape ---------- */
  const stage = document.getElementById('stage');
  const stagePath = document.getElementById('stagePath');
  function roundedPoly(pts, R) {
    let d = '';
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[(i - 1 + n) % n], v = pts[i], q = pts[(i + 1) % n];
      const l1 = Math.hypot(p[0] - v[0], p[1] - v[1]), l2 = Math.hypot(q[0] - v[0], q[1] - v[1]);
      const r = Math.min(R, l1 / 2, l2 / 2);
      const a = [v[0] + (p[0] - v[0]) / l1 * r, v[1] + (p[1] - v[1]) / l1 * r];
      const b = [v[0] + (q[0] - v[0]) / l2 * r, v[1] + (q[1] - v[1]) / l2 * r];
      d += (i ? 'L' : 'M') + a[0] + ' ' + a[1] + 'Q' + v[0] + ' ' + v[1] + ' ' + b[0] + ' ' + b[1];
    }
    return d + 'Z';
  }
  function shapeStage() {
    const w = stage.clientWidth, h = stage.clientHeight;
    const mobile = w < 700;
    const t = mobile ? 74 : 96, tw = mobile ? 150 : Math.min(380, w * .34);
    const pts = [[0, t], [w - tw, t], [w - tw, 0], [w, 0], [w, h]];
    if (!mobile) { const lw = 56, lb = 180; pts.push([lw, h], [lw, h - lb], [0, h - lb]); }
    else pts.push([0, h]);
    const d = roundedPoly(pts, mobile ? 22 : 32);
    stagePath.setAttribute('d', d);
    document.getElementById('stageEdgePath').setAttribute('d', d);
  }
  new ResizeObserver(shapeStage).observe(stage);

  /* ---------- Scroll-driven bits ---------- */
  const app = document.getElementById('app');
  const floatnav = document.getElementById('floatnav');
  const scrub = document.getElementById('scrub');
  const keys = new Set(['MTK']);
  scrub.innerHTML = scrub.textContent.trim().split(/\s+/)
    .map(w => `<span class="w${keys.has(w) ? ' is-key' : ''}">${w}</span>`).join(' ');
  const words = [...scrub.querySelectorAll('.w')];

  let ticking = false;
  function onScroll() {
    ticking = false;
    const vh = innerHeight;
    floatnav.classList.toggle('is-on', scrollY > hero.offsetHeight - 80);

    const sr = stage.getBoundingClientRect();
    const p = reduce ? 1 : clamp(1 - (sr.top - vh * .12) / (vh * .7));
    app.style.setProperty('--tilt', (18 * (1 - p)).toFixed(2) + 'deg');
    app.style.setProperty('--lift', (40 * (1 - p)).toFixed(1) + 'px');
    if (sr.top < vh * .55) app.classList.add('is-in');

    const r = scrub.getBoundingClientRect();
    const sp = clamp((vh * .85 - r.top) / (r.height + vh * .35));
    const lit = Math.round(sp * words.length);
    words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Contour waves ---------- */
  document.querySelectorAll('svg[data-waves]').forEach(svg => {
    const n = +svg.dataset.waves, W = 1600, H = 900;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    let out = '';
    for (let k = 0; k < n; k++) {
      const base = H * (.38 + k * .065), amp = 40 + k * 9, ph = k * .55;
      let d = `M-100 ${base}`;
      for (let x = -100; x <= W + 100; x += 50) {
        const y = base + Math.sin(x / 260 + ph) * amp + Math.sin(x / 113 + ph * 2) * amp * .25;
        d += ` L${x} ${y.toFixed(1)}`;
      }
      out += `<path d="${d}" style="--i:${k}"/>`;
    }
    svg.innerHTML = out;
  });

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

  /* ---------- Month-end calendar ---------- */
  const cal = document.getElementById('cal');
  cal.innerHTML = Array.from({ length: 14 }, (_, i) => `<i>${i + 1}</i>`).join('');
  const days = [...cal.children];
  const segBtns = [...document.querySelectorAll('#closecal .seg button')];
  const thumb = document.querySelector('#closecal .seg__thumb');
  function setClose(idx) {
    const n = +segBtns[idx].dataset.days;
    segBtns.forEach((b, i) => b.setAttribute('aria-pressed', i === idx));
    thumb.style.transform = `translateX(${idx * 100}%)`;
    document.getElementById('calN').textContent = n;
    days.forEach((d, i) => {
      d.style.transitionDelay = reduce ? '0ms' : (i * 35) + 'ms';
      d.classList.toggle('on', i < n);
    });
  }
  segBtns.forEach((b, i) => b.addEventListener('click', () => setClose(i)));
  setClose(0);

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
  const LABEL = { e: 'Edit', v: 'View', '': 'Hidden' };
  const NEXT = { e: 'v', v: '', '': 'e' };
  const cols = [...document.querySelectorAll('#matrix thead th')].map(th => th.textContent);
  const log = document.getElementById('log');
  document.querySelectorAll('#matrix tbody td[data-v]').forEach(td => {
    const role = td.parentElement.dataset.role, mod = cols[td.cellIndex];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = '<i></i>';
    const paint = () => {
      const v = td.dataset.v;
      btn.firstChild.className = v;
      btn.setAttribute('aria-label', `${role}, ${mod}: ${LABEL[v]}`);
    };
    if (role === 'Owner') { btn.disabled = true; btn.title = 'Owners always have full access'; }
    btn.addEventListener('click', () => {
      td.dataset.v = NEXT[td.dataset.v];
      paint();
      btn.classList.add('pop'); setTimeout(() => btn.classList.remove('pop'), 250);
      const p = document.createElement('p');
      p.innerHTML = `<time>${hhmm()}</time>`;
      p.append(`You set ${role} to ${LABEL[td.dataset.v]} on ${mod}`);
      log.prepend(p);
      while (log.children.length > 3) log.lastElementChild.remove();
    });
    paint();
    td.append(btn);
  });

  /* ---------- Reveals ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: .18, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();
