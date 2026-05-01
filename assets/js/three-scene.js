/**
 * three-scene.js — Realistic procedural Earth + Starfield
 */
(function () {
  'use strict';

  // ── STARFIELD ────────────────────────────────
  const cvs = document.getElementById('canvas-bg');
  const ctx = cvs.getContext('2d');
  let W, H;
  function resize() { W = cvs.width = window.innerWidth; H = cvs.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  const STAR_COUNT = 280;
  const stars = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random(),
    size: Math.random() * 1.4 + 0.3, speed: Math.random() * 0.00015 + 0.00005,
    opacity: Math.random() * 0.8 + 0.2, twinkle: Math.random() * Math.PI * 2,
    twinkleSpeed: Math.random() * 0.02 + 0.005,
  }));
  const shoots = [];
  const mp = { x: 0, y: 0 };
  document.addEventListener('mousemove', e => {
    mp.x = (e.clientX / window.innerWidth - 0.5) * 0.02;
    mp.y = (e.clientY / window.innerHeight - 0.5) * 0.02;
  });

  function addShoot() {
    if (Math.random() < 0.003) shoots.push({
      x: Math.random() * W, y: Math.random() * H * 0.4,
      vx: (Math.random() - 0.5) * 8, vy: Math.random() * 4 + 2,
      len: Math.random() * 100 + 60, life: 1,
    });
  }

  function drawStars() {
    ctx.clearRect(0, 0, W, H);
    const grad = ctx.createRadialGradient(W * 0.6, H * 0.3, 0, W * 0.6, H * 0.3, W * 0.8);
    grad.addColorStop(0, 'rgba(20,35,80,0.3)');
    grad.addColorStop(0.5, 'rgba(8,12,26,0.1)');
    grad.addColorStop(1, 'rgba(4,6,15,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    stars.forEach(s => {
      s.twinkle += s.twinkleSpeed; s.z -= s.speed;
      if (s.z <= 0) s.z = 1;
      const sx = (s.x / s.z) * W * 0.5 + W * 0.5 + mp.x * W * (1 - s.z);
      const sy = (s.y / s.z) * H * 0.5 + H * 0.5 + mp.y * H * (1 - s.z);
      const sz = s.size * (1 - s.z) * 0.8 + 0.2;
      const op = s.opacity * (0.7 + Math.sin(s.twinkle) * 0.3);
      if (sx < 0 || sx > W || sy < 0 || sy > H) return;
      if (sz > 1) {
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, sz * 3);
        g.addColorStop(0, `rgba(180,210,255,${op * 0.4})`);
        g.addColorStop(1, 'rgba(180,210,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, sz * 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = `rgba(200,220,255,${op})`; ctx.beginPath(); ctx.arc(sx, sy, sz, 0, Math.PI * 2); ctx.fill();
    });
    addShoot();
    for (let i = shoots.length - 1; i >= 0; i--) {
      const s = shoots[i];
      s.x += s.vx; s.y += s.vy; s.life -= 0.025;
      if (s.life <= 0 || s.x < 0 || s.x > W || s.y > H) { shoots.splice(i, 1); continue; }
      const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx / 8 * s.len, s.y - s.vy / 8 * s.len);
      g.addColorStop(0, `rgba(200,220,255,${s.life * 0.9})`);
      g.addColorStop(1, 'rgba(200,220,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx / 8 * s.len, s.y - s.vy / 8 * s.len);
      ctx.stroke();
    }
  }

  // ── REALISTIC EARTH ──────────────────────────
  const ec = document.getElementById('earth-canvas');
  const ectx = ec ? ec.getContext('2d') : null;
  const EW = 480, EH = 480, ER = 218, CX = EW / 2, CY = EH / 2;

  // ── Build procedural texture ──────────────────
  const TEX_W = 1024, TEX_H = 512;
  const texCanvas = document.createElement('canvas');
  texCanvas.width = TEX_W; texCanvas.height = TEX_H;
  const tctx = texCanvas.getContext('2d');

  function hash(x, y) { return Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1; }
  function smoothNoise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return hash(ix, iy) * (1 - ux) * (1 - uy) + hash(ix + 1, iy) * ux * (1 - uy) +
           hash(ix, iy + 1) * (1 - ux) * uy + hash(ix + 1, iy + 1) * ux * uy;
  }
  function fbm(x, y, oct) {
    let v = 0, a = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += a * smoothNoise(x * f, y * f); a *= 0.5; f *= 2.1; }
    return v;
  }

  const imgData = tctx.createImageData(TEX_W, TEX_H);
  const td = imgData.data;

  for (let py = 0; py < TEX_H; py++) {
    const latN = py / TEX_H; // 0=north pole, 1=south pole
    const lat = (latN - 0.5) * Math.PI;
    for (let px = 0; px < TEX_W; px++) {
      const idx = (py * TEX_W + px) * 4;
      const nx = px / TEX_W * 6;
      const ny = py / TEX_H * 3;
      const landMask = fbm(nx, ny, 7);
      const isLand = landMask > 0.502;
      const isPolar = latN < 0.09 || latN > 0.91;
      const isSubPolar = latN < 0.14 || latN > 0.86;
      let r = 0, g = 0, b = 0;

      if (isPolar) {
        const n = 0.88 + smoothNoise(px / 6, py / 6) * 0.12;
        r = Math.round(215 * n); g = Math.round(228 * n); b = Math.round(242 * n);
      } else if (isLand) {
        const mountain = fbm(nx * 2.4 + 7.3, ny * 2.4 + 2.1, 5);
        const desert = fbm(nx * 1.4 + 3.0, ny * 1.4 + 1.0, 4);
        if (isSubPolar) {
          // Tundra / boreal
          const v = 0.7 + smoothNoise(px / 10, py / 10) * 0.3;
          r = Math.round(72 * v); g = Math.round(95 * v); b = Math.round(62 * v);
        } else if (latN > 0.35 && latN < 0.65) {
          // Tropics
          if (desert > 0.545) {
            // Desert — warm sandy tan
            const v = 0.82 + smoothNoise(px / 12, py / 12) * 0.18;
            r = Math.round(198 * v); g = Math.round(168 * v); b = Math.round(92 * v);
          } else {
            // Tropical forest — deep rich green
            const v = 0.72 + smoothNoise(px / 15, py / 15) * 0.28;
            r = Math.round(25 * v); g = Math.round(88 * v); b = Math.round(38 * v);
          }
        } else {
          // Temperate
          const forest = smoothNoise(px / 22, py / 22);
          if (forest > 0.48) {
            const v = 0.75 + smoothNoise(px / 18, py / 18) * 0.25;
            r = Math.round(42 * v); g = Math.round(98 * v); b = Math.round(52 * v);
          } else {
            const v = 0.78 + smoothNoise(px / 20, py / 20) * 0.22;
            r = Math.round(115 * v); g = Math.round(145 * v); b = Math.round(62 * v);
          }
        }
        // Rocky mountains
        if (mountain > 0.60) {
          const mv = 0.72 + mountain * 0.28;
          r = Math.round(r * 0.4 + 128 * mv * 0.6);
          g = Math.round(g * 0.4 + 122 * mv * 0.6);
          b = Math.round(b * 0.4 + 115 * mv * 0.6);
        }
        // Snow on peaks
        if (mountain > 0.68 && (latN < 0.4 || latN > 0.6)) {
          const sf = (mountain - 0.68) / 0.32;
          r = Math.round(r * (1 - sf) + 225 * sf);
          g = Math.round(g * (1 - sf) + 232 * sf);
          b = Math.round(b * (1 - sf) + 240 * sf);
        }
      } else {
        // Ocean
        const depth = fbm(nx * 0.7 + 1.5, ny * 0.7 + 0.5, 4);
        if (depth > 0.56) {
          // Shallow — warm teal
          const v = 0.82 + smoothNoise(px / 22, py / 22) * 0.18;
          r = Math.round(16 * v); g = Math.round(98 * v); b = Math.round(158 * v);
        } else {
          // Deep ocean
          const v = 0.72 + smoothNoise(px / 28, py / 28) * 0.28;
          r = Math.round(6 * v); g = Math.round(48 * v); b = Math.round(110 * v);
        }
        // Sub-polar ocean ice
        if (isSubPolar) {
          const mix = latN < 0.14
            ? Math.min(1, (0.14 - latN) / 0.05)
            : Math.min(1, (latN - 0.86) / 0.05);
          r = Math.round(r * (1 - mix) + 175 * mix);
          g = Math.round(g * (1 - mix) + 205 * mix);
          b = Math.round(b * (1 - mix) + 228 * mix);
        }
      }

      td[idx]     = Math.max(0, Math.min(255, r));
      td[idx + 1] = Math.max(0, Math.min(255, g));
      td[idx + 2] = Math.max(0, Math.min(255, b));
      td[idx + 3] = 255;
    }
  }
  tctx.putImageData(imgData, 0, 0);

  // ── Cloud texture ──────────────────────────────
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = TEX_W; cloudCanvas.height = TEX_H;
  const cctx = cloudCanvas.getContext('2d');
  const cloudImg = cctx.createImageData(TEX_W, TEX_H);
  const cd = cloudImg.data;
  for (let py = 0; py < TEX_H; py++) {
    for (let px = 0; px < TEX_W; px++) {
      const idx = (py * TEX_W + px) * 4;
      const c = fbm(px / TEX_W * 9 + 20, py / TEX_H * 4.5 + 20, 6);
      const alpha = Math.max(0, Math.min(1, (c - 0.46) / 0.28));
      cd[idx] = 255; cd[idx + 1] = 255; cd[idx + 2] = 255;
      cd[idx + 3] = Math.round(alpha * 195);
    }
  }
  cctx.putImageData(cloudImg, 0, 0);

  // ── Sphere renderer ────────────────────────────
  let earthRot = 0, cloudRot = 0;

  function drawEarth() {
    if (!ectx) return;
    earthRot = (earthRot + 0.0012) % 1.0;
    cloudRot = (cloudRot + 0.0020) % 1.0;
    ectx.clearRect(0, 0, EW, EH);

    ectx.save();
    ectx.beginPath(); ectx.arc(CX, CY, ER, 0, Math.PI * 2); ectx.clip();

    // Scrolling earth texture
    const offX = earthRot * TEX_W;
    const dw = EW * 1.06, dh = EH * 1.03;
    const dx = CX - dw / 2, dy = CY - dh / 2;
    const src1 = offX % TEX_W;
    const frac1 = (TEX_W - src1) / TEX_W;
    ectx.drawImage(texCanvas, src1, 0, TEX_W - src1, TEX_H, dx, dy, dw * frac1, dh);
    if (src1 > 0) ectx.drawImage(texCanvas, 0, 0, src1, TEX_H, dx + dw * frac1, dy, dw * (1 - frac1), dh);

    // Limb darkening — sphere edge
    const limb = ectx.createRadialGradient(CX, CY, ER * 0.52, CX, CY, ER);
    limb.addColorStop(0, 'rgba(0,0,0,0)');
    limb.addColorStop(0.65, 'rgba(0,0,12,0.08)');
    limb.addColorStop(0.84, 'rgba(0,0,20,0.38)');
    limb.addColorStop(1, 'rgba(0,0,28,0.80)');
    ectx.fillStyle = limb; ectx.fillRect(0, 0, EW, EH);

    // Cloud layer
    ectx.globalAlpha = 0.68;
    const cOff = cloudRot * TEX_W;
    const cSrc = cOff % TEX_W;
    const cfrac = (TEX_W - cSrc) / TEX_W;
    ectx.drawImage(cloudCanvas, cSrc, 0, TEX_W - cSrc, TEX_H, dx, dy, dw * cfrac, dh);
    if (cSrc > 0) ectx.drawImage(cloudCanvas, 0, 0, cSrc, TEX_H, dx + dw * cfrac, dy, dw * (1 - cfrac), dh);
    ectx.globalAlpha = 1;

    // Night-side terminator
    const shad = ectx.createRadialGradient(CX + 160, CY, 0, CX + 168, CY, ER * 1.32);
    shad.addColorStop(0, 'rgba(0,0,10,0)');
    shad.addColorStop(0.25, 'rgba(0,0,18,0.18)');
    shad.addColorStop(0.52, 'rgba(0,0,22,0.62)');
    shad.addColorStop(0.78, 'rgba(0,0,28,0.84)');
    shad.addColorStop(1, 'rgba(0,0,28,0.90)');
    ectx.fillStyle = shad; ectx.fillRect(0, 0, EW, EH);

    // Specular sun highlight
    const spec = ectx.createRadialGradient(CX - 72, CY - 72, 0, CX - 52, CY - 52, 125);
    spec.addColorStop(0, 'rgba(255,255,245,0.20)');
    spec.addColorStop(0.4, 'rgba(255,255,230,0.06)');
    spec.addColorStop(1, 'rgba(255,255,230,0)');
    ectx.fillStyle = spec; ectx.fillRect(0, 0, EW, EH);

    // Atmosphere rim (inside)
    const atmo = ectx.createRadialGradient(CX, CY, ER - 16, CX, CY, ER);
    atmo.addColorStop(0, 'rgba(79,150,255,0)');
    atmo.addColorStop(0.55, 'rgba(79,150,255,0.09)');
    atmo.addColorStop(1, 'rgba(110,175,255,0.55)');
    ectx.fillStyle = atmo; ectx.fillRect(0, 0, EW, EH);

    ectx.restore();

    // Outer atmosphere glow
    const glow = ectx.createRadialGradient(CX, CY, ER, CX, CY, ER + 50);
    glow.addColorStop(0, 'rgba(79,142,247,0.40)');
    glow.addColorStop(0.42, 'rgba(79,142,247,0.12)');
    glow.addColorStop(1, 'rgba(79,142,247,0)');
    ectx.fillStyle = glow;
    ectx.beginPath(); ectx.arc(CX, CY, ER + 50, 0, Math.PI * 2); ectx.fill();
  }

  function loop() { requestAnimationFrame(loop); drawStars(); drawEarth(); }
  requestAnimationFrame(loop);

  window.SB = window.SB || {};
  window.SB.drawEarth = drawEarth;
})();