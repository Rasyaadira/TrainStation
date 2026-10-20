/**
 * Daylight atmosphere: high soft sun, warm sky fill, a gradient sky dome,
 * hazy cream horizon, stylized clouds and extremely gentle bloom exposure.
 */
import * as THREE from 'three';
import { createCloudTexture } from './textures.js';

const SKY_VERTEX = /* glsl */`
  varying vec3 vDirection;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vDirection = normalize(worldPosition.xyz - cameraPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */`
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;
  uniform float uTime;
  varying vec3 vDirection;

  void main() {
    vec3 direction = normalize(vDirection);
    float height = clamp(direction.y, 0.0, 1.0);

    vec3 color = mix(uHorizon, uZenith, pow(height, 0.58));

    // A fine, pale haze sits just above the rooftops.
    float horizonHaze = exp(-max(direction.y, 0.0) * 13.0);
    color = mix(color, uHorizon * 1.025, horizonHaze * 0.38);

    // Sun disc and wide warm halo.
    float sunDot = max(dot(direction, normalize(uSunDirection)), 0.0);
    float disc = smoothstep(0.99965, 0.99992, sunDot);
    float halo = pow(sunDot, 18.0);
    color += uSunColor * disc * 0.72;
    color += uSunColor * halo * 0.095;

    // A few barely-there wisps high in the sky.
    float band = sin(direction.x * 8.0 + direction.z * 5.0 + uTime * 0.003) * 0.5 + 0.5;
    color += uHorizon * band * smoothstep(0.12, 0.7, height) * 0.012;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const MOOD_DEFAULT = {
  skyTop: 0xa8cbe2,
  skyHorizon: 0xf3eddc,
  fogColor: 0xeee9dd,
  fogDensity: 0.0042,
  sunColor: 0xfff3d9,
  sunIntensity: 2.8,
  hemiSky: 0xe0edf4,
  hemiGround: 0xc3aa8a,
  hemiIntensity: 1.5,
  exposure: 1.12,
  cloudOpacity: 0.72
};

export class Atmosphere {
  constructor(scene) {
    this.scene = scene;
    this.elapsed = 0;
    this.currentMood = { ...MOOD_DEFAULT };
    this.targetMood = { ...MOOD_DEFAULT };
    this.sunDirection = new THREE.Vector3(-0.38, 0.83, 0.28).normalize();

    this.scene.fog = new THREE.FogExp2(MOOD_DEFAULT.fogColor, MOOD_DEFAULT.fogDensity);

    this._createSky();
    this._createLights();
    this._createClouds();
    this._createDustMotes();

    this._tempColorA = new THREE.Color();
    this._tempColorB = new THREE.Color();
  }

  _createSky() {
    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uZenith: { value: new THREE.Color(MOOD_DEFAULT.skyTop) },
        uHorizon: { value: new THREE.Color(MOOD_DEFAULT.skyHorizon) },
        uSunColor: { value: new THREE.Color(MOOD_DEFAULT.sunColor) },
        uSunDirection: { value: this.sunDirection.clone() },
        uTime: { value: 0 }
      },
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(310, 32, 18), this.skyMaterial);
    this.sky.name = 'SkyDome';
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
  }

  _createLights() {
    this.hemisphere = new THREE.HemisphereLight(
      MOOD_DEFAULT.hemiSky,
      MOOD_DEFAULT.hemiGround,
      MOOD_DEFAULT.hemiIntensity
    );
    this.scene.add(this.hemisphere);

    // A whisper of ambient warmth keeps the shaded platform from going blue.
    this.ambient = new THREE.AmbientLight(0xfff4e2, 0.16);
    this.scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(MOOD_DEFAULT.sunColor, MOOD_DEFAULT.sunIntensity);
    this.sun.position.set(
      this.sunDirection.x * 70,
      this.sunDirection.y * 70,
      this.sunDirection.z * 70
    );
    this.sun.target.position.set(0, 0, -6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 150;
    this.sun.shadow.camera.left = -46;
    this.sun.shadow.camera.right = 46;
    this.sun.shadow.camera.top = 46;
    this.sun.shadow.camera.bottom = -46;
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.035;
    this.sun.shadow.radius = 4;
    this.scene.add(this.sun, this.sun.target);

    // Soft warm fill from the opposite side. No shadow, just lifted contrast.
    this.fill = new THREE.DirectionalLight(0xffe7c9, 0.5);
    this.fill.position.set(35, 18, 20);
    this.fill.target.position.set(0, 1, 0);
    this.fill.castShadow = false;
    this.scene.add(this.fill, this.fill.target);
  }

  _createClouds() {
    const cloudTexture = createCloudTexture();
    this.clouds = new THREE.Group();
    this.clouds.name = 'Clouds';
    this.scene.add(this.clouds);

    const cloudData = [
      [-135, 66, -110, 62, 24, 0.75],
      [-35, 76, -155, 78, 27, 0.54],
      [78, 61, -132, 55, 20, 0.64],
      [150, 73, -95, 72, 26, 0.45],
      [-188, 56, 64, 53, 21, 0.38],
      [35, 82, 140, 75, 28, 0.32],
      [165, 59, 110, 58, 22, 0.3]
    ];

    this.cloudSprites = [];
    cloudData.forEach(([x, y, z, sx, sy, opacity]) => {
      const material = new THREE.SpriteMaterial({
        map: cloudTexture,
        color: 0xfffcf4,
        transparent: true,
        opacity: opacity * MOOD_DEFAULT.cloudOpacity,
        depthWrite: false,
        fog: false
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.set(x, y, z);
      sprite.scale.set(sx, sy, 1);
      sprite.userData = {
        baseX: x,
        speed: 0.22 + Math.random() * 0.16,
        baseOpacity: opacity
      };
      this.clouds.add(sprite);
      this.cloudSprites.push(sprite);
    });
  }

  _createDustMotes() {
    const count = 90;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 34;
      positions[i * 3 + 1] = 1.2 + Math.random() * 4.4;
      positions[i * 3 + 2] = -0.5 + Math.random() * 10;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xfff4dc,
      size: 0.035,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      sizeAttenuation: true
    });
    this.motes = new THREE.Points(geometry, material);
    this.motes.name = 'SunMotes';
    this.motes.frustumCulled = false;
    this.scene.add(this.motes);
  }

  applyMood(mood = {}, immediate = false) {
    this.targetMood = { ...MOOD_DEFAULT, ...mood };
    if (immediate) {
      this.currentMood = { ...this.targetMood };
      this._applyMoodValues(0);
    }
  }

  _applyMoodValues(alpha) {
    const current = this.currentMood;
    const target = this.targetMood;

    this._tempColorA.setHex(current.skyTop);
    this._tempColorA.lerp(this._tempColorB.setHex(target.skyTop), alpha);
    this.skyMaterial.uniforms.uZenith.value.copy(this._tempColorA);

    this._tempColorA.setHex(current.skyHorizon);
    this._tempColorA.lerp(this._tempColorB.setHex(target.skyHorizon), alpha);
    this.skyMaterial.uniforms.uHorizon.value.copy(this._tempColorA);

    this._tempColorA.setHex(current.fogColor);
    this._tempColorA.lerp(this._tempColorB.setHex(target.fogColor), alpha);
    this.scene.fog.color.copy(this._tempColorA);
    this.scene.fog.density = THREE.MathUtils.lerp(current.fogDensity, target.fogDensity, alpha);

    this._tempColorA.setHex(current.sunColor);
    this._tempColorA.lerp(this._tempColorB.setHex(target.sunColor), alpha);
    this.sun.color.copy(this._tempColorA);
    this.skyMaterial.uniforms.uSunColor.value.copy(this._tempColorA);
    this.sun.intensity = THREE.MathUtils.lerp(current.sunIntensity, target.sunIntensity, alpha);

    this._tempColorA.setHex(current.hemiSky);
    this._tempColorA.lerp(this._tempColorB.setHex(target.hemiSky), alpha);
    this.hemisphere.color.copy(this._tempColorA);
    this._tempColorA.setHex(current.hemiGround);
    this._tempColorA.lerp(this._tempColorB.setHex(target.hemiGround), alpha);
    this.hemisphere.groundColor.copy(this._tempColorA);
    this.hemisphere.intensity = THREE.MathUtils.lerp(current.hemiIntensity, target.hemiIntensity, alpha);

    const exposure = THREE.MathUtils.lerp(current.exposure, target.exposure, alpha);
    this.sunIntensityExposure = exposure;
    if (this.scene.userData.renderer) {
      this.scene.userData.renderer.toneMappingExposure = exposure;
    }

    const cloudOpacity = THREE.MathUtils.lerp(current.cloudOpacity, target.cloudOpacity, alpha);
    for (const cloud of this.cloudSprites) {
      cloud.material.opacity = cloud.userData.baseOpacity * cloudOpacity;
    }
  }

  update(dt, elapsed, camera) {
    this.elapsed = elapsed;
    this.sky.position.copy(camera.position);
    this.motes.position.x = Math.sin(elapsed * 0.025) * 0.3;

    this.skyMaterial.uniforms.uTime.value = elapsed;

    // Very slow cloud drift. Wrap across the view without popping.
    for (const sprite of this.cloudSprites) {
      sprite.position.x += sprite.userData.speed * dt;
      if (sprite.position.x > 230) sprite.position.x = -230;
    }

    const blend = 1 - Math.exp(-dt * 1.1);
    const keys = Object.keys(this.targetMood);
    for (const key of keys) {
      this.currentMood[key] = THREE.MathUtils.lerp(
        this.currentMood[key],
        this.targetMood[key],
        blend
      );
    }
    this._applyMoodValues(0);

    // Dust drifts almost imperceptibly through the canopy light.
    if (this.motes) {
      this.motes.rotation.y = Math.sin(elapsed * 0.035) * 0.012;
    }
  }

  setExposure(value) {
    if (this.scene.userData.renderer) {
      this.scene.userData.renderer.toneMappingExposure = value;
    }
  }
}
