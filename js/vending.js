/**
 * A procedurally modelled Japanese vending machine.
 * The DOM menu is populated from the same DRINK_MENU, while this module owns
 * the physical machine and the can that drops into the pickup tray.
 */
import * as THREE from 'three';
import {
  addBox,
  addCylinder,
  standardMaterial
} from './world.js';
import {
  createCanTexture,
  createVendingPanelTexture
} from './textures.js';

export const DRINK_MENU = [
  {
    id: 'coffee',
    nameEN: 'Canned Coffee',
    nameJP: '微糖コーヒー',
    label: '珈琲',
    price: 150,
    temp: 'HOT',
    color: '#8c4e31',
    accent: '#e7c995',
    labelColor: '#fff4df',
    note: 'Sweet, milky and warming.'
  },
  {
    id: 'tea',
    nameEN: 'Green Tea',
    nameJP: '緑茶',
    label: '緑茶',
    price: 130,
    temp: 'COLD',
    color: '#5c7f58',
    accent: '#d9e5b6',
    labelColor: '#243a27',
    note: 'Clean, cold and quietly bitter.'
  },
  {
    id: 'milk-tea',
    nameEN: 'Royal Milk Tea',
    nameJP: 'ロイヤルミルクティー',
    label: '紅茶',
    price: 160,
    temp: 'COLD',
    color: '#b98a62',
    accent: '#f3dfc7',
    labelColor: '#573925',
    note: 'Silky and gently sweet.'
  },
  {
    id: 'ramune',
    nameEN: 'Ramune',
    nameJP: 'ラムネ',
    label: 'ラムネ',
    price: 150,
    temp: 'COLD',
    color: '#5f9fb4',
    accent: '#f0f8f5',
    labelColor: '#24546d',
    note: 'Bright blue glass and a marble fizz.'
  },
  {
    id: 'peach',
    nameEN: 'White Peach Water',
    nameJP: '白桃ウォーター',
    label: '白桃',
    price: 140,
    temp: 'COLD',
    color: '#dba596',
    accent: '#f9ded1',
    labelColor: '#6d3d34',
    note: 'A soft peach sweetness for a warm afternoon.'
  },
  {
    id: 'corn',
    nameEN: 'Corn Soup',
    nameJP: 'コーンポタージュ',
    label: 'コーン',
    price: 160,
    temp: 'HOT',
    color: '#d5af50',
    accent: '#f5e6a8',
    labelColor: '#5a4317',
    note: 'Thick, golden and unexpectedly comforting.'
  },
  {
    id: 'sports',
    nameEN: 'Sports Drink',
    nameJP: 'スポーツドリンク',
    label: 'スポドリ',
    price: 140,
    temp: 'COLD',
    color: '#78a5a0',
    accent: '#e2f3e9',
    labelColor: '#2e5552',
    note: 'Cool, salty-sweet and refreshing.'
  },
  {
    id: 'yuzu',
    nameEN: 'Yuzu Honey',
    nameJP: 'ゆずはちみつ',
    label: 'ゆず',
    price: 150,
    temp: 'COLD',
    color: '#c5aa49',
    accent: '#f3e8b4',
    labelColor: '#56471f',
    note: 'Fragrant citrus with a honey finish.'
  }
];

const _world = new THREE.Vector3();

export class VendingMachine {
  constructor(parent, {
    x = 0,
    z = 0,
    y = 1,
    ry = 0,
    accent = 0x9e5b43
  } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'VendingMachine';
    this.group.position.set(x, y, z);
    this.group.rotation.y = ry;
    parent.add(this.group);

    this.position = new THREE.Vector3(x, y, z);
    this.ry = ry;
    this.accent = accent;
    this.state = 'idle';
    this.pendingDrink = null;
    this.dispenseTimer = 0;
    this.canRoot = null;
    this.canLabelMaterial = null;

    this._build(accent);
    this.getInteraction = this.getInteraction.bind(this);
    this.update = this.update.bind(this);
  }

  _build(accent) {
    const body = standardMaterial(0xeee9df, { roughness: 0.42, metalness: 0.06 });
    const accentMat = standardMaterial(accent, { roughness: 0.38, metalness: 0.15 });
    const dark = standardMaterial(0x31342f, { roughness: 0.56, metalness: 0.22 });
    const metal = standardMaterial(0x9da29b, { roughness: 0.35, metalness: 0.55 });
    const warmGlow = standardMaterial(0xffefcf, {
      roughness: 0.45,
      emissive: 0xffdfaa,
      emissiveIntensity: 0.45
    });

    addBox(this.group, 1.2, 0.16, 0.8, dark, 0, 0.08, 0, { cast: true, receive: true });
    addBox(this.group, 1.24, 1.86, 0.84, body, 0, 1.01, 0, { cast: true, receive: true });
    addBox(this.group, 1.27, 0.12, 0.87, accentMat, 0, 1.91, 0, { cast: true, receive: true });
    addBox(this.group, 1.27, 0.08, 0.87, accentMat, 0, 0.2, 0, { cast: true, receive: true });
    addBox(this.group, 0.06, 1.55, 0.81, accentMat, -0.6, 1.0, 0, { cast: false });
    addBox(this.group, 0.05, 1.55, 0.81, accentMat, 0.6, 1.0, 0, { cast: false });

    // Backlit product display.
    const panelTexture = createVendingPanelTexture(DRINK_MENU);
    const panelMaterial = new THREE.MeshStandardMaterial({
      map: panelTexture,
      emissiveMap: panelTexture,
      emissive: 0xfff2d0,
      emissiveIntensity: 0.22,
      roughness: 0.32,
      metalness: 0.02
    });
    addBox(this.group, 1.1, 1.56, 0.035, panelMaterial, 0, 1.09, 0.432, {
      cast: false,
      receive: false
    });

    // Thin glass sheet over the lit display.
    const glass = new THREE.MeshStandardMaterial({
      color: 0xe8f3ee,
      roughness: 0.08,
      metalness: 0.05,
      transparent: true,
      opacity: 0.075,
      depthWrite: false
    });
    addBox(this.group, 1.08, 1.53, 0.012, glass, 0, 1.09, 0.456, {
      cast: false,
      receive: false
    });

    // Header lamp and small side markings.
    addBox(this.group, 1.1, 0.05, 0.06, warmGlow, 0, 1.86, 0.43, {
      cast: false,
      receive: false
    });
    // Small indicator lamps sit in the narrow frame, not over the artwork.
    for (const side of [-1, 1]) {
      addBox(
        this.group,
        0.045,
        0.045,
        0.03,
        standardMaterial(side === -1 ? 0x79a48e : 0xb5654e, {
          roughness: 0.35,
          emissive: side === -1 ? 0x4f8b69 : 0xbd3e2b,
          emissiveIntensity: 0.85
        }),
        side * 0.555,
        1.63,
        0.44,
        { cast: false, receive: false }
      );
    }

    // Coin insert details.
    addBox(this.group, 0.2, 0.12, 0.025, metal, 0.39, 0.73, 0.44, {
      cast: false,
      receive: false
    });
    addBox(this.group, 0.016, 0.075, 0.028, dark, 0.39, 0.73, 0.456, {
      cast: false,
      receive: false
    });
    addBox(this.group, 0.18, 0.22, 0.025, metal, 0.39, 0.48, 0.44, {
      cast: false,
      receive: false
    });
    addBox(this.group, 0.1, 0.19, 0.028, dark, 0.39, 0.49, 0.456, {
      cast: false,
      receive: false
    });

    // Pickup slot and tray.
    addBox(this.group, 0.8, 0.24, 0.11, dark, 0, 0.34, 0.425, {
      cast: false,
      receive: true
    });
    addBox(this.group, 0.68, 0.16, 0.06, standardMaterial(0x171a17, { roughness: 0.8 }), 0, 0.34, 0.487, {
      cast: false,
      receive: false
    });
    addBox(this.group, 0.78, 0.03, 0.24, metal, 0, 0.29, 0.55, {
      cast: true,
      receive: true,
      rx: -0.12
    });
    addBox(this.group, 0.72, 0.035, 0.21, standardMaterial(0x4a4c47, { roughness: 0.5 }), 0, 0.315, 0.47, {
      cast: false,
      receive: false
    });

    // Tiny feet.
    for (const x of [-0.45, 0.45]) {
      for (const z of [-0.28, 0.28]) {
        addCylinder(this.group, 0.045, 0.055, 0.08, dark, x, 0.035, z, {
          radialSegments: 8,
          cast: false
        });
      }
    }

    // A discreet side service plate.
    addBox(this.group, 0.02, 0.26, 0.42, metal, 0.623, 0.8, 0, {
      cast: false,
      receive: false
    });
  }

  _makeCan(drink) {
    if (this.canRoot) {
      this.group.remove(this.canRoot);
      this.canRoot.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (material.map) material.map.dispose();
            material.dispose();
          });
        }
      });
    }

    const group = new THREE.Group();
    group.name = 'DispensedCan';
    const canMat = new THREE.MeshStandardMaterial({
      map: createCanTexture(drink),
      roughness: 0.31,
      metalness: 0.36
    });
    const metal = standardMaterial(0xc1c3bd, { roughness: 0.26, metalness: 0.78 });
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.225, 16, 1),
      [canMat, metal, metal]
    );
    can.castShadow = true;
    group.add(can);
    group.position.set(0, 0.72, 0.53);
    group.visible = false;
    this.group.add(group);
    this.canRoot = group;
    this.canLabelMaterial = canMat;
  }

  purchase(drink) {
    if (this.state !== 'idle') return false;
    this.state = 'dispensing';
    this.pendingDrink = drink;
    this.dispenseTimer = 0;
    this._makeCan(drink);
    return true;
  }

  collectDrink() {
    if (this.state !== 'ready' || !this.pendingDrink) return null;
    const drink = this.pendingDrink;
    this.pendingDrink = null;
    this.state = 'idle';
    if (this.canRoot) this.canRoot.visible = false;
    return drink;
  }

  getInteraction(playerPosition) {
    _world.set(this.position.x, this.position.y, this.position.z);
    const distance = Math.hypot(
      playerPosition.x - _world.x,
      playerPosition.z - _world.z
    );
    if (distance > 2.5) return null;
    if (this.state === 'ready') {
      return {
        type: 'pickup-drink',
        prompt: `Take ${this.pendingDrink.nameEN} from the pickup slot`,
        distance,
        target: this,
        vm: this
      };
    }
    if (this.state === 'dispensing') {
      return null;
    }
    return {
      type: 'use-vending',
      prompt: 'Use vending machine',
      distance,
      target: this,
      vm: this
    };
  }

  update(dt, elapsed) {
    if (this.state !== 'dispensing' || !this.canRoot) return;
    this.dispenseTimer += dt;
    const t = this.dispenseTimer;

    if (t < 0.5) {
      this.canRoot.visible = false;
      return;
    }

    this.canRoot.visible = true;
    const fall = Math.min(1, (t - 0.5) / 0.42);
    const eased = fall * fall;
    this.canRoot.position.y = THREE.MathUtils.lerp(0.76, 0.415, eased);
    this.canRoot.position.z = THREE.MathUtils.lerp(0.42, 0.56, fall);
    this.canRoot.rotation.z = Math.sin(fall * Math.PI) * 0.08;
    // Very subtle idle wobble after landing.
    if (fall >= 1) {
      this.state = 'ready';
      this.canRoot.position.set(0, 0.415, 0.56);
      this.canRoot.rotation.set(0, 0, 0);
    }
  }
}
