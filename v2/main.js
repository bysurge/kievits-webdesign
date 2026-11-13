// Kievits Webdesign v2. Content works without this file; everything here is extra and loads late.
(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

  // ---------- header + floating WhatsApp ----------
  const header = document.querySelector('.site-header');
  const wa = document.querySelector('.wa-float');
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { ticking = false; header && header.classList.toggle('scrolled', scrollY > 10); });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const contact = document.getElementById('preview');
  if (wa && contact && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => wa.classList.toggle('hide', e.isIntersecting), { threshold: .15 }).observe(contact);
  }

  // ---------- before/after slider (horeca) ----------
  document.querySelectorAll('.screen').forEach(screen => {
    const range = screen.querySelector('input[type=range]');
    if (range) range.addEventListener('input', () => screen.style.setProperty('--split', range.value + '%'));
  });

  // ---------- story: the phone follows the step you are reading ----------
  const device = document.querySelector('.device');
  const steps = [...document.querySelectorAll('.story-step')];
  if (device && steps.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const i = e.target.dataset.step;
        steps.forEach(s => s.classList.toggle('is-on', s === e.target));
        device.dataset.active = i;
      }
    }, { rootMargin: innerWidth < 900 ? '-46% 0px -44% 0px' : '-45% 0px -50% 0px' });
    steps.forEach(s => io.observe(s));
  }

  // ---------- pointer-only niceties ----------
  if (fine && !reduced) {
    document.querySelectorAll('[data-magnet]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * .22).toFixed(1) + 'px');
        el.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * .3).toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px'); });
    });
    document.querySelectorAll('.sector').forEach(el => el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--x', (e.clientX - r.left) + 'px'); el.style.setProperty('--y', (e.clientY - r.top) + 'px');
    }));
    const g = document.createElement('div'); g.className = 'grain'; g.setAttribute('aria-hidden', 'true'); document.body.append(g);
  }

  // ---------- decide: full 3D or light version ----------
  const params = new URLSearchParams(location.search);
  const conn = navigator.connection || {};
  function webgl() {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  }
  const lite = params.has('lite') || reduced || conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '') ||
    (navigator.deviceMemory && navigator.deviceMemory < 3) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) || !webgl();
  if (lite) root.classList.add('lite');

  const stage = document.getElementById('stage');
  function setMode3d(on) {
    const before = stage.offsetHeight, y = scrollY;
    root.classList.toggle('is-3d', on);
    const delta = stage.offsetHeight - before;
    if (y > 40 && delta) scrollTo(0, y + delta);
  }

  const idle = fn => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 300));
  const afterLoad = fn => (document.readyState === 'complete' ? idle(fn) : addEventListener('load', () => idle(fn), { once: true }));
  const script = src => new Promise((ok, err) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = err; document.head.append(s); });

  afterLoad(() => {
    if (!lite && stage) {
      const data = JSON.parse(document.getElementById('card-data').textContent);
      import('./card3d.js').then(m => m.start({
        stage, data,
        sticky: stage.querySelector('.stage-sticky'),
        slot: document.getElementById('card-slot'),
        copy: stage.querySelector('.hero-copy'),
        onReady: () => setMode3d(true),
        onFail: () => { setMode3d(false); root.classList.add('lite'); },
      })).catch(() => { setMode3d(false); root.classList.add('lite'); });
    }
    if (reduced) return;
    const libs = [script('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js')
      .then(() => script('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js'))];
    if (fine) libs.push(script('https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js').catch(() => {}));
    Promise.all(libs).then(motion).catch(() => {});
  });

  function motion() {
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);

    // Smooth scrolling with the mouse wheel only; touch keeps the phone's own scrolling.
    if (fine && window.Lenis) {
      const lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
        const id = a.getAttribute('href'); if (id.length < 2) return;
        const el = document.querySelector(id); if (!el) return;
        e.preventDefault(); lenis.scrollTo(el, { offset: -76 });
      }));
    }

    const below = el => el.getBoundingClientRect().top > innerHeight;

    // headings roll in word by word
    document.querySelectorAll('h2.big').forEach(h => {
      if (!below(h)) return;
      h.innerHTML = h.textContent.trim().split(/\s+/).map(w => `<span class="w"><span>${w}</span></span>`).join(' ');
      h.classList.add('words');
      const parts = h.querySelectorAll('.w > span');
      gsap.set(parts, { yPercent: 110 });
      ScrollTrigger.create({ trigger: h, start: 'top 88%', once: true,
        onEnter: () => gsap.to(parts, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: .05 }) });
    });

    // blocks fade up, only those still below the screen so nothing visible ever blinks
    const items = [...document.querySelectorAll('[data-reveal]')].filter(below).filter(el => !el.matches('.menu-card'))
      .filter(el => !el.matches('.section-head') || !el.querySelector('h2.words'));
    const heads = [...document.querySelectorAll('.section-head[data-reveal]')].filter(el => el.querySelector('h2.words'));
    heads.forEach(hd => { const p = hd.querySelector('.lead'); if (p) items.push(p); });
    gsap.set(items, { opacity: 0, y: 24 });
    ScrollTrigger.batch(items, {
      start: 'top 90%', once: true,
      onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .08, overwrite: true }),
    });

    // the menu card settles in with a slight tilt, like it is laid on the table
    const card = document.querySelector('.menu-card');
    if (card && below(card)) {
      gsap.fromTo(card, { rotateX: 14, y: 80, transformPerspective: 1200, transformOrigin: '50% 100%' },
        { rotateX: 0, y: 0, ease: 'none', scrollTrigger: { trigger: card, start: 'top 100%', end: 'top 45%', scrub: .8 } });
    }
  }
})();
