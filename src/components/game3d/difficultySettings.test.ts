import test from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTY_CONFIGS, getMaxLives } from './difficultySettings';
import { PRESET_CONFIGS, getFarPlaneByDistance, getFogDensityByDistance } from './graphicsSettings';
import { HORIZON_MONUMENT_CONFIG, computeHorizonVisualState } from './parallax';

test('difficulty configurations define expected lives and speed progression', () => {
  assert.equal(getMaxLives('easy'), 10);
  assert.equal(getMaxLives('medium'), 5);
  assert.equal(getMaxLives('hard'), 3);

  assert.ok(DIFFICULTY_CONFIGS.easy.initialPlayerSpeed < DIFFICULTY_CONFIGS.hard.initialPlayerSpeed);
  assert.ok(DIFFICULTY_CONFIGS.easy.maxActiveCars < DIFFICULTY_CONFIGS.hard.maxActiveCars);
});

test('graphics settings calculate far plane and fog density accurately', () => {
  assert.ok(getFarPlaneByDistance('low') < getFarPlaneByDistance('high'));
  assert.ok(getFogDensityByDistance('low') > getFogDensityByDistance('high'));
  assert.equal(PRESET_CONFIGS.ultra.bloomEnabled, true);
});

test('horizon Corcovado mountain and Cristo Redentor sit behind and clearly above the buildings', () => {
  assert.ok(HORIZON_MONUMENT_CONFIG.corcovadoZ > HORIZON_MONUMENT_CONFIG.buildingZMax);
  assert.ok(HORIZON_MONUMENT_CONFIG.corcovadoSummitY > HORIZON_MONUMENT_CONFIG.maxBuildingTopY + 15);
  assert.ok(HORIZON_MONUMENT_CONFIG.monumentTopY > HORIZON_MONUMENT_CONFIG.corcovadoSummitY + 15);
  assert.ok(HORIZON_MONUMENT_CONFIG.corcovadoZ < getFarPlaneByDistance('low'));

  const dayState = computeHorizonVisualState(0.2, 5.0);
  const nightState = computeHorizonVisualState(0.75, 10.0);
  assert.ok(nightState.uplightOpacity > dayState.uplightOpacity);
  assert.ok(dayState.godRaysOpacity > nightState.godRaysOpacity);
});

test('Brazilian house templates feature iron gates, clay brick houses, and sobrados without external GLTF dependencies', async () => {
  const { BRAZILIAN_HOUSE_SPECS, BuildingManager } = await import('./BuildingManager');
  assert.ok(BRAZILIAN_HOUSE_SPECS.length >= 10);
  assert.equal(BuildingManager.getTemplatesCount(), BRAZILIAN_HOUSE_SPECS.length);
  assert.ok(BRAZILIAN_HOUSE_SPECS.every((s) => s.hasIronGate));
  assert.ok(BRAZILIAN_HOUSE_SPECS.filter((s) => s.isBrickHouse).length >= 4);
  assert.ok(BRAZILIAN_HOUSE_SPECS.filter((s) => s.floors === 2).length >= 4);

  const instanceLeft = BuildingManager.createBuildingInstance(0, 1);
  const instanceRight = BuildingManager.createBuildingInstance(1, -1);
  assert.ok(instanceLeft && instanceLeft.width > 5);
  assert.ok(instanceRight && instanceRight.depth > 5);
});

test('right side of road is configured as stepped hillside favela morro with reduced trees', async () => {
  const { FAVELA_MORRO_CONFIG, getScenerySideConfig } = await import('./scenerySystem');
  const rightSide = getScenerySideConfig(FAVELA_MORRO_CONFIG.rightScreenSide, false);
  const leftSide = getScenerySideConfig(FAVELA_MORRO_CONFIG.leftScreenSide, false);

  assert.equal(rightSide.zone, 'favela_morro');
  assert.equal(rightSide.maxSidewalkTrees, 0);
  assert.equal(rightSide.maxResidentialTrees, 0);
  assert.ok(rightSide.maxHillTrees <= 1);

  assert.equal(leftSide.zone, 'brazilian_neighborhood');
  assert.ok(FAVELA_MORRO_CONFIG.tier0StreetBaseY < FAVELA_MORRO_CONFIG.tier1SlopeBaseY);
  assert.ok(FAVELA_MORRO_CONFIG.tier1SlopeBaseY < FAVELA_MORRO_CONFIG.tier2MidMorroBaseY);
  assert.ok(FAVELA_MORRO_CONFIG.tier2MidMorroBaseY < FAVELA_MORRO_CONFIG.tier3CrestBaseY);
  assert.ok(FAVELA_MORRO_CONFIG.stairwayWidth >= 4.5);
  assert.ok(FAVELA_MORRO_CONFIG.stairwayClearanceHalfZ >= 6.0);
  assert.ok(FAVELA_MORRO_CONFIG.minHouseSeparationGap >= 3.0);
  assert.ok(FAVELA_MORRO_CONFIG.backgroundComplexCount >= 2);
});

test('road surface transitions cleanly from asphalt with sand patches to dirt/clay/sand road and back', async () => {
  const { getRoadSurfaceTypeForChunk, getRoadSurfaceAtZ } = await import('./materials');
  assert.equal(getRoadSurfaceTypeForChunk(0), 'asphalt_sand_patches');
  assert.equal(getRoadSurfaceTypeForChunk(1), 'transition_asphalt_to_dirt');
  assert.equal(getRoadSurfaceTypeForChunk(2), 'dirt_sand_barro');
  assert.equal(getRoadSurfaceTypeForChunk(3), 'dirt_sand_barro');
  assert.equal(getRoadSurfaceTypeForChunk(4), 'dirt_sand_barro');
  assert.equal(getRoadSurfaceTypeForChunk(5), 'transition_dirt_to_asphalt');
  assert.equal(getRoadSurfaceTypeForChunk(6), 'asphalt_sand_patches');

  assert.equal(getRoadSurfaceAtZ(10, 45), 'asphalt_sand_patches');
  assert.equal(getRoadSurfaceAtZ(45, 45), 'transition_asphalt_to_dirt');
  assert.equal(getRoadSurfaceAtZ(90, 45), 'dirt_sand_barro');
});


