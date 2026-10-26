import * as THREE from 'three';
import { Flora, floraUniforms, bendChunk } from './flora';
export { BEND_X, BEND_Z } from './flora';

// Fog and the sky's horizon share this dark night green, so the far field dissolves into darkness.
export const HORIZON = new THREE.Color('#0c1511');
export const FOG_DENSITY = 0.04;

const fogChunk = /* glsl */ `
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  vec3 applyFog(vec3 c, float depth) {
    float f = 1.0 - exp(-uFogDensity * uFogDensity * depth * depth);
    return mix(c, uFogColor, clamp(f, 0.0, 1.0));
  }
`;

const shared = {
  uTime: { value: 0 },
  uCamZ: { value: 0 },
  uFogColor: { value: HORIZON.clone() },
  uFogDensity: { value: FOG_DENSITY },
};

function rand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Wrap a field instance into the window [camZ+ahead-depth, camZ+ahead]. */
const wrapChunk = /* glsl */ `
  uniform float uCamZ;
  float wrapZ(float z, float depth, float ahead) {
    return uCamZ + ahead - mod(uCamZ + ahead - z, depth);
  }
  ${bendChunk}
`;

// ─── Flower sprites ──────────────────────────────────────────────────────────
function flowerAtlas(): THREE.CanvasTexture {
  const cw = 128, chh = 256, types = 5;
  const c = document.createElement('canvas');
  c.width = cw * types; c.height = chh;
  const g = c.getContext('2d')!;
  const r = rand(7);

  const stem = (ox: number, headY: number, lean: number) => {
    g.strokeStyle = '#3d6b45'; g.lineWidth = 3.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(ox + 64, chh); g.quadraticCurveTo(ox + 64 + lean * 0.5, (chh + headY) / 2, ox + 64 + lean, headY); g.stroke();
    g.fillStyle = '#4f8556';
    for (const [y, dir] of [[chh - 50, -1], [chh - 86, 1]] as const) {
      g.save(); g.translate(ox + 64 + lean * ((chh - y) / (chh - headY)) * 0.6, y); g.rotate(dir * 0.9);
      g.beginPath(); g.ellipse(dir * 14, 0, 16, 4.5, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
  };
  const petals = (cx: number, cy: number, n: number, len: number, wid: number, fill: string | CanvasGradient, rot = 0) => {
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      g.save(); g.translate(cx, cy); g.scale(1, 0.72); g.rotate(a);
      g.fillStyle = fill;
      g.beginPath(); g.ellipse(len * 0.5, 0, len * 0.5, wid, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
  };
  const center = (cx: number, cy: number, rad: number, col: string) => {
    g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy, rad, rad * 0.72, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(cx - rad * 0.3, cy - rad * 0.25, rad * 0.35, rad * 0.25, 0, 0, Math.PI * 2); g.fill();
  };

  // 0 · white daisy
  stem(0, 70, 6); petals(70, 64, 16, 40, 6, '#fbf7f0'); center(70, 64, 10, '#f2c14e');
  // 1 · pink cosmos
  stem(cw, 66, -8);
  { const gr = g.createRadialGradient(cw + 56, 62, 4, cw + 56, 62, 44); gr.addColorStop(0, '#d9558a'); gr.addColorStop(0.35, '#f29bbd'); gr.addColorStop(1, '#ffd6e5');
    petals(cw + 56, 62, 8, 44, 13, gr, 0.2); center(cw + 56, 62, 8, '#f4c542'); }
  // 2 · lilac
  stem(cw * 2, 76, 4);
  { const gr = g.createRadialGradient(cw * 2 + 68, 70, 2, cw * 2 + 68, 70, 36); gr.addColorStop(0, '#7f63c9'); gr.addColorStop(1, '#cdb9f5');
    petals(cw * 2 + 68, 70, 5, 34, 16, gr, 0.6); center(cw * 2 + 68, 70, 6, '#fff3d6'); }
  // 3 · peach cluster
  stem(cw * 3, 96, -4);
  for (const [dx, dy, s] of [[-18, -24, 1], [16, -12, 0.85], [-4, 6, 0.9], [22, 18, 0.7]]) {
    petals(cw * 3 + 62 + dx, 96 + dy - 18, 5, 18 * s, 9 * s, '#ffcdb5', r()); center(cw * 3 + 62 + dx, 96 + dy - 18, 4 * s, '#f6a77f');
  }
  // 4 · white star bloom
  stem(cw * 4, 58, 10);
  { const gr = g.createRadialGradient(cw * 4 + 74, 54, 2, cw * 4 + 74, 54, 40); gr.addColorStop(0, '#fff0f4'); gr.addColorStop(1, '#ffffff');
    petals(cw * 4 + 74, 54, 6, 40, 8, gr, 0.3); center(cw * 4 + 74, 54, 5, '#e9d36f'); }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function flowers(): THREE.Mesh {
  // Flat sprites only fill the far field; near the camera the 3D flora takes over.
  const COUNT = 12000, WIDTH = 70, DEPTH = 60, TYPES = 5;
  const quad = new THREE.PlaneGeometry(1, 2, 1, 4);
  quad.translate(0, 1, 0);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = quad.index;
  geo.attributes.position = quad.attributes.position;
  geo.attributes.uv = quad.attributes.uv;
  const off = new Float32Array(COUNT * 2), size = new Float32Array(COUNT), type = new Float32Array(COUNT), phase = new Float32Array(COUNT);
  const r = rand(11);
  for (let i = 0; i < COUNT; i++) {
    let x = (r() - 0.5) * WIDTH;
    if (Math.abs(x) < 0.7 && r() < 0.75) x += Math.sign(x || 1) * 0.9; // a soft path in the middle
    off[i * 2] = x; off[i * 2 + 1] = -r() * DEPTH;
    size[i] = 0.2 + r() * 0.2;
    const t = r();
    type[i] = t < 0.34 ? 0 : t < 0.58 ? 1 : t < 0.74 ? 2 : t < 0.88 ? 3 : 4;
    phase[i] = r() * 6.28;
  }
  geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(off, 2));
  geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(size, 1));
  geo.setAttribute('aType', new THREE.InstancedBufferAttribute(type, 1));
  geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
  geo.instanceCount = COUNT;

  const mat = new THREE.ShaderMaterial({
    uniforms: { ...shared, uMap: { value: flowerAtlas() }, uDepth: { value: DEPTH }, uTypes: { value: TYPES } },
    vertexShader: /* glsl */ `
      ${wrapChunk}
      uniform float uTime, uDepth, uTypes;
      attribute vec2 aOffset; attribute float aSize, aType, aPhase;
      varying vec2 vUv; varying float vDepth; varying float vLight; varying float vNear;
      void main() {
        vec3 base = vec3(aOffset.x, 0.0, wrapZ(aOffset.y, uDepth, 4.0));
        base.y += bendY(base);
        vNear = step(abs(base.x), 12.0) * step(uCamZ - base.z, 16.0 + fract(aPhase * 7.0) * 6.0);
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        float h = position.y;
        float sway = sin(uTime * 1.3 + aPhase + base.x * 0.4) * 0.06 + sin(uTime * 2.7 + aPhase * 2.0) * 0.02;
        vec3 p = base + right * position.x * aSize + vec3(0.0, h * aSize, 0.0);
        p.x += sway * h * h * 0.5;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vUv = vec2((uv.x + aType) / uTypes, uv.y);
        vDepth = -mv.z;
        vLight = 0.75 + 0.25 * sin(aPhase * 3.0);
      }`,
    fragmentShader: /* glsl */ `
      ${fogChunk}
      uniform sampler2D uMap;
      varying vec2 vUv; varying float vDepth; varying float vLight; varying float vNear;
      void main() {
        if (vNear > 0.5) discard;
        vec4 c = texture2D(uMap, vUv);
        if (c.a < 0.05) discard;
        vec3 col = c.rgb * vLight * 0.72 * mix(vec3(0.12, 0.16, 0.18), vec3(1.0), smoothstep(0.25, 0.75, vUv.y));
        // soft alpha + alpha-to-coverage (with MSAA) = smooth edges instead of jagged cut-outs
        gl_FragColor = vec4(applyFog(col, vDepth), smoothstep(0.25, 0.65, c.a));
        #include <colorspace_fragment>
      }`,
  });
  mat.alphaToCoverage = true;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

function grass(): THREE.Mesh {
  const COUNT = 60000, WIDTH = 32, DEPTH = 36, SEG = 4;
  const pos: number[] = [], idx: number[] = [];
  for (let s = 0; s <= SEG; s++) {
    const y = s / SEG;
    pos.push(-0.5, y, 0, 0.5, y, 0);
    if (s < SEG) { const a = s * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const off = new Float32Array(COUNT * 2), data = new Float32Array(COUNT * 4);
  const r = rand(23);
  for (let i = 0; i < COUNT; i++) {
    off[i * 2] = (r() - 0.5) * WIDTH; off[i * 2 + 1] = -r() * DEPTH;
    data[i * 4] = 0.14 + r() * r() * 0.6; data[i * 4 + 1] = r() * 6.28; data[i * 4 + 2] = r() * 6.28; data[i * 4 + 3] = (r() - 0.5) * 0.35;
  }
  geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(off, 2));
  geo.setAttribute('aData', new THREE.InstancedBufferAttribute(data, 4));
  geo.instanceCount = COUNT;
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { ...shared, uDepth: { value: DEPTH }, uCursor: floraUniforms.uCursor, uCursorOn: floraUniforms.uCursorOn },
    vertexShader: /* glsl */ `
      ${wrapChunk}
      uniform float uTime, uDepth;
      uniform vec3 uCursor; uniform float uCursorOn;
      attribute vec2 aOffset; attribute vec4 aData;
      varying float vY; varying float vDepth; varying float vVar;
      void main() {
        float h = aData.x, ang = aData.y, ph = aData.z;
        float y = position.y;
        vVar = fract(ph * 3.17);
        vec3 p = vec3(position.x * 0.045 * (1.0 - y * 0.92), y * h, 0.0);
        p.x += (aData.w + sin(uTime * 1.6 + ph + aOffset.x * 0.3) * 0.08) * y * y;
        float c = cos(ang), s = sin(ang);
        p = vec3(p.x * c, p.y, p.x * s);
        p += vec3(aOffset.x, 0.0, wrapZ(aOffset.y, uDepth, 4.0));
        p.y += bendY(p);
        vec2 aw = p.xz - uCursor.xz;
        float cd = length(aw);
        p.xz += aw / max(cd, 0.001) * (1.0 - smoothstep(0.0, 1.1, cd)) * 0.2 * y * y * uCursorOn;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vY = y; vDepth = -mv.z;
      }`,
    fragmentShader: /* glsl */ `
      ${fogChunk}
      varying float vY; varying float vDepth; varying float vVar;
      void main() {
        vec3 tip = mix(vec3(0.03, 0.09, 0.045), vec3(0.07, 0.11, 0.04), vVar);
        vec3 col = mix(vec3(0.002, 0.006, 0.004), tip, vY * vY);
        col += vec3(0.05, 0.06, 0.08) * smoothstep(0.7, 1.0, vY) * vVar; // moonlit tips
        gl_FragColor = vec4(applyFog(col, vDepth), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

function ground(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(120, 160, 60, 80);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      ${wrapChunk}
      varying vec3 vWorld; varying float vDepth;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); w.y += bendY(w.xyz); vWorld = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      ${fogChunk}
      varying vec3 vWorld; varying float vDepth;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        float n = noise(vWorld.xz * 0.6) * 0.6 + noise(vWorld.xz * 2.3) * 0.4;
        vec3 col = mix(vec3(0.002, 0.005, 0.003), vec3(0.008, 0.02, 0.011), n);
        gl_FragColor = vec4(applyFog(col, vDepth), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

function sky(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(300, 48, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uTime: shared.uTime, uHorizon: shared.uFogColor },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uHorizon;
      varying vec3 vDir;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 zenith = vec3(0.0015, 0.003, 0.007);
        // a wide, soft haze above the horizon instead of a hard line
        vec3 col = mix(uHorizon, vec3(0.008, 0.016, 0.018), smoothstep(-0.02, 0.3, h));
        col = mix(col, zenith, smoothstep(0.15, 0.7, h));
        // moon haze
        vec3 moonDir = normalize(vec3(-0.42, 0.36, -1.0));
        float m = max(dot(d, moonDir), 0.0);
        col += vec3(0.16, 0.18, 0.16) * pow(m, 90.0) + vec3(0.02, 0.03, 0.028) * pow(m, 8.0);
        col += vec3(0.98, 0.95, 0.86) * smoothstep(0.99965, 0.9998, m);
        // stars
        vec3 cell = floor(d * 260.0);
        float r = hash(cell);
        if (r > 0.9965 && h > 0.06) {
          vec3 center = (cell + 0.5) / 260.0;
          float dist = length(d - normalize(center)) * 260.0;
          float tw = 0.6 + 0.4 * sin(uTime * (1.0 + r * 4.0) + r * 100.0);
          col += vec3(1.0, 0.97, 0.9) * (1.0 - smoothstep(0.0, 0.5, dist)) * tw * (r - 0.9965) * 420.0 * smoothstep(0.06, 0.3, h);
        }
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return mesh;
}

function fireflies(): THREE.Points {
  const COUNT = 320, DEPTH = 40;
  const pos = new Float32Array(COUNT * 3), data = new Float32Array(COUNT * 2);
  const r = rand(5);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (r() - 0.5) * 18; pos[i * 3 + 1] = 0.25 + r() * 2.8; pos[i * 3 + 2] = -r() * DEPTH;
    data[i * 2] = r() * 6.28; data[i * 2 + 1] = 0.5 + r();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aData', new THREE.BufferAttribute(data, 2));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { ...shared, uDepth: { value: DEPTH }, uPixel: { value: 1 }, uBoost: { value: 1 } },
    vertexShader: /* glsl */ `
      ${wrapChunk}
      uniform float uTime, uDepth, uPixel;
      attribute vec2 aData;
      varying float vGlow;
      void main() {
        float ph = aData.x, sp = aData.y;
        vec3 p = position;
        p.x += sin(uTime * 0.4 * sp + ph) * 0.6;
        p.y += sin(uTime * 0.7 * sp + ph * 2.0) * 0.25;
        p.z = wrapZ(p.z + cos(uTime * 0.3 * sp + ph) * 0.6, uDepth, 3.0);
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float blink = smoothstep(0.2, 1.0, sin(uTime * 1.7 * sp + ph * 5.0) * 0.5 + 0.5);
        vGlow = blink * smoothstep(34.0, 6.0, -mv.z);
        gl_PointSize = (0.1 + 0.07 * sp) * uPixel / -mv.z;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uBoost;
      varying float vGlow;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float core = 1.0 - smoothstep(0.0, 0.5, d);
        float a = pow(core, 2.6) * vGlow * uBoost;
        gl_FragColor = vec4(vec3(1.0, 0.86, 0.5) * 2.4 * a, a);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

function mistTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d')!;
  const r = rand(3);
  for (let i = 0; i < 46; i++) {
    const x = 90 + r() * 332, y = 52 + r() * 30, rad = 24 + r() * 40;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(255,255,255,.2)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 128);
  }
  // fade every edge so the sheet never shows its rectangle
  g.globalCompositeOperation = 'destination-in';
  const fx = g.createLinearGradient(0, 0, 512, 0);
  fx.addColorStop(0, 'rgba(0,0,0,0)'); fx.addColorStop(0.3, '#000'); fx.addColorStop(0.7, '#000'); fx.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fx; g.fillRect(0, 0, 512, 128);
  const fy = g.createLinearGradient(0, 0, 0, 128);
  fy.addColorStop(0, 'rgba(0,0,0,0)'); fy.addColorStop(0.45, '#000'); fy.addColorStop(0.8, '#000'); fy.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fy; g.fillRect(0, 0, 512, 128);
  return new THREE.CanvasTexture(c);
}

/**
 * Ground-hugging mist: a few horizontal layers below eye level with drifting noise.
 * Being flat and below the camera, they never show an edge against the sky.
 */
class Mist {
  readonly group = new THREE.Group();
  private readonly mats: THREE.ShaderMaterial[] = [];
  constructor() {
    const tex = mistTexture();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    [[0.28, 0.32], [0.62, 0.22], [1.0, 0.12]].forEach(([y, strength], i) => {
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { uMap: { value: tex }, uTime: shared.uTime, uCamZ: shared.uCamZ, uStrength: { value: strength }, uSeed: { value: i * 3.7 }, uFogColor: shared.uFogColor },
        vertexShader: /* glsl */ `
          ${wrapChunk}
          varying vec2 vUv; varying vec3 vWorld; varying float vDepth;
          void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); w.y += bendY(w.xyz); vWorld = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap; uniform float uTime, uStrength, uSeed; uniform vec3 uFogColor;
          varying vec2 vUv; varying vec3 vWorld; varying float vDepth;
          void main() {
            vec2 p = vWorld.xz * 0.025 + vec2(uTime * 0.006 + uSeed, uTime * 0.002);
            float n = texture2D(uMap, p).a * 0.6 + texture2D(uMap, p * 2.3 + 0.37).a * 0.4;
            float edge = 1.0 - smoothstep(0.25, 0.5, length(vUv - 0.5));   // round fade, no corners
            float nearFade = smoothstep(1.5, 7.0, vDepth);                 // never fog the lens
            float a = (0.35 + n * 2.2) * uStrength * edge * nearFade;
            gl_FragColor = vec4(uFogColor * 1.35 + 0.02, clamp(a, 0.0, 0.6));
            #include <colorspace_fragment>
          }`,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = y;
      mesh.renderOrder = 5;
      this.mats.push(mat);
      this.group.add(mesh);
    });
  }
  update(_time: number, camZ: number): void {
    this.group.position.z = camZ - 30;
  }
}

export class GardenWorld {
  readonly group = new THREE.Group();
  readonly fireflies = fireflies();
  private readonly ground = ground();
  private readonly sky = sky();
  private readonly mist = new Mist();
  private readonly grass = grass();
  readonly flora: Flora;

  constructor() {
    Object.assign(floraUniforms, { uTime: shared.uTime, uCamZ: shared.uCamZ, uFogColor: shared.uFogColor, uFogDensity: shared.uFogDensity });
    this.flora = new Flora();
    this.group.add(this.sky, this.ground, this.grass, flowers(), this.flora.group, this.fireflies, this.mist.group);
  }

  /** Lower detail on slow computers: q in 0..1. */
  setQuality(q: number): void {
    this.flora.setQuality(q);
    const g = this.grass.geometry as THREE.InstancedBufferGeometry;
    g.instanceCount = Math.floor(60000 * Math.max(0.4, q));
  }

  /** Point on the ground under the mouse; flowers and grass lean away from it. */
  setCursor(point: THREE.Vector3 | null): void {
    const on = floraUniforms.uCursorOn;
    on.value += ((point ? 1 : 0) - on.value) * 0.15;
    if (point) floraUniforms.uCursor.value.lerp(point, 0.35);
  }

  /** Warm light the lily throws onto nearby flowers. */
  setGlow(pos: THREE.Vector3, strength: number): void {
    floraUniforms.uGlowPos.value.copy(pos);
    floraUniforms.uGlowStrength.value = strength;
  }

  /** projScale = drawing-buffer height / (2·tan(fov/2)), converts world size to pixels. */
  update(time: number, camZ: number, projScale: number): void {
    shared.uTime.value = time;
    shared.uCamZ.value = camZ;
    this.ground.position.z = camZ - 60;
    this.sky.position.z = camZ;
    (this.fireflies.material as THREE.ShaderMaterial).uniforms.uPixel.value = projScale;
    this.mist.update(time, camZ);
  }

  setFog(color: THREE.Color, density: number): void {
    shared.uFogColor.value.copy(color);
    shared.uFogDensity.value = density;
  }

  dispose(): void {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material & { map?: THREE.Texture; uniforms?: Record<string, { value: unknown }> };
      if (mat) {
        mat.map?.dispose();
        Object.values(mat.uniforms ?? {}).forEach((u) => (u.value instanceof THREE.Texture) && u.value.dispose());
        mat.dispose();
      }
    });
  }
}
