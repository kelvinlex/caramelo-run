import * as THREE from 'three';

// Monkey patch THREE.CylinderGeometry to trace NaN
const origCylinder = THREE.CylinderGeometry;
THREE.CylinderGeometry = class extends origCylinder {
  constructor(...args) {
    super(...args);
    const pos = this.attributes.position.array;
    for (let i = 0; i < pos.length; i++) {
      if (isNaN(pos[i])) {
        console.error('NaN in CylinderGeometry args:', args);
        console.error(new Error().stack);
        break;
      }
    }
  }
};
