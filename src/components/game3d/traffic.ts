import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createVehicleHeadlightRigs, VehicleHeadlightRig } from './CarModelsDetailed';
import { applyAtmosphericToHierarchy } from './atmosphericFogSystem';

export interface CarModelDef {
  id: string;
  file: string;
  name: string;
  baseSpeed: number; // m/s
  speedVariation: number;
  scale: number;
  frontZ: number;
  hlY: number;
  hlWidth: number;
  hitBoxX: number;
  hitBoxZ: number;
}

// 🚗 Modelos com escalas aumentadas (+35%) para proporção e imponência realistas na pista
export const NEW_CAR_MODELS: CarModelDef[] = [
  { id: 'police', file: 'police.glb', name: 'Polícia Rodoviária', baseSpeed: 23.0, speedVariation: 3.5, scale: 1.18, frontZ: 2.9, hlY: 0.55, hlWidth: 1.05, hitBoxX: 1.25, hitBoxZ: 2.8 },
  { id: 'fenyr', file: 'fenyr.glb', name: 'Superesportivo Fenyr', baseSpeed: 26.0, speedVariation: 3.0, scale: 1.20, frontZ: 2.6, hlY: 0.48, hlWidth: 1.10, hitBoxX: 1.30, hitBoxZ: 2.6 },
  { id: 'lamb', file: 'lamb.glb', name: 'Hipercarro Lamb', baseSpeed: 25.5, speedVariation: 3.0, scale: 1.20, frontZ: 2.5, hlY: 0.46, hlWidth: 1.05, hitBoxX: 1.25, hitBoxZ: 2.5 },
  { id: 'italia', file: 'italia.glb', name: 'Superesportivo Italia', baseSpeed: 25.0, speedVariation: 3.0, scale: 1.18, frontZ: 2.7, hlY: 0.48, hlWidth: 1.10, hitBoxX: 1.30, hitBoxZ: 2.7 },
  { id: 'ghini', file: 'ghini.glb', name: 'Esportivo Ghini', baseSpeed: 24.0, speedVariation: 3.0, scale: 1.20, frontZ: 2.6, hlY: 0.50, hlWidth: 1.05, hitBoxX: 1.25, hitBoxZ: 2.6 },
  { id: 'kamaro', file: 'kamaro.glb', name: 'Muscle Car Kamaro', baseSpeed: 21.0, speedVariation: 3.0, scale: 1.20, frontZ: 2.6, hlY: 0.52, hlWidth: 1.08, hitBoxX: 1.28, hitBoxZ: 2.6 },
  { id: 'rally', file: 'rally.glb', name: 'Carro de Rally', baseSpeed: 21.5, speedVariation: 3.5, scale: 1.20, frontZ: 2.3, hlY: 0.55, hlWidth: 1.02, hitBoxX: 1.20, hitBoxZ: 2.4 },
  { id: 'coupe', file: 'coupe.glb', name: 'Cupê Esportivo', baseSpeed: 20.0, speedVariation: 3.0, scale: 1.20, frontZ: 2.7, hlY: 0.55, hlWidth: 1.08, hitBoxX: 1.25, hitBoxZ: 2.7 },
  { id: 'jeep', file: 'jeep.glb', name: 'SUV Jeep 4x4', baseSpeed: 17.5, speedVariation: 2.5, scale: 1.22, frontZ: 2.4, hlY: 0.68, hlWidth: 1.08, hitBoxX: 1.32, hitBoxZ: 2.5 },
  { id: 'mobil', file: 'mobil.glb', name: 'Carro Urbano Mobil', baseSpeed: 16.0, speedVariation: 2.5, scale: 1.20, frontZ: 2.8, hlY: 0.56, hlWidth: 1.05, hitBoxX: 1.25, hitBoxZ: 2.7 },
  { id: 'armor', file: 'armor.glb', name: 'Blindado Pesado', baseSpeed: 15.0, speedVariation: 2.0, scale: 1.22, frontZ: 2.8, hlY: 0.74, hlWidth: 1.20, hitBoxX: 1.45, hitBoxZ: 2.9 },
  { id: 'van', file: 'van.glb', name: 'Furgão de Entrega', baseSpeed: 14.5, speedVariation: 2.0, scale: 1.22, frontZ: 2.7, hlY: 0.70, hlWidth: 1.15, hitBoxX: 1.35, hitBoxZ: 2.8 },
];

export interface TrafficCar {
  mesh: THREE.Group;
  wheels: THREE.Object3D[];
  headlights?: VehicleHeadlightRig;
  lane: number;
  targetLane: number;
  isChangingLane: boolean;
  laneChangeTimer: number;
  z: number;
  speed: number;
  active: boolean;
  type: string;
  modelDef: CarModelDef;
  isTruck?: boolean;
  nearMissTriggered?: boolean;
  hasHonked?: boolean;
  hasSiren?: boolean;
  sirenTimer?: number;
  sirenGiroflexGroup?: THREE.Group;
  sirenRedLight?: THREE.PointLight;
  sirenBlueLight?: THREE.PointLight;
  isModelLoaded?: boolean;
}

const gltfLoader = new GLTFLoader();
const loadedTemplates = new Map<string, THREE.Group>();

export class TrafficManager {
  private scene: THREE.Scene;
  private pool: TrafficCar[] = [];
  private activeCars: TrafficCar[] = [];
  private spawnTimer: number = 3.0;
  private lanes = [-2.5, 0.0, 2.5];
  private nextModelIndex = 0;
  public onNearMiss?: (car: TrafficCar) => void;
  public currentHeadlightGlare: number = 0;
  private difficulty: 'easy' | 'medium' | 'hard' = 'medium';

  public setDifficulty(diff: 'easy' | 'medium' | 'hard') {
    this.difficulty = diff;
  }

  // 🚨 Sistema de áudio da sirene de polícia com atenuação posicional e Doppler
  private sirenAudio: HTMLAudioElement | null = null;
  private isSirenPlaying = false;
  private renderer?: THREE.WebGLRenderer;
  private camera?: THREE.Camera;

  public setRendererAndCamera(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    this.renderer = renderer;
    this.camera = camera;
    this.warmUp(renderer, camera);
  }

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    if (typeof window !== 'undefined') {
      try {
        this.sirenAudio = new Audio('/sounds/police_siren.mp3');
        this.sirenAudio.loop = true;
        this.sirenAudio.volume = 0;
      } catch (err) {
        console.warn('[TrafficManager] Falha ao instanciar áudio de sirene:', err);
      }
    }

    this.initPool();
    this.initPromise = this.preloadTemplates();
  }

  private initPromise: Promise<void> | null = null;
  public isLoaded = false;

  public async init(): Promise<void> {
    if (this.isLoaded) return;
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  private async preloadTemplates(): Promise<void> {
    const loadOne = (def: CarModelDef) => {
      return new Promise<void>((resolve) => {
        if (loadedTemplates.has(def.id)) {
          this.upgradeCarModel(def.id);
          resolve();
          return;
        }

        gltfLoader.load(
          `/models/cars/${def.file}`,
          (gltf) => {
            const root = gltf.scene;
            root.scale.set(def.scale, def.scale, def.scale);
            // Corrige sombras e materiais
            root.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.castShadow = false;
                child.receiveShadow = false;
                child.frustumCulled = true;
                if (child.material) {
                  const mats = Array.isArray(child.material) ? child.material : [child.material];
                  mats.forEach((m) => {
                    m.roughness = Math.min(0.8, m.roughness || 0.5);
                  });
                }
              }
            });
            applyAtmosphericToHierarchy(root, { lod: 'scenery', ditherNear: 145, ditherFar: 205 });
            loadedTemplates.set(def.id, root);
            this.upgradeCarModel(def.id);
            resolve();
          },
          undefined,
          (err) => {
            console.error(`[TrafficManager] Erro ao carregar ${def.file}:`, err);
            resolve();
          }
        );
      });
    };

    // Carrega todos os modelos de trânsito em alta velocidade durante a tela de loading
    await Promise.all(NEW_CAR_MODELS.map(loadOne));
    this.isLoaded = true;
    this.initInitialTraffic();
  }

  private upgradeCarModel(defId: string) {
    const template = loadedTemplates.get(defId);
    if (!template) return;

    this.pool.forEach((car) => {
      if (car.modelDef.id === defId && !car.isModelLoaded) {
        car.isModelLoaded = true;
        // Remove placeholder antigo
        while (car.mesh.children.length > 0) {
          car.mesh.remove(car.mesh.children[0]);
        }

        const clone = template.clone(true);
        car.mesh.add(clone);

        car.wheels = [];
        clone.traverse((child) => {
          if (child.name.toLowerCase().includes('wheel')) {
            car.wheels.push(child);
          }
        });

        // Adiciona sistema de faróis dianteiros
        const headlights = createVehicleHeadlightRigs(
          car.modelDef.frontZ,
          car.modelDef.hlY,
          car.modelDef.hlWidth,
          car.modelDef.id === 'van' || car.modelDef.id === 'armor'
        );
        car.mesh.add(headlights.group);
        car.headlights = headlights;

        // Se for viatura de polícia, adiciona o equipamento de giroflex piscante no teto
        if (car.modelDef.id === 'police') {
          this.attachPoliceGiroflex(car);
        }

        if (this.renderer && this.camera) {
          const wasVis = car.mesh.visible;
          car.mesh.visible = true;
          try {
            this.renderer.compile(car.mesh, this.camera);
          } catch (_) {}
          car.mesh.visible = wasVis;
        }
      }
    });
  }

  private attachPoliceGiroflex(car: TrafficCar) {
    const giroflexGroup = new THREE.Group();
    giroflexGroup.position.set(0, 1.45, -0.15); // Teto da viatura

    const redLight = new THREE.PointLight(0xef4444, 0, 18);
    redLight.position.set(-0.35, 0.2, 0);
    giroflexGroup.add(redLight);

    const blueLight = new THREE.PointLight(0x3b82f6, 0, 18);
    blueLight.position.set(0.35, 0.2, 0);
    giroflexGroup.add(blueLight);

    car.mesh.add(giroflexGroup);
    car.sirenGiroflexGroup = giroflexGroup;
    car.sirenRedLight = redLight;
    car.sirenBlueLight = blueLight;
  }

  private initPool() {
    // 🚗 Pool expandido para 24 veículos (2 instâncias de cada modelo) para fluxo contínuo inesgotável
    for (let instance = 0; instance < 2; instance++) {
      NEW_CAR_MODELS.forEach((def) => {
        const rootGroup = new THREE.Group();
        rootGroup.visible = false;
        rootGroup.rotation.y = Math.PI;

        const phMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
        const phMesh = new THREE.Mesh(new THREE.BoxGeometry(def.hitBoxX * 1.8, 1.35, def.hitBoxZ * 1.8), phMat);
        phMesh.position.y = 0.65;
        rootGroup.add(phMesh);

        const headlights = createVehicleHeadlightRigs(def.frontZ, def.hlY, def.hlWidth, false);
        rootGroup.add(headlights.group);

        this.scene.add(rootGroup);

        const car: TrafficCar = {
          mesh: rootGroup,
          wheels: [],
          headlights,
          lane: 0,
          targetLane: 0,
          isChangingLane: false,
          laneChangeTimer: 0,
          z: 0,
          speed: def.baseSpeed,
          active: false,
          type: def.id,
          modelDef: def,
          isTruck: def.id === 'armor' || def.id === 'van',
          nearMissTriggered: false,
          hasHonked: false,
          hasSiren: false,
          sirenTimer: 0,
        };

        if (def.id === 'police') {
          this.attachPoliceGiroflex(car);
        }

        this.pool.push(car);
      });
    }
  }

  private initInitialTraffic() {
    // 🚦 Mantém a pista limpa no início para a largada e a conclusão do tutorial do jato d'água
  }

  public getActiveCars(): TrafficCar[] {
    return this.activeCars;
  }

  public removeCar(car: TrafficCar) {
    car.active = false;
    car.mesh.visible = false;
    car.hasSiren = false;
    if (car.sirenRedLight) car.sirenRedLight.intensity = 0;
    if (car.sirenBlueLight) car.sirenBlueLight.intensity = 0;
    const idx = this.activeCars.indexOf(car);
    if (idx !== -1) {
      this.activeCars.splice(idx, 1);
    }
  }

  public update(
    dt: number,
    playerX: number,
    playerY: number,
    playerSpeed: number,
    gameTime: number,
    playerZ: number = 0,
    nightFactor: number = 0
  ): TrafficCar | null {
    let collidedCar: TrafficCar | null = null;
    let maxGlare = 0;

    let closestSirenDist: number | null = null;
    let closestSirenDeltaZ = 0;

    // 1. Atualiza e move os carros ativos
    for (let i = this.activeCars.length - 1; i >= 0; i--) {
      const car = this.activeCars[i];

      // FÍSICA CÔMICA: Carro arremessado por hidrante de água
      if (car.mesh.userData.isLaunchedByWater) {
        const ud = car.mesh.userData;
        ud.launchVy = (ud.launchVy || 22.0) - 26.0 * dt;
        car.mesh.position.y += ud.launchVy * dt;
        car.mesh.position.x += (ud.launchVx || 3.5) * dt;
        car.z -= (car.speed * 0.35 + playerSpeed * 0.7) * dt;
        car.mesh.position.z = car.z;

        car.mesh.rotation.x += (ud.launchRotX || 12.0) * dt;
        car.mesh.rotation.y += (ud.launchRotY || 4.0) * dt;
        car.mesh.rotation.z += (ud.launchRotZ || 14.0) * dt;

        const airWheelStep = 25.0 * dt;
        for (let w = 0; w < car.wheels.length; w++) {
          car.wheels[w].rotation.x += airWheelStep;
        }

        if (car.mesh.position.y < -2.0 || car.z < -22 || Math.abs(car.mesh.position.x) > 35) {
          this.removeCar(car);
        }
        continue;
      }

      // Velocidade relativa de aproximação
      const hyperExtra = playerSpeed > 27.78 ? (playerSpeed - 27.78) * 0.35 : 0;
      const totalClosingSpeed = car.speed + hyperExtra + playerSpeed;
      car.z -= totalClosingSpeed * dt;

      car.mesh.rotation.set(0, Math.PI, 0);
      car.mesh.position.set(car.lane, 0.02, car.z);

      // Faróis automotivos sincronizados com o ciclo dia/noite (sutil de dia, iluminação plena à noite)
      if (car.headlights) {
        car.headlights.setIntensity(nightFactor);
      }

      // 🚨 GIROFLEX E SIRENE DA POLÍCIA
      if (car.modelDef.id === 'police' && car.hasSiren) {
        car.sirenTimer = (car.sirenTimer || 0) + dt * 8.0;
        const phase = Math.sin(car.sirenTimer);
        if (car.sirenRedLight) car.sirenRedLight.intensity = phase > 0 ? 3.5 : 0.1;
        if (car.sirenBlueLight) car.sirenBlueLight.intensity = phase < 0 ? 3.5 : 0.1;

        // Monitora proximidade acústica para controle de volume
        const deltaZ = car.z - playerZ;
        const dist = Math.abs(deltaZ);
        if (closestSirenDist === null || dist < closestSirenDist) {
          closestSirenDist = dist;
          closestSirenDeltaZ = deltaZ;
        }
      }

      // ROTAÇÃO DINÂMICA DAS RODAS (Apenas carros dentro do campo de visão útil)
      if (car.z > -12 && car.z < 85) {
        const wheelRadius = 0.38;
        const rotStep = (totalClosingSpeed * dt) / wheelRadius;
        for (let w = 0; w < car.wheels.length; w++) {
          car.wheels[w].rotation.x += rotStep;
        }
      }

      // Ofuscamento realista de farol
      if (nightFactor > 0.05) {
        const dzGlare = car.z - playerZ;
        if (dzGlare > 0 && dzGlare < 48) {
          const dxGlare = Math.abs(playerX - car.lane);
          if (dxGlare < 2.4) {
            const distRatio = Math.max(0, Math.min(1, (48 - dzGlare) / 48));
            const distCurve = Math.pow(distRatio, 1.25);
            const lateralCurve = Math.max(0, 1.0 - (dxGlare / 2.4));
            const glare = distCurve * lateralCurve * nightFactor * (car.isTruck ? 1.3 : 1.0);
            if (glare > maxGlare) {
              maxGlare = Math.min(1.0, glare);
            }
          }
        }
      }

      // Detecção de colisão com dimensões realistas
      const dx = Math.abs(playerX - car.lane);
      const dz = Math.abs(car.z - playerZ);
      const dy = playerY;

      const hitBoxZ = car.modelDef.hitBoxZ;
      const hitBoxX = car.modelDef.hitBoxX;

      if (dx < hitBoxX && dz < hitBoxZ && dy < 1.2) {
        collidedCar = car;
      }

      // Near-Miss (fina no trânsito)
      if (!car.nearMissTriggered && dz < hitBoxZ + 0.8 && dx >= hitBoxX && dx < hitBoxX + 0.75 && dy < 1.4) {
        car.nearMissTriggered = true;
        if (this.onNearMiss) {
          this.onNearMiss(car);
        }
      }

      // Recicla carro quando passa da câmera
      if (car.z < -20) {
        this.removeCar(car);
      }
    }

    this.currentHeadlightGlare = maxGlare;

    // 🔊 CONTROLE DINÂMICO DE ÁUDIO DA SIRENE (Aumenta ao se aproximar, diminui ao passar)
    this.updateSirenSound(closestSirenDist, closestSirenDeltaZ);

    // 🚦 2. SISTEMA DINÂMICO DE NÍVEIS DE TRÂNSITO POR VELOCIDADE (LEVEL PROGRESSION)
    const speedKmh = playerSpeed * 3.6;
    const isMobile = typeof window !== 'undefined' && (
      'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 850
    );

    let maxActiveLimit = 1;
    let spawnDelayMin = 4.2;
    let spawnDelayMax = 6.0;

    if (this.difficulty === 'easy') {
      // 🟢 MODO FÁCIL: Estritamente 1 carro por vez na pista (sem aglomeração nem ondas)
      maxActiveLimit = 1;
      spawnDelayMin = 5.5;
      spawnDelayMax = 8.0;
    } else if (this.difficulty === 'hard') {
      // 🔴 MODO DIFÍCIL: Trânsito intenso, frenético e veloz (até 6 carros)
      if (speedKmh < 45) {
        maxActiveLimit = 2;
        spawnDelayMin = 2.8;
        spawnDelayMax = 4.0;
      } else if (speedKmh < 75) {
        maxActiveLimit = 4;
        spawnDelayMin = 1.6;
        spawnDelayMax = 2.6;
      } else {
        maxActiveLimit = isMobile ? 5 : 6;
        spawnDelayMin = 1.0;
        spawnDelayMax = 1.7;
      }
    } else {
      // 🟡 MODO MÉDIO: Equilíbrio padrão
      if (speedKmh < 45) {
        maxActiveLimit = 1;
        spawnDelayMin = 4.2;
        spawnDelayMax = 6.0;
      } else if (speedKmh < 65) {
        maxActiveLimit = 2;
        spawnDelayMin = 2.8;
        spawnDelayMax = 4.2;
      } else if (speedKmh < 85) {
        maxActiveLimit = 4;
        spawnDelayMin = 2.0;
        spawnDelayMax = 3.2;
      } else {
        maxActiveLimit = isMobile ? 4 : 5;
        spawnDelayMin = 1.4;
        spawnDelayMax = 2.2;
      }
    }

    this.spawnTimer -= dt;

    if (this.spawnTimer <= 0 && this.activeCars.length < maxActiveLimit) {
      if (this.difficulty !== 'easy' && speedKmh > 85) {
        this.spawnTimer = spawnDelayMin + Math.random() * (spawnDelayMax - spawnDelayMin);
        const waveSize = Math.random() > 0.4 ? 4 : 3;
        this.spawnHighSpeedWave(waveSize);
      } else {
        this.spawnTimer = spawnDelayMin + Math.random() * (spawnDelayMax - spawnDelayMin);
        const candidateDef = NEW_CAR_MODELS[this.nextModelIndex % NEW_CAR_MODELS.length];
        this.nextModelIndex++;
        const candidateCar = this.pool.find(c => !c.active && c.modelDef.id === candidateDef.id);

        if (candidateCar) {
          this.spawnCar(candidateCar);
        } else {
          const inactive = this.pool.find(c => !c.active);
          if (inactive) this.spawnCar(inactive);
        }
      }
    }

    return collidedCar;
  }

  // 🔊 Atualização espacial de volume da sirene com efeito Doppler
  private updateSirenSound(closestDist: number | null, deltaZ: number) {
    if (!this.sirenAudio) return;

    if (closestDist !== null && closestDist < 75.0) {
      let targetVolume = 0;

      if (deltaZ >= -2.0) {
        // Viatura se aproximando pela frente: volume aumenta suavemente até o clímax ("dá uma aumentadinha")
        const proximity = Math.max(0, 1.0 - (closestDist / 70.0));
        targetVolume = Math.pow(proximity, 1.1) * 0.85;
      } else {
        // Viatura passou da câmera: volume cai rapidamente com a distância ("vai diminuindo som quando passa da camera")
        const behindDist = Math.abs(deltaZ);
        const fadeOut = Math.max(0, 1.0 - (behindDist / 32.0));
        targetVolume = Math.pow(fadeOut, 1.8) * 0.75;
      }

      this.sirenAudio.volume = Math.max(0, Math.min(1.0, targetVolume));

      if (targetVolume > 0.02 && !this.isSirenPlaying) {
        this.sirenAudio.play().catch(() => {});
        this.isSirenPlaying = true;
      } else if (targetVolume <= 0.02 && this.isSirenPlaying) {
        this.stopSiren();
      }
    } else if (this.isSirenPlaying) {
      this.stopSiren();
    }
  }

  private stopSiren() {
    if (this.sirenAudio) {
      this.sirenAudio.volume = 0;
      this.sirenAudio.pause();
    }
    this.isSirenPlaying = false;
  }

  // Dispara onda coordenada de veículos
  private spawnHighSpeedWave(count: number) {
    const inactive = this.pool.filter(c => !c.active);
    if (inactive.length === 0) return;

    // Spawna os carros disponíveis sem cancelar a onda se faltar 1 no pool
    const actualCount = Math.min(count, inactive.length);

    const shuffledLanes = [...this.lanes].sort(() => Math.random() - 0.5);
    const laneSequence: number[] = [shuffledLanes[0], shuffledLanes[1], shuffledLanes[2]];
    if (actualCount >= 4) {
      laneSequence.push(shuffledLanes[0]);
    }

    const baseZ = 195 + Math.random() * 20;

    for (let i = 0; i < actualCount; i++) {
      const car = inactive[i];
      const lane = laneSequence[i % laneSequence.length];
      const z = baseZ + i * (22.0 + Math.random() * 8.0);
      const speed = car.modelDef.baseSpeed + (Math.random() - 0.5) * car.modelDef.speedVariation;
      this.spawnCarAt(car, lane, z, speed);
    }
  }

  private spawnCarAt(car: TrafficCar, lane: number, z: number, speed: number) {
    car.active = true;
    car.lane = lane;
    car.speed = speed;
    car.z = z;
    car.nearMissTriggered = false;
    car.hasHonked = false;

    // 🚨 Apenas algumas viaturas de polícia ligam a sirene (55% de chance)
    if (car.modelDef.id === 'police') {
      car.hasSiren = Math.random() < 0.55;
    } else {
      car.hasSiren = false;
    }

    car.mesh.position.set(lane, 0.02, z);
    car.mesh.rotation.set(0, Math.PI, 0);
    car.mesh.visible = true;
    this.activeCars.push(car);
  }

  private spawnCar(car: TrafficCar) {
    const busyLanes = new Set<number>();
    this.activeCars.forEach(c => {
      if (c.z > 85) busyLanes.add(c.lane);
    });

    const freeLanes = this.lanes.filter(l => !busyLanes.has(l));
    let chosenLane: number;

    if (freeLanes.length > 0) {
      chosenLane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
    } else {
      // Se todas as faixas tiverem carros à frente, escolhe a faixa com o carro mais distante
      let maxDist = -999;
      let bestLane = this.lanes[0];
      for (const l of this.lanes) {
        const inLane = this.activeCars.filter(c => c.lane === l);
        const highestZInLane = inLane.reduce((max, c) => Math.max(max, c.z), 0);
        if (highestZInLane > maxDist) {
          maxDist = highestZInLane;
          bestLane = l;
        }
      }
      chosenLane = bestLane;
    }

    // Calcula Z garantindo folga segura em relação a qualquer outro veículo na mesma faixa
    const carsInChosenLane = this.activeCars.filter(c => c.lane === chosenLane);
    const highestZ = carsInChosenLane.reduce((max, c) => Math.max(max, c.z), 180);
    const spawnZ = Math.max(195 + Math.random() * 35, highestZ + 30.0 + Math.random() * 15.0);

    car.active = true;
    car.lane = chosenLane;
    car.nearMissTriggered = false;
    car.hasHonked = false;
    car.speed = car.modelDef.baseSpeed + (Math.random() - 0.5) * car.modelDef.speedVariation;
    car.z = spawnZ;

    // 🚨 Sorteia sirene para viaturas de polícia
    if (car.modelDef.id === 'police') {
      car.hasSiren = Math.random() < 0.55;
    } else {
      car.hasSiren = false;
    }

    car.mesh.position.set(chosenLane, 0.02, car.z);
    car.mesh.rotation.set(0, Math.PI, 0);
    car.mesh.visible = true;

    this.activeCars.push(car);
  }

  public launchCarWithWater(car: TrafficCar, _jetX: number, _jetZ: number) {
    if (!car.active || car.mesh.userData.isLaunchedByWater) return;
    car.mesh.userData.isLaunchedByWater = true;
    car.mesh.userData.launchVy = 22.0 + Math.random() * 8.0;
    car.mesh.userData.launchVx = (car.lane === 0 ? (Math.random() > 0.5 ? 4.8 : -4.8) : Math.sign(car.lane) * 5.2);
    car.mesh.userData.launchRotX = (Math.random() > 0.5 ? 1 : -1) * (12.0 + Math.random() * 6.0);
    car.mesh.userData.launchRotY = (Math.random() - 0.5) * 8.0;
    car.mesh.userData.launchRotZ = (Math.random() > 0.5 ? 1 : -1) * (14.0 + Math.random() * 8.0);
  }

  public reset() {
    this.stopSiren();
    this.activeCars.forEach(c => {
      c.active = false;
      c.hasSiren = false;
      c.mesh.visible = false;
      c.mesh.userData.isLaunchedByWater = false;
      c.mesh.rotation.set(0, Math.PI, 0);
    });
    this.pool.forEach(c => {
      c.mesh.userData.isLaunchedByWater = false;
      c.mesh.rotation.set(0, Math.PI, 0);
      c.mesh.position.y = 0.02;
    });
    this.activeCars = [];
    this.spawnTimer = 2.0;
    this.initInitialTraffic();
  }

  public dispose() {
    this.stopSiren();
    this.pool.forEach(c => {
      try {
        c.mesh.traverse((node) => {
          try {
            if ((node as THREE.Mesh).geometry && typeof (node as THREE.Mesh).geometry.dispose === 'function') {
              (node as THREE.Mesh).geometry.dispose();
            }
            if ((node as THREE.Mesh).material) {
              const mat = (node as THREE.Mesh).material;
              if (Array.isArray(mat)) {
                mat.forEach(m => {
                  if (m && typeof m.dispose === 'function') m.dispose();
                });
              } else if (mat && typeof (mat as THREE.Material).dispose === 'function') {
                (mat as THREE.Material).dispose();
              }
            }
          } catch (_) {}
        });
      } catch (_) {}
      if (c.mesh.parent) c.mesh.parent.remove(c.mesh);
    });
    this.pool = [];
    this.activeCars = [];
  }

  public prepareForWarmUp() {
    this.pool.forEach((car, idx) => {
      car.mesh.visible = true;
      // Posiciona no campo de visão e sob a luz do sol para compilar materiais e sombras (Depth Pass)
      car.mesh.position.set(((idx % 3) - 1) * 2.6, 0.02, 16 + (idx % 6) * 4);
    });
  }

  public finishWarmUp() {
    this.pool.forEach((car) => {
      car.mesh.visible = false;
      car.mesh.position.set(0, -999, 0);
    });
    this.activeCars = [];
  }

  public warmUp(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    this.prepareForWarmUp();
    this.pool.forEach((car) => {
      try {
        renderer.compile(car.mesh, camera);
      } catch (_) {}
    });
  }
}
