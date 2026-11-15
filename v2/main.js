// Kievits Webdesign v2 (style B). Content works without this file; everything here is extra.
(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

  // ---------- header + floating WhatsApp ----------
  const header = document.querySelector('.site-header');
  const wa = document.querySelector('.wa-float');
  const hero = document.getElementById('hero');
  const rig = document.getElementById('rig');
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      header && header.classList.toggle('scrolled', scrollY > 10);
      // the hero phone tips back a little as you scroll away from it
      if (rig && !reduced) {
        const f = Math.min(1, scrollY / innerHeight);
        rig.style.setProperty('--sy', (f * 14).toFixed(2) + 'deg');
        rig.style.setProperty('--ty', (f * -40).toFixed(1) + 'px');
      }
    });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const contact = document.getElementById('preview');
  if (wa && contact && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => wa.classList.toggle('hide', e.isIntersecting), { threshold: .15 }).observe(contact);
  }

  // ---------- hero: the phone cycles through example sites with a gold sweep ----------
  if (hero) {
    const slides = [...hero.querySelectorAll('.slide')];
    const label = document.getElementById('showing');
    let cur = 0, z = 1, timer = 0, visible = true;
    setTimeout(() => hero.classList.add('is-new'), reduced ? 0 : 900);   // floating labels come in
    const ready = img => (img.complete && img.naturalWidth ? Promise.resolve() : img.decode ? img.decode().catch(() => {}) : new Promise(ok => { img.onload = ok; }));
    const next = () => {
      const n = (cur + 1) % slides.length, s = slides[n], img = s.querySelector('img');
      img.loading = 'eager';
      ready(img).then(() => {
        // put the next slide back at the start without animating, on top of the rest, then sweep it in
        s.classList.add('instant'); s.classList.remove('on'); void s.offsetWidth; s.classList.remove('instant');
        s.style.zIndex = ++z;
        requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add('on')));
        if (label) { label.classList.add('swap'); setTimeout(() => { label.textContent = s.dataset.name; label.classList.remove('swap'); }, 450); }
        cur = n;
        schedule();
      });
    };
    const schedule = () => { clearTimeout(timer); if (visible && !document.hidden) timer = setTimeout(next, 3800); };
    if (!reduced && slides.length > 1) {
      if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? schedule() : clearTimeout(timer); }, { threshold: .2 }).observe(hero.querySelector('.phone3'));
      document.addEventListener('visibilitychange', () => (document.hidden ? clearTimeout(timer) : schedule()));
      schedule();
    }
    if (fine && !reduced) {
      addEventListener('pointermove', e => {
        const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
        rig.style.setProperty('--ry', (-16 + x * 22).toFixed(1) + 'deg'); rig.style.setProperty('--rx', (6 - y * 10).toFixed(1) + 'deg');
      }, { passive: true });
    }
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
        steps.forEach(s => s.classList.toggle('is-on', s === e.target));
        device.dataset.active = e.target.dataset.step;
      }
    }, { rootMargin: innerWidth < 900 ? '-46% 0px -44% 0px' : '-45% 0px -50% 0px' });
    steps.forEach(s => io.observe(s));
  }

  // ---------- examples: coverflow tilt while you swipe, centre phone scrolls its site ----------
  const track = document.getElementById('ex-track');
  if (track) {
    const cards = [...track.querySelectorAll('.ex')];
    const dots = [...document.querySelectorAll('.ex-dots i')];
    let queued = false, current = -1;
    const setEnds = () => cards.forEach(c => {
      const img = c.querySelector('img'), scr = c.querySelector('.ex-screen');
      const end = Math.min(0, scr.clientHeight - img.clientHeight);
      img.style.setProperty('--end', end + 'px');
    });
    const update = () => {
      queued = false;
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0, bestD = Infinity;
      cards.forEach((c, i) => {
        const step = c.offsetWidth + 24;
        const o = Math.max(-2, Math.min(2, (c.offsetLeft + c.offsetWidth / 2 - mid) / step));
        if (!reduced) {
          c.style.transform = `perspective(1100px) rotateY(${(-o * 16).toFixed(2)}deg) scale(${(1 - Math.min(Math.abs(o), 1) * .1).toFixed(3)})`;
          c.style.opacity = String(1 - Math.min(Math.abs(o), 1.5) * .35);
        }
        if (Math.abs(o) < bestD) { bestD = Math.abs(o); best = i; }
      });
      if (best !== current) {
        current = best;
        cards.forEach((c, i) => c.classList.toggle('is-center', i === best));
        dots.forEach((d, i) => d.classList.toggle('on', i === best));
      }
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    track.addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', () => { setEnds(); queue(); });
    cards.forEach(c => { const img = c.querySelector('img'); img.complete ? setEnds() : img.addEventListener('load', setEnds); });
    document.querySelectorAll('.ex-btn').forEach(b => b.addEventListener('click', () => {
      const i = Math.max(0, Math.min(cards.length - 1, current + Number(b.dataset.dir)));
      track.scrollTo({ left: cards[i].offsetLeft + cards[i].offsetWidth / 2 - track.clientWidth / 2, behavior: reduced ? 'auto' : 'smooth' });
    }));
    track.setAttribute('data-lenis-prevent', '');
    update();
  }

  // ---------- horeca: paper menu becomes the online menu ----------
  const swap = document.getElementById('swap');
  if (swap && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); swap.classList.add('play'); } }, { threshold: .5 }).observe(swap);
    const again = document.getElementById('swap-again');
    if (again) again.addEventListener('click', () => {
      swap.classList.add('reset'); swap.classList.remove('play'); void swap.offsetWidth;   // jump back without animating
      swap.classList.remove('reset');
      requestAnimationFrame(() => requestAnimationFrame(() => swap.classList.add('play')));
    });
  }

  // ---------- menu card: a cover that opens once it is in view ----------
  const card = document.querySelector('.menu-card');
  let coverDelay = 0;
  if (card && !reduced && 'IntersectionObserver' in window && card.getBoundingClientRect().top > innerHeight * .6) {
    const title = (card.querySelector('h2') || {}).textContent || 'De kaart';
    const cover = document.createElement('div');
    cover.className = 'card-cover'; cover.setAttribute('aria-hidden', 'true');
    cover.innerHTML = `<div class="cc-in"><svg width="54" height="54" viewBox="0 0 30 30"><circle cx="15" cy="15" r="14" fill="#e3b448"/><path d="M7 17c3-4 5-4 8 0s5 4 8 0" fill="none" stroke="#1e2b24" stroke-width="2.4" stroke-linecap="round"/></svg><b>${title}</b><small>Kievits Webdesign</small></div>`;
    card.append(cover);
    coverDelay = 1.1;
    const open = () => { card.classList.add('open'); setTimeout(() => cover.remove(), 2200); };
    cover.addEventListener('click', open);
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); setTimeout(open, 350); } }, { threshold: .4 }).observe(card);
  }

  // ---------- menu card: prices roll in like an old counter ----------
  if (card && !reduced && 'IntersectionObserver' in window) {
    const strips = [];
    card.querySelectorAll('.dish .p').forEach(p => {
      const node = [...p.childNodes].reverse().find(n => n.nodeType === 3 && n.textContent.trim());
      if (!node) return;
      const txt = node.textContent.trim();
      const wrap = document.createElement('span'); wrap.className = 'price-roll'; wrap.setAttribute('aria-label', txt);
      [...txt].forEach((ch, i) => {
        if (!/\d/.test(ch)) { const s = document.createElement('span'); s.textContent = ch; s.setAttribute('aria-hidden', 'true'); wrap.append(s); return; }
        const roll = document.createElement('span'); roll.className = 'roll'; roll.setAttribute('aria-hidden', 'true');
        const strip = document.createElement('span'); strip.className = 'strip';
        const to = 10 * (1 + i) + Number(ch);
        for (let n = 0; n <= to; n++) { const d = document.createElement('span'); d.textContent = n % 10; strip.append(d); }
        strip.dataset.to = to; roll.append(strip); wrap.append(roll); strips.push(strip);
      });
      node.replaceWith(wrap);
    });
    new IntersectionObserver(([e], o) => {
      if (!e.isIntersecting) return; o.disconnect();
      card.classList.add('counted');
      strips.forEach((s, i) => { s.style.transitionDelay = (coverDelay + .2 + i * .06) + 's'; s.style.transform = `translateY(${-s.dataset.to * 1.15}em)`; });
    }, { threshold: .45 }).observe(card);
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

  // ---------- libraries, after the page is ready ----------
  const idle = fn => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 300));
  const afterLoad = fn => (document.readyState === 'complete' ? idle(fn) : addEventListener('load', () => idle(fn), { once: true }));
  const script = src => new Promise((ok, err) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = err; document.head.append(s); });

  afterLoad(() => {
    if (reduced) return;
    const libs = [script('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js')
      .then(() => script('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js'))];
    if (fine) libs.push(script('https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js').catch(() => {}));
    Promise.all(libs).then(motion).catch(() => {});
  });

  function motion() {
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);

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

    document.querySelectorAll('h2.big').forEach(h => {
      if (!below(h)) return;
      h.innerHTML = h.textContent.trim().split(/\s+/).map(w => `<span class="w"><span>${w}</span></span>`).join(' ');
      h.classList.add('words');
      const parts = h.querySelectorAll('.w > span');
      gsap.set(parts, { yPercent: 110 });
      ScrollTrigger.create({ trigger: h, start: 'top 88%', once: true,
        onEnter: () => gsap.to(parts, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: .05 }) });
    });

    const items = [...document.querySelectorAll('[data-reveal]')].filter(below)
      .filter(el => !el.matches('.menu-card'))
      .filter(el => !el.matches('.section-head') || !el.querySelector('h2.words'));
    document.querySelectorAll('.section-head[data-reveal]').forEach(hd => { if (hd.querySelector('h2.words')) { const p = hd.querySelector('.lead'); if (p && below(p)) items.push(p); } });
    gsap.set(items, { opacity: 0, y: 24 });
    ScrollTrigger.batch(items, {
      start: 'top 90%', once: true,
      onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .08, overwrite: true }),
    });

    // the big name at the bottom rises out of the floor
    const mark = document.querySelector('.wordmark span');
    if (mark) gsap.fromTo(mark, { yPercent: 70 }, { yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: '.wordmark', start: 'top 100%', end: 'bottom 100%', scrub: .6 } });
  }
})();
