/**
 * CARAMELO RUN - ARQUIVO MESTRE DE MODELOS 3D E OBJETOS DO JOGO
 * 
 * Este arquivo reúne e organiza de forma modular todos os modelos e componentes
 * 3D do jogo para facilitar futuras substituições por arquivos .GLTF / .GLB / FBX.
 */

// 1. PERSONAGEM MOTOBOY & MOTOCICLETA
export { buildMotoboy, type MotoboyInstance } from './MotoboyModel';

// 2. PERSONAGEM CACHORRO VIRA-LATA CARAMELO
export { buildCaramelo, type CarameloInstance } from './CarameloModel';

// 3. VEÍCULOS & TRÂFEGO (Fusca, Gol, Sedan, Pickup)
export { createUltraRealisticCar } from './CarModelsDetailed';
export { TrafficManager, type TrafficCar } from './traffic';

// 4. OBSTÁCULOS DA PISTA (Cones grandes, buracos sinalizados, poças, caixas de pizza, coxinhas e ossos)
export {
  createTrafficCone,
  createPothole,
  createPuddle,
  createPizzaBox,
  createAsphaltPatch,
  createCoxinha,
  createBone,
  type PotholeSize,
  type PuddleSize
} from './obstacles';
export { SpawnManager, type SpawnedObstacle } from './spawnManager';

// 5. CENÁRIO, CASAS MODULARES & POSTES/OBJETOS URBANOS
export { createModularFacade, EXPANDED_HOUSE_PALETTES } from './facades';
export {
  createStreetLightPoleVariant,
  createTrashCan,
  createTrafficSign,
  createBench,
  createHydrant,
  createParkedMotorcycle,
  createParkedBicycle,
  createDebris,
  createParkedCar
} from './urbanProps';
export { populateChunkScenery, recycleChunkScenery, type ChunkConfig } from './scenerySystem';
export { createSpeedBump, getSharedMaterials } from './sceneryModels';

// 6. MATERIAIS & TEXTURAS PROCEDURAIS
export { createAsphaltTexture, createSidewalkTexture } from './materials';

// 7. ILUMINAÇÃO, CICLO DIA/NOITE & FAROL POTENTE
export { createWeatherLighting, type WeatherSystem, type TimeOfDay } from './weatherLighting';

// 8. SISTEMA DE PARTÍCULAS (Poeira, fumaça de escapamento, explosões e mordidas)
export { ParticleSystem } from './particles';

// 9. PARALLAX & HORIZONTE DISTANTE
export { ParallaxSystem } from './parallax';
