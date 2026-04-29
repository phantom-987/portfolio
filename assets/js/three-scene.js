(function () {
  'use strict';

  const canvas = document.getElementById('starfield-canvas');
  const scene    = new THREE.Scene();
  const camera   = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  canvas.appendChild(renderer.domElement);

  // ─── STATE ───────────────────────────────────
  const state = {
    isLight       : document.body.classList.contains('light-mode'),
    isInsideEarth : false,
    zoomProgress  : 0,
    zoomDir       : 0,
    zoomStartTime : null,
    ZOOM_DURATION : 2.4,
    mouse   : new THREE.Vector2(0, 0),
    smoothM : new THREE.Vector2(0, 0),
    scroll  : 0,
  };

  // ─── HELPERS ─────────────────────────────────
  const lerp  = (a, b, t) => a + (b - a) * t;
  const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
  const ease3 = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3) / 2;

  function lerpV3(out, a, b, t) {
    out.x = lerp(a.x, b.x, t);
    out.y = lerp(a.y, b.y, t);
    out.z = lerp(a.z, b.z, t);
  }

  // ─── TEXTURES ────────────────────────────────
  const loader   = new THREE.TextureLoader();
  const earthTex = loader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg');
  const moonTex  = loader.load('https://threejs.org/examples/textures/planets/moon_1024.jpg');
  const cloudTex = loader.load('https://threejs.org/examples/textures/planets/earth_clouds_1024.png');

  // ─── PROCEDURAL CLOUD TEXTURE ────────────────
  function makeCloudTexture(w, h) {
    const cvs = document.createElement('canvas');
    cvs.width = w; cvs.height = h;
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) {
      const x  = Math.random() * w;
      const y  = Math.random() * h;
      const rx = 40 + Math.random() * 120;
      const ry = 20 + Math.random() * 50;
      const g  = ctx.createRadialGradient(x, y, 0, x, y, rx);
      g.addColorStop(0,   'rgba(255,255,255,0.55)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.2)');
      g.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.save();
      ctx.scale(1, ry / rx);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y * (rx / ry), rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    return new THREE.CanvasTexture(cvs);
  }

  // ─── LIGHTING ────────────────────────────────
  const lights = (() => {
    const sun    = new THREE.PointLight(0xffffff, 2.0);
    sun.position.set(5, 3, 5);
    const ambient = new THREE.AmbientLight(0x404060, 1.0);
    const sunDay  = new THREE.DirectionalLight(0xfff4c2, 0.0);
    sunDay.position.set(4, 6, 3);
    const sky  = new THREE.AmbientLight(0x88ccff, 0.0);
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0xffd580, 0.0);
    scene.add(sun, ambient, sunDay, sky, hemi);
    return { sun, ambient, sunDay, sky, hemi };
  })();

  // ─── EARTH ───────────────────────────────────
  const earth = (() => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 64, 64),
      new THREE.MeshStandardMaterial({ map: earthTex })
    );
    const atmosD = new THREE.Mesh(
      new THREE.SphereGeometry(1.28, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x0044ff, transparent: true, opacity: 0.12 })
    );
    const atmosL = new THREE.Mesh(
      new THREE.SphereGeometry(1.35, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x87ceeb, transparent: true, opacity: 0 })
    );
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1.18, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x87ceeb, transparent: true, opacity: 0, side: THREE.BackSide })
    );
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.22, 64, 64),
      new THREE.MeshBasicMaterial({
        map: cloudTex, transparent: true,
        opacity: 0, side: THREE.BackSide, depthWrite: false
      })
    );
    scene.add(mesh, atmosD, atmosL, sky, clouds);
    return { mesh, atmosD, atmosL, sky, clouds };
  })();

  // ─── SUN OBJECT ──────────────────────────────
  const sunObj = (() => {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xfffde0 })
    );
    const glowMat = new THREE.SpriteMaterial({
      color: 0xffd700, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(0.7, 0.7, 1);
    core.add(glow);

    const outerMat = new THREE.SpriteMaterial({
      color: 0xff8800, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const outer = new THREE.Sprite(outerMat);
    outer.scale.set(1.4, 1.4, 1);
    core.add(outer);

    core.visible = false;
    core.position.set(0.8, 0.55, -0.5);
    scene.add(core);
    return { core, glow, glowMat, outer, outerMat };
  })();

  // ─── GOD RAYS ────────────────────────────────
  const godRays = (() => {
    const rays = [];
    for (let i = 0; i < 7; i++) {
      const angle  = (i / 7) * Math.PI * 2;
      const length = 0.4 + Math.random() * 0.5;
      const width  = 0.03 + Math.random() * 0.04;
      const geo    = new THREE.PlaneGeometry(width, length);
      geo.translate(0, length / 2, 0);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfff5c0, transparent: true, opacity: 0,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(sunObj.core.position);
      mesh.rotation.z = angle;
      scene.add(mesh);
      rays.push({ mesh, mat, angle, phase: Math.random() * Math.PI * 2 });
    }
    return rays;
  })();

  // ─── CLOUD PLANES ────────────────────────────
  const cloudPlanes = (() => {
    const layers = [];
    const configs = [
      { z: -0.1, y:  0.28, scale: 0.55, speed: 0.00018, opacity: 0.75, count: 5 },
      { z:  0.1, y:  0.10, scale: 0.40, speed: 0.00026, opacity: 0.55, count: 4 },
      { z:  0.3, y: -0.10, scale: 0.30, speed: 0.00035, opacity: 0.40, count: 4 },
    ];
    configs.forEach(cfg => {
      const tex = makeCloudTexture(512, 256);
      for (let i = 0; i < cfg.count; i++) {
        const mat = new THREE.MeshBasicMaterial({
          map: tex, transparent: true, opacity: 0,
          depthWrite: false, side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(cfg.scale * 1.8, cfg.scale * 0.9), mat);
        mesh.position.set(
          (Math.random() - 0.5) * 3.5,
          cfg.y + (Math.random() - 0.5) * 0.15,
          cfg.z
        );
        mesh.visible = false;
        scene.add(mesh);
        layers.push({ mesh, mat, cfg });
      }
    });
    return layers;
  })();

  // ─── GOLDEN DUST ─────────────────────────────
  const dust = (() => {
    const COUNT = 280;
    const pos   = new Float32Array(COUNT * 3);
    const vel   = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i*3]   = (Math.random() - 0.5) * 4;
      pos[i*3+1] = (Math.random() - 0.5) * 3;
      pos[i*3+2] = (Math.random() - 0.5) * 2;
      vel[i*3]   = (Math.random() - 0.5) * 0.0005;
      vel[i*3+1] = Math.random() * 0.0003 + 0.0001;
      vel[i*3+2] = 0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffd580, size: 0.022, transparent: true, opacity: 0,
      sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    scene.add(pts);
    return { pts, vel };
  })();

  // ─── STARFIELD ───────────────────────────────
  const stars = (() => {
    function makeLayer(count, size, spread, color) {
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i*3]   = (Math.random() - 0.5) * spread;
        pos[i*3+1] = (Math.random() - 0.5) * spread;
        pos[i*3+2] = (Math.random() - 0.5) * spread * 0.5;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({
        color, size, transparent: true, opacity: 0.85, sizeAttenuation: true
      }));
      scene.add(pts);
      return pts;
    }
    return {
      back  : makeLayer(1800, 0.018, 60, 0xaaaaff),
      mid   : makeLayer(900,  0.030, 40, 0xccddff),
      front : makeLayer(300,  0.055, 25, 0xffffff),
    };
  })();

  // ─── DARK PARTICLES ──────────────────────────
  const darkParts = (() => {
    const COUNT = 300;
    const pos   = new Float32Array(COUNT * 3);
    const vel   = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i*3]   = (Math.random() - 0.5) * 10;
      pos[i*3+1] = (Math.random() - 0.5) * 6;
      pos[i*3+2] = (Math.random() - 0.5) * 4 - 1;
      vel[i*3]   = (Math.random() - 0.5) * 0.0008;
      vel[i*3+1] = (Math.random() - 0.5) * 0.0005;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0x6c63ff, size: 0.03, transparent: true, opacity: 0.35, sizeAttenuation: true,
    }));
    scene.add(pts);
    return { pts, vel };
  })();

  // ─── MOON ────────────────────────────────────
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 32, 32),
    new THREE.MeshStandardMaterial({ map: moonTex })
  );
  scene.add(moon);

  // ─── PLANETS ─────────────────────────────────
  const planets = [
    { color: 0xc2773a, size: 0.18, r: 2.8, speed: 0.30, tilt: 0.1,  ring: false },
    { color: 0xe8b84a, size: 0.35, r: 3.8, speed: 0.18, tilt: 0.05, ring: false },
    { color: 0xd4b483, size: 0.28, r: 4.9, speed: 0.12, tilt: 0.30, ring: true  },
  ].map(d => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(d.size, 32, 32),
      new THREE.MeshStandardMaterial({ color: d.color })
    );
    if (d.ring) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(d.size * 1.4, d.size * 2.2, 64),
        new THREE.MeshBasicMaterial({ color: 0xc8a97a, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
      );
      ring.rotation.x = Math.PI / 2.5;
      mesh.add(ring);
    }
    scene.add(mesh);
    return { mesh, angle: Math.random() * Math.PI * 2, ...d };
  });

  // ─── SATELLITES ──────────────────────────────
  function makeSat(bc, wc, r) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(r,8,8), new THREE.MeshBasicMaterial({ color: bc })));
    const wm = new THREE.MeshBasicMaterial({ color: wc });
    const wg = new THREE.BoxGeometry(r*3, r*0.3, r);
    [-1,1].forEach(s => { const w = new THREE.Mesh(wg,wm); w.position.x = s*r*2.2; g.add(w); });
    scene.add(g);
    return g;
  }
  const sat1 = makeSat(0xffcc00, 0x4488ff, 0.04);
  const sat2 = makeSat(0xff8800, 0x44aaff, 0.03);

  // ─── DATA NODES ──────────────────────────────
  const dataNodes = (() => {
    function latLon(lat, lon, r) {
      const phi = (90-lat)*Math.PI/180, th = (lon+180)*Math.PI/180;
      return new THREE.Vector3(-r*Math.sin(phi)*Math.cos(th), r*Math.cos(phi), r*Math.sin(phi)*Math.sin(th));
    }
    const cities  = [[28.6,77.2],[40.7,-74],[51.5,-0.1],[35.7,139.6],[-33.9,151.2],[1.4,103.8]];
    const nodeGeo = new THREE.SphereGeometry(0.022,8,8);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 });
    const nodes   = cities.map(([lat,lon]) => {
      const pos = latLon(lat,lon,1.22);
      const mesh = new THREE.Mesh(nodeGeo, new THREE.MeshBasicMaterial({ color: 0x00ffff }));
      mesh.position.copy(pos);
      scene.add(mesh);
      return { mesh, pos };
    });
    nodes.forEach(({pos:a},i) => nodes.forEach(({pos:b},j) => {
      if (i>=j || Math.random()>0.55) return;
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]), lineMat));
    }));
    return nodes;
  })();

  // ─── SKY GRADIENT PALETTES ───────────────────
  const SKY_PALETTES = [
    { top: '#ff9a76', mid: '#ffcba4', bot: '#ffe4c4' }, // dawn
    { top: '#4facfe', mid: '#87ceeb', bot: '#e0f4ff' }, // morning
    { top: '#1565c0', mid: '#42a5f5', bot: '#e3f2fd' }, // noon
    { top: '#f9731c', mid: '#ffc947', bot: '#fff3e0' }, // golden hour
    { top: '#7b2d8b', mid: '#ff6b6b', bot: '#ffb347' }, // dusk
  ];

  function getSkyColors(t) {
    const cycle = t * 0.012;
    const idx   = Math.floor(cycle % SKY_PALETTES.length);
    const next  = (idx + 1) % SKY_PALETTES.length;
    const blend = cycle % 1;
    const a = SKY_PALETTES[idx], b = SKY_PALETTES[next];

    function hex2rgb(h) {
      return { r: parseInt(h.slice(1,3),16), g: parseInt(h.slice(3,5),16), b: parseInt(h.slice(5,7),16) };
    }
    function mix(ca, cb, t) {
      const ra=hex2rgb(ca), rb=hex2rgb(cb);
      return `rgb(${Math.round(lerp(ra.r,rb.r,t))},${Math.round(lerp(ra.g,rb.g,t))},${Math.round(lerp(ra.b,rb.b,t))})`;
    }
    return {
      top : mix(a.top, b.top, blend),
      mid : mix(a.mid, b.mid, blend),
      bot : mix(a.bot, b.bot, blend),
    };
  }

  function applySkyCss(colors, opacity) {
    if (opacity <= 0) {
      document.documentElement.style.setProperty('--sky-opacity', '0');
      return;
    }
    const grad = `linear-gradient(180deg, ${colors.top} 0%, ${colors.mid} 50%, ${colors.bot} 100%)`;
    document.documentElement.style.setProperty('--sky-gradient', grad);
    document.documentElement.style.setProperty('--sky-opacity',  opacity.toFixed(3));
  }

  // ─── CAMERA CONSTANTS ────────────────────────
  const CAM_SPACE   = new THREE.Vector3(0, 0, 5);
  const CAM_SURFACE = new THREE.Vector3(0, 0.1, 1.19);

  // ─── EVENTS ──────────────────────────────────
  window.addEventListener('mousemove', e => {
    state.mouse.x =  (e.clientX / window.innerWidth  - 0.5) * 2;
    state.mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
  });
  window.addEventListener('touchmove', e => {
    state.mouse.x =  (e.touches[0].clientX / window.innerWidth  - 0.5) * 2;
    state.mouse.y = -(e.touches[0].clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
  window.addEventListener('scroll', () => {
    const max = document.body.scrollHeight - window.innerHeight;
    state.scroll = max > 0 ? window.scrollY / max : 0;
  });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });
  new MutationObserver(() => {
    const wasLight = state.isLight;
    state.isLight  = document.body.classList.contains('light-mode');
    if (state.isLight && !wasLight)  { state.zoomDir = 1;  state.zoomStartTime = null; }
    if (!state.isLight && wasLight)  { state.zoomDir = -1; state.zoomStartTime = null; }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // ─── UPDATE FUNCTIONS ────────────────────────

  function updateMouse() {
    state.smoothM.x = lerp(state.smoothM.x, state.mouse.x, 0.06);
    state.smoothM.y = lerp(state.smoothM.y, state.mouse.y, 0.06);
  }

  function updateZoom(t) {
    if (state.zoomDir === 0) return;
    if (state.zoomStartTime === null) state.zoomStartTime = t;
    const raw = clamp((t - state.zoomStartTime) / state.ZOOM_DURATION, 0, 1);
    state.zoomProgress = state.zoomDir === 1 ? ease3(raw) : 1 - ease3(raw);
    if (raw >= 1) { state.zoomDir = 0; state.isInsideEarth = state.isLight; }
  }

  function updateCamera() {
    const z = state.zoomProgress;
    const basePos = new THREE.Vector3();
    lerpV3(basePos, CAM_SPACE, CAM_SURFACE, z);
    if (!state.isLight && z < 0.05) {
      basePos.z += lerp(0, 1.0, state.scroll);
      basePos.x  = lerp(0, 1.5, state.scroll);
    }
    const px = lerp(0.12, 0, z);
    basePos.x += state.smoothM.x * px;
    basePos.y += state.smoothM.y * px * 0.6;
    camera.position.lerp(basePos, 0.05);
    if (z > 0.02) camera.lookAt(0, 0, 0);
  }

  function updateEarth() {
    const z = state.zoomProgress;
    earth.mesh.rotation.y += 0.0015;
    if (!state.isInsideEarth) {
      earth.mesh.rotation.x = lerp(earth.mesh.rotation.x, state.smoothM.y * 0.15, 0.04);
    }
    earth.atmosD.rotation.copy(earth.mesh.rotation);
    earth.atmosL.rotation.copy(earth.mesh.rotation);
    earth.clouds.rotation.y = earth.mesh.rotation.y * 0.97;

    earth.atmosD.material.opacity = lerp(0.12, 0, z);
    earth.atmosL.material.opacity = lerp(0, 0.22, z);
    earth.clouds.material.opacity = clamp((z - 0.55) * 2.5 * 0.55, 0, 0.55);
    earth.sky.material.opacity    = clamp((z - 0.5)  * 2.0 * 0.6,  0, 0.6);
    earth.clouds.visible = z > 0.5;
    earth.sky.visible    = z > 0.5;

    if (!state.isLight && z < 0.05) {
      const s = 1 - state.scroll * 0.3;
      earth.mesh.scale.setScalar(s);
      earth.atmosD.scale.setScalar(s);
      earth.mesh.position.x = state.scroll * 1.5;
    } else {
      earth.mesh.scale.setScalar(1);
      earth.mesh.position.x = lerp(earth.mesh.position.x, 0, 0.04);
    }
  }

  function updateStars(t) {
    const fadeOp = clamp(1 - state.zoomProgress * 2, 0, 1);
    Object.values(stars).forEach((s, i) => {
      s.visible = fadeOp > 0.01;
      s.material.opacity = fadeOp * (0.75 + Math.sin(t * 1.2 + i) * 0.1);
    });
    const mx = state.smoothM.x, my = state.smoothM.y;
    stars.back.position.set(mx*0.25, -my*0.25, 0);
    stars.mid.position.set( mx*0.50, -my*0.50, 0);
    stars.front.position.set(mx*1.0, -my*1.00, 0);
    stars.back.rotation.y  = t * 0.006;
    stars.mid.rotation.y   = t * 0.010;
    stars.front.rotation.y = t * 0.016;
  }

  function updateDarkParticles(t) {
    if (state.isLight) { darkParts.pts.visible = false; return; }
    darkParts.pts.visible = true;
    const attr = darkParts.pts.geometry.attributes.position;
    const pos  = attr.array, vel = darkParts.vel;
    for (let i = 0; i < pos.length/3; i++) {
      pos[i*3]   += vel[i*3];
      pos[i*3+1] += vel[i*3+1];
      pos[i*3+2] += Math.sin(t*0.3+i)*0.00015;
      if (pos[i*3]   >  5) pos[i*3]   = -5;
      if (pos[i*3]   < -5) pos[i*3]   =  5;
      if (pos[i*3+1] >  3) pos[i*3+1] = -3;
      if (pos[i*3+1] < -3) pos[i*3+1] =  3;
    }
    attr.needsUpdate = true;
    darkParts.pts.position.set(state.smoothM.x*0.18, -state.smoothM.y*0.18, 0);
  }

  function updateMoon(t) {
    const vis = state.zoomProgress < 0.85 && !state.isLight;
    moon.visible = vis;
    if (!vis) return;
    moon.position.set(Math.cos(t*0.4)*2, Math.sin(t*0.15)*0.3, Math.sin(t*0.4)*2);
    moon.rotation.y += 0.003;
  }

  function updatePlanets() {
    const vis = !state.isLight && state.zoomProgress < 0.85;
    planets.forEach(p => {
      p.mesh.visible = vis;
      if (!vis) return;
      p.angle += p.speed * 0.01;
      p.mesh.position.set(Math.cos(p.angle)*p.r, Math.sin(p.angle*0.5)*p.tilt, Math.sin(p.angle)*p.r);
      p.mesh.rotation.y += 0.008;
    });
  }

  function updateSatellites(t) {
    const vis = state.zoomProgress < 0.85;
    sat1.visible = sat2.visible = vis;
    if (!vis) return;
    sat1.position.set(Math.cos(t*0.6)*1.8, Math.sin(t*0.35)*0.5, Math.sin(t*0.6)*1.8);
    sat1.rotation.y += 0.05;
    sat2.position.set(Math.sin(t*0.8)*0.66, Math.cos(t*0.8)*1.485, Math.cos(t*0.8)*1.65);
  }

  function updateNodes(t) {
    const vis = state.zoomProgress < 0.4;
    dataNodes.forEach((n,i) => {
      n.mesh.visible = vis;
      if (!vis) return;
      const s = 1 + Math.sin(t*2+i)*0.35;
      n.mesh.scale.setScalar(s);
    });
  }

  function updateSun(t) {
    const z = state.zoomProgress;
    sunObj.core.visible = z > 0.65;
    if (!sunObj.core.visible) { godRays.forEach(r => { r.mesh.visible = false; }); return; }

    const fadeIn = clamp((z - 0.65) * 3, 0, 1);
    sunObj.core.position.set(
      0.75 + Math.sin(t*0.07)*0.06,
      0.52 + Math.cos(t*0.05)*0.04,
      -0.5
    );

    const pulse = 0.55 + Math.sin(t*1.8)*0.12;
    // Lens flare on cursor proximity
    const dx = state.smoothM.x - sunObj.core.position.x * 0.5;
    const dy = state.smoothM.y - sunObj.core.position.y * 0.5;
    const boost = clamp(1 - Math.sqrt(dx*dx+dy*dy)*0.6, 0, 1) * 0.4;

    sunObj.glowMat.opacity  = fadeIn * pulse * 0.9  + boost;
    sunObj.outerMat.opacity = fadeIn * pulse * 0.45 + boost * 0.5;

    godRays.forEach(r => {
      r.mesh.visible = true;
      r.mesh.position.copy(sunObj.core.position);
      r.angle += 0.0008;
      r.mesh.rotation.z = r.angle;
      r.mat.opacity = fadeIn * (0.03 + Math.abs(Math.sin(t*1.2+r.phase))*0.055);
    });
  }

  function updateCloudPlanes(t) {
    const z      = state.zoomProgress;
    const fadeIn = clamp((z - 0.55) * 3, 0, 1);
    cloudPlanes.forEach((c, i) => {
      c.mesh.visible = z > 0.55;
      if (!c.mesh.visible) { c.mat.opacity = 0; return; }
      c.mesh.position.x += c.cfg.speed * (1 + i * 0.1);
      if (c.mesh.position.x > 2.2) c.mesh.position.x = -2.2;
      c.mesh.position.y += Math.sin(t*0.3+i*0.7)*0.00015;
      c.mesh.position.y += (state.smoothM.y*0.006 - c.mesh.position.y*0.001);
      c.mat.opacity = fadeIn * c.cfg.opacity * (0.85 + Math.sin(t*0.4+i)*0.15);
    });
  }

  function updateDust(t) {
    const z      = state.zoomProgress;
    const fadeIn = clamp((z - 0.6) * 3, 0, 1);
    dust.pts.visible = z > 0.6 && state.isLight;
    if (!dust.pts.visible) return;

    const attr = dust.pts.geometry.attributes.position;
    const pos  = attr.array, vel = dust.vel;
    for (let i = 0; i < pos.length/3; i++) {
      pos[i*3]   += vel[i*3]   + state.smoothM.x*0.00008;
      pos[i*3+1] += vel[i*3+1];
      pos[i*3+2] += Math.sin(t*0.2+i)*0.00008;
      if (pos[i*3]   >  2.5) pos[i*3]   = -2.5;
      if (pos[i*3]   < -2.5) pos[i*3]   =  2.5;
      if (pos[i*3+1] >  2.0) pos[i*3+1] = -1.5;
      if (pos[i*3+1] < -1.5) pos[i*3+1] =  2.0;
    }
    attr.needsUpdate = true;
    dust.pts.material.opacity = fadeIn * (0.35 + Math.sin(t*0.5)*0.08);
  }

  function updateSkyCss(t) {
    const z      = state.zoomProgress;
    const fadeIn = clamp((z - 0.5) * 2.5, 0, 1);
    if (fadeIn <= 0) { applySkyCss({}, 0); return; }
    const colors = getSkyColors(t);
    applySkyCss(colors, fadeIn);
    earth.sky.material.color.setStyle(colors.mid);
  }

  function updateLights(t) {
    const z = state.zoomProgress;
    lights.sky.intensity     = lerp(0, 1.8, z);
    lights.sunDay.intensity  = lerp(0, 1.4, z);
    lights.hemi.intensity    = lerp(0, 1.2, z);
    lights.sun.intensity     = lerp(2.0, 0.3, z);
    lights.ambient.intensity = lerp(1.0, 0.5, z);
    lights.sunDay.position.set(3+Math.sin(t*0.05)*0.5, 5, 3+Math.cos(t*0.05)*0.5);
  }

  // ─── MAIN LOOP ───────────────────────────────
  const clock = new THREE.Clock();
  let lastT   = 0;

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    lastT   = t;

    updateMouse();
    updateZoom(t);
    updateCamera();
    updateLights(t);
    updateEarth();
    updateStars(t);
    updateDarkParticles(t);
    updateMoon(t);
    updatePlanets();
    updateSatellites(t);
    updateNodes(t);
    updateSun(t);
    updateCloudPlanes(t);
    updateDust(t);
    updateSkyCss(t);

    renderer.render(scene, camera);
  }

  animate();

})();