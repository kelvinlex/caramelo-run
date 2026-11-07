import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getMotoSpecById, type MotorcycleSpec } from '../game/motosCatalog';

export interface MotoInstance {
  spec: MotorcycleSpec;
  root: THREE.Group;
  steeringPivot: THREE.Object3D | null;
  frontWheel: THREE.Object3D | null;
  rearWheel: THREE.Object3D | null;
  update: (dt: number, speed: number, steerLean: number, pitchAngle: number) => void;
  dispose: () => void;
}

let cachedGltfScene: THREE.Group | null = null;
let gltfLoadingPromise: Promise<THREE.Group> | null = null;

export function loadMasterMotosGlb(onProgress?: (percent: number) => void): Promise<THREE.Group> {
  if (cachedGltfScene) {
    return Promise.resolve(cachedGltfScene);
  }
  if (gltfLoadingPromise) {
    return gltfLoadingPromise;
  }

  gltfLoadingPromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      '/assets/motos/player_20_motos_completas_cartoon_game_ready.glb',
      (gltf) => {
        cachedGltfScene = gltf.scene;
        resolve(gltf.scene);
      },
      (xhr) => {
        if (xhr.lengthComputable && onProgress) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100);
          onProgress(percent);
        }
      },
      (err) => {
        console.error('[motoModelLoader] Falha ao carregar GLB das motos:', err);
        gltfLoadingPromise = null;
        reject(err);
      }
    );
  });

  return gltfLoadingPromise;
}

export async function createMotoInstance(
  motoId: string,
  options?: { scale?: number; castShadow?: boolean; receiveShadow?: boolean }
): Promise<MotoInstance> {
  const spec = getMotoSpecById(motoId);
  const masterScene = await loadMasterMotosGlb();

  // Encontra o nó da moto no GLB pelo nodeName do manifesto
  let sourceNode = masterScene.getObjectByName(spec.nodeName);
  if (!sourceNode) {
    // Tenta encontrar por busca case-insensitive ou prefixo
    sourceNode = masterScene.getObjectByName(spec.id);
    if (!sourceNode) {
      masterScene.traverse((obj) => {
        if (!sourceNode && obj.name.toLowerCase().includes(spec.id.toLowerCase())) {
          sourceNode = obj;
        }
      });
    }
  }

  // Fallback para primeira moto caso o nó específico não seja encontrado
  if (!sourceNode) {
    const parentContainer = masterScene.getObjectByName('01_PLAYER_MOTOS_JOGADOR_20');
    if (parentContainer && parentContainer.children.length > 0) {
      sourceNode = parentContainer.children[0];
    } else {
      sourceNode = masterScene;
    }
  }

  // Clona a moto para criar uma instância independente
  const motoMeshGroup = sourceNode.clone(true);
  motoMeshGroup.position.set(0, 0, 0);

  // No modelo original 3D, a frente da moto aponta para +X.
  // Rotacionamos em +90 graus (Math.PI / 2) no eixo Y para apontar para -Z (frente da pista).
  motoMeshGroup.rotation.y = Math.PI / 2;

  const root = new THREE.Group();
  root.name = `MotoInstance_${spec.id}`;

  const visualHolder = new THREE.Group();
  visualHolder.name = 'VisualHolder';
  visualHolder.add(motoMeshGroup);
  root.add(visualHolder);

  const scale = options?.scale ?? 1.0;
  root.scale.set(scale, scale, scale);

  // Configura sombras e materiais
  const castShadow = options?.castShadow ?? true;
  const receiveShadow = options?.receiveShadow ?? true;

  motoMeshGroup.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            m.needsUpdate = true;
          });
        } else {
          mesh.material.needsUpdate = true;
        }
      }
    }
  });

  // Encontra pivôs de direção, rodas e descanso lateral/cavalete (pezinho levantado)
  let steeringPivot: THREE.Object3D | null = null;
  let frontWheel: THREE.Object3D | null = null;
  let rearWheel: THREE.Object3D | null = null;

  motoMeshGroup.traverse((child) => {
    const n = child.name.toLowerCase();
    // Retrai e levanta o pezinho lateral e o cavalete central em todas as motos (fica recolhido e levantado)
    if (n.includes('sidestand')) {
      child.quaternion.set(0, 0, -0.5971954, 0.8020958);
    }
    if (n.includes('centerstand')) {
      child.quaternion.set(0, 0, -0.58509725, 0.8109631);
    }
    if (n.includes('steering') || n.includes('guidao')) {
      steeringPivot = child;
    }
    if (n.includes('frontwheel') || n.includes('roda_dianteira')) {
      frontWheel = child;
    }
    if (n.includes('rearwheel') || n.includes('roda_traseira')) {
      rearWheel = child;
    }
  });

  let wheelAngle = 0;
  let engineBob = 0;

  const update = (dt: number, speed: number, steerLean: number, pitchAngle: number) => {
    // Rotação contínua das rodas para frente ao redor do eixo Z (eixo real das rodas no modelo 3D)
    // No espaço local de cada moto: +X é a frente, +Y é para cima e o eixo da roda é o eixo Z.
    // Uma rotação horária negativa (-wheelAngle) ao redor de Z gira a roda para frente no chão.
    const angularSpeed = (speed / 0.32) * dt; // raio aproximado da roda ~0.32m
    wheelAngle = (wheelAngle + angularSpeed) % (Math.PI * 2);

    if (frontWheel) {
      frontWheel.rotation.x = 0;
      frontWheel.rotation.y = 0;
      frontWheel.rotation.z = -wheelAngle;
    }
    if (rearWheel) {
      rearWheel.rotation.x = 0;
      rearWheel.rotation.y = 0;
      rearWheel.rotation.z = -wheelAngle;
    }

    // Esterçamento suave do guidão nas curvas e desvios
    if (steeringPivot) {
      const targetSteer = -steerLean * 0.32;
      steeringPivot.rotation.y = THREE.MathUtils.lerp(steeringPivot.rotation.y, targetSteer, Math.min(1, 14 * dt));
    }

    // Inclinação lateral da moto mais livre e solta nas manobras (Banking/Lean fluido)
    const targetRoll = -steerLean * 0.46;
    visualHolder.rotation.z = THREE.MathUtils.lerp(visualHolder.rotation.z, targetRoll, Math.min(1, 12 * dt));

    // Inclinação suave do grau (Pitch ao empinar no Q ou pular)
    visualHolder.rotation.x = THREE.MathUtils.lerp(visualHolder.rotation.x, -pitchAngle, Math.min(1, 12 * dt));

    // Ponto de apoio do grau no pneu traseiro:
    // O eixo traseiro fica em Z = +0.68m no espaço global da moto.
    // Conforme a moto empina, elevamos a posição Y proporcionalmente para que a roda traseira
    // fique cravada no asfalto e a dianteira suba suavemente para o ar.
    const wheelieLiftY = 0.68 * Math.sin(Math.max(0, pitchAngle));
    const wheelieShiftZ = 0.68 * (1 - Math.cos(Math.max(0, pitchAngle)));

    // Vibração suave de marcha lenta / aceleração do motor (estilo cartoon)
    if (speed > 0.5) {
      engineBob += dt * 38;
      visualHolder.position.y = Math.sin(engineBob) * 0.007 + wheelieLiftY;
    } else {
      visualHolder.position.y = wheelieLiftY;
    }
    visualHolder.position.z = wheelieShiftZ;
  };

  const dispose = () => {
    motoMeshGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      }
    });
    root.clear();
  };

  return {
    spec,
    root,
    steeringPivot,
    frontWheel,
    rearWheel,
    update,
    dispose,
  };
}
