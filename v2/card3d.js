// The one "Igloo moment": a 3D menu card that turns and opens while you scroll.
// Loaded only on capable devices, after the page content is already on screen.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

const W = 1, H = 1.414, T = 0.012;           // page size in world units (A5-ish)
const TEX_W = 1024, TEX_H = 1448;
const C = { board: '#1e2b24', board2: '#2a3b31', chalk: '#f1efe6', dim: '#a3ab9f', mustard: '#e3b448',
  linen: '#f3efe4', rule: '#d4ccb8', wine: '#7a2833', ink: '#1e2b24', ink2: '#555e55', grey: '#8f897a' };
const SERIF = '"Young Serif", Georgia, serif';
const SANS = '"Schibsted Grotesk", system-ui, sans-serif';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outCubic = t => 1 - Math.pow(1 - t, 3);
const outBack = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const phase = (p, from, len) => ease(clamp((p - from) / len));

// ---------- textures, drawn in code ----------
function canvas2d(w = TEX_W, h = TEX_H) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function wrap(ctx, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); line = w; y += lh; } else line = test;
  }
  ctx.fillText(line, x, y); return y + lh;
}
function logo(ctx, cx, cy, r) {
  ctx.fillStyle = C.mustard; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  const k = r / 14; ctx.save(); ctx.translate(cx - 15 * k, cy - 15 * k); ctx.scale(k, k);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(7, 17); ctx.bezierCurveTo(10, 13, 12, 13, 15, 17); ctx.bezierCurveTo(18, 21, 20, 21, 23, 17); ctx.stroke();
  ctx.restore();
}
function grain(ctx, alpha) {
  // fine paper fibre, drawn once
  const n = 9000;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = Math.random() > .5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.fillRect(Math.random() * TEX_W, Math.random() * TEX_H, 1.6, 1.6);
  }
}
function paper(ctx, spine) {
  const g = ctx.createRadialGradient(TEX_W / 2, 0, 50, TEX_W / 2, TEX_H * .3, TEX_H);
  g.addColorStop(0, '#faf7ef'); g.addColorStop(1, '#ebe5d6');
  ctx.fillStyle = g; ctx.fillRect(0, 0, TEX_W, TEX_H);
  grain(ctx, .035);
  const x0 = spine === 'right' ? TEX_W : 0, x1 = spine === 'right' ? TEX_W - 120 : 120;
  const s = ctx.createLinearGradient(x0, 0, x1, 0);
  s.addColorStop(0, 'rgba(60,45,20,.16)'); s.addColorStop(1, 'rgba(60,45,20,0)');
  ctx.fillStyle = s; ctx.fillRect(0, 0, TEX_W, TEX_H);
  ctx.strokeStyle = C.rule; ctx.lineWidth = 2; ctx.strokeRect(44, 44, TEX_W - 88, TEX_H - 88);
}
function course(ctx, c, y) {
  const L = 110, R = TEX_W - 110;
  ctx.textAlign = 'left'; ctx.fillStyle = C.wine; ctx.font = `700 27px ${SANS}`; ctx.fillText(c.h, L, y);
  ctx.fillStyle = C.rule; ctx.fillRect(L, y + 18, R - L, 2);
  y += 92;
  ctx.font = `52px ${SERIF}`; ctx.fillStyle = C.ink; ctx.fillText(c.dish, L, y);
  const dishEnd = L + ctx.measureText(c.dish).width + 16;
  ctx.textAlign = 'right'; ctx.fillText(c.price, R, y);
  let priceStart = R - ctx.measureText(c.price).width - 16;
  if (c.old) {
    ctx.font = `34px ${SERIF}`; ctx.fillStyle = C.grey;
    const ow = ctx.measureText(c.old).width; ctx.fillText(c.old, priceStart, y);
    ctx.fillRect(priceStart - ow, y - 10, ow, 2.5); priceStart -= ow + 16;
  }
  ctx.fillStyle = '#a69f8b';
  for (let x = dishEnd; x < priceStart; x += 13) { ctx.beginPath(); ctx.arc(x, y - 6, 2.4, 0, Math.PI * 2); ctx.fill(); }
  ctx.textAlign = 'left'; ctx.font = `33px ${SANS}`; ctx.fillStyle = C.ink2;
  return wrap(ctx, c.desc, L, y + 64, R - L, 46) + 80;
}
function coverTex(d) {
  const [c, ctx] = canvas2d();
  const g = ctx.createRadialGradient(TEX_W * .3, TEX_H * .2, 50, TEX_W * .5, TEX_H * .5, TEX_H * .9);
  g.addColorStop(0, C.board2); g.addColorStop(1, '#17221c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, TEX_W, TEX_H);
  grain(ctx, .03);
  ctx.strokeStyle = 'rgba(241,239,230,.38)'; ctx.lineWidth = 2.5; ctx.strokeRect(52, 52, TEX_W - 104, TEX_H - 104);
  ctx.strokeStyle = 'rgba(241,239,230,.14)'; ctx.lineWidth = 2; ctx.strokeRect(70, 70, TEX_W - 140, TEX_H - 140);
  logo(ctx, TEX_W / 2, 470, 78);
  ctx.textAlign = 'center'; ctx.fillStyle = C.chalk; ctx.font = `150px ${SERIF}`; ctx.fillText(d.title, TEX_W / 2, 720);
  ctx.fillStyle = C.dim; ctx.font = `600 44px ${SANS}`; ctx.fillText(d.subtitle, TEX_W / 2, 790);
  ctx.fillStyle = C.mustard; ctx.fillRect(TEX_W / 2 - 34, 850, 68, 3);
  ctx.fillStyle = C.dim; ctx.font = `30px ${SANS}`; ctx.fillText(d.tag, TEX_W / 2, 920);
  ctx.fillStyle = C.mustard; ctx.font = `46px ${SERIF}`; ctx.fillText(d.foot, TEX_W / 2, 1270);
  return c;
}
function leftTex(d) {
  const [c, ctx] = canvas2d(); paper(ctx, 'right');
  ctx.textAlign = 'center'; ctx.fillStyle = C.ink; ctx.font = `120px ${SERIF}`; ctx.fillText(d.title, TEX_W / 2, 300);
  ctx.fillStyle = C.wine; ctx.font = `36px ${SANS}`; ctx.fillText(d.sub, TEX_W / 2, 372);
  ctx.fillStyle = C.mustard; ctx.fillRect(TEX_W / 2 - 34, 420, 68, 3);
  let y = 560; for (const k of d.courses) y = course(ctx, k, y);
  return c;
}
function rightTex(d) {
  const [c, ctx] = canvas2d(); paper(ctx, 'left');
  let y = 220; for (const k of d.courses) y = course(ctx, k, y);
  ctx.font = `36px ${SANS}`; ctx.textAlign = 'left';
  for (const line of d.list || []) {
    ctx.strokeStyle = C.wine; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(112, y - 12); ctx.lineTo(124, y); ctx.lineTo(146, y - 26); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.fillText(line, 172, y); y += 64;
  }
  ctx.textAlign = 'center'; ctx.fillStyle = C.grey; ctx.font = `26px ${SANS}`; ctx.fillText(d.foot, TEX_W / 2, TEX_H - 110);
  return [c, y];
}
function stampTex(lines) {
  const [c, ctx] = canvas2d(512, 512);
  ctx.translate(256, 256);
  ctx.fillStyle = C.mustard; ctx.beginPath(); ctx.arc(0, 0, 240, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(30,43,36,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 212, 0, Math.PI * 2); ctx.stroke();
  // ink unevenness
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 1400; i++) { ctx.fillStyle = `rgba(0,0,0,${Math.random() * .25})`; const a = Math.random() * 6.28, r = Math.random() * 240; ctx.fillRect(Math.cos(a) * r, Math.sin(a) * r, 2, 2); }
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.font = `64px ${SERIF}`;
  ctx.fillText(lines[0], 0, -10); ctx.fillText(lines[1], 0, 70);
  return c;
}
function backTex() {
  const [c, ctx] = canvas2d();
  ctx.fillStyle = '#19241e'; ctx.fillRect(0, 0, TEX_W, TEX_H);
  logo(ctx, TEX_W / 2, TEX_H - 200, 34);
  return c;
}
function dotTex() {
  const [c, ctx] = canvas2d(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(.35, 'rgba(255,230,170,.45)'); g.addColorStop(1, 'rgba(255,230,170,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64); return c;
}

// Cover: one bendable sheet, front = cover art, back = inside left. The free edge lags behind while it turns.
function sheetMaterial(front, back) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uFront: { value: front }, uBack: { value: back }, uBend: { value: 0 }, uShadeF: { value: 1 }, uShadeB: { value: 1 } },
    vertexShader: `
      uniform float uBend; varying vec2 vUv;
      void main() {
        vUv = uv; vec3 p = position; float t = p.x / ${W.toFixed(3)};
        p.z -= uBend * .32 * t * t;
        p.x -= uBend * .05 * t * t;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D uFront; uniform sampler2D uBack; uniform float uShadeF; uniform float uShadeB; varying vec2 vUv;
      void main() {
        vec4 c = gl_FrontFacing ? texture2D(uFront, vUv) * uShadeF : texture2D(uBack, vec2(1.0 - vUv.x, vUv.y)) * uShadeB;
        gl_FragColor = vec4(c.rgb, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

// ---------- scene ----------
export async function start({ stage, sticky, slot, copy, data, onReady, onFail }) {
  await Promise.all([document.fonts.load(`96px ${SERIF}`), document.fonts.load(`600 30px ${SANS}`), document.fonts.load(`30px ${SANS}`)]);

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  sticky.prepend(canvas);
  const cue = sticky.querySelector('.scroll-cue');
  const small = innerWidth < 600;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, .1, 50);
  camera.position.z = 12;
  const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const tex = src => { const t = new THREE.CanvasTexture(src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };
  const mat = (map, color) => new THREE.MeshBasicMaterial(map ? { map } : { color });
  const edge = mat(null, 0xe4ddca);
  const [rightCanvas, listEnd] = rightTex(data.right);
  const insideRight = mat(tex(rightCanvas)), back = mat(tex(backTex()));

  const group = new THREE.Group();          // overall placement + tilt
  const inner = new THREE.Group();          // slides so the right part is centred
  const right = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), [edge, edge, edge, edge, insideRight, back]);
  right.position.x = W / 2;
  const hinge = new THREE.Group();          // the spine
  hinge.position.set(0, 0, T / 2 + .004);
  const sheetGeo = new THREE.PlaneGeometry(W, H, small ? 18 : 28, 1); sheetGeo.translate(W / 2, 0, 0);
  const sheet = sheetMaterial(tex(coverTex(data.cover)), tex(leftTex(data.left)));
  const cover = new THREE.Mesh(sheetGeo, sheet);
  hinge.add(cover); inner.add(right, hinge); group.add(inner); scene.add(group);

  // the stamp lands on the right page once it is in view
  const stampMat = new THREE.MeshBasicMaterial({ map: tex(stampTex(data.right.stamp)), transparent: true, depthWrite: false, opacity: 0 });
  const stamp = new THREE.Mesh(new THREE.PlaneGeometry(.36, .36), stampMat);
  const stampY = H / 2 - (Math.max(listEnd + 230, 1080) / TEX_H) * H;
  stamp.position.set(.16, stampY, T / 2 + .003);
  stamp.rotation.z = .12;
  right.add(stamp);

  // dust in the light: a few drifting specks, cheap points
  const N = small ? 70 : 140;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 9; pos[i * 3 + 1] = (Math.random() - .5) * 6; pos[i * 3 + 2] = (Math.random() - .5) * 4 + .5; seed[i] = Math.random() * 100; }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dustMat = new THREE.PointsMaterial({ map: tex(dotTex()), size: .05, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // ---------- layout ----------
  let L = {};
  function layout() {
    const sw = sticky.clientWidth, sh = sticky.clientHeight;
    renderer.setSize(sw, sh, false);
    camera.aspect = sw / sh; camera.updateProjectionMatrix();
    const u = visH / sh;                                     // world units per css px
    const sr = sticky.getBoundingClientRect(), r = slot.getBoundingClientRect();
    const startX = (r.left + r.width / 2 - sr.left - sw / 2) * u;
    const startY = -(r.top + r.height / 2 - sr.top - sh / 2) * u;
    const s0 = (r.height * u) / H;
    const fit = Math.min((sw * .86 * u) / (2 * W), (sh * .72 * u) / H);
    const pan = fit * W / u < 250;                           // page would be under 250px wide: pan across it instead
    const s1 = pan ? Math.min((sw * .84 * u) / W, (sh * .7 * u) / H) : fit;
    const headerOffset = (sw < 900 ? 10 : 20) * u;
    L = { startX, startY, s0, s1, pan, endY: -headerOffset };
  }

  // ---------- state ----------
  let target = 0, p = 0, raf = 0, visible = true;
  const t0 = performance.now();
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  if (matchMedia('(pointer: fine)').matches) addEventListener('pointermove', e => { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; }, { passive: true });

  function readScroll() {
    const r = stage.getBoundingClientRect();
    const range = stage.offsetHeight - sticky.clientHeight;
    target = clamp(-r.top / Math.max(1, range));
  }

  function apply(time) {
    const a = phase(p, 0, .3), b = phase(p, .2, .4), c = phase(p, .62, .3);
    const k = (time - t0) / 1000;
    const intro = outCubic(clamp(k / 1.6));                 // one turn when the 3D card takes over
    const s = lerp(L.s0, L.s1, a);
    group.scale.setScalar(s);
    group.position.x = lerp(L.startX, 0, a);
    group.position.y = lerp(L.startY, L.endY, a) + (1 - intro) * -.25;
    const idle = 1 - a;
    group.position.y += Math.sin(k * 1.1) * .035 * idle;
    group.rotation.y = lerp(-.42, 0, a) + Math.sin(k * .7) * .05 * idle + mx * (.25 * idle + .07) + (L.pan ? lerp(.1, -.1, c) * b : 0)
      - (1 - intro) * Math.PI * 2;
    group.rotation.x = lerp(.13, .07, a) + my * (.12 * idle + .05);
    group.rotation.z = lerp(.05, 0, a);
    const angle = -Math.PI * .965 * b;
    hinge.rotation.y = angle;
    sheet.uniforms.uBend.value = Math.sin(b * Math.PI) * 1.0;
    let ox = lerp(-W / 2, L.pan ? W / 2 : 0, b);
    if (L.pan) ox -= W * c;
    inner.position.x = ox;
    // cheap shading instead of lights
    const facing = Math.cos(angle);
    sheet.uniforms.uShadeF.value = .5 + .5 * Math.max(0, facing);
    sheet.uniforms.uShadeB.value = .55 + .45 * Math.max(0, -facing);
    insideRight.color.setScalar(1 - .32 * Math.sin(-angle));
    // stamp: thunk
    const st = clamp((p - (L.pan ? .84 : .64)) / .1);
    const sb = st > 0 ? outBack(st) : 0;
    stamp.scale.setScalar(lerp(2.4, 1, sb) * (st > 0 ? 1 : 0.0001));
    stampMat.opacity = clamp(st * 3) * .96;
    stamp.rotation.z = .12 + (1 - sb) * .5;
    // dust drifts slowly
    dust.rotation.y = k * .02; dust.position.y = Math.sin(k * .2) * .1;
    dustMat.opacity = .35 + .25 * (1 - a);
    // hero text steps aside
    if (copy) {
      const f = clamp(p / .16);
      copy.style.opacity = String(1 - f);
      copy.style.transform = `translate3d(0, ${-40 * f}px, 0)`;
      copy.style.visibility = f >= 1 ? 'hidden' : '';
    }
    if (cue) cue.style.opacity = String(1 - clamp(p / .06));
  }

  // ---------- loop ----------
  let frames = 0, slow = 0, last = 0, failed = false;
  function frame(time) {
    raf = 0;
    readScroll();
    p += (target - p) * .12;
    if (Math.abs(target - p) < .0005) p = target;
    mx += (tmx - mx) * .06; my += (tmy - my) * .06;
    apply(time);
    renderer.render(scene, camera);
    if (last && frames < 90) { if (time - last > 48) slow++; frames++; if (frames === 90 && slow > 35) return fail(); }
    last = time;
    if (visible) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible && !failed) raf = requestAnimationFrame(frame); }

  function fail() {
    failed = true; cancelAnimationFrame(raf);
    if (copy) { copy.style.opacity = ''; copy.style.transform = ''; copy.style.visibility = ''; }
    onFail && onFail();
    renderer.dispose(); canvas.remove();
  }

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { last = 0; kick(); } }, { rootMargin: '100px' }).observe(stage);
  let resizeQueued = false;
  addEventListener('resize', () => {
    if (resizeQueued) return; resizeQueued = true;
    requestAnimationFrame(() => { resizeQueued = false; layout(); kick(); });
  });

  onReady();
  layout(); readScroll(); p = target;
  apply(performance.now()); renderer.render(scene, camera);
  kick();
  return { fail };
}
