(function () {
  const canvas = document.getElementById('starfield-canvas');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  canvas.appendChild(renderer.domElement);

  // =====================
  // STARFIELD — 3 layers
  // =====================
  function createStarLayer(count, size, spread, color) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color, size, transparent: true, opacity: 0.85, sizeAttenuation: true
    });
    return new THREE.Points(geo, mat);
  }

  const starsBack  = createStarLayer(1800, 0.018, 60, 0xaaaaff);
  const starsMid   = createStarLayer(900,  0.030, 40, 0xccddff);
  const starsFront = createStarLayer(300,  0.055, 25, 0xffffff);
  scene.add(starsBack, starsMid, starsFront);

  // =====================
  // LIGHTING
  // =====================
  const sunLight = new THREE.PointLight(0xffffff, 2.0);
  sunLight.position.set(5, 3, 5);
  scene.add(sunLight);
  const ambient = new THREE.AmbientLight(0x404060, 1.0);
  scene.add(ambient);

  // =====================
  // EARTH
  // =====================
  const loader = new THREE.TextureLoader();
  const earthTex = loader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg');
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 64, 64),
    new THREE.MeshStandardMaterial({ map: earthTex })
  );
  scene.add(earth);

  // Atmosphere glow (dark mode)
  const atmosDark = new THREE.Mesh(
    new THREE.SphereGeometry(1.28, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0x0044ff, transparent: true, opacity: 0.12 })
  );
  scene.add(atmosDark);

  // Atmosphere glow (light mode — sky blue, thicker)
  const atmosLight = new THREE.Mesh(
    new THREE.SphereGeometry(1.35, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0x87ceeb, transparent: true, opacity: 0 })
  );
  scene.add(atmosLight);

  // =====================
  // MOON
  // =====================
  const moonTex = loader.load('https://threejs.org/examples/textures/planets/moon_1024.jpg');
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 32, 32),
    new THREE.MeshStandardMaterial({ map: moonTex })
  );
  scene.add(moon);

  // =====================
  // PLANETS (dark mode)
  // =====================
  const planetData = [
    { color: 0xc2773a, size: 0.18, orbitR: 2.8, speed: 0.3,  tilt: 0.1  }, // Mars
    { color: 0xe8b84a, size: 0.35, orbitR: 3.8, speed: 0.18, tilt: 0.05 }, // Jupiter
    { color: 0xd4b483, size: 0.28, orbitR: 4.9, speed: 0.12, tilt: 0.3  }, // Saturn
  ];

  const planets = planetData.map(p => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(p.size, 32, 32),
      new THREE.MeshStandardMaterial({ color: p.color })
    );
    // Saturn ring
    if (p.color === 0xd4b483) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(p.size * 1.4, p.size * 2.2, 64),
        new THREE.MeshBasicMaterial({ color: 0xc8a97a, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
      );
      ring.rotation.x = Math.PI / 2.5;
      mesh.add(ring);
    }
    mesh.visible = true;
    scene.add(mesh);
    return { mesh, ...p, angle: Math.random() * Math.PI * 2 };
  });

  // =====================
  // SATELLITE
  // =====================
  const satellite = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffcc00 })
  );
  // Satellite solar panel wings
  const wingGeo = new THREE.BoxGeometry(0.12, 0.01, 0.04);
  const wingMat = new THREE.MeshBasicMaterial({ color: 0x4488ff });
  const wingL = new THREE.Mesh(wingGeo, wingMat);
  const wingR = new THREE.Mesh(wingGeo, wingMat);
  wingL.position.x = -0.09;
  wingR.position.x =  0.09;
  satellite.add(wingL, wingR);
  scene.add(satellite);

  // Satellite 2 (polar orbit)
  const satellite2 = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff8800 })
  );
  scene.add(satellite2);

  // =====================
  // DATA NODES + LINES
  // =====================
  function latLonToVec3(lat, lon, r) {
    const phi   = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
       r * Math.cos(phi),
       r * Math.sin(phi) * Math.sin(theta)
    );
  }

  const cities = [[28.6, 77.2], [40.7, -74], [51.5, -0.1], [35.7, 139.6], [-33.9, 151.2], [1.4, 103.8]];
  const nodes = [];
  const nodePositions = [];

  cities.forEach(([lat, lon]) => {
    const pos = latLonToVec3(lat, lon, 1.22);
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x00ffff })
    );
    node.position.copy(pos);
    nodes.push(node);
    nodePositions.push(pos);
    scene.add(node);
  });

  nodePositions.forEach((a, i) => {
    nodePositions.forEach((b, j) => {
      if (i >= j || Math.random() > 0.55) return;
      const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
      scene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 })));
    });
  });

  // =====================
  // BIRDS (light mode)
  // =====================
  const birds = [];
  const BIRD_COUNT = 12;

  for (let i = 0; i < BIRD_COUNT; i++) {
    const birdGroup = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x222244 })
    );
    birdGroup.add(body);

    // Wings (two thin boxes)
    const wingMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.006, 0.03),
      new THREE.MeshBasicMaterial({ color: 0x333366 })
    );
    birdGroup.add(wingMesh);

    birdGroup.position.set(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 3 - 1
    );

    birdGroup.visible = false;
    scene.add(birdGroup);

    birds.push({
      group: birdGroup,
      wing: wingMesh,
      speed: 0.008 + Math.random() * 0.006,
      waveOffset: Math.random() * Math.PI * 2,
      altitude: birdGroup.position.y,
      direction: Math.random() > 0.5 ? 1 : -1
    });
  }

  // =====================
  // MOUSE PARALLAX
  // =====================
  let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
  let isLightMode = document.body.classList.contains('light-mode');

  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });
  document.addEventListener('touchmove', (e) => {
    mouseX = (e.touches[0].clientX / window.innerWidth  - 0.5) * 2;
    mouseY = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  // =====================
  // THEME CHANGE LISTENER
  // =====================
  const observer = new MutationObserver(() => {
    isLightMode = document.body.classList.contains('light-mode');

    // Fade stars out in light mode
    [starsBack, starsMid, starsFront].forEach(s => {
      s.material.opacity = isLightMode ? 0.0 : 0.85;
    });

    // Atmosphere
    atmosDark.material.opacity  = isLightMode ? 0.0  : 0.12;
    atmosLight.material.opacity = isLightMode ? 0.22 : 0.0;

    // Planets visibility
    planets.forEach(p => { p.mesh.visible = !isLightMode; });

    // Birds visibility
    birds.forEach(b => { b.group.visible = isLightMode; });

    // Scene background
    renderer.setClearColor(isLightMode ? 0x87ceeb : 0x000000, isLightMode ? 0.0 : 0.0);
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // =====================
  // ANIMATION LOOP
  // =====================
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Smooth lerp
    targetX += (mouseX - targetX) * 0.04;
    targetY += (mouseY - targetY) * 0.04;

    // Earth rotation + mouse tilt
    earth.rotation.y += 0.002;
    earth.rotation.x += (targetY * 0.2 - earth.rotation.x) * 0.04;
    atmosDark.rotation.copy(earth.rotation);
    atmosLight.rotation.copy(earth.rotation);

    // Moon orbit
    moon.position.x = Math.cos(t * 0.4) * 2.0;
    moon.position.z = Math.sin(t * 0.4) * 2.0;
    moon.position.y = Math.sin(t * 0.15) * 0.3;
    moon.rotation.y += 0.003;

    // Satellites
    const sr = 1.8;
    satellite.position.x = Math.cos(t * 0.6) * sr;
    satellite.position.z = Math.sin(t * 0.6) * sr;
    satellite.position.y = Math.sin(t * 0.35) * 0.5;
    satellite.rotation.y += 0.05;

    // Polar orbit satellite
    const sr2 = 1.65;
    satellite2.position.x = Math.sin(t * 0.8) * sr2 * 0.4;
    satellite2.position.z = Math.cos(t * 0.8) * sr2;
    satellite2.position.y = Math.cos(t * 0.8) * sr2 * 0.9;

    // Planets orbit (dark mode only)
    if (!isLightMode) {
      planets.forEach(p => {
        p.angle += p.speed * 0.01;
        p.mesh.position.x = Math.cos(p.angle) * p.orbitR;
        p.mesh.position.z = Math.sin(p.angle) * p.orbitR;
        p.mesh.position.y = Math.sin(p.angle * 0.5) * p.tilt;
        p.mesh.rotation.y += 0.008;
      });
    }

    // Nodes pulse
    nodes.forEach((node, i) => {
      const s = 1 + Math.sin(t * 2 + i) * 0.35;
      node.scale.set(s, s, s);
    });

    // Star parallax
    starsBack.position.x  =  targetX * 0.3;
    starsBack.position.y  = -targetY * 0.3;
    starsMid.position.x   =  targetX * 0.6;
    starsMid.position.y   = -targetY * 0.6;
    starsFront.position.x =  targetX * 1.1;
    starsFront.position.y = -targetY * 1.1;
    starsBack.rotation.y  = t * 0.008;
    starsMid.rotation.y   = t * 0.012;
    starsFront.rotation.y = t * 0.018;

    // Star twinkle
    starsBack.material.opacity  = isLightMode ? 0 : 0.75 + Math.sin(t * 1.2) * 0.1;
    starsFront.material.opacity = isLightMode ? 0 : 0.80 + Math.sin(t * 2.1 + 1) * 0.15;

    // Birds (light mode)
    if (isLightMode) {
      birds.forEach((b, i) => {
        b.group.position.x += b.speed * b.direction;
        b.group.position.y = b.altitude + Math.sin(t * 0.8 + b.waveOffset) * 0.15;

        // Wing flap
        const flapAngle = Math.sin(t * 6 + b.waveOffset) * 0.4;
        b.wing.rotation.z = flapAngle;

        // Face direction of travel
        b.group.rotation.y = b.direction > 0 ? -Math.PI / 2 : Math.PI / 2;

        // Wrap around screen
        if (b.group.position.x > 6)  b.group.position.x = -6;
        if (b.group.position.x < -6) b.group.position.x =  6;
      });
    }

    // Scroll-based earth zoom
    const scrollFrac = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    const earthScale = 1 - scrollFrac * 0.3;
    earth.scale.set(earthScale, earthScale, earthScale);
    atmosDark.scale.copy(earth.scale);
    atmosLight.scale.copy(earth.scale);

    // Earth position shift on scroll
    earth.position.x = scrollFrac * 1.5;

    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

})();