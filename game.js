import * as THREE from './vendor/three.module.min.js';
const Q = new URLSearchParams(location.search);
const POSTER = Q.has('poster');
const $ = s => document.querySelector(s);
const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrapA = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const rnd = (a, b) => a + Math.random() * (b - a);

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: $('#c') });
renderer.setPixelRatio(Math.min(devicePixelRatio, POSTER ? 1 : 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec8ff);
scene.fog = new THREE.Fog(0x9fd6ff, 120, 520);
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1200);
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
scene.add(new THREE.HemisphereLight(0xffffff, 0x5a8a3a, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(80, 140, 40); scene.add(sun);

function tex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
const lam = (o) => new THREE.MeshLambertMaterial(o);

// ---------- track ----------
const CP = [[0,0],[0,-150],[30,-230],[110,-262],[190,-232],[222,-160],[182,-92],[200,-30],[272,0],[302,80],[262,162],[170,192],[80,172],[22,110]];
const curve = new THREE.CatmullRomCurve3(CP.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
const N = 700, W = 16, HW = W / 2, WALL = HW + 7;
const P = [], T = [], L = [];
for (let i = 0; i < N; i++) {
  const p = curve.getPointAt(i / N), t = curve.getTangentAt(i / N).normalize();
  P.push(p); T.push(t); L.push(new THREE.Vector3(t.z, 0, -t.x));
}
function ribbon(off0, off1, y0, y1, mat, colorFn, vRep = 1) {
  const pos = [], uv = [], col = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const k = i % N, p = P[k], l = L[k];
    pos.push(p.x + l.x * off0, y0, p.z + l.z * off0, p.x + l.x * off1, y1, p.z + l.z * off1);
    uv.push(0, i * vRep / 10, 1, i * vRep / 10);
    if (colorFn) { const c = colorFn(i); col.push(c.r, c.g, c.b, c.r, c.g, c.b); }
    if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (colorFn) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); scene.add(m); return m;
}
const asphalt = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#5b5f68'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4000; i++) { const v = 70 + Math.random() * 40 | 0; g.fillStyle = `rgb(${v},${v},${v + 6})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(6, 0, 5, h); g.fillRect(w - 11, 0, 5, h);
  g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(w / 2 - 2, 0, 4, h / 2);
}, true);
ribbon(HW, -HW, 0.02, 0.02, lam({ map: asphalt }));
const red = new THREE.Color(0xe02525), wht = new THREE.Color(0xffffff);
const curbMat = lam({ vertexColors: true });
ribbon(HW + 1.6, HW, 0.06, 0.06, curbMat, i => (i >> 1) % 2 ? red : wht);
ribbon(-HW, -HW - 1.6, 0.06, 0.06, curbMat, i => (i >> 1) % 2 ? red : wht);
// run-off sand-ish strip
ribbon(WALL, HW + 1.6, 0.03, 0.03, lam({ color: 0x8fcf5a }));
ribbon(-HW - 1.6, -WALL, 0.03, 0.03, lam({ color: 0x8fcf5a }));
// walls
const wallTex = tex(64, 32, (g) => { g.fillStyle = '#1f5fd6'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#fff'; g.fillRect(0, 0, 32, 32); }, true);
const wallMat = lam({ map: wallTex, side: THREE.DoubleSide });
ribbon(WALL, WALL, 0, 1.4, wallMat); ribbon(-WALL, -WALL, 1.4, 0, wallMat);
// ground
const grass = tex(128, 128, (g, w, h) => { g.fillStyle = '#5fb43c'; g.fillRect(0, 0, w, h); g.fillStyle = '#6cc447'; g.fillRect(0, 0, w, h / 2); for (let i = 0; i < 600; i++) { g.fillStyle = Math.random() < .5 ? '#55a535' : '#74cc50'; g.fillRect(Math.random() * w, Math.random() * h, 2, 3); } }, true);
grass.repeat.set(120, 120);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), lam({ map: grass })); ground.rotation.x = -Math.PI / 2; ground.position.set(150, -0.02, -40); scene.add(ground);
// start line
const checker = tex(128, 32, (g) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 8, y * 8, 8, 8); } });
const sl = new THREE.Mesh(new THREE.PlaneGeometry(W, 2.4), lam({ map: checker }));
sl.rotation.x = -Math.PI / 2; sl.rotation.z = Math.atan2(T[0].x, T[0].z) + Math.PI / 2; sl.rotation.order = 'YXZ';
sl.rotation.set(-Math.PI / 2, 0, 0); sl.position.copy(P[0]).setY(0.08);
const slg = new THREE.Group(); slg.add(sl); sl.position.set(0, 0.08, 0); slg.position.copy(P[0]); slg.rotation.y = Math.atan2(T[0].x, T[0].z); scene.add(slg);
// banners
const SPONSORS = [['MUSHROOM MOTORS', '#e8202a', '#fff'], ['STAR TYRES', '#ffd400', '#1a2a8a'], ['KOOPA OIL', '#1aa34a', '#fff'], ['PIPE PLUMBING', '#1d4fd8', '#ffd400'], ['BANANA BRAKES', '#ffe14d', '#6b3e00'], ['SHELL SPEED', '#ff7a00', '#fff'], ['PRINCESS PALACE', '#ff6fb5', '#fff'], ['LENNY LUBES', '#222', '#ffd400']];
const bannerTex = SPONSORS.map(([t, bg, fg]) => tex(512, 128, (g, w, h) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.fillRect(0, 8, w, 6); g.fillRect(0, h - 14, w, 6);
  g.font = 'bold italic 64px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, w / 2, h / 2 + 2, w - 30);
}));
const postMat = lam({ color: 0x888888 }), postGeo = new THREE.BoxGeometry(0.3, 3.4, 0.3);
for (let i = 6, b = 0; i < N; i += 22, b++) {
  for (const s of [1, -1]) {
    if ((b + (s > 0 ? 0 : 1)) % 2) continue;
    const p = P[i], l = L[i], off = s * (WALL + 0.5);
    const g = new THREE.Group(); g.position.set(p.x + l.x * off, 0, p.z + l.z * off);
    g.rotation.y = Math.atan2(-l.x * s, -l.z * s);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), lam({ map: bannerTex[(b * 3 + (s > 0 ? 1 : 0)) % bannerTex.length], side: THREE.DoubleSide }));
    m.position.y = 2.5; g.add(m);
    for (const x of [-4.4, 4.4]) { const q = new THREE.Mesh(postGeo, postMat); q.position.set(x, 1.7, -0.05); g.add(q); }
    scene.add(g);
  }
}
// grandstands
const crowdGeo = new THREE.BoxGeometry(0.7, 0.9, 0.5);
const crowdCols = [0xff4040, 0x40a0ff, 0xffe040, 0x40d060, 0xffffff, 0xff80c0, 0xff9a30, 0x9b59ff];
function grandstand(i, s, len = 60) {
  const g = new THREE.Group(), p = P[i], l = L[i];
  g.position.set(p.x + l.x * s * (WALL + 3), 0, p.z + l.z * s * (WALL + 3)); g.rotation.y = Math.atan2(T[i].x, T[i].z);
  const steps = 7, crowd = new THREE.InstancedMesh(crowdGeo, lam({ color: 0xffffff }), steps * Math.floor(len / 1.1));
  let c = 0; const m4 = new THREE.Matrix4(), col = new THREE.Color();
  for (let k = 0; k < steps; k++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(2, 1.1 * (k + 1), len), lam({ color: k % 2 ? 0xd8d8e0 : 0xb8bcc8 }));
    st.position.set(s * (k * 2 + 1), 0.55 * (k + 1), 0); g.add(st);
    for (let z = -len / 2 + 0.8; z < len / 2 - 0.5; z += 1.1) {
      if (Math.random() < 0.12 || c >= crowd.count) continue;
      m4.makeTranslation(s * (k * 2 + 1), 1.1 * (k + 1) + 0.45 + Math.random() * 0.15, z); crowd.setMatrixAt(c, m4);
      crowd.setColorAt(c++, col.setHex(crowdCols[Math.random() * crowdCols.length | 0])); 
    }
  }
  crowd.count = c; g.add(crowd);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 12, len), lam({ color: 0x2b3a8f })); back.position.set(s * (steps * 2 + 0.3), 6, 0); g.add(back);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(steps * 2 + 2, 0.5, len + 2), lam({ color: 0xe03030 })); roof.position.set(s * (steps + 0.5), 12.2, 0); roof.rotation.z = s * 0.08; g.add(roof);
  for (let z = -len / 2; z <= len / 2; z += len / 4) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 12, 0.4), postMat); pl.position.set(s * 0.2, 6, z); g.add(pl); }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.6, len * 0.6 / 4), lam({ map: bannerTex[(i / 7 | 0) % bannerTex.length], side: THREE.DoubleSide }));
  sign.position.set(s * 0.4, 13.8, 0); sign.rotation.y = Math.PI / 2; g.add(sign);
  scene.add(g);
}
grandstand(30, 1, 70); grandstand(30, -1, 70); grandstand(250, 1); grandstand(480, -1); grandstand(600, 1);
// start gantry
{
  const g = new THREE.Group(); g.position.copy(P[0]); g.rotation.y = Math.atan2(T[0].x, T[0].z);
  for (const x of [-WALL, WALL]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.8, 9, 0.8), lam({ color: 0xdddddd })); p.position.set(x, 4.5, 0); g.add(p); }
  const t = tex(1024, 128, (c, w, h) => { for (let x = 0; x < 32; x++) for (let y = 0; y < 4; y++) { c.fillStyle = (x + y) % 2 ? '#111' : '#fff'; c.fillRect(x * 32, y * 32, 32, 32); } c.fillStyle = '#e8202a'; c.fillRect(260, 10, 504, 108); c.fillStyle = '#fff'; c.font = 'bold italic 80px Arial Black, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('MARIO KART', 512, 66); });
  const b = new THREE.Mesh(new THREE.BoxGeometry(WALL * 2 + 1, 2.4, 0.6), [postMat, postMat, postMat, postMat, lam({ map: t }), lam({ map: t })]); b.position.y = 8.2; g.add(b);
  scene.add(g);
}
// trees, hills, clouds
function farFromTrack(x, z, d) { for (let i = 0; i < N; i += 4) { const dx = P[i].x - x, dz = P[i].z - z; if (dx * dx + dz * dz < d * d) return false; } return true; }
{
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.5, 2.5, 6), lam({ color: 0x7a4a22 }), 260);
  const top = new THREE.InstancedMesh(new THREE.ConeGeometry(2.6, 6, 7), lam({ color: 0x2f8f3a }), 260);
  const ball = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.6, 0), lam({ color: 0x3fa64a, flatShading: true }), 260);
  let n = 0, nb = 0; const m = new THREE.Matrix4();
  for (let tries = 0; tries < 3000 && n < 260; tries++) {
    const x = rnd(-160, 460), z = rnd(-420, 340);
    if (!farFromTrack(x, z, WALL + 22)) continue;
    const s = rnd(0.8, 1.6);
    m.compose(new THREE.Vector3(x, 1.25 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); trunk.setMatrixAt(n, m);
    m.compose(new THREE.Vector3(x, 5 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
    if (Math.random() < .5) top.setMatrixAt(n, m); else { ball.setMatrixAt(nb++, m); m.makeScale(0, 0, 0); top.setMatrixAt(n, m); }
    n++;
  }
  trunk.count = n; top.count = n; ball.count = nb; scene.add(trunk, top, ball);
  const hillMat = lam({ color: 0x4f9e3a, flatShading: true });
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, r = rnd(420, 520); const h = new THREE.Mesh(new THREE.IcosahedronGeometry(rnd(50, 90), 1), hillMat); h.position.set(150 + Math.cos(a) * r, -10, -40 + Math.sin(a) * r); h.scale.y = rnd(.5, .9); scene.add(h); }
  const cm = lam({ color: 0xffffff, emissive: 0x666666 });
  for (let i = 0; i < 14; i++) { const g = new THREE.Group(); for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(rnd(6, 10), 1), cm); s.position.set(k * 9 - 13, rnd(-2, 2), rnd(-3, 3)); g.add(s); } const a = rnd(0, TAU), r = rnd(250, 450); g.position.set(150 + Math.cos(a) * r, rnd(70, 120), -40 + Math.sin(a) * r); scene.add(g); }
}

// ---------- characters & karts ----------
const CHARS = [
  { name: 'Mario', hat: 0xe52521, shirt: 0xe52521, pants: 0x2a4fd6, kart: 0xe52521, skin: 0xffcc99, accel: 1, top: 1, handling: 1 },
  { name: 'Luigi', hat: 0x1fa830, shirt: 0x1fa830, pants: 0x2a4fd6, kart: 0x1fa830, skin: 0xffcc99, accel: 1, top: 1.01, handling: 1.03 },
  { name: 'Peach', hat: 0xffd23a, shirt: 0xff7ac0, pants: 0xff7ac0, kart: 0xff8fd0, skin: 0xffd9b8, accel: 1.08, top: 0.98, handling: 1.08, crown: true },
  { name: 'Bowser', hat: 0x2e8b2e, shirt: 0xf5b041, pants: 0xf5b041, kart: 0x3a3a3a, skin: 0x7ec850, accel: 0.9, top: 1.06, handling: 0.9, big: true },
  { name: 'Yoshi', hat: 0x5cd64a, shirt: 0xffffff, pants: 0xe05a20, kart: 0x5cd64a, skin: 0x5cd64a, accel: 1.05, top: 0.99, handling: 1.06, yoshi: true },
  { name: 'Toad', hat: 0xffffff, shirt: 0x2a4fd6, pants: 0xffffff, kart: 0x2a8fe0, skin: 0xffd9b8, accel: 1.12, top: 0.96, handling: 1.1, toad: true },
];
const black = lam({ color: 0x1a1a1a }), metal = lam({ color: 0xc0c0c0 });
const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.4, 12); wheelGeo.rotateZ(Math.PI / 2);
const shadowTex = tex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 30); r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
function box(w, h, d, mat, x, y, z, parent) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; }
function sph(r, mat, x, y, z, parent, seg = 12) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg - 2), mat); m.position.set(x, y, z); parent.add(m); return m; }
function makeKart(ch) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const km = lam({ color: ch.kart });
  box(1.7, 0.45, 2.6, km, 0, 0.55, 0, body); box(1.3, 0.35, 0.9, km, 0, 0.6, 1.5, body);
  box(1.9, 0.18, 0.5, black, 0, 0.5, 1.95, body); box(1.6, 0.6, 0.18, black, 0, 1.1, -1.2, body);
  box(0.2, 0.25, 0.2, metal, -0.45, 0.85, -1.4, body); box(0.2, 0.25, 0.2, metal, 0.45, 0.85, -1.4, body);
  const wheels = [];
  for (const [x, z] of [[-0.95, 0.95], [0.95, 0.95], [-0.95, -0.95], [0.95, -0.95]]) { const w = new THREE.Mesh(wheelGeo, black); w.position.set(x, 0.45, z); body.add(w); wheels.push(w); }
  const d = new THREE.Group(); d.position.set(0, 0.8, -0.2); body.add(d);
  const sk = lam({ color: ch.skin }), hm = lam({ color: ch.hat });
  box(0.9, 0.7, 0.6, lam({ color: ch.pants }), 0, 0.35, 0, d); box(0.95, 0.4, 0.62, lam({ color: ch.shirt }), 0, 0.75, 0, d);
  if (ch.yoshi) { sph(0.45, sk, 0, 1.35, 0, d); sph(0.38, sk, 0, 1.25, 0.45, d); sph(0.14, lam({ color: 0xffffff }), -0.15, 1.7, 0.2, d); sph(0.14, lam({ color: 0xffffff }), 0.15, 1.7, 0.2, d); sph(0.25, lam({ color: 0xe05a20 }), 0, 1.4, -0.4, d); }
  else if (ch.toad) { sph(0.38, sk, 0, 1.3, 0, d); const cap = sph(0.7, hm, 0, 1.6, 0, d); cap.scale.y = 0.75; const rm = lam({ color: 0xe52521 }); for (const [x, y, z] of [[0, 1.95, 0.35], [-0.55, 1.75, 0], [0.55, 1.75, 0], [0, 1.85, -0.5]]) sph(0.2, rm, x, y, z, d, 8); }
  else {
    sph(ch.big ? 0.55 : 0.4, sk, 0, 1.35, 0, d);
    if (ch.big) { const sh = sph(0.75, lam({ color: 0x2e8b2e }), 0, 0.8, -0.45, d); sh.scale.z = 0.6; for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 6), lam({ color: 0xffffff })); s.position.set((i % 2 - 0.5) * 0.6, 0.6 + (i >> 1) * 0.5, -0.9); s.rotation.x = -Math.PI / 2; d.add(s); } const hr = lam({ color: 0xe05a20 }); box(0.5, 0.25, 0.4, hr, 0, 1.85, -0.1, d); for (const x of [-0.35, 0.35]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 6), lam({ color: 0xfff6d0 })); h.position.set(x, 1.85, 0.1); d.add(h); } }
    else if (ch.crown) { const hair = sph(0.44, hm, 0, 1.4, -0.08, d); hair.scale.set(1, 1, 1.1); const cr = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.22, 5, 1, true), lam({ color: 0xffd700, side: THREE.DoubleSide })); cr.position.set(0, 1.85, 0); d.add(cr); }
    else { const cap = sph(0.42, hm, 0, 1.5, -0.02, d); cap.scale.y = 0.6; box(0.6, 0.06, 0.4, hm, 0, 1.42, 0.38, d); sph(0.12, lam({ color: 0xffffff }), 0, 1.6, 0.35, d, 8); box(0.4, 0.1, 0.1, lam({ color: 0x3a2010 }), 0, 1.22, 0.38, d); }
  }
  if (ch.big) d.scale.setScalar(1.15);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3, 3.6), shadowMat); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.05; root.add(shadow);
  const sparks = [];
  for (const x of [-0.95, 0.95]) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), new THREE.MeshBasicMaterial({ color: 0x40a0ff })); s.position.set(x, 0.3, -1.3); s.visible = false; body.add(s); sparks.push(s); }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.4, 8), new THREE.MeshBasicMaterial({ color: 0xffa020 })); flame.rotation.x = -Math.PI / 2; flame.position.set(0, 0.85, -2); flame.visible = false; body.add(flame);
  scene.add(root);
  return { root, body, wheels, sparks, flame };
}

// ---------- items ----------
const qTex = tex(128, 128, (g) => { const gr = g.createLinearGradient(0, 0, 128, 128); ['#ff4d4d', '#ffd84d', '#4dff88', '#4dc3ff', '#c44dff'].forEach((c, i) => gr.addColorStop(i / 4, c)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(255,255,255,.9)'; g.font = 'bold 96px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 64, 70); });
const qMat = new THREE.MeshLambertMaterial({ map: qTex, transparent: true, opacity: 0.85, emissive: 0x333333 });
const boxes = [];
for (const i of [110, 330, 520]) for (const o of [-5.4, -1.8, 1.8, 5.4]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), qMat); const p = P[i], l = L[i];
  m.position.set(p.x + l.x * o, 1.4, p.z + l.z * o); scene.add(m); boxes.push({ m, t: 0 });
}
const ITEMS = { mushroom: '🍄', banana: '🍌', shell: '🐢' };
const bananaGeo = new THREE.TorusGeometry(0.5, 0.2, 6, 10, Math.PI * 1.2), bananaMat = lam({ color: 0xffe033 });
const shellGeo = new THREE.SphereGeometry(0.6, 12, 8), shellMat = lam({ color: 0x22b040 });
const hazards = []; // {type, pos, vel, m, life}

// ---------- karts state ----------
let karts = [], player = null, state = 'title', raceT = 0, countdown = 0, results = [], selected = 0;
const LAPS = 3;
function nearest(pos, guess) {
  let best = guess, bd = 1e9;
  const scan = guess < 0 ? N : 40;
  for (let k = -scan; k <= scan; k++) { const i = ((guess < 0 ? 0 : guess) + k + N * 2) % N; const dx = pos.x - P[i].x, dz = pos.z - P[i].z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } }
  return best;
}
function lateral(pos, i) { return (pos.x - P[i].x) * L[i].x + (pos.z - P[i].z) * L[i].z; }
function setupRace(charIdx) {
  for (const k of karts) scene.remove(k.root); karts = [];
  for (const h of hazards) scene.remove(h.m); hazards.length = 0;
  const order = [...CHARS.keys()].filter(i => i !== charIdx); order.push(charIdx);
  order.forEach((ci, slot) => {
    const i = (N - 8 - slot * 7) % N, side = slot % 2 ? -3.5 : 3.5, p = P[i], l = L[i];
    const k = { ...makeKart(CHARS[ci]), ch: CHARS[ci], ai: ci !== charIdx, pos: new THREE.Vector3(p.x + l.x * side, 0, p.z + l.z * side), h: Math.atan2(T[i].x, T[i].z), speed: 0, idx: i, lap: 0, maxIdx: 0, checkpoint: false, drift: 0, driftCharge: 0, boost: 0, spin: 0, item: null, roulette: 0, aiItemT: rnd(1, 4), aiOff: rnd(-4, 4), aiSkill: 0.92 + slot * 0.012, finished: false, finishT: 0, hop: 0, steerVis: 0 };
    k.root.position.copy(k.pos); k.root.rotation.y = k.h; karts.push(k); if (!k.ai) player = k;
  });
}

// ---------- input ----------
const keys = {}, touch = { left: false, right: false, drift: false, item: false, brake: false };
addEventListener('keydown', e => { keys[e.code] = true; if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); if (state === 'select') selectKey(e); });
addEventListener('keyup', e => { keys[e.code] = false; });
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.querySelectorAll('[data-btn]').forEach(b => {
  const n = b.dataset.btn, on = e => { e.preventDefault(); touch[n] = true; b.classList.add('on'); }, off = e => { e.preventDefault(); touch[n] = false; b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
});
function input() {
  const left = keys.ArrowLeft || keys.KeyA || touch.left, right = keys.ArrowRight || keys.KeyD || touch.right;
  const gas = keys.ArrowUp || keys.KeyW || (isTouch && !touch.brake) || autoGas;
  return { steer: (left ? 1 : 0) - (right ? 1 : 0), gas, brake: keys.ArrowDown || keys.KeyS || touch.brake, drift: keys.Space || touch.drift, item: keys.ShiftLeft || keys.ShiftRight || keys.KeyX || touch.item };
}
let autoGas = false, prevItem = false;

// ---------- audio ----------
let ac = null, master, engOsc, engGain, muted = false;
function initAudio() {
  if (ac) { ac.resume(); return; }
  ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.6; master.connect(ac.destination);
  engOsc = ac.createOscillator(); engOsc.type = 'sawtooth'; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
  engGain = ac.createGain(); engGain.gain.value = 0; engOsc.connect(f); f.connect(engGain); engGain.connect(master); engOsc.start();
  startMusic();
}
function tone(freq, dur, type = 'square', vol = 0.15, when = 0, slide = 0) {
  if (!ac) return; const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
const sfx = {
  beep: () => tone(440, 0.25, 'square', 0.2), go: () => tone(880, 0.6, 'square', 0.2),
  item: () => { for (let i = 0; i < 6; i++) tone(500 + i * 120, 0.08, 'triangle', 0.1, i * 0.07); },
  boost: () => tone(200, 0.5, 'sawtooth', 0.15, 0, 600), hit: () => tone(300, 0.6, 'square', 0.18, 0, -250),
  throw: () => tone(600, 0.15, 'triangle', 0.15, 0, -300), lap: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.15, 'square', 0.12, i * 0.1)),
  spark: () => tone(1200, 0.06, 'triangle', 0.05),
  finish: () => [523, 523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.18, 'square', 0.13, i * 0.13)),
};
// original upbeat chiptune loop (composed procedurally, not from any game)
const MEL = [72, 76, 79, 76, 77, 74, 71, 74, 72, 76, 79, 84, 83, 79, 77, 74, 76, 72, 69, 72, 74, 77, 81, 79, 77, 76, 74, 71, 72, 0, 79, 0];
const BAS = [48, 48, 55, 55, 53, 53, 55, 55, 48, 48, 52, 52, 53, 53, 55, 43];
let musicTimer = null, step = 0, nextT = 0, musicOn = true;
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
function startMusic() {
  nextT = ac.currentTime + 0.1;
  musicTimer = setInterval(() => {
    while (nextT < ac.currentTime + 0.2) {
      const dt = 60 / 152 / 2, w = nextT - ac.currentTime;
      if (musicOn && !muted) {
        const m = MEL[step % 32]; if (m) tone(midi(m), dt * 0.9, 'square', 0.045, w);
        if (step % 2 === 0) tone(midi(BAS[(step >> 1) % 16]), dt * 1.6, 'triangle', 0.09, w);
        if (step % 4 === 2) tone(2000, 0.03, 'square', 0.02, w);
      }
      nextT += dt; step++;
    }
  }, 50);
}
$('#mute').addEventListener('click', e => { e.stopPropagation(); muted = !muted; if (master) master.gain.value = muted ? 0 : 0.6; $('#mute').textContent = muted ? '🔇' : '🔊'; });

// ---------- UI flow ----------
const ui = { title: $('#title'), select: $('#select'), hud: $('#hud'), finish: $('#finish'), touch: $('#touch'), big: $('#big') };
function show(name) { for (const k of ['title', 'select', 'finish']) ui[k].classList.toggle('hidden', k !== name); ui.hud.classList.toggle('hidden', name !== 'race'); ui.touch.classList.toggle('hidden', !(name === 'race' && isTouch)); }
const grid = $('#chars');
CHARS.forEach((c, i) => {
  const d = document.createElement('button'); d.className = 'char'; const hx = '#' + c.kart.toString(16).padStart(6, '0'), hh = '#' + c.hat.toString(16).padStart(6, '0');
  d.innerHTML = `<div class="av" style="background:${hx};border-color:${hh}">${c.name[0]}</div><b>${c.name}</b><small>SPD ${'★'.repeat(Math.round(c.top * 5 - 2))} ACC ${'★'.repeat(Math.round(c.accel * 5 - 2))}</small>`;
  d.addEventListener('click', () => { selected = i; markSel(); startRace(); }); grid.appendChild(d);
});
function markSel() { [...grid.children].forEach((c, i) => c.classList.toggle('sel', i === selected)); }
function selectKey(e) { if (e.code === 'ArrowRight' || e.code === 'KeyD') selected = (selected + 1) % 6; if (e.code === 'ArrowLeft' || e.code === 'KeyA') selected = (selected + 5) % 6; if (e.code === 'ArrowDown') selected = (selected + 3) % 6; if (e.code === 'ArrowUp') selected = (selected + 3) % 6; markSel(); if (e.code === 'Enter' || e.code === 'Space') startRace(); }
markSel();
ui.title.addEventListener('click', () => { initAudio(); state = 'select'; show('select'); });
addEventListener('keydown', e => { if (state === 'title' && (e.code === 'Enter' || e.code === 'Space')) ui.title.click(); });
$('#again').addEventListener('click', () => startRace());
$('#menu').addEventListener('click', () => { state = 'select'; show('select'); });
function startRace() { setupRace(selected); state = 'countdown'; countdown = 3.999; raceT = 0; lastCount = 4; show('race'); updateHUD(); }
let lastCount = 4;
function bigText(t, ms = 900) { ui.big.textContent = t; ui.big.classList.remove('pop'); void ui.big.offsetWidth; ui.big.classList.add('pop'); clearTimeout(bigText.t); bigText.t = setTimeout(() => ui.big.textContent = '', ms); }
const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
const fmt = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
function positions() { return [...karts].sort((a, b) => (b.finished - a.finished) || (a.finished && b.finished ? a.finishT - b.finishT : (b.lap * N + b.idx) - (a.lap * N + a.idx))); }
function updateHUD() {
  if (!player) return; const pos = positions().indexOf(player) + 1;
  $('#pos').textContent = ord(pos); $('#pos').className = 'p' + pos;
  $('#lap').textContent = `LAP ${clamp(player.lap, 1, LAPS)}/${LAPS}`; $('#time').textContent = fmt(raceT);
  $('#item').textContent = player.roulette > 0 ? Object.values(ITEMS)[Math.floor(performance.now() / 80) % 3] : (player.item ? ITEMS[player.item] : '');
}
function finishRace() {
  state = 'finished'; autoGas = true; sfx.finish();
  setTimeout(() => {
    const pos = positions(); const list = $('#results'); list.innerHTML = '';
    pos.forEach((k, i) => { const li = document.createElement('li'); if (!k.ai) li.className = 'me'; li.innerHTML = `<span>${ord(i + 1)}</span><b>${k.ch.name}</b><em>${k.finished ? fmt(k.finishT) : '--:--'}</em>`; list.appendChild(li); });
    const p = pos.indexOf(player) + 1; $('#ftitle').textContent = p === 1 ? '🏆 YOU WIN!' : p <= 3 ? `🎉 ${ord(p)} PLACE!` : `${ord(p)} place`;
    show('finish'); ui.hud.classList.remove('hidden');
  }, 1800);
}

// ---------- simulation ----------
function useItem(k) {
  const it = k.item; if (!it) return; k.item = null;
  const f = new THREE.Vector3(Math.sin(k.h), 0, Math.cos(k.h));
  if (it === 'mushroom') { k.boost = Math.max(k.boost, 1.3); if (!k.ai) sfx.boost(); }
  else if (it === 'banana') { const m = new THREE.Mesh(bananaGeo, bananaMat); m.position.copy(k.pos).addScaledVector(f, -3).setY(0.5); scene.add(m); hazards.push({ type: 'banana', m, pos: m.position, life: 40 }); if (!k.ai) sfx.throw(); }
  else if (it === 'shell') { const m = new THREE.Mesh(shellGeo, shellMat); m.position.copy(k.pos).addScaledVector(f, 3.2).setY(0.6); scene.add(m); hazards.push({ type: 'shell', m, pos: m.position, vel: f.multiplyScalar(70), life: 5, owner: k, idx: k.idx }); if (!k.ai) sfx.throw(); }
}
function hitKart(k) { if (k.spin > 0) return; k.spin = 1.1; k.speed *= 0.25; k.drift = 0; k.boost = 0; if (!k.ai) sfx.hit(); }
function rollItem(k) {
  const pos = positions().indexOf(k); const r = Math.random();
  if (pos >= 3) return r < 0.5 ? 'mushroom' : r < 0.8 ? 'shell' : 'banana';
  return r < 0.45 ? 'banana' : r < 0.8 ? 'shell' : 'mushroom';
}
const tmp = new THREE.Vector3();
function stepKart(k, dt, inp) {
  const ch = k.ch, maxS = 40 * ch.top * (k.ai ? k.aiSkill : 1);
  k.idx = nearest(k.pos, k.idx); const lat = lateral(k.pos, k.idx), off = Math.abs(lat) > HW + 1.6;
  if (k.spin > 0) { k.spin -= dt; k.speed *= Math.pow(0.3, dt); inp = { steer: 0, gas: false }; }
  let top = off ? maxS * 0.45 : maxS; if (k.boost > 0) { k.boost -= dt; top = maxS * 1.45; k.speed = Math.max(k.speed, top * 0.9); }
  if (inp.gas) k.speed += (k.speed < top ? 26 * ch.accel : -40) * dt; else k.speed -= 14 * dt;
  if (inp.brake) k.speed -= 40 * dt;
  k.speed = clamp(k.speed, -10, maxS * 1.5);
  if (!inp.gas && !inp.brake) k.speed = Math.max(0, k.speed);
  // drift
  if (inp.drift && !k.drift && inp.steer && k.speed > 16 && !off) { k.drift = Math.sign(inp.steer); k.driftCharge = 0; k.hop = 0.25; }
  if (k.drift && (!inp.drift || k.speed < 10)) {
    if (k.driftCharge > 1.6) { k.boost = Math.max(k.boost, 1.1); if (!k.ai) sfx.boost(); } else if (k.driftCharge > 0.7) { k.boost = Math.max(k.boost, 0.6); if (!k.ai) sfx.boost(); }
    k.drift = 0; k.driftCharge = 0;
  }
  let steer = inp.steer;
  if (k.drift) { steer = k.drift * (0.55 + 0.55 * Math.max(-0.6, inp.steer * k.drift)); k.driftCharge += dt * (1 + Math.abs(inp.steer) * 0.4); }
  const sf = Math.max(inp.gas ? 0.45 : 0, clamp(Math.abs(k.speed) / 12, 0, 1)) * Math.sign(k.speed || 1);
  k.h += steer * 2.1 * ch.handling * sf * dt * (k.drift ? 1.15 : 1);
  if (k.spin > 0) k.h += dt * 0; 
  const fx = Math.sin(k.h), fz = Math.cos(k.h);
  k.pos.x += fx * k.speed * dt; k.pos.z += fz * k.speed * dt;
  // walls
  k.idx = nearest(k.pos, k.idx); const lat2 = lateral(k.pos, k.idx);
  if (Math.abs(lat2) > WALL - 1.2) { const push = Math.abs(lat2) - (WALL - 1.2); k.pos.addScaledVector(L[k.idx], -Math.sign(lat2) * push); k.speed = Math.min(k.speed * 0.97, Math.max(14, k.speed * 0.6)); }
  // laps
  if (k.idx > N * 0.45 && k.idx < N * 0.55) k.checkpoint = true;
  const prev = k.prevIdx ?? k.idx;
  if (prev > N * 0.9 && k.idx < N * 0.1) { if (k.checkpoint || k.lap === 0) { k.lap++; k.checkpoint = false; if (k.lap > LAPS && !k.finished) { k.finished = true; k.finishT = raceT; if (!k.ai) finishRace(); } else if (!k.ai && k.lap > 1) { bigText(k.lap === LAPS ? 'FINAL LAP!' : `LAP ${k.lap}`, 1400); sfx.lap(); } } }
  else if (prev < N * 0.1 && k.idx > N * 0.9 && k.lap > 0) { k.lap--; k.checkpoint = true; }
  k.prevIdx = k.idx;
  // item boxes
  for (const b of boxes) if (b.m.visible && k.pos.distanceToSquared(tmp.copy(b.m.position).setY(0)) < 5.5) { b.m.visible = false; b.t = 3; if (!k.item && !k.roulette) { k.roulette = 1.1; if (!k.ai) sfx.item(); } }
  if (k.roulette > 0) { k.roulette -= dt; if (k.roulette <= 0) { k.roulette = 0; k.item = rollItem(k); } }
  // visuals
  k.root.position.copy(k.pos); k.root.rotation.y = k.h + (k.spin > 0 ? (1.1 - k.spin) * TAU * 1.8 : 0);
  k.steerVis += ((k.drift ? k.drift * 0.45 : steer * 0.12) - k.steerVis) * Math.min(1, dt * 8);
  k.body.rotation.y = k.steerVis; k.body.rotation.z = -steer * 0.05 * sf;
  if (k.hop > 0) { k.hop -= dt; k.body.position.y = Math.sin((0.25 - k.hop) / 0.25 * Math.PI) * 0.6; } else k.body.position.y = off ? Math.sin(raceT * 40) * 0.05 : 0;
  for (const w of k.wheels) w.rotation.x += k.speed * dt / 0.45;
  const sc = k.driftCharge > 1.6 ? 0xff8a1a : 0x40a0ff; const sv = k.drift && k.driftCharge > 0.4;
  k.sparks.forEach(s => { s.visible = sv && Math.random() < 0.8; s.material.color.setHex(sc); s.scale.setScalar(rnd(0.6, 1.3)); });
  if (sv && !k.ai && Math.random() < 0.15) sfx.spark();
  k.flame.visible = k.boost > 0; if (k.boost > 0) k.flame.scale.set(1, rnd(0.8, 1.4), 1);
}
function aiInput(k, dt) {
  const look = 10 + Math.floor(k.speed / 4), ti = (k.idx + look) % N, p = P[ti], l = L[ti];
  if (Math.random() < dt * 0.3) k.aiOff = clamp(k.aiOff + rnd(-3, 3), -5, 5);
  // dodge hazards ahead
  let off = k.aiOff;
  for (const h of hazards) if (h.type === 'banana') { const d = h.pos.distanceTo(k.pos); if (d < 18) { const hl = lateral(h.pos, nearest(h.pos, k.idx)); if (Math.abs(hl - off) < 2.5) off = hl > 0 ? hl - 4 : hl + 4; } }
  const tx = p.x + l.x * off, tz = p.z + l.z * off;
  const diff = wrapA(Math.atan2(tx - k.pos.x, tz - k.pos.z) - k.h);
  const curv = Math.abs(wrapA(Math.atan2(T[(k.idx + 40) % N].x, T[(k.idx + 40) % N].z) - Math.atan2(T[k.idx].x, T[k.idx].z)));
  // rubber band
  const gap = (player.lap * N + player.idx) - (k.lap * N + k.idx);
  k.aiSkill = clamp(0.9 + gap * 0.0006 + (k.ch === CHARS[0] ? 0.02 : 0), 0.84, 1.04);
  const inp = { steer: clamp(diff * 2.5, -1, 1), gas: true, brake: curv > 1.1 && k.speed > 34, drift: curv > 0.6 && Math.abs(diff) > 0.12 && k.speed > 25 };
  if (k.drift && Math.sign(diff) !== k.drift && Math.abs(diff) > 0.1) inp.drift = false;
  if (k.item) {
    k.aiItemT -= dt;
    if (k.aiItemT < 0) {
      let use = k.item === 'mushroom' ? curv < 0.3 : true;
      if (k.item === 'shell') use = karts.some(o => o !== k && o.pos.distanceTo(k.pos) < 45 && Math.abs(wrapA(Math.atan2(o.pos.x - k.pos.x, o.pos.z - k.pos.z) - k.h)) < 0.2) || k.aiItemT < -8;
      if (use) { useItem(k); k.aiItemT = rnd(1, 5); }
    }
  }
  return inp;
}
function stepHazards(dt) {
  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i]; h.life -= dt; let dead = h.life <= 0;
    if (h.type === 'shell') {
      h.pos.addScaledVector(h.vel, dt); h.m.rotation.y += dt * 12; h.idx = nearest(h.pos, h.idx); const lt = lateral(h.pos, h.idx);
      if (Math.abs(lt) > WALL - 0.8) { const n = L[h.idx].clone().multiplyScalar(Math.sign(lt)); h.vel.addScaledVector(n, -2 * h.vel.dot(n)); h.pos.addScaledVector(n, -(Math.abs(lt) - (WALL - 0.8))); }
    } else h.m.rotation.y += dt * 2;
    for (const k of karts) { if (h.type === 'shell' && h.owner === k && h.life > 4.6) continue; if (k.pos.distanceToSquared(tmp.copy(h.pos).setY(0)) < 3.2) { hitKart(k); dead = true; break; } }
    for (let j = 0; j < hazards.length && !dead; j++) if (j !== i && hazards[j].pos.distanceToSquared(h.pos) < 1.6) { hazards[j].life = 0; dead = true; }
    if (dead) { scene.remove(h.m); hazards.splice(i, 1); }
  }
}
function collide() {
  for (let i = 0; i < karts.length; i++) for (let j = i + 1; j < karts.length; j++) {
    const a = karts[i], b = karts[j], dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d2 = dx * dx + dz * dz, r = a.ch.big || b.ch.big ? 2.6 : 2.2;
    if (d2 < r * r && d2 > 1e-4) { const d = Math.sqrt(d2), p = (r - d) / 2; a.pos.x -= dx / d * p; a.pos.z -= dz / d * p; b.pos.x += dx / d * p; b.pos.z += dz / d * p; }
  }
}
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function updateCamera(dt, snap) {
  const k = player, h = k.h + (k.drift ? k.drift * 0.15 : 0), f = new THREE.Vector3(Math.sin(h), 0, Math.cos(h));
  const want = k.pos.clone().addScaledVector(f, -7.5).setY(3.4), look = k.pos.clone().addScaledVector(f, 5).setY(1.3);
  if (snap) { camPos.copy(want); camLook.copy(look); } else { camPos.lerp(want, Math.min(1, dt * 6)); camLook.lerp(look, Math.min(1, dt * 10)); }
  camera.position.copy(camPos); camera.lookAt(camLook);
  const fov = 68 + (k.boost > 0 ? 10 : 0) + k.speed * 0.08; camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix();
}

// ---------- main loop ----------
const TS = +Q.get('timescale') || 1;
function sim(dt) {
    if (state === 'countdown') {
      countdown -= dt; const c = Math.ceil(countdown);
      if (c !== lastCount && c > 0) { bigText(String(c)); sfx.beep(); lastCount = c; }
      if (countdown <= 0) { state = 'race'; bigText('GO!'); sfx.go(); autoGas = false; }
      updateCamera(dt, countdown > 3.9);
      for (const k of karts) { k.root.position.copy(k.pos); k.root.rotation.y = k.h; }
    } else {
      raceT += dt;
      const pin = input();
      if (state === 'finished') { pin.steer = 0; pin.drift = false; pin.item = false; }
      for (const k of karts) {
        const inp = (k.ai || state === 'finished') && k !== player ? aiInput(k, dt) : (k === player && (state === 'finished' || Q.has('autopilot')) ? aiInput(k, dt) : pin);
        stepKart(k, dt, inp);
      }
      if (pin.item && !prevItem && state === 'race') useItem(player); prevItem = pin.item;
      collide(); stepHazards(dt); updateCamera(dt);
      if (ac) { engOsc.frequency.setTargetAtTime(55 + Math.abs(player.speed) * 4 + (player.boost > 0 ? 60 : 0), ac.currentTime, 0.05); engGain.gain.setTargetAtTime(muted ? 0 : 0.05, ac.currentTime, 0.1); }
    }
}

let last = performance.now(), titleT = 0, hudT = 0;
setupRace(0);
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  for (const b of boxes) { b.m.rotation.y += dt * 1.5; b.m.rotation.x += dt; b.m.position.y = 1.4 + Math.sin(now / 300 + b.m.position.x) * 0.2; if (!b.m.visible && (b.t -= dt) <= 0) b.m.visible = true; }
  if (state === 'title' || state === 'select') {
    titleT += dt * 0.12; const c = P[0];
    camera.position.set(c.x + Math.cos(titleT) * 26, 9, c.z - 10 + Math.sin(titleT) * 26); camera.lookAt(c.x, 1, c.z - 14);
    if (POSTER) { { const a = P[N - 58], b = P[N - 20]; camera.position.set(a.x + L[N-58].x * 4, 5, a.z + L[N-58].z * 6); camera.lookAt(b.x, 1.5, b.z); } }
  } else {
    for (let i = 0; i < TS; i++) sim(TS > 1 ? 1 / 30 : dt);
    if ((hudT += dt) > 0.05) { hudT = 0; updateHUD(); }
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);
if (POSTER) { document.body.classList.add('poster'); }
let frames=0; setInterval(()=>{window.__fps=frames;frames=0},1000); const _r=renderer.render.bind(renderer); renderer.render=(a,b)=>{frames++;_r(a,b)};
window.__game = { get state() { return state; }, karts: () => karts };
