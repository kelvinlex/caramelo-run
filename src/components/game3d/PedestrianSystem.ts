import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export type PedestrianBehavior = 'WALKING' | 'TALKING' | 'DEAD';

export interface PedestrianInstance {
  id: number;
  group: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: {
    idle?: THREE.AnimationAction;
    walk?: THREE.AnimationAction;
  };
  currentActionName: 'Idle' | 'Walk' | null;
  behavior: PedestrianBehavior;
  active: boolean;
  x: number;
  y: number;
  z: number;
  walkSpeedZ: number;
  side: 'left' | 'right';
  deathTimer: number;
  fallPitch: number;
  fallRoll: number;
  fallVelocityY: number;
}

// Cores variadas de camisetas e roupas casuais
const CASUAL_COLORS = [
  0xfacc15, // Amarelo Brasil
  0x2563eb, // Azul Cobalto
  0xdc2626, // Vermelho Urbano
  0x16a34a, // Verde Bandeira
  0xf1f5f9, // Branco Algodão
  0x1e293b, // Preto Grafite
  0xea580c, // Laranja Quebrada
  0x9333ea, // Roxo Street
];

interface VocationDef {
  id: string;
  name: string;
  url: string;
}

const VOCATION_DEFS: VocationDef[] = [
  { id: 'gari', name: 'Gari', url: '/models/npcs/npc_gari.glb' },
  { id: 'policia', name: 'Policial', url: '/models/npcs/npc_policia.glb' },
  { id: 'bombeiro', name: 'Bombeiro', url: '/models/npcs/npc_bombeiro.glb' },
  { id: 'medico', name: 'Médico', url: '/models/npcs/npc_medico.glb' },
  { id: 'engenheiro', name: 'Engenheiro', url: '/models/npcs/npc_engenheiro.glb' },
  { id: 'estudante', name: 'Estudante', url: '/models/npcs/npc_estudante.glb' },
];

export class PedestrianSystem {
  private scene: THREE.Scene;
  private pedestrians: PedestrianInstance[] = [];
  private templates: Map<string, { scene: THREE.Group; animations: THREE.AnimationClip[] }> = new Map();
  public isLoaded = false;
  private isDisposed = false;
  private renderer?: THREE.WebGLRenderer;
  private camera?: THREE.Camera;
  private onLoadedListeners: (() => void)[] = [];
  private onProgressListeners: ((pct: number) => void)[] = [];
  public onHitCallback?: (count: number) => void;
  public totalHits: number = 0;
  private loadPromise: Promise<void> | null = null;

  public onLoaded(fn: () => void): void {
    if (this.isLoaded) {
      setTimeout(fn, 0);
    } else {
      this.onLoadedListeners.push(fn);
    }
  }

  public onProgress(fn: (pct: number) => void): void {
    if (this.isLoaded) {
      setTimeout(() => fn(100), 0);
    } else {
      this.onProgressListeners.push(fn);
    }
  }

  public setRendererAndCamera(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    this.renderer = renderer;
    this.camera = camera;
    if (this.isLoaded) {
      this.warmUp(renderer, camera);
    }
  }

  constructor(scene: THREE.Scene, renderer?: THREE.WebGLRenderer, camera?: THREE.Camera, onHitCallback?: (count: number) => void) {
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;
    this.onHitCallback = onHitCallback;

    (window as any).__PEDESTRIANS = this;

    // Carrega modelos oficiais de profissões imediatamente
    this.loadPromise = this.loadVocations();
  }

  public getPedestriansDebug() {
    return this.pedestrians.map(p => ({
      id: p.id,
      active: p.active,
      x: p.x,
      y: p.y,
      z: p.z,
      walkSpeedZ: p.walkSpeedZ,
      visible: p.group.visible,
      action: p.currentActionName,
      inScene: !!p.group.parent
    }));
  }

  public async init(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadPromise) {
      await this.loadPromise;
    }
  }

  private async loadVocations() {
    const loader = new GLTFLoader();
    let loadedCount = 0;
    const promises = VOCATION_DEFS.map((voc) => {
      return new Promise<void>((resolve) => {
        loader.load(
          voc.url,
          (gltf) => {
            loadedCount++;
            const pct = Math.round((loadedCount / VOCATION_DEFS.length) * 100);
            this.onProgressListeners.forEach((cb) => {
              try { cb(pct); } catch (e) {}
            });

            if (this.isDisposed) {
              resolve();
              return;
            }

            gltf.scene.traverse((obj) => {
              if ((obj as THREE.Mesh).isMesh) {
                const mesh = obj as THREE.Mesh;
                mesh.castShadow = false;
                mesh.receiveShadow = false;
                mesh.frustumCulled = true;
              }
            });

            this.templates.set(voc.id, {
              scene: gltf.scene,
              animations: gltf.animations,
            });
            resolve();
          },
          undefined,
          (err) => {
            console.warn(`[PedestrianSystem] Erro ao carregar ${voc.name}:`, err);
            loadedCount++;
            const pct = Math.round((loadedCount / VOCATION_DEFS.length) * 100);
            this.onProgressListeners.forEach((cb) => {
              try { cb(pct); } catch (e) {}
            });
            resolve();
          }
        );
      });
    });

    await Promise.all(promises);

    if (this.isDisposed || this.templates.size === 0) return;

    this.isLoaded = true;
    console.log(`[PedestrianSystem] 100% carregado! ${this.templates.size} profissões e animações prontas.`);

    const isMobile = typeof window !== 'undefined' && (
      'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 850
    );
    // Reduz significativamente a quantidade total de NPCs para economia de CPU/GPU
    this.initPool(isMobile ? 3 : 5);
    if (this.renderer && this.camera) {
      this.warmUp(this.renderer, this.camera);
    }
    this.onLoadedListeners.forEach((cb) => {
      try { cb(); } catch (e) { console.error(e); }
    });
    this.onLoadedListeners = [];
    this.onProgressListeners.forEach((cb) => {
      try { cb(100); } catch (e) {}
    });
    this.onProgressListeners = [];
  }

  private initPool(count: number) {
    if (this.templates.size === 0 || this.isDisposed) return;

    const availableIds = Array.from(this.templates.keys());

    for (let i = 0; i < count; i++) {
      const vocId = availableIds[i % availableIds.length];
      const tmpl = this.templates.get(vocId)!;

      const clonedScene = SkeletonUtils.clone(tmpl.scene) as THREE.Group;
      // 🚶 Proporção realista e destacada na calçada (+42%)
      clonedScene.scale.set(1.42, 1.42, 1.42);
      const mixer = new THREE.AnimationMixer(clonedScene);
      const actions: PedestrianInstance['actions'] = {};

      tmpl.animations.forEach((clip) => {
        const lower = clip.name.toLowerCase();
        if (lower.includes('idle')) actions.idle = mixer.clipAction(clip);
        if (lower.includes('walk')) actions.walk = mixer.clipAction(clip);
      });

      // Garantia de fallback se nomes não baterem exatamente
      if (!actions.idle && tmpl.animations.length > 0) {
        actions.idle = mixer.clipAction(tmpl.animations[0]);
      }
      if (!actions.walk && tmpl.animations.length > 0) {
        actions.walk = mixer.clipAction(tmpl.animations[tmpl.animations.length > 1 ? 1 : 0]);
      }

      clonedScene.position.set(0, -999, 0);
      clonedScene.visible = false;
      this.scene.add(clonedScene);

      const side: 'left' | 'right' = i % 2 === 0 ? 'right' : 'left';

      const ped: PedestrianInstance = {
        id: i,
        group: clonedScene,
        mixer,
        actions,
        currentActionName: null,
        behavior: 'TALKING',
        active: false,
        x: 0,
        y: 0.20,
        z: -999,
        walkSpeedZ: 0,
        side,
        deathTimer: 0,
        fallPitch: 0,
        fallRoll: 0,
        fallVelocityY: 0,
      };

      this.pedestrians.push(ped);
    }

    this.distributeInitialPedestrians();
  }

  private playAction(ped: PedestrianInstance, name: 'Idle' | 'Walk') {
    const nextAction = name === 'Idle' ? (ped.actions.idle || ped.actions.walk) : (ped.actions.walk || ped.actions.idle);
    if (!nextAction) return;

    if (ped.currentActionName === name && nextAction.isRunning()) {
      return;
    }

    const currentAction = ped.currentActionName === 'Idle' ? ped.actions.idle : ped.actions.walk;
    if (currentAction && currentAction !== nextAction) {
      currentAction.fadeOut(0.15);
    }

    nextAction.setEffectiveTimeScale(name === 'Walk' ? 1.22 : 1.0);
    nextAction.reset().fadeIn(0.15).play();
    ped.currentActionName = name;
  }

  private distributeInitialPedestrians() {
    // Organiza pedestres em pequenos grupos de 2 a 3 conversando parados na calçada
    // Grupo 1: z ~ 24m | Grupo 2: z ~ 48m
    for (let i = 0; i < this.pedestrians.length; i++) {
      const groupBaseZ = i < 3 ? 24 : 52;
      const offsetInGroup = (i % 3) * 1.35;
      this.spawnPedestrian(this.pedestrians[i], groupBaseZ + offsetInGroup);
    }
  }

  private spawnPedestrian(ped: PedestrianInstance, zPosition: number) {
    ped.active = true;
    ped.z = zPosition;
    ped.y = 0.20; // Altura exata sobre o piso da calçada elevada das casas (0.20m)
    ped.deathTimer = 0;
    ped.fallPitch = 0;
    ped.fallRoll = 0;
    ped.fallVelocityY = 0;
    ped.group.visible = true;

    // Distribui em grupo de 2 a 3 conversando parados
    const side = ped.side;
    const baseSidewalkX = side === 'right' ? 7.20 : -7.20;
    const memberOffset = (ped.id % 3) * 0.45;
    ped.x = side === 'right' ? (baseSidewalkX + memberOffset) : (baseSidewalkX - memberOffset);

    // NPCs em grupo parados conversando entre si (TALKING com animação Idle)
    ped.behavior = 'TALKING';
    ped.walkSpeedZ = 0;
    
    // Rotação: NPCs ficam voltados ligeiramente um de frente para o outro
    const inGroupIdx = ped.id % 3;
    let angleY = 0;
    if (inGroupIdx === 0) angleY = Math.PI * 0.25;
    else if (inGroupIdx === 1) angleY = -Math.PI * 0.75;
    else angleY = Math.PI * 0.90;
    
    ped.group.rotation.set(0, angleY, 0);
    this.playAction(ped, 'Idle');

    ped.group.position.set(ped.x, ped.y, ped.z);
  }

  public update(dt: number, roadSpeed: number, motoboyX: number, motoboyY: number, motoboyZ: number, isPlaying: boolean) {
    if (!this.isLoaded || this.isDisposed) return;

    for (let i = 0; i < this.pedestrians.length; i++) {
      const ped = this.pedestrians[i];
      if (!ped.active) continue;

      // O mundo avança com a rolagem do asfalto em direção à câmera (Z decrescente)
      const worldScroll = isPlaying ? roadSpeed * dt : 0;
      ped.z -= worldScroll;

      // Se foi atropelado na calçada
      if (ped.behavior === 'DEAD') {
        ped.deathTimer += dt;
        ped.fallPitch = Math.min(Math.PI / 2, ped.fallPitch + dt * 6.0);
        ped.y = Math.max(0.08, ped.y + ped.fallVelocityY * dt);
        ped.fallVelocityY -= 14.0 * dt;
        ped.group.rotation.x = ped.fallPitch;
        ped.group.rotation.z = ped.fallRoll;
        ped.group.position.set(ped.x, ped.y, ped.z);

        if (ped.z < -12.0) {
          this.recyclePedestrian(ped);
        }
        continue;
      }

      // ⚡ Culling e Distância Segura - mixer.update() apenas quando visível (economia de CPU em cálculo de esqueleto)
      const distToCamera = Math.abs(ped.z - motoboyZ);
      const isBehindPlayer = ped.z < motoboyZ - 6.0;

      if (isBehindPlayer || distToCamera > 55.0) {
        ped.group.visible = false;
      } else {
        ped.group.visible = true;
        // ⚡ Otimização: atualiza animação esquelética a cada 2 frames (30fps efetivo no esqueleto - imperceptível)
        if (((window as any).__frameCount & 1) === 0) {
          ped.mixer.update(dt * 2.0);
        }
      }

      // Caminhada apenas se não estiver conversando em grupo
      if (ped.behavior === 'WALKING') {
        ped.z += ped.walkSpeedZ * dt;
      }

      ped.group.position.set(ped.x, ped.y, ped.z);

      // Verificação de Colisão: se a moto subir na calçada e bater no pedestre
      if (isPlaying && (ped.behavior as string) !== 'DEAD') {
        const dx = Math.abs(motoboyX - ped.x);
        const dz = Math.abs(motoboyZ - ped.z);
        if (dx < 1.05 && dz < 1.35 && motoboyY < 1.35) {
          this.hitPedestrian(ped);
        }
      }

      // Reciclagem: quando o pedestre fica para trás da câmera (z < -10m), reaparece lá na frente das casas
      if (ped.z < -10.0) {
        this.recyclePedestrian(ped);
      }
    }
  }

  private hitPedestrian(ped: PedestrianInstance) {
    ped.behavior = 'DEAD';
    ped.mixer.stopAllAction();

    ped.fallVelocityY = 2.5;
    ped.fallRoll = (Math.random() - 0.5) * 0.7;
    ped.fallPitch = 0.25;

    this.totalHits++;

    if (this.onHitCallback) {
      this.onHitCallback(this.totalHits);
    }
  }

  private recyclePedestrian(ped: PedestrianInstance) {
    // Spawna à frente dentro do campo de visão útil da pista (entre Z = 45m e 70m)
    const newZ = 45 + (ped.id % 2) * 18 + Math.random() * 8;
    this.spawnPedestrian(ped, newZ);
  }

  public setShadowsEnabled(enabled: boolean) {
    for (const ped of this.pedestrians) {
      ped.group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          (obj as THREE.Mesh).castShadow = enabled;
        }
      });
    }
  }

  public reset() {
    this.totalHits = 0;
    if (this.isLoaded) {
      for (const ped of this.pedestrians) {
        ped.currentActionName = null;
      }
      this.distributeInitialPedestrians();
    }
  }

  public dispose() {
    this.isDisposed = true;
    this.pedestrians.forEach((p) => {
      this.scene.remove(p.group);
      p.mixer.stopAllAction();
    });
    this.pedestrians = [];
  }

  public prepareForWarmUp() {
    this.pedestrians.forEach((ped, idx) => {
      ped.group.visible = true;
      ped.group.position.set((idx % 2 === 0 ? 1 : -1) * 7.2, 0.22, 14 + idx * 4);
    });
  }

  public finishWarmUp() {
    this.distributeInitialPedestrians();
  }

  public warmUp(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    this.prepareForWarmUp();
    this.pedestrians.forEach((ped) => {
      try {
        renderer.compile(ped.group, camera);
      } catch (_) {}
    });
    this.distributeInitialPedestrians();
  }
}
