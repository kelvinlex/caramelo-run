// Search for which CylinderGeometry has NaN
import * as THREE from 'three';

// Let's test the partial theta cylinder:
const geo = new THREE.CylinderGeometry(3.8 * 0.38, 3.8 * 0.38, 0.20, 16, 1, false, 0, Math.PI);
geo.computeBoundingSphere();
console.log('Test partial cylinder sphere:', geo.boundingSphere);

// Let's test all templates in BuildingManager
try {
  // Let's check if any math in BuildingManager creates NaN
} catch (e) {
  console.error(e);
}
