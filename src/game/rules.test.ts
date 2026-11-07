import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HOUSE_VARIATIONS,
  LANE_WIDTH,
  createInitialPlayerState,
  shiftLane,
  triggerJump,
  triggerRoll,
  stepPlayerPhysics,
  checkObstacleCollision,
  applyConeHit,
  applyCoinPickup,
  getHouseVariationByIndex,
  computeHorizonCurveOffsets,
  computeRoadTextureOffsetDelta,
  type TrackObstacle,
} from './rules';

test('30 distinct Brazilian house variations are defined with valid spacing and colors', () => {
  assert.equal(HOUSE_VARIATIONS.length, 30);
  const ids = new Set(HOUSE_VARIATIONS.map((h) => h.id));
  assert.equal(ids.size, 30);

  const names = new Set(HOUSE_VARIATIONS.map((h) => h.name));
  assert.equal(names.size, 30);

  for (const house of HOUSE_VARIATIONS) {
    assert.ok(house.width >= 6.5 && house.width <= 9.0, `Valid width for ${house.name}`);
    assert.ok(house.spacingAfter >= 3.5 && house.spacingAfter <= 5.5, `Valid spacing for ${house.name}`);
    assert.match(house.wallColor, /^#[0-9A-Fa-f]{6}$/);
  }
});

test('lane shifting clamps cleanly between left (-1), center (0), and right (+1)', () => {
  let state = createInitialPlayerState();
  assert.equal(state.lane, 0);

  state = shiftLane(state, -1);
  assert.equal(state.lane, -1);

  state = shiftLane(state, -1);
  assert.equal(state.lane, -1); // clamped

  state = shiftLane(state, 1);
  assert.equal(state.lane, 0);

  state = shiftLane(state, 1);
  assert.equal(state.lane, 1);

  state = shiftLane(state, 1);
  assert.equal(state.lane, 1); // clamped

  // Step physics moves x toward target lane X
  for (let i = 0; i < 20; i++) {
    state = stepPlayerPhysics(state, 0.03);
  }
  assert.ok(Math.abs(state.x - LANE_WIDTH) < 0.05);
});

test('jump and roll physics allow clearing traffic cones and ducking overhead banners', () => {
  let state = createInitialPlayerState();
  const cone: TrackObstacle = {
    id: 1,
    z: 0,
    lane: 0,
    kind: 'cone_single',
    width: 0.9,
    height: 0.95,
    minY: 0,
    hit: false,
    knockbackVx: 0,
    knockbackVy: 0,
    knockbackVz: 0,
    rotX: 0,
    rotZ: 0,
  };

  // Standing in same lane at z=0 collides with cone
  assert.equal(checkObstacleCollision(state, cone), true);

  // Trigger jump and step until airborne above cone height
  state = triggerJump(state);
  for (let i = 0; i < 8; i++) {
    state = stepPlayerPhysics(state, 0.03);
  }
  assert.ok(state.y > 1.0, 'Player should be airborne above cone');
  assert.equal(checkObstacleCollision(state, cone), false);

  // Overhead banner requires rolling
  const banner: TrackObstacle = {
    id: 2,
    z: 0,
    lane: 0,
    kind: 'overhead_banner',
    width: 1.8,
    height: 1.2,
    minY: 1.05,
    hit: false,
    knockbackVx: 0,
    knockbackVy: 0,
    knockbackVz: 0,
    rotX: 0,
    rotZ: 0,
  };
  let groundState = createInitialPlayerState();
  assert.equal(checkObstacleCollision(groundState, banner), true);

  groundState = triggerRoll(groundState);
  assert.equal(checkObstacleCollision(groundState, banner), false);
});

test('cone hit decrements HP with invulnerability window and coin pickup increments score', () => {
  let state = createInitialPlayerState();
  assert.equal(state.hp, 3);

  state = applyConeHit(state);
  assert.equal(state.hp, 2);
  assert.ok(state.invulnerableTimer > 0);

  // Hit while invulnerable does not reduce HP
  state = applyConeHit(state);
  assert.equal(state.hp, 2);

  state = applyCoinPickup(state);
  assert.equal(state.coins, 1);
  assert.ok(state.score >= 50);

  assert.equal(getHouseVariationByIndex(0).id, 1);
  assert.equal(getHouseVariationByIndex(29).id, 30);
  assert.equal(getHouseVariationByIndex(30).id, 1);
});

test('downhill ladeira and horizon curvature keep player zone grounded and plunge steeply toward the coast', () => {
  const atPlayer = computeHorizonCurveOffsets(0);
  assert.equal(atPlayer.dy, 0);
  assert.equal(atPlayer.dx, 0);

  const midDist = computeHorizonCurveOffsets(-44, 0.0011, 0.0002, 0.185);
  const farDist = computeHorizonCurveOffsets(-104, 0.0011, 0.0002, 0.185);

  assert.ok(midDist.dy < -8.0, 'Mid-distance ladeira drops steeply downward');
  assert.ok(farDist.dy < midDist.dy * 2.5, 'Far ladeira plunges deep toward the lower coastal city');
  assert.ok(farDist.dx > midDist.dx, 'Lateral curve scales quadratically with distance');

  const uvDelta = computeRoadTextureOffsetDelta(12, 24);
  assert.equal(uvDelta, 0.5);
  assert.equal(computeRoadTextureOffsetDelta(0, 24), 0);
});

test('automatic LOD, Distance Culling, Behind-Gameplay Culling, and Occlusion Culling optimize scene objects', async () => {
  const {
    computeObjectLodAndCulling,
    evaluateFavelaOcclusion,
    FOG_DISTANCE_NEAR,
    FOG_DISTANCE_FAR,
    MAX_CULL_DISTANCE_HOUSE_Z,
  } = await import('./rules');

  // Fog distance smoothly covers the max cull distance
  assert.ok(FOG_DISTANCE_NEAR < FOG_DISTANCE_FAR);
  assert.ok(FOG_DISTANCE_FAR >= MAX_CULL_DISTANCE_HOUSE_Z);

  // Behind-Gameplay Culling: objects completely behind the camera (z > 14.5) are culled
  const behind = computeObjectLodAndCulling(16.0, 0);
  assert.equal(behind.visible, false);

  // Objects just passing the player (z = 6.0) remain visible until they clear the camera frustum
  const justPassed = computeObjectLodAndCulling(6.0, 0);
  assert.equal(justPassed.visible, true);

  // LOD0: close objects (0..48m ahead) render at full detail (lod = 0)
  const nearObj = computeObjectLodAndCulling(-18.0, 0);
  assert.equal(nearObj.visible, true);
  assert.equal(nearObj.lod, 0);

  // LOD1: medium distance objects (48..88m ahead) switch to medium detail (lod = 1)
  const midObj = computeObjectLodAndCulling(-64.0, 0);
  assert.equal(midObj.visible, true);
  assert.equal(midObj.lod, 1);

  // LOD2: far objects (88..132m ahead) switch to low-poly silhouette (lod = 2) inside Fog Distance
  const farObj = computeObjectLodAndCulling(-105.0, 0);
  assert.equal(farObj.visible, true);
  assert.equal(farObj.lod, 2);

  // Distance Culling: objects beyond maxCullDistance (> 132m) are completely culled
  const tooFar = computeObjectLodAndCulling(-140.0, 0);
  assert.equal(tooFar.visible, false);

  // Occlusion Culling: 2-story foreground sobrado occludes lower favela retaining tier while keeping upper favela visible
  const occNear = evaluateFavelaOcclusion(-10.0, 'left', -2.6, true);
  assert.equal(occNear.fullyOccluded, false);
  assert.equal(occNear.lowerTierOccluded, true);

  const occFarBehind = evaluateFavelaOcclusion(16.5, 'right', 0, false);
  assert.equal(occFarBehind.fullyOccluded, true);

  const { computeDistantHouseOpacity, computeFavelaFadeOpacity } = await import('./rules');
  assert.equal(computeDistantHouseOpacity(-20, 0), 1.0);
  const midFade = computeDistantHouseOpacity(-90, 0);
  assert.ok(midFade < 1.0 && midFade > 0.56, 'Distant house ahead fades smoothly');
  assert.equal(computeDistantHouseOpacity(-130, 0), 0.56);

  // Upper & distant favela houses wait longer before smoothly fading out ("fassas as casas de tras esperando mais um pouco pra sumir")
  assert.equal(computeFavelaFadeOpacity(-30, 0, false), 1.0);
  assert.equal(computeFavelaFadeOpacity(-30, 0, true), 0.92);
  const farUpperFavela = computeFavelaFadeOpacity(-95, 0, true);
  assert.ok(farUpperFavela < 0.7 && farUpperFavela >= 0.22);
});

test('houses follow exact world curvature drop and mountain vista sits further away with optimized mesh segments', async () => {
  const {
    CRISTO_STATUE_SCALE,
    MOUNTAIN_VISTA_Z,
    computeWorldCurvatureDropY,
    computeMountainVistaPlacement,
  } = await import('./rules');

  // Near player (z >= -4), curvature drop is 0 so foreground houses sit at flat sidewalk level
  assert.equal(computeWorldCurvatureDropY(0), 0);
  assert.equal(computeWorldCurvatureDropY(-4), 0);

  // Far ahead at z = -104 (dist = 100m), curvature drops by 0.0011 * 10000 = 11.0m for both road and houses
  const dropAt104 = computeWorldCurvatureDropY(-104);
  assert.ok(Math.abs(dropAt104 - 11.0) < 1e-6);

  // Mountain is placed further back (z = -168 instead of -144)
  const vista = computeMountainVistaPlacement();
  assert.ok(MOUNTAIN_VISTA_Z <= -165, 'Mountain is positioned further away in the horizon');
  assert.equal(vista.z, MOUNTAIN_VISTA_Z);
  assert.ok(CRISTO_STATUE_SCALE >= 0.45 && CRISTO_STATUE_SCALE <= 0.58, 'Scale constant valid');
  assert.ok(vista.curvedBaseY > 1.0 && vista.curvedBaseY < 2.5, 'Mountain base stays grounded after world curvature');
  assert.ok(vista.radialSegmentsMain <= 20 && vista.heightSegmentsMain <= 14, 'Optimized low-poly mountain segment budget');
});



