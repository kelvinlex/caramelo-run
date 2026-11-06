import * as THREE from 'three';

interface Particle {
  mesh: THREE.Object3D;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  growthRate: number;
  rotSpeed?: number;
  hasGravity?: boolean;
  spin3D?: boolean;
  isLeaf?: boolean;
  isBird?: boolean;
  isWater?: boolean;
  isBlood?: boolean;
  wingFlapSpeed?: number;
  wings?: THREE.Mesh[];
}

function createSoftSmokeTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  ctx.clearRect(0, 0, size, size);

  // 💨 FUMAÇA DE ESCAPAMENTO VOLUMÉTRICA 3D: Nuvem densa branco-azulada de motor com turbulência suave
  const lobes = [
    { x: cx, y: cy, r: 66, alpha: 0.96 },
    { x: cx - 36, y: cy + 12, r: 46, alpha: 0.88 },
    { x: cx + 38, y: cy + 10, r: 48, alpha: 0.88 },
    { x: cx - 22, y: cy - 32, r: 44, alpha: 0.90 },
    { x: cx + 24, y: cy - 30, r: 46, alpha: 0.90 },
    { x: cx, y: cy + 28, r: 42, alpha: 0.82 },
  ];

  // Sombra de volume externa suave
  lobes.forEach((l) => {
    const gShadow = ctx.createRadialGradient(l.x + 6, l.y + 8, l.r * 0.1, l.x, l.y, l.r * 1.12);
    gShadow.addColorStop(0.0, 'rgba(71, 85, 105, 0.55)');
    gShadow.addColorStop(0.65, 'rgba(100, 116, 139, 0.28)');
    gShadow.addColorStop(1.0, 'rgba(15, 23, 42, 0.0)');
    ctx.fillStyle = gShadow;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r * 1.12, 0, Math.PI * 2);
    ctx.fill();
  });

  // Preenchimento volumétrico branco/azulado brilhante
  lobes.forEach((l) => {
    const grad = ctx.createRadialGradient(l.x - l.r * 0.25, l.y - l.r * 0.25, l.r * 0.08, l.x, l.y, l.r);
    grad.addColorStop(0.0, `rgba(255, 255, 255, ${l.alpha})`);
    grad.addColorStop(0.55, `rgba(241, 245, 249, ${l.alpha * 0.88})`);
    grad.addColorStop(0.85, `rgba(186, 230, 253, ${l.alpha * 0.45})`);
    grad.addColorStop(1.0, 'rgba(148, 163, 184, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createSoftDustTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  ctx.clearRect(0, 0, size, size);

  // 🛞 FUMAÇA DE ATRITO DE PNEU / BURNOUT NO ASFALTO: Densa, quente e volumétrica
  const lobes = [
    { x: cx, y: cy, r: 62, alpha: 0.92 },
    { x: cx - 38, y: cy + 14, r: 44, alpha: 0.84 },
    { x: cx + 36, y: cy + 12, r: 46, alpha: 0.84 },
    { x: cx - 20, y: cy - 28, r: 40, alpha: 0.85 },
    { x: cx + 22, y: cy - 26, r: 42, alpha: 0.85 },
  ];

  lobes.forEach((l) => {
    const grad = ctx.createRadialGradient(l.x - l.r * 0.2, l.y - l.r * 0.2, l.r * 0.08, l.x, l.y, l.r * 1.08);
    grad.addColorStop(0.0, `rgba(255, 251, 235, ${l.alpha})`);
    grad.addColorStop(0.48, `rgba(226, 232, 240, ${l.alpha * 0.82})`);
    grad.addColorStop(0.78, `rgba(148, 163, 184, ${l.alpha * 0.42})`);
    grad.addColorStop(1.0, 'rgba(71, 85, 105, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r * 1.08, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createEarthSandDustTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  ctx.clearRect(0, 0, size, size);

  // 🏜️ POEIRA DENSA DE BARRO VERMELHO E AREIA DOURADA LEVANTADA PELOS PNEUS NO CHÃO
  const lobes = [
    { x: cx, y: cy + 8, r: 68, alpha: 0.94 },
    { x: cx - 42, y: cy + 16, r: 48, alpha: 0.86 },
    { x: cx + 42, y: cy + 16, r: 48, alpha: 0.86 },
    { x: cx - 22, y: cy - 22, r: 44, alpha: 0.82 },
    { x: cx + 24, y: cy - 20, r: 44, alpha: 0.82 },
  ];

  lobes.forEach((l) => {
    const grad = ctx.createRadialGradient(l.x, l.y - l.r * 0.15, l.r * 0.08, l.x, l.y, l.r * 1.12);
    grad.addColorStop(0.0, `rgba(232, 184, 122, ${l.alpha})`);      // Areia dourada quente
    grad.addColorStop(0.45, `rgba(196, 128, 72, ${l.alpha * 0.85})`); // Barro ocre
    grad.addColorStop(0.78, `rgba(154, 88, 44, ${l.alpha * 0.48})`);  // Terra avermelhada
    grad.addColorStop(1.0, 'rgba(92, 48, 22, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r * 1.12, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  public isOptimizedMode: boolean = false;

  public setOptimizedMode(optimized: boolean) {
    this.isOptimizedMode = optimized;
    if (optimized) {
      // Limpa partículas que estejam flutuando para liberação imediata de memória
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        if (!p.isWater) {
          this.scene.remove(p.mesh);
          this.particles.splice(i, 1);
        }
      }
    }
  }

  private softSmokeTex: THREE.CanvasTexture;
  private softDustTex: THREE.CanvasTexture;
  private earthSandDustTex: THREE.CanvasTexture;

  private dustGeo1: THREE.SphereGeometry;
  private dustGeo2: THREE.SphereGeometry;
  private smokeGeo: THREE.SphereGeometry;
  private fireGeo: THREE.SphereGeometry;
  private starGeo: THREE.SphereGeometry;
  private shockwaveGeo: THREE.RingGeometry;
  private auraGeo: THREE.SphereGeometry;
  private leafGeo: THREE.PlaneGeometry;

  private dustMat1: THREE.MeshBasicMaterial;
  private dustMat2: THREE.MeshBasicMaterial;
  private dustMat3: THREE.MeshBasicMaterial;
  private claySandMat1: THREE.MeshBasicMaterial;
  private claySandMat2: THREE.MeshBasicMaterial;
  private smokeMat: THREE.MeshBasicMaterial;
  private fireMat1: THREE.MeshBasicMaterial;
  private fireMat2: THREE.MeshBasicMaterial;
  private starMat: THREE.MeshBasicMaterial;
  private shockwaveMat: THREE.MeshBasicMaterial;
  private auraMat1: THREE.MeshBasicMaterial;
  private auraMat2: THREE.MeshBasicMaterial;

  // Leaf Materials (Yellow, Pink, Green)
  private leafYellowMat: THREE.MeshBasicMaterial;
  private leafPinkMat: THREE.MeshBasicMaterial;
  private leafGreenMat: THREE.MeshBasicMaterial;
  private birdMat: THREE.MeshBasicMaterial;

  // ⚡ Pre-allocated Speed & Streak Assets (Zero GC allocations per frame)
  private speedLineGeo: THREE.BoxGeometry;
  private speedLineMat: THREE.MeshBasicMaterial;
  private motionStreakGeo: THREE.BoxGeometry;
  private motionStreakMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.softSmokeTex = createSoftSmokeTexture();
    this.softDustTex = createSoftDustTexture();
    this.earthSandDustTex = createEarthSandDustTexture();

    this.dustGeo1 = new THREE.SphereGeometry(0.09, 8, 8);
    this.dustGeo2 = new THREE.SphereGeometry(0.14, 8, 8);
    this.smokeGeo = new THREE.SphereGeometry(0.12, 8, 8);
    this.fireGeo = new THREE.SphereGeometry(0.22, 8, 8);
    this.starGeo = new THREE.SphereGeometry(0.08, 6, 6);
    this.shockwaveGeo = new THREE.RingGeometry(0.3, 0.6, 16);
    this.auraGeo = new THREE.SphereGeometry(0.16, 8, 8);
    this.leafGeo = new THREE.PlaneGeometry(0.22, 0.14);

    this.speedLineGeo = new THREE.BoxGeometry(0.04, 0.04, 2.4);
    this.speedLineMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.85 });
    this.motionStreakGeo = new THREE.BoxGeometry(0.025, 0.025, 2.2);
    this.motionStreakMat = new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.75 });

    // Multi-tone Realistic Street Dust Materials
    this.dustMat1 = new THREE.MeshBasicMaterial({ color: 0xd6cbb8, transparent: true, opacity: 0.55 });
    this.dustMat2 = new THREE.MeshBasicMaterial({ color: 0xb8a994, transparent: true, opacity: 0.45 });
    this.dustMat3 = new THREE.MeshBasicMaterial({ color: 0x9c8e7c, transparent: true, opacity: 0.4 });
    this.claySandMat1 = new THREE.MeshBasicMaterial({ color: 0xd99b52, transparent: true, opacity: 0.78 });
    this.claySandMat2 = new THREE.MeshBasicMaterial({ color: 0xb45309, transparent: true, opacity: 0.72 });

    this.smokeMat = new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.7 });
    this.fireMat1 = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.95 });
    this.fireMat2 = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.95 });
    this.starMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    this.shockwaveMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.8, side: THREE.DoubleSide });

    // Super Saiyan / Fire Aura Materials
    this.auraMat1 = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.85 });
    this.auraMat2 = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.9 });

    // Nature Materials (Falling Leaves & Birds)
    this.leafYellowMat = new THREE.MeshBasicMaterial({ color: 0xfde047, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    this.leafPinkMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    this.leafGreenMat = new THREE.MeshBasicMaterial({ color: 0x4ade80, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    this.birdMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide });

    // 🌊 Materiais e geometrias compartilhados de água (Zero GC / Zero memory leak)
    this.waterDropGeo = new THREE.SphereGeometry(0.14, 6, 6);
    this.waterMatFoam = new THREE.MeshBasicMaterial({ color: 0xf0fdf4, transparent: true, opacity: 0.88 });
    this.waterMatBlue = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
    this.waterRippleGeo = new THREE.RingGeometry(0.35, 0.95, 12);
    this.waterRippleMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.82, side: THREE.DoubleSide });

    // Pre-allocated Pool for Water Blast Drops & Ripples (Zero allocations / Zero scene.add mid-frame)
    for (let i = 0; i < 20; i++) {
      const mat = i % 2 === 0 ? this.waterMatFoam : this.waterMatBlue;
      const dropMesh = new THREE.Mesh(this.waterDropGeo, mat);
      dropMesh.visible = false;
      this.scene.add(dropMesh);
      this.waterDropPool.push(dropMesh);
    }
    for (let r = 0; r < 2; r++) {
      const ripMesh = new THREE.Mesh(this.waterRippleGeo, this.waterRippleMat);
      ripMesh.rotation.x = -Math.PI / 2;
      ripMesh.visible = false;
      this.scene.add(ripMesh);
      this.waterRipplePool.push(ripMesh);
    }

    // 🩸 Materiais e geometrias de sangue (Zero GC / Alta performance)
    this.bloodGeo = new THREE.SphereGeometry(0.08, 6, 6);
    this.bloodMatDark = new THREE.MeshBasicMaterial({ color: 0x990000, transparent: true, opacity: 0.95 });
    this.bloodMatBright = new THREE.MeshBasicMaterial({ color: 0xdd1111, transparent: true, opacity: 0.95 });

    // 💵 Geometrias e materiais compartilhados para coleta de dinheiro e fumaça (Zero GC!)
    this.cashConfettiGeo = new THREE.PlaneGeometry(0.34, 0.17);
    this.lootBeamGeo = new THREE.CylinderGeometry(0.42, 0.65, 3.2, 12, 1, true);
    this.cashGreenMat = new THREE.MeshBasicMaterial({ color: 0x34d399, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    this.cashPurpleMat = new THREE.MeshBasicMaterial({ color: 0xc084fc, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    this.cashCyanMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    this.lootBeamMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.exhaustFlameMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.exhaustBlueFlameMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.sharedSmokeSpriteMat = new THREE.SpriteMaterial({
      map: this.softSmokeTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
    });
    this.sharedDustSpriteMat = new THREE.SpriteMaterial({
      map: this.softDustTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });
    this.sharedEarthDustSpriteMat = new THREE.SpriteMaterial({
      map: this.earthSandDustTex,
      color: 0xffe4b5,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
  }

  private waterDropGeo: THREE.SphereGeometry;
  private waterMatFoam: THREE.MeshBasicMaterial;
  private waterMatBlue: THREE.MeshBasicMaterial;
  private waterRippleGeo: THREE.RingGeometry;
  private waterRippleMat: THREE.MeshBasicMaterial;
  private waterDropPool: THREE.Mesh[] = [];
  private waterRipplePool: THREE.Mesh[] = [];
  private bloodGeo: THREE.SphereGeometry;
  private bloodMatDark: THREE.MeshBasicMaterial;
  private bloodMatBright: THREE.MeshBasicMaterial;
  private cashConfettiGeo: THREE.PlaneGeometry;
  private lootBeamGeo: THREE.CylinderGeometry;
  private cashGreenMat: THREE.MeshBasicMaterial;
  private cashPurpleMat: THREE.MeshBasicMaterial;
  private cashCyanMat: THREE.MeshBasicMaterial;
  private lootBeamMat: THREE.MeshBasicMaterial;
  private exhaustFlameMat: THREE.MeshBasicMaterial;
  private exhaustBlueFlameMat: THREE.MeshBasicMaterial;
  private sharedSmokeSpriteMat: THREE.SpriteMaterial;
  private sharedDustSpriteMat: THREE.SpriteMaterial;
  private sharedEarthDustSpriteMat: THREE.SpriteMaterial;

  // ⚡ Aquecimento e compilação antecipada de todos os shaders de partículas na GPU (elimina engasgos no 1º bueiro)
  public warmUp(renderer: THREE.WebGLRenderer, camera: THREE.Camera, composer?: any) {
    try {
      const dummyGroup = new THREE.Group();
      dummyGroup.name = 'particleWarmUpGroup';
      dummyGroup.frustumCulled = false;
      dummyGroup.position.set(0, 1.2, 4.5); // Diretamente no cone de visão frontal da câmera

      const addWarmMesh = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
        const m = new THREE.Mesh(geo, mat);
        m.frustumCulled = false;
        dummyGroup.add(m);
      };

      // 💧 Partículas de água do bueiro (Espuma branca, água azul celeste e ondas de choque na pista)
      addWarmMesh(this.waterDropGeo, this.waterMatFoam);
      addWarmMesh(this.waterDropGeo, this.waterMatBlue);
      addWarmMesh(this.waterRippleGeo, this.waterRippleMat);

      // Partículas de combate, fumaça, fogo, sangue, estrelas e aura
      addWarmMesh(this.bloodGeo, this.bloodMatDark);
      addWarmMesh(this.bloodGeo, this.bloodMatBright);
      addWarmMesh(this.dustGeo1, this.dustMat1);
      addWarmMesh(this.dustGeo2, this.dustMat2);
      addWarmMesh(this.smokeGeo, this.smokeMat);
      addWarmMesh(this.fireGeo, this.fireMat1);
      addWarmMesh(this.fireGeo, this.fireMat2);
      addWarmMesh(this.starGeo, this.starMat);
      addWarmMesh(this.shockwaveGeo, this.shockwaveMat);
      addWarmMesh(this.auraGeo, this.auraMat1);
      addWarmMesh(this.auraGeo, this.auraMat2);

      // Posiciona as meshes reais do pool diretamente em frente à câmera e torna visíveis
      this.waterDropPool.forEach((m, idx) => {
        m.visible = true;
        m.frustumCulled = false;
        m.position.set(((idx % 5) - 2) * 0.18, 0.8 + Math.floor(idx / 5) * 0.18, 4.2);
        m.scale.set(1, 1, 1);
      });
      this.waterRipplePool.forEach((m, idx) => {
        m.visible = true;
        m.frustumCulled = false;
        m.position.set(idx * 0.4 - 0.2, 0.3, 4.2);
        m.scale.set(1, 1, 1);
      });

      this.scene.add(dummyGroup);

      renderer.compile(this.scene, camera);
      renderer.render(this.scene, camera);

      if (composer && typeof composer.render === 'function') {
        try { composer.render(); } catch (_) {}
      }

      const gl = renderer.getContext();
      if (gl && typeof gl.finish === 'function') {
        gl.finish();
      }

      // ⚡ JIT-compiles emitWaterBlast and update(p.isWater) code paths so CPU never stalls on first hit
      this.emitWaterBlast(0, 0.4, 4.5);
      this.update(0.016, 12.0);
      this.clear();

      this.scene.remove(dummyGroup);
      this.waterDropPool.forEach((m) => {
        m.visible = false;
        m.position.set(0, 0, 0);
      });
      this.waterRipplePool.forEach((m) => {
        m.visible = false;
        m.position.set(0, 0, 0);
      });
    } catch (_) {}
  }

  // === FALLING LEAVES FROM TREES (DESATIVADO PARA LIMPEZA VISUAL E PERFORMANCE) ===
  public emitFallingLeaves(_x: number, _y: number, _z: number, _type: 'yellow' | 'pink' | 'green' = 'yellow') {
    // Zero emissão de folhas para manter as calçadas e a tela limpas
  }

  // === BIRDS FLOCK TAKING OFF FROM TREETOP ===
  public emitBirdsFlock(x: number, y: number, z: number) {
    const numBirds = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numBirds; i++) {
      const birdGroup = new THREE.Group();
      
      // Simple aerodynamic bird body
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 4), this.birdMat);
      body.rotation.x = Math.PI / 2;
      birdGroup.add(body);

      // Left and Right Flapping Wings
      const wingGeo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 0, 0,
        0.28, 0.05, -0.1,
        0, 0, -0.22,
      ]);
      wingGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      wingGeo.computeVertexNormals();

      const wingL = new THREE.Mesh(wingGeo, this.birdMat);
      const wingR = new THREE.Mesh(wingGeo, this.birdMat);
      wingR.scale.set(-1, 1, 1);

      birdGroup.add(wingL);
      birdGroup.add(wingR);

      birdGroup.position.set(
        x + (Math.random() - 0.5) * 2.0,
        y + Math.random() * 1.5,
        z + (Math.random() - 0.5) * 2.0
      );

      this.scene.add(birdGroup);

      this.particles.push({
        mesh: birdGroup,
        vx: (x > 0 ? -1 : 1) * (2.0 + Math.random() * 3.0),
        vy: 2.5 + Math.random() * 2.5, // Fly upwards into sky
        vz: 6.0 + Math.random() * 5.0, // Fly forward
        life: 0,
        maxLife: 4.0 + Math.random() * 1.5,
        growthRate: 0,
        isBird: true,
        wingFlapSpeed: 18 + Math.random() * 6,
        wings: [wingL, wingR],
      });
    }
  }

  // === FIRE AURA EMITTER WHEN CARAMELO REACHES FULL ENERGY / BONE GOAL ===
  public emitFireAura(x: number, y: number, z: number) {
    for (let i = 0; i < 4; i++) {
      const isYellow = Math.random() > 0.4;
      const mat = isYellow ? this.auraMat2 : this.auraMat1;
      const mesh = new THREE.Mesh(this.auraGeo, mat);

      const rad = 0.4 + Math.random() * 0.3;
      const angle = Math.random() * Math.PI * 2;
      mesh.position.set(
        x + Math.cos(angle) * rad,
        y + 0.2 + Math.random() * 0.7,
        z + Math.sin(angle) * rad * 0.7
      );
      this.scene.add(mesh);

      this.particles.push({
        mesh,
        vx: (Math.random() - 0.5) * 0.6,
        vy: 2.2 + Math.random() * 1.8,
        vz: -0.8 + (Math.random() - 0.5) * 0.6,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.2,
        growthRate: 1.2,
      });
    }
  }

  // === SPEED LINES / WIND STREAKS WHEN SPRINTING WITH STAMINA ===
  public emitSpeedLines(x: number, y: number, z: number) {
    if (Math.random() > 0.4) return;
    const mesh = new THREE.Mesh(this.speedLineGeo, this.speedLineMat);
    const side = (Math.random() - 0.5) * 2.2;
    mesh.position.set(x + side, y + Math.random() * 0.8, z - 0.4);
    this.scene.add(mesh);
    this.particles.push({
      mesh,
      vx: 0,
      vy: 0,
      vz: -32.0,
      life: 0,
      maxLife: 0.22,
      growthRate: 1.0,
    });
  }

  // === 💨 MODO CINEMÁTICO: LINHAS DE VENTO E ESTEIRA AERODINÂMICA AO VIRAR PROS LADOS ===
  public emitLateralMotionStreaks(x: number, y: number, z: number, turnDir: number, speed: number) {
    if (this.isOptimizedMode) return;
    if (Math.abs(turnDir) < 0.15) return;
    if (Math.random() > 0.65) return;

    const mesh = new THREE.Mesh(this.motionStreakGeo, this.motionStreakMat);

    const sideOffset = -turnDir * 0.45 + (Math.random() - 0.5) * 0.25;
    mesh.position.set(x + sideOffset, y + 0.50 + Math.random() * 0.55, z - 0.25);
    mesh.rotation.y = -turnDir * 0.22;
    this.scene.add(mesh);

    this.particles.push({
      mesh,
      vx: -turnDir * 4.2,
      vy: (Math.random() - 0.5) * 0.4,
      vz: -speed * 1.1,
      life: 0,
      maxLife: 0.18,
      growthRate: 0.85,
    });
  }

  // === REALISTIC MULTI-LAYER DUST TRAIL BEHIND CARAMELO ===
  public emitPawDust(x: number, y: number, z: number, speed: number) {
    if (this.isOptimizedMode) return; // Otimizado: sem poeira contínua gerando centenas de meshes
    const intensity = Math.min(1.0, speed / 20.0);
    const numPuffs = Math.random() < 0.65 ? 2 : 1;

    for (let p = 0; p < numPuffs; p++) {
      const isBig = Math.random() > 0.45;
      const geo = isBig ? this.dustGeo2 : this.dustGeo1;
      const matRand = Math.random();
      const mat = matRand < 0.4 ? this.dustMat1 : matRand < 0.75 ? this.dustMat2 : this.dustMat3;
      const mesh = new THREE.Mesh(geo, mat);

      const offsetX = (Math.random() - 0.5) * 0.38;
      const offsetZ = -0.45 - Math.random() * 0.4;
      mesh.position.set(x + offsetX, y + 0.08, z + offsetZ);

      const baseScale = (Math.random() * 0.4 + 0.8) * (0.8 + intensity * 0.6);
      mesh.scale.set(baseScale, baseScale, baseScale);

      this.scene.add(mesh);

      this.particles.push({
        mesh,
        vx: (Math.random() - 0.5) * (1.2 + intensity * 1.5),
        vy: (Math.random() * 0.9 + 0.3) * (0.8 + intensity * 0.8),
        vz: -(speed * (0.35 + Math.random() * 0.25)),
        life: 0,
        maxLife: 0.45 + Math.random() * 0.35,
        growthRate: 2.4 + intensity * 1.8,
      });
    }
  }

  // === 🛞 POEIRA DAS RODAS NO CHÃO (MOTO E CARROS LEVANTANDO BARRO E AREIA) ===
  public emitMotoRoadTireDust(
    x: number,
    y: number,
    z: number,
    speed: number,
    isWheelie = false,
    isDirtOrSand = true
  ) {
    const spawnChance = isDirtOrSand ? 0.92 : (isWheelie ? 0.88 : 0.78);
    if (Math.random() > spawnChance) return;

    const numPuffs = (speed > 15 || isWheelie || isDirtOrSand) ? 2 : 1;
    const spriteMat = isDirtOrSand ? this.sharedEarthDustSpriteMat : this.sharedDustSpriteMat;

    for (let p = 0; p < numPuffs; p++) {
      const sprite = new THREE.Sprite(spriteMat);
      // Ponto exato de contato do pneu traseiro com o solo levantando nuvem de areia/barro
      const side = (p === 0 ? -1 : 1) * (0.09 + Math.random() * 0.14);
      sprite.position.set(
        x + side,
        Math.max(0.08, y + 0.09),
        z - 0.74 + (Math.random() - 0.5) * 0.12
      );

      const baseBoost = isDirtOrSand ? 0.48 : (isWheelie ? 0.46 : 0.36);
      const initScale = baseBoost + (speed / 26.0) * 0.32;
      sprite.scale.set(initScale * 1.15, initScale * 0.85, 1);
      this.scene.add(sprite);

      this.particles.push({
        mesh: sprite,
        vx: side * (isDirtOrSand ? 3.8 : 2.6) + (Math.random() - 0.5) * 0.75,
        vy: 0.28 + Math.random() * (isDirtOrSand ? 0.52 : 0.34),
        vz: -speed * 0.46 - Math.random() * 2.2,
        life: 0,
        maxLife: isDirtOrSand ? (0.52 + Math.random() * 0.22) : (0.44 + Math.random() * 0.18),
        growthRate: isDirtOrSand ? 4.5 : (isWheelie ? 4.2 : 3.4),
      });
    }

    // Roda dianteira também levanta poeira baixa no chão quando não está empinando
    if (!isWheelie && y < 0.15 && Math.random() < (isDirtOrSand ? 0.65 : 0.38)) {
      const frontSprite = new THREE.Sprite(this.sharedEarthDustSpriteMat);
      frontSprite.position.set(
        x + (Math.random() - 0.5) * 0.18,
        0.08,
        z + 0.58
      );
      const fScale = 0.28 + (speed / 30.0) * 0.22;
      frontSprite.scale.set(fScale, fScale * 0.75, 1);
      this.scene.add(frontSprite);

      this.particles.push({
        mesh: frontSprite,
        vx: (Math.random() - 0.5) * 1.4,
        vy: 0.18 + Math.random() * 0.25,
        vz: -speed * 0.40 - 0.8,
        life: 0,
        maxLife: 0.38,
        growthRate: 3.4,
      });
    }

    // Grãos físicos de barro e areia espirrando da roda traseira no trecho de terra
    if (isDirtOrSand && !this.isOptimizedMode && Math.random() < 0.58) {
      const grainMesh = new THREE.Mesh(
        this.dustGeo1,
        Math.random() > 0.5 ? this.claySandMat1 : this.claySandMat2
      );
      grainMesh.position.set(
        x + (Math.random() - 0.5) * 0.26,
        Math.max(0.06, y + 0.08),
        z - 0.82
      );
      const gs = 0.65 + Math.random() * 0.55;
      grainMesh.scale.set(gs, gs, gs);
      this.scene.add(grainMesh);

      this.particles.push({
        mesh: grainMesh,
        vx: (Math.random() - 0.5) * 2.6,
        vy: 1.4 + Math.random() * 1.8,
        vz: -speed * 0.52 - Math.random() * 2.5,
        life: 0,
        maxLife: 0.36 + Math.random() * 0.15,
        growthRate: -0.4,
        hasGravity: true,
      });
    }
  }

  // === 🚗💨 POEIRA LEVANTADA PELAS RODAS DOS CARROS E CAMINHÕES NO CHÃO ===
  public emitCarWheelDust(
    carX: number,
    carY: number,
    carZ: number,
    forwardSpeed: number,
    isDirtOrSand = true
  ) {
    if (this.isOptimizedMode && Math.random() > 0.35) return;
    if (Math.random() > (isDirtOrSand ? 0.55 : 0.32)) return;

    const wheelOffsets = [-0.74, 0.74];
    const spriteMat = isDirtOrSand ? this.sharedEarthDustSpriteMat : this.sharedDustSpriteMat;

    for (let w = 0; w < wheelOffsets.length; w++) {
      if (!isDirtOrSand && Math.random() > 0.65) continue;
      const wx = wheelOffsets[w];
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(
        carX + wx + (Math.random() - 0.5) * 0.12,
        carY + 0.11,
        carZ - 1.15 + (Math.random() - 0.5) * 0.25
      );
      const baseScale = isDirtOrSand ? 0.54 : 0.38;
      sprite.scale.set(baseScale * 1.2, baseScale * 0.85, 1);
      this.scene.add(sprite);

      this.particles.push({
        mesh: sprite,
        vx: Math.sign(wx) * (isDirtOrSand ? 1.8 : 1.1) + (Math.random() - 0.5) * 0.6,
        vy: 0.26 + Math.random() * (isDirtOrSand ? 0.48 : 0.28),
        vz: -forwardSpeed * 0.35 - Math.random() * 1.6,
        life: 0,
        maxLife: isDirtOrSand ? 0.50 : 0.38,
        growthRate: isDirtOrSand ? 4.4 : 3.2,
      });
    }
  }

  // === DISSIPATING GROUND DUST RING WHEN MOTORCYCLE LANDS AFTER BUMP JUMP ===
  public emitLandingDustRing(x: number, z: number) {
    const numPuffs = 14;
    for (let i = 0; i < numPuffs; i++) {
      const angle = (i / numPuffs) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const speed = 2.4 + Math.random() * 1.8;
      const geo = Math.random() > 0.4 ? this.dustGeo2 : this.dustGeo1;
      const mat = Math.random() < 0.4 ? this.dustMat1 : Math.random() < 0.7 ? this.dustMat2 : this.dustMat3;
      const mesh = new THREE.Mesh(geo, mat);

      const initDist = 0.25 + Math.random() * 0.2;
      mesh.position.set(
        x + Math.cos(angle) * initDist,
        0.04 + Math.random() * 0.08,
        z + Math.sin(angle) * initDist * 1.3
      );

      const baseScale = 1.1 + Math.random() * 0.8;
      mesh.scale.set(baseScale, baseScale * 0.55, baseScale);
      this.scene.add(mesh);

      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 0.12 + Math.random() * 0.3,
        vz: Math.sin(angle) * speed * 1.2,
        life: 0,
        maxLife: 0.60 + Math.random() * 0.25,
        growthRate: 4.0,
      });
    }

    const ringMesh = new THREE.Mesh(this.shockwaveGeo, this.dustMat1);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(x, 0.03, z);
    ringMesh.scale.set(0.6, 0.6, 0.6);
    this.scene.add(ringMesh);

    this.particles.push({
      mesh: ringMesh,
      vx: 0,
      vy: 0.01,
      vz: 0,
      life: 0,
      maxLife: 0.45,
      growthRate: 5.5,
    });
  }

  // === 🔥💨 FUMAÇA DE ESCAPAMENTO DO MOTOBOY + PIPOCO / CHAMA DE CORTE DE GIRO ===
  public emitExhaustSmoke(x: number, y: number, z: number, speed: number, isWheelie = false) {
    if (Math.random() > (isWheelie ? 0.85 : 0.70)) return;

    // Ponteira direita do escapamento esportivo da CG 160
    const pipeX = x + 0.26 + (Math.random() - 0.5) * 0.04;
    const pipeY = y + 0.18 + (Math.random() - 0.5) * 0.04;
    const pipeZ = z - 0.80;

    // 1. Nuvem volumétrica densa de escapamento jateada com pressão para trás
    const sprite = new THREE.Sprite(this.sharedSmokeSpriteMat);
    sprite.position.set(pipeX, pipeY, pipeZ);

    const initialScale = (isWheelie ? 0.46 : 0.36) + Math.random() * 0.16;
    sprite.scale.set(initialScale, initialScale, 1);
    this.scene.add(sprite);

    this.particles.push({
      mesh: sprite,
      vx: 0.36 + (Math.random() - 0.5) * 0.32,
      vy: 0.58 + Math.random() * 0.45,
      vz: -speed * 0.55 - Math.random() * 2.8,
      life: 0,
      maxLife: 0.48 + Math.random() * 0.20,
      growthRate: 3.6,
    });

    // 2. Chama de escapamento ("Pipoco / Corte de Giro") quando acelerando forte ou dando Grau!
    if ((speed > 16.5 || isWheelie) && Math.random() < (isWheelie ? 0.55 : 0.32)) {
      const isBlueCore = Math.random() > 0.42;
      const flameMesh = new THREE.Mesh(
        this.dustGeo2,
        isBlueCore ? this.exhaustBlueFlameMat : this.exhaustFlameMat
      );
      flameMesh.position.set(pipeX, pipeY, pipeZ + 0.06);
      flameMesh.scale.set(0.72, 0.72, 2.1);
      this.scene.add(flameMesh);

      this.particles.push({
        mesh: flameMesh,
        vx: 0.12,
        vy: 0.08,
        vz: -speed * 0.38 - 1.6,
        life: 0,
        maxLife: 0.11,
        growthRate: -2.8,
      });
    }
  }

  public emitBiteImpact(x: number, y: number, z: number) {
    for (let i = 0; i < 16; i++) {
      const mesh = new THREE.Mesh(this.starGeo, this.starMat.clone());
      mesh.position.set(x, y, z);
      this.scene.add(mesh);

      const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.2;
      const speed = Math.random() * 4.5 + 2.5;

      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.8 + 1.2,
        vz: (Math.random() - 0.5) * 3.0,
        life: 0,
        maxLife: 0.45,
        growthRate: -0.8,
        rotSpeed: Math.random() * 20 - 10,
      });
    }
  }

  public emitCarExplosion(x: number, y: number, z: number) {
    // 1. Onda de choque primária no asfalto (dourada/incandescente, Zero GC)
    const shockwave = new THREE.Mesh(this.shockwaveGeo, this.shockwaveMat);
    shockwave.rotation.x = -Math.PI / 2;
    shockwave.position.set(x, 0.06, z);
    this.scene.add(shockwave);

    this.particles.push({
      mesh: shockwave,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 0.45,
      growthRate: 24.0,
    });

    // 2. Segunda onda de choque laranja-fogo inclinada
    const shockwave2 = new THREE.Mesh(this.shockwaveGeo, this.auraMat1);
    shockwave2.rotation.x = -Math.PI / 3;
    shockwave2.position.set(x, y + 0.4, z);
    this.scene.add(shockwave2);

    this.particles.push({
      mesh: shockwave2,
      vx: 0,
      vy: 1.2,
      vz: 0,
      life: 0,
      maxLife: 0.38,
      growthRate: 19.0,
    });

    // 3. Clarão central branco-amarelado (Core Flash de alto impacto)
    const flashMesh = new THREE.Mesh(this.fireGeo, this.auraMat2);
    flashMesh.position.set(x, y + 0.5, z);
    flashMesh.scale.set(2.5, 2.5, 2.5);
    this.scene.add(flashMesh);

    this.particles.push({
      mesh: flashMesh,
      vx: 0,
      vy: 1.5,
      vz: 0,
      life: 0,
      maxLife: 0.22,
      growthRate: 14.0,
    });

    // 4. Bolas de fogo volumétricas (laranja, vermelho e amarelo intenso, 100% materiais compartilhados)
    const fireCount = this.isOptimizedMode ? 18 : 32;
    for (let i = 0; i < fireCount; i++) {
      const mat = i % 3 === 0 ? this.auraMat2 : i % 2 === 0 ? this.fireMat1 : this.fireMat2;
      const mesh = new THREE.Mesh(this.fireGeo, mat);
      mesh.position.set(
        x + (Math.random() - 0.5) * 1.1,
        y + 0.25 + Math.random() * 0.5,
        z + (Math.random() - 0.5) * 1.1
      );
      const s = 0.9 + Math.random() * 1.1;
      mesh.scale.set(s, s, s);
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const spd = 3.5 + Math.random() * 8.5;
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * spd,
        vy: Math.random() * 8.5 + 3.0,
        vz: Math.sin(angle) * spd,
        life: 0,
        maxLife: 0.55 + Math.random() * 0.35,
        growthRate: 2.4,
        rotSpeed: (Math.random() - 0.5) * 14,
      });
    }

    // 5. Faíscas metálicas e estilhaços incandescentes voando longe com gravidade
    const sparkCount = this.isOptimizedMode ? 12 : 24;
    for (let s = 0; s < sparkCount; s++) {
      const sparkMesh = new THREE.Mesh(this.starGeo, this.starMat);
      sparkMesh.position.set(x, y + 0.5, z);
      const sc = 0.7 + Math.random() * 0.9;
      sparkMesh.scale.set(sc, sc, sc * 2.2);
      this.scene.add(sparkMesh);

      const ang = Math.random() * Math.PI * 2;
      const spd = 7.0 + Math.random() * 11.0;
      this.particles.push({
        mesh: sparkMesh,
        vx: Math.cos(ang) * spd,
        vy: 5.5 + Math.random() * 9.5,
        vz: Math.sin(ang) * spd,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
        growthRate: -0.4,
        hasGravity: true,
        rotSpeed: (Math.random() - 0.5) * 22,
      });
    }

    // 6. Nuvens densas de fumaça escura subindo após o fogo
    const smokeCount = this.isOptimizedMode ? 14 : 22;
    for (let i = 0; i < smokeCount; i++) {
      const mesh = new THREE.Mesh(this.smokeGeo, this.smokeMat);
      mesh.position.set(
        x + (Math.random() - 0.5) * 1.2,
        y + 0.6 + Math.random() * 0.6,
        z + (Math.random() - 0.5) * 1.2
      );
      this.scene.add(mesh);

      this.particles.push({
        mesh,
        vx: (Math.random() - 0.5) * 5.0,
        vy: Math.random() * 5.5 + 2.2,
        vz: (Math.random() - 0.5) * 5.0,
        life: 0,
        maxLife: 0.95 + Math.random() * 0.45,
        growthRate: 2.8,
      });
    }
  }

  // 💵 Efeito de coleta simples e limpo (sem explosão exagerada na rua)
  public emitCoinCollectSparkles(_x: number, _y: number, _z: number, _value: 10 | 50 | 100 = 10) {
    // Removido efeito exagerado na rua a pedido do usuário (feedback visual limpo e direto no HUD)
  }

  // 🌊 DYNAMIC PRESSURIZED WATER BLAST & SPLASH PARTICLES (Pre-pooled / Zero GC / Zero Frame Drops)
  public emitWaterBlast(x: number, y: number, z: number) {
    const count = this.isOptimizedMode ? 8 : 16;
    for (let i = 0; i < count; i++) {
      const mesh = this.waterDropPool[i % this.waterDropPool.length];
      mesh.position.set(x + (Math.random() - 0.5) * 0.8, y + 0.3, z + (Math.random() - 0.5) * 0.8);
      mesh.scale.set(1, 1, 1);
      mesh.visible = true;

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8.0 + 3.0;
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: Math.random() * 18.0 + 8.0,
        vz: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.75 + Math.random() * 0.35,
        growthRate: -0.1,
        isWater: true,
      });
    }

    const ripple = this.waterRipplePool[0];
    if (ripple) {
      ripple.position.set(x, y + 0.05, z);
      ripple.scale.set(0.1, 0.1, 0.1);
      ripple.visible = true;

      this.particles.push({
        mesh: ripple,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.4,
        growthRate: 12.0,
        isWater: true,
      });
    }
  }

  // 🩸 ESPIRRO DE SANGUE 3D (Colisão / Mordida do cão / Dano)
  public emitBloodSplatter(x: number, y: number, z: number, count = 22) {
    for (let i = 0; i < count; i++) {
      const isBright = Math.random() > 0.45;
      const mat = (isBright ? this.bloodMatBright : this.bloodMatDark).clone();
      const mesh = new THREE.Mesh(this.bloodGeo, mat);
      (mesh as any).userData = { isDisposableMat: true };

      const scale = Math.random() * 0.9 + 0.55;
      mesh.scale.set(scale, scale * (1.2 + Math.random() * 0.5), scale);
      mesh.position.set(
        x + (Math.random() - 0.5) * 0.4,
        y + (Math.random() - 0.5) * 0.35 + 0.25,
        z + (Math.random() - 0.5) * 0.4
      );

      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const horizSpeed = Math.random() * 4.5 + 1.2;
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * horizSpeed,
        vy: Math.random() * 5.5 + 2.0,
        vz: Math.sin(angle) * horizSpeed,
        life: 0,
        maxLife: 0.65 + Math.random() * 0.35,
        growthRate: -0.15,
        isBlood: true,
      });
    }
  }

  public update(dt: number, forwardSpeed: number) {
    // 🚀 Otimização de Performance com folga para fumaça de pneu e escapamento (sem sobrecarregar o GC)
    const maxActive = this.isOptimizedMode ? 28 : 65;
    if (this.particles.length > maxActive) {
      const dropCount = this.particles.length - maxActive;
      for (let d = 0; d < dropCount; d++) {
        const removed = this.particles.shift();
        if (removed) this.disposeParticle(removed);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life >= p.maxLife) {
        this.disposeParticle(p);
        this.particles.splice(i, 1);
        continue;
      }

      if (p.isBlood) {
        // Balística de sangue com gravidade e dispersão realista
        p.vy -= 18.0 * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y = Math.max(0.04, p.mesh.position.y + p.vy * dt);
        p.mesh.position.z += (p.vz - forwardSpeed * 0.35) * dt;

        const progress = p.life / p.maxLife;
        const mat = (p.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat && mat.transparent) {
          mat.opacity = Math.max(0, (1 - progress) * 0.95);
        }
      } else if (p.isWater) {
        // Realistic Water Droplet arc physics with gravity and drag
        p.vy -= 22.0 * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += (p.vz - forwardSpeed * 0.45) * dt;

        const progress = Math.min(1.0, p.life / p.maxLife);
        if (p.growthRate && p.growthRate > 0) {
          // Ripple expands on the ground
          p.mesh.scale.multiplyScalar(1 + dt * p.growthRate);
        } else {
          // Droplets shrink smoothly (Zero material uniform mutation)
          const shrink = Math.max(0.01, 1.0 - progress);
          p.mesh.scale.set(shrink, shrink, shrink);
        }
      } else if (p.isLeaf) {
        // Floating swaying leaf physics
        p.mesh.position.x += (p.vx + Math.sin(p.life * 6.0) * 0.6) * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += (p.vz - forwardSpeed * 0.6) * dt;
        p.mesh.rotation.x += (p.rotSpeed || 2) * dt;
        p.mesh.rotation.y += (p.rotSpeed || 2) * dt * 0.8;
      } else if (p.isBird) {
        // Flapping flying bird physics
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += (p.vz - forwardSpeed * 0.4) * dt;

        if (p.wings && p.wings.length === 2) {
          const flap = Math.sin(p.life * (p.wingFlapSpeed || 20)) * 0.6;
          p.wings[0].rotation.z = flap;
          p.wings[1].rotation.z = -flap;
        }
      } else {
        // Standard particle physics (sprites volumétricos de fumaça, mini-cédulas e faíscas)
        if (p.hasGravity) {
          p.vy -= 16.5 * dt;
        }
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y = Math.max(0.03, p.mesh.position.y + p.vy * dt);
        p.mesh.position.z += (p.vz - forwardSpeed * 0.3) * dt;

        if (p.spin3D) {
          const rs = p.rotSpeed || 10;
          p.mesh.rotation.x += rs * dt;
          p.mesh.rotation.y += rs * 0.85 * dt;
          p.mesh.rotation.z += rs * 0.65 * dt;
        }

        const progress = p.life / p.maxLife;
        if (p.mesh instanceof THREE.Sprite) {
          // Turbulência de ar e dissipação suave da nuvem de fumaça no final da vida (sem corte brusco)
          p.mesh.position.x += Math.sin(p.life * 16.0 + i) * 0.35 * dt;
          if (progress < 0.65) {
            p.mesh.scale.multiplyScalar(1 + dt * p.growthRate);
          } else {
            p.mesh.scale.multiplyScalar(Math.max(0.1, 1 - dt * 4.5));
          }
        } else {
          p.mesh.scale.multiplyScalar(Math.max(0.05, 1 + dt * p.growthRate));
        }
      }
    }
  }

  private disposeParticle(p: Particle) {
    if (p.isWater) {
      p.mesh.visible = false;
      return;
    }
    this.scene.remove(p.mesh);
    p.mesh.traverse((node) => {
      if ((node as any).userData?.isDisposableGeo && (node as THREE.Mesh).geometry) {
        (node as THREE.Mesh).geometry.dispose();
      }
      if ((node as any).userData?.isDisposableMat && (node as THREE.Mesh).material) {
        const mat = (node as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else (mat as THREE.Material).dispose();
      }
    });
  }

  public clear() {
    this.waterDropPool.forEach((m) => { m.visible = false; });
    this.waterRipplePool.forEach((m) => { m.visible = false; });
    this.particles.forEach((p) => {
      this.disposeParticle(p);
    });
    this.particles = [];
  }

  public dispose() {
    this.clear();
    this.waterDropPool.forEach((m) => { this.scene.remove(m); });
    this.waterRipplePool.forEach((m) => { this.scene.remove(m); });
    this.softSmokeTex.dispose();
    this.softDustTex.dispose();
    this.dustGeo1.dispose();
    this.dustGeo2.dispose();
    this.smokeGeo.dispose();
    this.fireGeo.dispose();
    this.starGeo.dispose();
    this.shockwaveGeo.dispose();
    this.auraGeo.dispose();
    this.leafGeo.dispose();
    this.waterDropGeo.dispose();
    this.waterRippleGeo.dispose();
    this.bloodGeo.dispose();

    this.dustMat1.dispose();
    this.dustMat2.dispose();
    this.dustMat3.dispose();
    this.smokeMat.dispose();
    this.fireMat1.dispose();
    this.fireMat2.dispose();
    this.starMat.dispose();
    this.shockwaveMat.dispose();
    this.auraMat1.dispose();
    this.auraMat2.dispose();
    this.leafYellowMat.dispose();
    this.leafPinkMat.dispose();
    this.leafGreenMat.dispose();
    this.birdMat.dispose();
    this.waterMatFoam.dispose();
    this.waterMatBlue.dispose();
    this.waterRippleMat.dispose();
    this.bloodMatDark.dispose();
    this.bloodMatBright.dispose();
  }
}
