import * as THREE from 'three';
import { 
  createPothole, createPuddle, createAsphaltPatch, 
  createPizzaBox, createTrafficCone, createCoxinha, createBone, createGoldCoin,
  createBanknoteBundle, createManhole, manholeStreamTex,
} from './obstacles';
import { applyAtmosphericToHierarchy } from './atmosphericFogSystem';

export interface SpawnedObstacle {
  mesh: THREE.Group;
  type: string;
  z: number;
  x: number;
  collisionRadius: number;
  collected?: boolean;
  active?: boolean;
}

export class SpawnManager {
  private scene: THREE.Scene;
  private pool: SpawnedObstacle[] = [];
  private activeObstacles: SpawnedObstacle[] = [];
  private spawnCooldown: number = 1.0;
  private lanes = [-2.5, 0.0, 2.5];
  
  private obstacleTypes = [
    { type: 'coin', weight: 52 }, // 💵 Cédulas de dinheiro (10 e 100 reais)
    { type: 'pizza', weight: 15 },
    { type: 'pothole', weight: 5 },
    { type: 'cone', weight: 15 },
    { type: 'coxinha', weight: 16 },
    { type: 'bone', weight: 12 },
  ];

  private currentMode: 'caramelo' | 'motoboy' = 'caramelo';
  private difficulty: 'easy' | 'medium' | 'hard' = 'medium';

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initInitialObstacles();
  }

  public setMode(mode: 'caramelo' | 'motoboy') {
    this.currentMode = mode;
  }

  public setDifficulty(diff: 'easy' | 'medium' | 'hard') {
    this.difficulty = diff;
  }

  public getObstacles(): SpawnedObstacle[] {
    return this.activeObstacles;
  }

  // ⚡ Pré-alocação e aquecimento da pool de obstáculos na GPU (ZERO engasgos na corrida)
  public prewarmPool(renderer?: THREE.WebGLRenderer, camera?: THREE.Camera) {
    const counts: Record<string, number> = {
      coin_10: 48,
      coin_50: 20,
      coin_100: 8,
      bone: 36,
      cone: 10,
      pizza: 10,
      coxinha: 10,
      pothole: 8,
      puddle: 8,
      manhole: 6,
      patch: 8,
    };

    Object.entries(counts).forEach(([type, targetCount]) => {
      const current = this.pool.filter(o => o.type === type).length;
      for (let i = current; i < targetCount; i++) {
        const mesh = this.createObstacleMesh(type);
        mesh.visible = false;
        mesh.position.set(0, -999, 0);
        this.scene.add(mesh);
        this.pool.push({
          mesh,
          type,
          z: -999,
          x: 0,
          collisionRadius: 0.6,
          active: false,
          collected: false,
        });
      }
    });
  }

  public prepareForWarmUp() {
    this.pool.forEach((obs, idx) => {
      obs.mesh.visible = true;
      obs.mesh.position.set(((idx % 3) - 1) * 2.5, 0.85, 12 + (idx % 8) * 3);
      if (obs.type === 'manhole' && (obs.mesh as any).userData?.waterGroup) {
        (obs.mesh as any).userData.waterGroup.visible = true;
      }
    });
  }

  public finishWarmUp() {
    this.pool.forEach((obs) => {
      obs.mesh.visible = false;
      obs.mesh.position.set(0, -999, 0);
      obs.active = false;
      if (obs.type === 'manhole' && (obs.mesh as any).userData?.waterGroup) {
        (obs.mesh as any).userData.waterGroup.visible = false;
      }
    });
    this.activeObstacles = [];
    this.initInitialObstacles();
  }

  private initInitialObstacles() {
    // Initial spawn spaced from z = 25 to z = 180
    for (let z = 25; z < 180; z += 18) {
      this.spawnSingleObstacle(z);
    }
  }

  private getRandomType(): string {
    const isCaramelo = this.currentMode === 'caramelo';
    let totalWeight = 0;
    for (let i = 0; i < this.obstacleTypes.length; i++) {
      const item = this.obstacleTypes[i];
      if (item.type === 'coin') totalWeight += 40;
      else if (item.type === 'bone') totalWeight += isCaramelo ? 18 : 0;
      else totalWeight += item.weight;
    }
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < this.obstacleTypes.length; i++) {
      const item = this.obstacleTypes[i];
      let w = item.weight;
      if (item.type === 'coin') w = 40;
      else if (item.type === 'bone') w = isCaramelo ? 18 : 0;
      if (w <= 0) continue;
      const t = (item.type === 'coin' && isCaramelo) ? 'bone' : (item.type === 'bone' && !isCaramelo) ? 'coin' : item.type;
      rand -= w;
      if (rand <= 0) return t;
    }
    return isCaramelo ? 'bone' : 'coin';
  }

  private createObstacleMesh(type: string): THREE.Group {
    let g: THREE.Group;
    switch (type) {
      case 'coin': g = createBanknoteBundle(10); break;
      case 'coin_10': g = createBanknoteBundle(10); break;
      case 'coin_50': g = createBanknoteBundle(50); break;
      case 'coin_100': g = createBanknoteBundle(100); break;
      case 'puddle': g = createBanknoteBundle(10); break;
      case 'pizza': g = createPizzaBox(); break;
      case 'pothole': g = createPothole(Math.random() > 0.5 ? 'medium' : 'small'); break;
      case 'manhole': g = createManhole(); break;
      case 'cone': g = createTrafficCone(); break;
      case 'coxinha': g = createCoxinha(); break;
      case 'bone': g = createBone(); break;
      case 'patch': g = createAsphaltPatch(); break;
      default: g = createAsphaltPatch(); break;
    }
    applyAtmosphericToHierarchy(g, { lod: 'small_prop' });
    return g;
  }

  public update(dt: number, currentSpeed: number, playerZ: number = 0, nightFactor: number = 0, camera?: THREE.Camera): void {
    const forwardDist = currentSpeed * dt;

    // 1. Move all active obstacles towards camera
    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      const obs = this.activeObstacles[i];
      obs.z -= forwardDist;
      obs.mesh.position.z = obs.z;

      // Animate collectibles
      if (!obs.collected) {
        if (obs.type === 'bone') {
          // 🦴 Osso cômico flutuando suavemente e girando no próprio eixo
          obs.mesh.rotation.y += 3.2 * dt;
          obs.mesh.position.set(obs.x, 0.85 + Math.sin(obs.z * 0.5) * 0.08, obs.z);
        } else if (obs.type === 'coxinha') {
          obs.mesh.rotation.y += 2.8 * dt;
          obs.mesh.position.y = 0.85;
          obs.mesh.position.x = obs.x;
        } else if (obs.type === 'coin' || obs.type === 'coin_10' || obs.type === 'coin_50' || obs.type === 'coin_100') {
          // 💵 NOTAS REAIS COLETÁVEIS: Billboard perfeito virado de frente para a câmera + suave flutuação vertical
          const ud = obs.mesh.userData;
          const phase = ud.floatPhase || 0;
          const floatOffset = Math.sin((obs.z * 0.45) + phase) * 0.12;
          obs.mesh.position.set(obs.x, (ud.initialY || 0.85) + floatOffset, obs.z);

          // Face Camera (Billboard perfeitamente frontal)
          if (camera) {
            obs.mesh.quaternion.copy(camera.quaternion);
          } else {
            obs.mesh.rotation.set(0, 0, 0);
          }
        }
      }

      // 🕳️🌊 Animate Manhole (Tampa de Bueiro com indicador pulando antes de espirrar jato de água)
      if (obs.type === 'manhole') {
        const ud = obs.mesh.userData;
        if (!ud.triggered) {
          const bounceVal = Math.abs(Math.sin(obs.z * 0.45));
          if (ud.preEruptIndicatorGroup) {
            ud.preEruptIndicatorGroup.visible = true;
            ud.preEruptIndicatorGroup.position.y = 1.25 + bounceVal * 0.95;
            const stretch = 0.88 + bounceVal * 0.25;
            ud.preEruptIndicatorGroup.scale.set(1.0 / stretch, stretch, 1.0 / stretch);
          }
          if (ud.preEruptRingMesh) {
            ud.preEruptRingMesh.visible = true;
            const ringScale = 0.85 + (1.0 - bounceVal) * 0.55;
            ud.preEruptRingMesh.scale.set(ringScale, ringScale, 1.0);
          }
          if (ud.lidGroup && obs.z < (playerZ + 48)) {
            ud.lidGroup.position.y = 0.08 + Math.abs(Math.sin(obs.z * 2.5)) * 0.07;
            ud.lidGroup.rotation.z = Math.sin(obs.z * 3.2) * 0.08;
          }
        }

        // Trigger explosion when player approaches within 18 meters
        if (!ud.triggered && obs.z < (playerZ + 18) && obs.z > (playerZ - 4)) {
          ud.triggered = true;
          ud.lidVy = 18.0; // Tampa voa com tremenda força para o alto
          if (ud.preEruptIndicatorGroup) ud.preEruptIndicatorGroup.visible = false;
          if (ud.preEruptRingMesh) ud.preEruptRingMesh.visible = false;
          if (ud.waterGroup) {
            ud.waterGroup.visible = true;
          }
        }

        if (ud.triggered) {
          // Animate flying lid spinning in the air
          if (ud.lidGroup) {
            ud.lidVy -= 22 * dt;
            ud.lidY = Math.max(0.08, ud.lidY + ud.lidVy * dt);
            ud.lidGroup.position.y = ud.lidY;
            ud.lidRotX += 14 * dt;
            ud.lidRotZ += 10 * dt;
            ud.lidGroup.rotation.x = ud.lidRotX;
            ud.lidGroup.rotation.z = ud.lidRotZ;
          }

          // Animate pressurized geyser column
          if (ud.waterGroup) {
            ud.waterProgress = Math.min(1.0, ud.waterProgress + 6.5 * dt);
            const pulse = 1.0 + Math.sin(obs.z * 2.0) * 0.12;
            ud.waterGroup.scale.set(pulse, ud.waterProgress * (1.0 + Math.sin(obs.z * 3.0) * 0.08), pulse);
            if (manholeStreamTex) {
              manholeStreamTex.offset.y -= dt * 3.8;
            }
            if (ud.crestSprayGroup) {
              ud.crestSprayGroup.rotation.y += dt * 2.4;
            }
            if (ud.foamRings && Array.isArray(ud.foamRings)) {
              for (let r = 0; r < ud.foamRings.length; r++) {
                const ring = ud.foamRings[r];
                ring.position.y += dt * 14.0;
                if (ring.position.y > 17.5) ring.position.y = 1.0;
                const sc = 0.65 + (ring.position.y / 17.5) * 0.65;
                ring.scale.set(sc, sc, 1.0);
              }
            }
          }
        }
      }

      // Animate rotating red question mark indicators
      const indicator = obs.mesh.userData.indicatorGroup;
      if (indicator) {
        indicator.rotation.y += 3.5 * dt;
      }

      // Recycle obstacles that pass behind camera
      if (obs.z < -14) {
        obs.mesh.visible = false;
        obs.active = false;
        // Reset manhole state
        if (obs.type === 'manhole') {
          const ud = obs.mesh.userData;
          ud.triggered = false;
          ud.lidVy = 0;
          ud.lidY = 0.08;
          ud.lidRotX = 0;
          ud.lidRotZ = 0;
          ud.waterProgress = 0;
          if (ud.lidGroup) {
            ud.lidGroup.position.set(0, 0.08, 0);
            ud.lidGroup.rotation.set(0, 0, 0);
          }
          if (ud.waterGroup) {
            ud.waterGroup.visible = false;
            ud.waterGroup.scale.set(0.01, 0.01, 0.01);
          }
        }
        this.activeObstacles.splice(i, 1);
      }
    }

    // 2. Spawn new obstacles ahead (limite calibrado para 24 obstáculos até 95m: fluidez máxima e zero peso inútil)
    this.spawnCooldown -= dt;
    if (this.spawnCooldown <= 0 && this.activeObstacles.length < 24) {
      const maxZ = this.activeObstacles.reduce((max, o) => Math.max(max, o.z), 35);
      if (maxZ < 95) {
        this.spawnSingleObstacle(maxZ + 14 + Math.random() * 6);
      }
      this.spawnCooldown = this.difficulty === 'easy' ? 1.25 : this.difficulty === 'hard' ? 0.48 : 0.75;
    }
  }

  private spawnOneObstacleAt(type: string, lane: number, z: number) {
    let item = this.pool.find(o => o.type === type && !o.active);
    if (!item) {
      const mesh = this.createObstacleMesh(type);
      this.scene.add(mesh);
      item = {
        mesh,
        type,
        z: 0,
        x: 0,
        collisionRadius: mesh.userData.collisionRadius || 0.6,
        active: true,
        collected: false,
      };
      this.pool.push(item);
    }

    const isNote = type.startsWith('coin');
    const initialY = (isNote || type === 'coxinha' || type === 'bone') ? 0.85 : 0.0;
    item.mesh.position.set(lane, initialY, z);
    item.mesh.rotation.set(0, 0, 0);
    item.mesh.visible = true;
    item.x = lane;
    item.z = z;
    item.active = true;
    item.collected = false;

    this.activeObstacles.push(item);
  }

  // 💵 Spawna exatamente 1 nota de 100 em desafio (ex: na frente de jato d'água)
  public spawnRareBanknote100At(lane: number, z: number) {
    this.spawnOneObstacleAt('coin_100', lane, z);
  }

  private spawnSingleObstacle(z: number) {
    let type = this.getRandomType();
    const isCollectible = type === 'coin' || type === 'bone';

    // 🌟 DISTRIBUIÇÃO PLANEJADA DE CÉDULAS (10, 50 E 100):
    // Nota 10: Mais comum, espalhada pelo mapa, algumas fileiras de aprox 10 notas.
    // Nota 50: Quantidade moderada, pequenos grupos/filas.
    // Nota 100: Rara, exatamente 4 no mapa, posicionadas em desafios (frente de jatos de água).
    if (isCollectible) {
      if (this.currentMode === 'caramelo') {
        const trailCount = 4;
        for (const l of this.lanes) {
          for (let c = 0; c < trailCount; c++) {
            this.spawnOneObstacleAt('bone', l, z + c * 2.4);
          }
        }
      } else {
        const roll = Math.random();
        if (roll < 0.28) {
          // 💵 Fila longa de 10 notas de R$ 10 em uma faixa
          const lane = this.lanes[Math.floor(Math.random() * this.lanes.length)];
          for (let c = 0; c < 10; c++) {
            this.spawnOneObstacleAt('coin_10', lane, z + c * 2.2);
          }
        } else if (roll < 0.52) {
          // 💵 Pequeno grupo de notas de 50 (3 a 4 notas)
          const lane = this.lanes[Math.floor(Math.random() * this.lanes.length)];
          const count = 3 + Math.floor(Math.random() * 2);
          for (let c = 0; c < count; c++) {
            this.spawnOneObstacleAt('coin_50', lane, z + c * 2.4);
          }
        } else {
          // Notas avulsas de 10 espalhadas
          const lane = this.lanes[Math.floor(Math.random() * this.lanes.length)];
          this.spawnOneObstacleAt('coin_10', lane, z);
        }
      }
      return;
    }

    // Check blocked lanes near this Z for normal obstacles
    // ⚡ Zero alocações: verifica faixas ocupadas com flags booleanas
    let lane0Free = true, lane1Free = true, lane2Free = true;
    for (let i = 0; i < this.activeObstacles.length; i++) {
      const o = this.activeObstacles[i];
      if (Math.abs(o.z - z) < 7 && o.type !== 'patch' && o.type !== 'coin' && o.type !== 'bone') {
        if (o.x === this.lanes[0]) lane0Free = false;
        else if (o.x === this.lanes[1]) lane1Free = false;
        else if (o.x === this.lanes[2]) lane2Free = false;
      }
    }
    const freeCount = (lane0Free ? 1 : 0) + (lane1Free ? 1 : 0) + (lane2Free ? 1 : 0);
    let freeLanes: number[];
    if (freeCount === 3) freeLanes = this.lanes;
    else if (freeCount === 0) freeLanes = this.lanes;
    else {
      freeLanes = [];
      if (lane0Free) freeLanes.push(this.lanes[0]);
      if (lane1Free) freeLanes.push(this.lanes[1]);
      if (lane2Free) freeLanes.push(this.lanes[2]);
    }

    if (freeLanes.length === 0) {
      return;
    }

    const lane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
    this.spawnOneObstacleAt(type, lane, z);
  }

  public checkCollision(playerX: number, playerY: number = 0, playerZ: number = 0, isMotoboy: boolean = false): SpawnedObstacle | null {
    // Check collision around (playerX, playerY, playerZ) - Zero GC indexed loop
    for (let i = 0; i < this.activeObstacles.length; i++) {
      const obs = this.activeObstacles[i];
      if (obs.collected || obs.collisionRadius === 0) continue;
      // ⚡ Early-exit estrito: ignora obstáculos a mais de 2.6m de distância no eixo Z
      if (Math.abs(obs.z - playerZ) > 2.6) continue;
      // 🚫 Motoboy NÃO coleta ossos (apenas o cão Caramelo em Z=0 no modo Caramelo coleta ossos)
      if (obs.type === 'bone' && (isMotoboy || this.currentMode === 'motoboy' || playerZ > 0.5)) continue;

      const dx = Math.abs(obs.x - playerX);
      const dz = Math.abs(obs.z - playerZ);

      // Collectibles can be gathered in the air or ground
      const isCollectible = obs.type === 'coxinha' || obs.type === 'bone' || obs.type.startsWith('coin');


      // If jumping (playerY > 0.45), avoid ground obstacles (pothole, puddle, pizza, cone)
      if (!isCollectible && playerY > 0.45) {
        continue;
      }

      // 🎯 Hitboxes justas e corretas calibradas por tipo
      let hitZ = 0.65;
      let hitX = obs.collisionRadius || 0.55;

      if (isCollectible) {
        hitZ = 0.95;
        hitX = 0.85;
      } else if (obs.type === 'cone') {
        hitZ = 0.55;
        hitX = 0.45;
      } else if (obs.type === 'pizza') {
        hitZ = 0.50;
        hitX = 0.45;
      } else if (obs.type === 'pothole') {
        hitZ = 0.70;
        hitX = 0.65;
      } else if (obs.type === 'puddle') {
        hitZ = 0.70;
        hitX = 0.65;
      } else if (obs.type === 'manhole') {
        hitZ = 0.80;
        hitX = 0.75;
      }

      if (dz < hitZ && dx < hitX) {
        obs.collected = true;
        if (isCollectible) {
          obs.active = false;
          obs.mesh.visible = false;
          const idx = this.activeObstacles.indexOf(obs);
          if (idx !== -1) {
            this.activeObstacles.splice(idx, 1);
          }
        }
        return obs;
      }
    }
    return null;
  }

  public reset(mode?: 'caramelo' | 'motoboy') {
    if (mode) this.currentMode = mode;
    this.pool.forEach((o) => {
      o.mesh.visible = false;
      o.active = false;
      o.collected = false;
    });
    this.activeObstacles = [];
    this.initInitialObstacles();
  }

  public dispose() {
    this.pool.forEach(o => {
      o.mesh.traverse((node) => {
        if ((node as THREE.Mesh).geometry) (node as THREE.Mesh).geometry.dispose();
        if ((node as THREE.Mesh).material) {
          const mat = (node as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
      if (o.mesh.parent) o.mesh.parent.remove(o.mesh);
    });
    this.pool = [];
    this.activeObstacles = [];
  }
}
