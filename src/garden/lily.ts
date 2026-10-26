import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const U = 44, V = 16;
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Stargazer-style tepal painted on canvas; returns colour + bump maps. y = 0 is the base. */
function petalMaps(inner: boolean): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const w = 512, h = 1024;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const b = document.createElement('canvas'); b.width = w; b.height = h;
  const g = c.getContext('2d')!, bg = b.getContext('2d')!;
  let s = inner ? 101 : 211;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);

  // base: warm white with green throat
  const base = g.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#cfe0a0'); base.addColorStop(0.09, '#eef2cf'); base.addColorStop(0.2, '#fff6f2'); base.addColorStop(1, '#fffaf8');
  g.fillStyle = base; g.fillRect(0, 0, w, h);

  // pink flame: soft wide flush, then a deeper core along the midrib
  const flame = (alpha: number, spread: number, blur: number, color: string, top: number, bottom: number) => {
    g.save(); g.filter = `blur(${blur}px)`; g.globalAlpha = alpha; g.fillStyle = color;
    g.beginPath(); g.moveTo(w / 2, h * top);
    g.bezierCurveTo(w * (0.5 + spread), h * 0.28, w * (0.5 + spread * 0.75), h * 0.62, w / 2, h * bottom);
    g.bezierCurveTo(w * (0.5 - spread * 0.75), h * 0.62, w * (0.5 - spread), h * 0.28, w / 2, h * top);
    g.fill(); g.restore();
  };
  flame(0.55, 0.42, 40, '#f4a6c0', 0.08, 0.86);
  flame(0.8, 0.3, 22, inner ? '#e0507f' : '#e45f89', 0.1, 0.74);
  flame(0.85, 0.1, 10, '#b5164f', 0.12, 0.6);
  // organic mottling so the colour isn't a clean vector gradient
  for (let i = 0; i < 900; i++) {
    const x = r() * w, y = r() * h, rad = 4 + r() * 22;
    g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${r() * 0.07})` : `rgba(200,60,110,${r() * 0.05})`;
    g.beginPath(); g.ellipse(x, y, rad, rad * (1.5 + r()), 0, 0, Math.PI * 2); g.fill();
  }
  // white margin
  const edge = g.createLinearGradient(0, 0, w, 0);
  edge.addColorStop(0, 'rgba(255,252,250,.95)'); edge.addColorStop(0.16, 'rgba(255,252,250,0)');
  edge.addColorStop(0.84, 'rgba(255,252,250,0)'); edge.addColorStop(1, 'rgba(255,252,250,.95)');
  g.fillStyle = edge; g.fillRect(0, 0, w, h);
  // the tip fades back to white
  const tipFade = g.createLinearGradient(0, h * 0.7, 0, h);
  tipFade.addColorStop(0, 'rgba(255,250,248,0)'); tipFade.addColorStop(1, 'rgba(255,250,248,.9)');
  g.fillStyle = tipFade; g.fillRect(0, 0, w, h);

  // bump: neutral grey + midrib groove + veins + papillae
  bg.fillStyle = '#808080'; bg.fillRect(0, 0, w, h);
  const groove = bg.createLinearGradient(0, 0, w, 0);
  groove.addColorStop(0.44, '#808080'); groove.addColorStop(0.5, '#4a4a4a'); groove.addColorStop(0.56, '#808080');
  bg.fillStyle = groove; bg.fillRect(0, 0, w, h * 0.85);

  // veins
  for (let i = -9; i <= 9; i++) {
    const x0 = w / 2 + i * 3, x1 = w / 2 + i * (w / 22);
    g.strokeStyle = `rgba(255,236,242,${0.18 + r() * 0.1})`; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(x0, h * 0.06); g.bezierCurveTo(x1 * 0.9 + w * 0.05, h * 0.4, x1, h * 0.7, w / 2 + i * 12, h * 0.98); g.stroke();
    bg.strokeStyle = 'rgba(150,150,150,.6)'; bg.lineWidth = 2;
    bg.beginPath(); bg.moveTo(x0, h * 0.06); bg.bezierCurveTo(x1 * 0.9 + w * 0.05, h * 0.4, x1, h * 0.7, w / 2 + i * 12, h * 0.98); bg.stroke();
  }

  // papillae (raised fleshy bumps near the throat) and dark speckles
  for (let i = 0; i < 220; i++) {
    const y = h * (0.08 + Math.pow(r(), 1.4) * 0.5);
    const spread = 0.1 + (y / h) * 0.55;
    const x = w / 2 + (r() - 0.5) * w * spread;
    const papilla = y < h * 0.3 && r() < 0.55;
    const rx = papilla ? 2 + r() * 3 : 1.5 + r() * 3.5;
    const ry = rx * (1.2 + r() * 0.8);
    g.fillStyle = papilla ? `rgba(196,40,92,${0.6 + r() * 0.3})` : `rgba(${110 + r() * 40},${8 + r() * 14},${40 + r() * 20},${0.55 + r() * 0.4})`;
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
    if (papilla) {
      bg.fillStyle = 'rgba(230,230,230,.9)';
      bg.beginPath(); bg.ellipse(x, y, rx * 1.3, ry * 1.4, 0, 0, Math.PI * 2); bg.fill();
    }
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const bump = new THREE.CanvasTexture(b);
  bump.anisotropy = 8;
  return { map, bump };
}

class Petal {
  readonly mesh: THREE.Mesh;
  private readonly geo = new THREE.BufferGeometry();

  constructor(
    private az: number, private length: number, private width: number, private inner: boolean, material: THREE.Material,
    /** small per-petal differences so the flower isn't perfectly symmetric */
    private vary = { tilt: 0, curl: 1, twist: 1 },
  ) {
    const pos = new Float32Array((U + 1) * (V + 1) * 3);
    const uv = new Float32Array((U + 1) * (V + 1) * 2);
    const idx: number[] = [];
    for (let i = 0; i <= U; i++) for (let j = 0; j <= V; j++) {
      const k = i * (V + 1) + j;
      uv[k * 2] = j / V; uv[k * 2 + 1] = 1 - i / U;
      if (i < U && j < V) { const a = k, b = k + V + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    }
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.geo.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geo, material);
  }

  shape(open: number): void {
    const pos = this.geo.attributes.position as THREE.BufferAttribute;
    const o = smooth(open);
    const theta0 = lerp(0.16, (this.inner ? 0.5 : 0.6) + this.vary.tilt, o);
    const curl = lerp(-0.36, (this.inner ? 2.05 : 2.35) * this.vary.curl, o);
    const cosA = Math.cos(this.az), sinA = Math.sin(this.az);
    const steps = U * 3;
    const spine: number[][] = [];
    let r = 0.03, h = 0;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      // the bend is concentrated in the outer half, like a real recurved lily
      const th = theta0 + curl * smooth(Math.min(1, u * 1.15)) * Math.pow(u, 0.6);
      spine.push([r, h, th]);
      r += Math.sin(th) * (this.length / steps);
      h += Math.cos(th) * (this.length / steps);
    }
    for (let i = 0; i <= U; i++) {
      const u = i / U;
      const [sr, sh, th] = spine[Math.round(u * steps)];
      const nr = -Math.cos(th), nh = Math.sin(th);
      const wHalf = this.width * (0.12 * (1 - u) + Math.pow(Math.sin(Math.PI * Math.min(u * 0.96 + 0.02, 1)), 0.7)) * (1 - 0.15 * u) * lerp(0.8, 1, o);
      for (let j = 0; j <= V; j++) {
        const v = (j / V) * 2 - 1;
        const av = Math.abs(v);
        const cup = lerp(0.6, this.inner ? 0.24 : 0.16, o) * v * v * wHalf;
        const keel = -0.022 * Math.exp(-v * v * 40) * Math.sin(Math.PI * Math.min(1, u * 1.2)); // midrib groove
        const wave = (this.inner ? 0.11 : 0.07) * Math.sin(u * 26 + v * 2 + this.az * 3) * Math.pow(av, 3) * smooth(u) * wHalf * o;
        const twist = 0.14 * this.vary.twist * u * v * wHalf * o;
        const off = cup + keel + wave;
        const rr = sr + nr * off, hh = sh + nh * off;
        const side = v * wHalf;
        const k = (i * (V + 1) + j) * 3;
        pos.array[k] = rr * cosA - side * sinA;
        pos.array[k + 1] = hh + twist;
        pos.array[k + 2] = rr * sinA + side * cosA;
      }
    }
    pos.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.geo.computeBoundingSphere();
  }
}

function leafTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#2c4d27'); gr.addColorStop(1, '#4d7a43');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const side = g.createLinearGradient(0, 0, 64, 0);
  side.addColorStop(0, 'rgba(20,40,18,.5)'); side.addColorStop(0.5, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(20,40,18,.5)');
  g.fillStyle = side; g.fillRect(0, 0, 64, 256);
  g.strokeStyle = 'rgba(160,200,130,.45)'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(32, 0); g.lineTo(32, 256); g.stroke();
  g.strokeStyle = 'rgba(140,180,120,.18)'; g.lineWidth = 1;
  for (const x of [20, 26, 38, 44]) { g.beginPath(); g.moveTo(32, 0); g.quadraticCurveTo(x, 128, 32 + (x - 32) * 0.3, 256); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function leafGeometry(len: number, width: number, bend: number): THREE.BufferGeometry {
  const nu = 16, nv = 6;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
    const u = i / nu, v = (j / nv) * 2 - 1;
    const wHalf = width * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.95 + 0.05)), 0.8);
    const th = 0.5 + bend * u * u;
    const x = Math.sin(th) * u * len, y = Math.cos(th) * u * len * 0.9;
    pos.push(x + v * v * 0.012, y + Math.abs(v) * 0.01, v * wHalf);
    uv.push(j / nv, u);
    if (i < nu && j < nv) { const a = i * (nv + 1) + j, b = a + nv + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export class Lily {
  readonly group = new THREE.Group();
  readonly head = new THREE.Group();
  private readonly petals: Petal[] = [];
  private readonly stamens = new THREE.Group();
  private readonly petalMats: THREE.MeshPhysicalMaterial[] = [];
  private readonly keyLight = new THREE.DirectionalLight('#dfe6ff', 1.25);
  private readonly rimLight = new THREE.DirectionalLight('#ffd9e6', 1.0);
  private readonly fillLight = new THREE.PointLight('#ffc9a8', 0, 3, 1.5);
  private readonly halo: THREE.Sprite;
  private readonly pollen: THREE.Points;
  private readonly envRT: THREE.WebGLRenderTarget;
  private open = -1;

  constructor(renderer: THREE.WebGLRenderer) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    pmrem.dispose();
    const env = this.envRT.texture;

    const mk = (inner: boolean) => {
      const { map, bump } = petalMaps(inner);
      const m = new THREE.MeshPhysicalMaterial({
        map, bumpMap: bump, bumpScale: 1.2,
        emissiveMap: map, emissive: '#ffffff', emissiveIntensity: 0.05,
        side: THREE.DoubleSide, roughness: 0.58,
        sheen: 0.5, sheenColor: new THREE.Color('#ffc4d6'), sheenRoughness: 0.4,
        envMap: env, envMapIntensity: 0.16,
      });
      this.petalMats.push(m);
      return m;
    };
    const outerMat = mk(false), innerMat = mk(true);
    for (let i = 0; i < 6; i++) {
      const inner = i % 2 === 1;
      const jitter = [0.03, -0.05, 0.06, -0.02, -0.06, 0.04][i];
      const p = new Petal(
        (i / 6) * Math.PI * 2 + 0.2 + jitter, (inner ? 0.6 : 0.64) * (1 + jitter), inner ? 0.2 : 0.15, inner, inner ? innerMat : outerMat,
        { tilt: jitter * 1.5, curl: 1 + jitter * 2, twist: i % 3 === 0 ? -1 : 1 },
      );
      this.petals.push(p);
      this.head.add(p.mesh);
    }

    // stamens: pale green filaments, rusty anthers dusted with pollen
    const filament = new THREE.MeshPhysicalMaterial({ color: '#e4edc4', roughness: 0.5, sheen: 0.5, sheenColor: new THREE.Color('#ffffff'), envMap: env, envMapIntensity: 0.4, emissive: '#c9d79a', emissiveIntensity: 0.08 });
    const anther = new THREE.MeshStandardMaterial({ color: '#9c3d16', roughness: 0.95, envMap: env, envMapIntensity: 0.25, emissive: '#3a1004', emissiveIntensity: 0.3 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.7;
      const out = 0.21 + (i % 2) * 0.03;
      const tip = new THREE.Vector3(Math.cos(a) * out, 0.43 + (i % 3) * 0.02, Math.sin(a) * out);
      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(Math.cos(a) * 0.01, 0.0, Math.sin(a) * 0.01),
        new THREE.Vector3(Math.cos(a) * 0.02, 0.18, Math.sin(a) * 0.02),
        new THREE.Vector3(Math.cos(a) * out * 0.75, 0.32, Math.sin(a) * out * 0.75),
        tip,
      );
      const tube = new THREE.TubeGeometry(curve, 24, 1, 8);
      // taper the filament
      const p = tube.attributes.position as THREE.BufferAttribute;
      const tmp = new THREE.Vector3();
      for (let k = 0; k < p.count; k++) {
        const seg = Math.floor(k / 9) / 24;
        const center = curve.getPointAt(seg);
        tmp.fromBufferAttribute(p, k).sub(center).multiplyScalar(0.0075 * (1 - seg * 0.55)).add(center);
        p.setXYZ(k, tmp.x, tmp.y, tmp.z);
      }
      tube.computeVertexNormals();
      this.stamens.add(new THREE.Mesh(tube, filament));
      const an = new THREE.Mesh(new THREE.CapsuleGeometry(0.0085, 0.05, 6, 10), anther);
      an.position.copy(tip).add(new THREE.Vector3(0, 0.008, 0));
      an.rotation.set(0.25, -a, Math.PI / 2 - 0.15);
      this.stamens.add(an);
    }
    const pistilCurve = new THREE.CubicBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.01, 0.2, 0), new THREE.Vector3(0.05, 0.36, 0.03), new THREE.Vector3(0.07, 0.5, 0.05));
    this.stamens.add(new THREE.Mesh(new THREE.TubeGeometry(pistilCurve, 24, 0.009, 8), filament));
    const stigmaMat = new THREE.MeshPhysicalMaterial({ color: '#8a5a6e', roughness: 0.3, clearcoat: 0.8, envMap: env, envMapIntensity: 0.6 });
    for (let k = 0; k < 3; k++) {
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), stigmaMat);
      const a = (k / 3) * Math.PI * 2;
      lobe.position.set(0.07 + Math.cos(a) * 0.01, 0.505, 0.05 + Math.sin(a) * 0.01);
      this.stamens.add(lobe);
    }
    this.head.add(this.stamens);

    // stem, leaves, two closed buds
    const green = new THREE.MeshStandardMaterial({ color: '#2f5129', roughness: 0.75, envMap: env, envMapIntensity: 0.25, emissive: '#0b1809', emissiveIntensity: 0.4 });
    const stemCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -1.45, 0), new THREE.Vector3(0.04, -0.9, 0.02), new THREE.Vector3(-0.015, -0.35, 0.04), new THREE.Vector3(0, -0.03, 0)]);
    const stemGeo = new THREE.TubeGeometry(stemCurve, 48, 0.013, 10);
    this.group.add(new THREE.Mesh(stemGeo, green));
    const leafMat = new THREE.MeshStandardMaterial({ map: leafTexture(), side: THREE.DoubleSide, roughness: 0.65, envMap: env, envMapIntensity: 0.3, emissive: '#0b1a09', emissiveIntensity: 0.5 });
    const leafGeo = [leafGeometry(0.4, 0.026, 1.5), leafGeometry(0.34, 0.022, 1.9)];
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const leaf = new THREE.Mesh(leafGeo[i % 2], leafMat);
      leaf.position.copy(stemCurve.getPoint(0.18 + t * 0.55));
      leaf.rotation.set(0, i * 2.4 + 0.3, -0.15);
      leaf.scale.setScalar(1.05 - t * 0.35);
      this.group.add(leaf);
    }
    // ovary: a slim green swelling where the stem meets the petals
    const calyx = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), green);
    calyx.scale.set(1, 2.4, 1);
    calyx.position.y = -0.035;
    this.head.add(calyx);

    // lights — only lily/stem materials react to them, the field uses its own shaders
    this.keyLight.position.set(-2, 3, 3);
    this.rimLight.position.set(1, 1.5, -3);
    this.fillLight.position.set(0, 0.2, 0.9);
    this.keyLight.target = this.head; this.rimLight.target = this.head;
    this.group.add(this.keyLight, this.rimLight, this.fillLight);

    const haloTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d')!;
      const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      gr.addColorStop(0, 'rgba(255,240,232,1)'); gr.addColorStop(0.3, 'rgba(255,210,224,.35)'); gr.addColorStop(1, 'rgba(255,210,224,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    })();
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    this.halo.position.set(0, 0.25, -0.35);
    this.head.add(this.halo);

    // golden pollen motes rising from the open flower
    const n = 140;
    const pp = new Float32Array(n * 3), pd = new Float32Array(n);
    for (let i = 0; i < n; i++) { pp.set([(Math.random() - 0.5) * 0.5, Math.random(), (Math.random() - 0.5) * 0.5], i * 3); pd[i] = Math.random() * 10; }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    pg.setAttribute('aSeed', new THREE.BufferAttribute(pd, 1));
    this.pollen = new THREE.Points(pg, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uAmount: { value: 0 } },
      vertexShader: /* glsl */ `
        uniform float uTime, uAmount; attribute float aSeed; varying float vA;
        void main() {
          float t = fract(position.y + uTime * (0.05 + fract(aSeed) * 0.06));
          vec3 p = vec3(position.x * (0.4 + t * 1.6) + sin(uTime + aSeed) * 0.05, 0.3 + t * 1.3, position.z * (0.4 + t * 1.6));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vA = uAmount * sin(t * 3.14159) * (0.5 + 0.5 * sin(uTime * 3.0 + aSeed * 9.0));
          gl_PointSize = 70.0 / -mv.z;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() { float d = length(gl_PointCoord - 0.5); float a = (1.0 - smoothstep(0.0, 0.5, d)); a = a * a * vA; gl_FragColor = vec4(vec3(1.0, 0.85, 0.55) * 2.2 * a, a); }`,
    }));
    this.head.add(this.pollen);

    this.head.rotation.x = 0.5;
    this.group.add(this.head);
    this.setOpen(0);
  }

  setOpen(value: number): void {
    const v = Math.round(value * 400) / 400;
    if (v === this.open) return;
    this.open = v;
    this.petals.forEach((p) => p.shape(v));
    const s = lerp(0.3, 1, smooth(Math.min(1, v * 1.3)));
    this.stamens.scale.set(s, s, s);
  }

  /** glow: ~0 far away, ~1.5 when open, up to ~8 when the light floods the screen. */
  setGlow(glow: number, time: number): void {
    const pulse = 1 + Math.sin(time * 2.2) * 0.05 * Math.min(1, glow);
    // stays below the bloom threshold until the final flood (glow > 2)
    this.petalMats.forEach((m) => { m.emissiveIntensity = (0.04 + Math.min(glow, 2) * 0.045 + Math.max(0, glow - 2) * 0.35) * pulse; });
    this.fillLight.intensity = Math.min(glow, 2) * 0.15;
    (this.halo.material as THREE.SpriteMaterial).opacity = Math.min(1, glow * 0.14);
    const hs = 1.3 + glow * 0.9;
    this.halo.scale.set(hs, hs, 1);
    const pm = this.pollen.material as THREE.ShaderMaterial;
    pm.uniforms.uTime.value = time;
    pm.uniforms.uAmount.value = Math.min(1, Math.max(0, this.open - 0.3) * 1.6);
  }

  dispose(): void {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.MeshStandardMaterial | undefined;
      mat?.map?.dispose();
      mat?.bumpMap?.dispose();
      mat?.dispose?.();
    });
    this.envRT.dispose();
  }
}
