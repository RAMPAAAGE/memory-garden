import * as THREE from 'three';

// Procedural 3D flowers, instanced over a wrapped field around the camera.

type ColorFn = (u: number, v: number) => THREE.Color;
const C = (hex: string) => new THREE.Color(hex);
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a: THREE.Color, b: THREE.Color, t: number) => a.clone().lerp(b, t);

export function rand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Builder {
  pos: number[] = [];
  col: number[] = [];
  petal: number[] = [];
  idx: number[] = [];

  get count(): number { return this.pos.length / 3; }

  surface(nu: number, nv: number, fn: (u: number, v: number) => THREE.Vector3, color: ColorFn, petal = 1): void {
    const start = this.count;
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      const u = i / nu, v = j / nv;
      const p = fn(u, v), c = color(u, v);
      this.pos.push(p.x, p.y, p.z);
      this.col.push(c.r, c.g, c.b);
      this.petal.push(petal);
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = start + i * (nv + 1) + j, b = a + nv + 1;
      this.idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  tube(points: THREE.Vector3[], segs: number, sides: number, radius: (u: number) => number, color: ColorFn): void {
    const curve = new THREE.CatmullRomCurve3(points);
    const frames = curve.computeFrenetFrames(segs, false);
    this.surface(segs, sides, (u, v) => {
      const i = Math.round(u * segs);
      const a = v * Math.PI * 2;
      const r = radius(u);
      return curve.getPointAt(u)
        .addScaledVector(frames.normals[i], Math.cos(a) * r)
        .addScaledVector(frames.binormals[i], Math.sin(a) * r);
    }, color, 0);
  }

  merge(other: Builder, m: THREE.Matrix4): void {
    const offset = this.count;
    const v = new THREE.Vector3();
    for (let i = 0; i < other.pos.length; i += 3) {
      v.set(other.pos[i], other.pos[i + 1], other.pos[i + 2]).applyMatrix4(m);
      this.pos.push(v.x, v.y, v.z);
    }
    this.col.push(...other.col);
    this.petal.push(...other.petal);
    for (const i of other.idx) this.idx.push(i + offset);
  }

  geometry(height: number): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aPetal', new THREE.Float32BufferAttribute(this.petal, 1));
    const sway: number[] = [];
    for (let i = 1; i < this.pos.length; i += 3) sway.push(Math.pow(Math.max(0, this.pos[i]) / height, 1.6));
    g.setAttribute('aSway', new THREE.Float32BufferAttribute(sway, 1));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    return g;
  }
}

interface PetalOpts {
  az: number; len: number; w: number; tilt: number; curl: number;
  cup?: number; ruffle?: number; notch?: number; nu: number; nv: number;
  width?: (u: number) => number; color: ColorFn; petal?: number;
}

/** A petal rising from the origin around the local +Y axis. */
function petal(b: Builder, o: PetalOpts): void {
  const steps = o.nu * 4;
  const spine: [number, number, number][] = []; // r, h, theta
  let r = 0, h = 0;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const th = o.tilt + o.curl * Math.pow(u, 1.6);
    spine.push([r, h, th]);
    r += Math.sin(th) * (o.len / steps);
    h += Math.cos(th) * (o.len / steps);
  }
  const R = new THREE.Vector3(Math.cos(o.az), 0, Math.sin(o.az));
  const S = new THREE.Vector3(-Math.sin(o.az), 0, Math.cos(o.az));
  const widthFn = o.width ?? ((u: number) => Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.92 + 0.06)), 0.7));
  b.surface(o.nu, o.nv, (u, vv) => {
    const v = vv * 2 - 1;
    const [sr, sh, th] = spine[Math.round(u * steps)];
    const wHalf = o.w * widthFn(u);
    const nr = -Math.cos(th), nh = Math.sin(th);
    const off = ((o.cup ?? 0.3) * v * v + (o.ruffle ?? 0) * Math.sin(u * 14 + o.az * 7) * Math.abs(v) ** 2) * wHalf;
    const ext = (o.notch ?? 0) * o.len * 0.14 * (0.5 + 0.5 * Math.cos(v * Math.PI * 3)) * smooth(0.7, 1, u);
    const tr = Math.sin(th), tt = Math.cos(th);
    return new THREE.Vector3()
      .addScaledVector(R, sr + nr * off + tr * ext)
      .addScaledVector(S, v * wHalf)
      .add(new THREE.Vector3(0, sh + nh * off + tt * ext, 0));
  }, o.color, o.petal ?? 1);
}

function disk(b: Builder, radius: number, height: number, color: ColorFn, nu = 3, nv = 8): void {
  b.surface(nu, nv, (u, v) => {
    const a = v * Math.PI * 2, r = radius * (1 - u);
    return new THREE.Vector3(Math.cos(a) * r, height * Math.sin((u * Math.PI) / 2), Math.sin(a) * r);
  }, color, 0);
}

function leaf(b: Builder, base: THREE.Vector3, az: number, len: number, w: number, tilt: number, color: THREE.Color): void {
  const l = new Builder();
  petal(l, { az, len, w, tilt, curl: 0.9, cup: 0.25, nu: 4, nv: 2, color: (u) => mix(color, C('#7fae6b'), u * 0.5), petal: 0.6 });
  l.idx.length && b.merge(l, new THREE.Matrix4().makeTranslation(base.x, base.y, base.z));
}

function stem(b: Builder, top: THREE.Vector3, bend: number, radius: number, color = C('#3f6e3f')): void {
  b.tube([
    new THREE.Vector3(0, -0.02, 0),
    new THREE.Vector3(bend * 0.2, top.y * 0.35, 0),
    new THREE.Vector3(top.x * 0.8 + bend * 0.3, top.y * 0.72, top.z * 0.8),
    top,
  ], 5, 3, (u) => radius * (1 - u * 0.35), (u) => mix(C('#1d3a22'), color, smooth(0, 0.5, u)));
}

/** Rotate a head built around +Y so it faces `dir`, then place it at `at`. */
function placeHead(b: Builder, head: Builder, at: THREE.Vector3, dir: THREE.Vector3): void {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  b.merge(head, new THREE.Matrix4().compose(at, q, new THREE.Vector3(1, 1, 1)));
}

// ─── Species ────────────────────────────────────────────────────────────────

function spiderLily(): { geo: THREE.BufferGeometry; height: number } {
  const b = new Builder();
  const top = new THREE.Vector3(0.015, 0.52, 0);
  stem(b, top, 0.02, 0.006, C('#4b7a3e'));
  const crimson = C('#7a0618'), red = C('#d0122c'), tip = C('#f2384a');
  const r = rand(4);
  const florets = 6;
  for (let f = 0; f < florets; f++) {
    const a = (f / florets) * Math.PI * 2 + r() * 0.4;
    const e = 0.75 + r() * 0.35;
    const dir = new THREE.Vector3(Math.cos(a) * Math.sin(e), Math.cos(e), Math.sin(a) * Math.sin(e));
    const fl = new Builder();
    for (let k = 0; k < 6; k++) {
      petal(fl, {
        az: (k / 6) * Math.PI * 2 + r() * 0.3, len: 0.07 + r() * 0.012, w: 0.0075, tilt: 0.55, curl: 2.9,
        cup: 0.5, ruffle: 0.9, nu: 7, nv: 2,
        color: (u) => (u < 0.4 ? mix(crimson, red, u / 0.4) : mix(red, tip, (u - 0.4) / 0.6)),
      });
    }
    for (let k = 0; k < 6; k++) {
      petal(fl, {
        az: (k / 6) * Math.PI * 2 + 0.5, len: 0.13 + r() * 0.03, w: 0.0034, tilt: 0.42, curl: -0.3,
        cup: 0, nu: 6, nv: 1, width: () => 1,
        color: (u) => (u > 0.93 ? C('#f6c86a') : mix(red, tip, u)), petal: 0.8,
      });
    }
    placeHead(b, fl, top.clone().addScaledVector(dir, 0.012), dir);
  }
  return { geo: b.geometry(0.62), height: 0.62 };
}

function cosmos(kind: 'pink' | 'white' | 'magenta'): { geo: THREE.BufferGeometry; height: number } {
  const b = new Builder();
  const palette = {
    pink: [C('#c2407a'), C('#f07fae'), C('#ffd3e4')],
    white: [C('#e7b9cc'), C('#fbf2f4'), C('#ffffff')],
    magenta: [C('#7d1450'), C('#c42a7a'), C('#ef6aa8')],
  }[kind];
  const top = new THREE.Vector3(0.03, 0.56, 0.01);
  stem(b, top, -0.03, 0.005);
  leaf(b, new THREE.Vector3(0.005, 0.2, 0), 0.4, 0.09, 0.008, 0.9, C('#3f7444'));
  leaf(b, new THREE.Vector3(0.01, 0.32, 0), 3.4, 0.08, 0.008, 1.0, C('#3f7444'));
  const head = new Builder();
  for (let k = 0; k < 8; k++) {
    petal(head, {
      az: (k / 8) * Math.PI * 2, len: 0.085, w: 0.03, tilt: 1.25, curl: 0.35, cup: 0.22, ruffle: 0.12, notch: 1, nu: 5, nv: 3,
      width: (u) => 0.28 + 0.72 * smooth(0, 0.55, u) - 0.12 * smooth(0.85, 1, u),
      color: (u, v) => {
        const c = u < 0.22 ? mix(palette[0], palette[1], u / 0.22) : mix(palette[1], palette[2], (u - 0.22) / 0.78);
        return c.multiplyScalar(0.92 + 0.08 * Math.cos(v * 18));
      },
    });
  }
  head.merge((() => { const d = new Builder(); disk(d, 0.016, 0.012, (u) => mix(C('#c77d12'), C('#ffd23a'), u)); return d; })(), new THREE.Matrix4());
  placeHead(b, head, top, new THREE.Vector3(0.45, 1, 0.1));
  return { geo: b.geometry(0.66), height: 0.66 };
}

function daisy(): { geo: THREE.BufferGeometry; height: number } {
  const b = new Builder();
  const top = new THREE.Vector3(-0.02, 0.4, 0.015);
  stem(b, top, 0.03, 0.004);
  leaf(b, new THREE.Vector3(0, 0.05, 0), 1.2, 0.07, 0.01, 1.1, C('#356b3d'));
  const head = new Builder();
  const r = rand(9);
  for (let k = 0; k < 16; k++) {
    petal(head, {
      az: (k / 16) * Math.PI * 2 + r() * 0.1, len: 0.05 + r() * 0.008, w: 0.0085, tilt: 1.4, curl: 0.45, cup: 0.35, nu: 4, nv: 2,
      color: (u) => mix(C('#e9e4d6'), C('#ffffff'), smooth(0, 0.4, u)),
    });
  }
  const d = new Builder();
  disk(d, 0.017, 0.016, (u) => mix(C('#b8780e'), C('#ffcf2e'), u));
  head.merge(d, new THREE.Matrix4());
  placeHead(b, head, top, new THREE.Vector3(-0.3, 1, 0.25));
  return { geo: b.geometry(0.46), height: 0.46 };
}

function lavender(): { geo: THREE.BufferGeometry; height: number } {
  const b = new Builder();
  const top = new THREE.Vector3(0.02, 0.5, 0);
  stem(b, top, 0.02, 0.0035, C('#5d7d55'));
  const whorls = 7;
  for (let w = 0; w < whorls; w++) {
    const t = w / (whorls - 1);
    const y = 0.32 + t * 0.18;
    const x = 0.02 * (y / 0.5) ** 2;
    const size = 0.014 * (1 - t * 0.45);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + w * 0.7;
      const bud = new Builder();
      bud.surface(2, 4, (u, v) => {
        const ang = v * Math.PI * 2, rr = Math.sin(u * Math.PI) * size * 0.55;
        return new THREE.Vector3(Math.cos(ang) * rr, (u - 0.5) * size * 1.6, Math.sin(ang) * rr);
      }, (u) => mix(C('#4e2f8f'), C('#a07fe0'), u), 0.7);
      b.merge(bud, new THREE.Matrix4().makeTranslation(x + Math.cos(a) * size * 0.55, y, Math.sin(a) * size * 0.55));
    }
  }
  return { geo: b.geometry(0.52), height: 0.52 };
}

function forgetMeNots(): { geo: THREE.BufferGeometry; height: number } {
  const b = new Builder();
  const r = rand(21);
  for (let f = 0; f < 6; f++) {
    const a = r() * Math.PI * 2, d = 0.02 + r() * 0.05;
    const top = new THREE.Vector3(Math.cos(a) * d, 0.12 + r() * 0.1, Math.sin(a) * d);
    b.tube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(top.x * 0.4, top.y * 0.5, top.z * 0.4), top], 3, 3, () => 0.0025, () => C('#2f5a33'));
    const head = new Builder();
    for (let k = 0; k < 5; k++) {
      petal(head, {
        az: (k / 5) * Math.PI * 2, len: 0.017, w: 0.009, tilt: 1.35, curl: 0.2, cup: 0.2, nu: 2, nv: 2,
        width: (u) => Math.sin(Math.PI * Math.min(1, u * 0.8 + 0.2)),
        color: (u) => mix(C('#f5f0d0'), C('#6f9bf0'), smooth(0.05, 0.4, u)),
      });
    }
    placeHead(b, head, top, new THREE.Vector3(r() - 0.5, 1.6, r() - 0.5));
  }
  return { geo: b.geometry(0.24), height: 0.24 };
}

// ─── Instancing + shading ───────────────────────────────────────────────────

export const floraUniforms = {
  uTime: { value: 0 },
  uCamZ: { value: 0 },
  uFogColor: { value: new THREE.Color() },
  uFogDensity: { value: 0.04 },
  uMoonDir: { value: new THREE.Vector3(-0.45, 0.75, 0.5).normalize() },
  uMoonColor: { value: new THREE.Color('#c9d6ff') },
  uAmbient: { value: new THREE.Color('#3a4a5c') },
  uDepth: { value: 26 },
  uGlowPos: { value: new THREE.Vector3(0, -100, 0) },
  uGlowStrength: { value: 0 },
  uCursor: { value: new THREE.Vector3(0, 0, 999) },
  uCursorOn: { value: 0 },
};

/** The field is gently bent like a bowl: the sides rise, the distance falls away. */
export const BEND_X = 0.012, BEND_Z = 0.0026;
/** Needs `uniform float uCamZ` declared before it. */
export const bendChunk = /* glsl */ `
  float bendY(vec3 p) {
    float d = max(uCamZ - p.z, 0.0);
    return ${BEND_X.toFixed(4)} * min(p.x * p.x, 380.0) - ${BEND_Z.toFixed(4)} * d * d;
  }
`;

const vertexShader = /* glsl */ `
  uniform float uTime, uCamZ, uDepth;
  ${bendChunk}
  uniform vec3 uCursor; uniform float uCursorOn;
  attribute vec3 aColor; attribute float aPetal; attribute float aSway;
  attribute vec2 aOffset; attribute vec4 aData; // scale, rotation, phase, tint mix
  attribute vec3 aTint;
  varying vec3 vColor; varying vec3 vNormal; varying vec3 vWorld; varying vec3 vView; varying float vPetal; varying float vDepth; varying float vH;
  void main() {
    float z = uCamZ + 3.0 - mod(uCamZ + 3.0 - aOffset.y, uDepth);
    vec3 base = vec3(aOffset.x, 0.0, z);
    float dist = uCamZ - z;
    float grow = 1.0 - smoothstep(uDepth - 9.0, uDepth - 3.0, dist);
    float s = aData.x * grow;
    float c = cos(aData.y), sn = sin(aData.y);
    mat3 rot = mat3(c, 0.0, -sn, 0.0, 1.0, 0.0, sn, 0.0, c);
    vec3 p = rot * (position * s);
    vec3 n = rot * normal;
    float t = uTime + aData.z;
    vec2 wind = vec2(sin(t * 1.1 + base.x * 0.35) + 0.4 * sin(t * 2.3), cos(t * 0.9 + base.z * 0.2)) * 0.05;
    p.xz += wind * aSway * s;
    // flowers lean away from the cursor
    vec2 away = base.xz - uCursor.xz;
    float cd = length(away);
    p.xz += away / max(cd, 0.001) * (1.0 - smoothstep(0.0, 1.3, cd)) * 0.32 * aSway * s * uCursorOn;
    vec4 world = vec4(base + p, 1.0);
    vH = world.y;
    world.y += bendY(base);
    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;
    vColor = mix(aColor, aColor * aTint, aData.w * aPetal);
    vNormal = n; vWorld = world.xyz; vView = -mv.xyz; vPetal = aPetal; vDepth = -mv.z;
  }`;

const fragmentShader = /* glsl */ `
  uniform vec3 uFogColor; uniform float uFogDensity;
  uniform vec3 uMoonDir, uMoonColor, uAmbient;
  uniform float uEmissive;
  uniform vec3 uGlowPos; uniform float uGlowStrength;
  varying vec3 vColor; varying vec3 vNormal; varying vec3 vWorld; varying vec3 vView; varying float vPetal; varying float vDepth; varying float vH;
  void main() {
    vec3 N = normalize(vNormal);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(vView);
    float ndl = dot(N, uMoonDir);
    float diff = max(ndl, 0.0);
    float back = max(-ndl, 0.0) * vPetal;            // light through thin petals
    float rim = pow(1.0 - abs(dot(N, normalize(cameraPosition - vWorld))), 3.0);
    float ao = mix(0.25, 1.0, smoothstep(0.0, 0.35, vH));
    vec3 col = vColor * (uAmbient + uMoonColor * (diff * 0.85 + back * 0.55)) * ao;
    col += vColor * rim * 0.35 * vPetal;
    col += vColor * uEmissive * vPetal;
    // warm light from the lily at the end
    vec3 L = uGlowPos - vWorld;
    float gd = length(L);
    col += vColor * vec3(1.0, 0.86, 0.8) * uGlowStrength * max(dot(N, L / gd), 0.2) / (1.0 + gd * gd * 0.6);
    float f = 1.0 - exp(-uFogDensity * uFogDensity * vDepth * vDepth);
    gl_FragColor = vec4(mix(col, uFogColor, clamp(f, 0.0, 1.0)), 1.0);
    #include <colorspace_fragment>
  }`;

interface Species {
  make: () => { geo: THREE.BufferGeometry; height: number };
  count: number;
  scale: [number, number];
  tints: string[];
  emissive?: number;
  /** placement weight at (x, z) — lets species grow in drifts */
  where: (x: number, z: number, r: () => number) => boolean;
}

export class Flora {
  readonly group = new THREE.Group();
  private readonly meshes: { mesh: THREE.Mesh; base: number }[] = [];

  constructor(width = 26, depth = 26) {
    floraUniforms.uDepth.value = depth;
    const species: Species[] = [
      // everything is scattered and mixed — no drifts or bands
      { make: spiderLily, count: 300, scale: [0.95, 1.35], tints: ['#ffffff'], emissive: 0.28, where: () => true },
      { make: () => cosmos('pink'), count: 700, scale: [0.9, 1.45], tints: ['#ffffff', '#ffd0e4'], where: () => true },
      { make: () => cosmos('white'), count: 450, scale: [0.9, 1.4], tints: ['#ffffff'], where: () => true },
      { make: () => cosmos('magenta'), count: 350, scale: [0.9, 1.35], tints: ['#ffffff', '#ffb3c8'], where: () => true },
      { make: daisy, count: 1300, scale: [0.85, 1.4], tints: ['#ffffff', '#fff3e0'], where: () => true },
      { make: lavender, count: 700, scale: [0.9, 1.4], tints: ['#ffffff', '#d7c7ff', '#ffc8f0'], where: () => true },
      { make: forgetMeNots, count: 1500, scale: [1.0, 1.6], tints: ['#ffffff', '#ffd6f2', '#e3f0ff'], where: () => true },
    ];
    const r = rand(77);
    species.forEach((sp, si) => {
      const { geo } = sp.make();
      const ig = new THREE.InstancedBufferGeometry();
      ig.index = geo.index;
      for (const name of ['position', 'normal', 'aColor', 'aPetal', 'aSway']) ig.setAttribute(name, geo.getAttribute(name));
      const off = new Float32Array(sp.count * 2), data = new Float32Array(sp.count * 4), tint = new Float32Array(sp.count * 3);
      for (let i = 0; i < sp.count; i++) {
        let x = 0, z = 0;
        for (let tries = 0; tries < 30; tries++) {
          x = (r() - 0.5) * width; z = -r() * depth;
          if (Math.abs(x) < 0.45 && r() < 0.85) continue;
          if (sp.where(x, z, r)) break;
        }
        off[i * 2] = x; off[i * 2 + 1] = z;
        data[i * 4] = sp.scale[0] + r() * (sp.scale[1] - sp.scale[0]);
        data[i * 4 + 1] = r() * Math.PI * 2;
        data[i * 4 + 2] = r() * 100;
        data[i * 4 + 3] = 1;
        const tc = C(sp.tints[Math.floor(r() * sp.tints.length)]);
        tint.set([tc.r, tc.g, tc.b], i * 3);
      }
      ig.setAttribute('aOffset', new THREE.InstancedBufferAttribute(off, 2));
      ig.setAttribute('aData', new THREE.InstancedBufferAttribute(data, 4));
      ig.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 3));
      ig.instanceCount = sp.count;
      const mat = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        uniforms: { ...floraUniforms, uEmissive: { value: sp.emissive ?? 0.04 } },
        vertexShader, fragmentShader,
      });
      const mesh = new THREE.Mesh(ig, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = si;
      this.group.add(mesh);
      this.meshes.push({ mesh, base: sp.count });
    });
  }

  /** 0..1 share of instances to draw (for slower computers). */
  setQuality(q: number): void {
    for (const { mesh, base } of this.meshes) (mesh.geometry as THREE.InstancedBufferGeometry).instanceCount = Math.floor(base * q);
  }

  get triangles(): number {
    return this.meshes.reduce((s, { mesh }) => {
      const g = mesh.geometry as THREE.InstancedBufferGeometry;
      return s + (g.index!.count / 3) * g.instanceCount;
    }, 0);
  }
}
