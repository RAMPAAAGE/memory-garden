import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { texts } from '../config';
import { GardenWorld, HORIZON, FOG_DENSITY, BEND_Z } from '../garden/world';
import { Lily } from '../garden/lily';
import { createSoftPass } from '../garden/softPass';
import { formatDate, loadMemories, type Memory } from '../memories';
import type { Mount } from '../main';

// ─── Layout of the walk ─────────────────────────────────────────────────────
const SPACING = 12;      // distance between memories
const FIRST = 14;        // first memory distance from the start
const VIEW = 4.9;        // camera stops this far in front of a memory
const SIDE_X = 1.6;
const CAM_Y = 1.55;
const TRAVEL = 0.52;     // share of a segment spent walking; the rest is the pause with text
const LILY_LEN = 2.4;    // scroll length of the finale
const PX_PER_SEGMENT = 950;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smoothstep = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

interface Card {
  index: number;
  group: THREE.Group;
  photo: THREE.Mesh;
  glow: THREE.Mesh;
  texture: THREE.Texture | null;
  video?: HTMLVideoElement;
  disposed: boolean;
  hover: number;
  fades: [THREE.MeshBasicMaterial, number][];
}

export const mountGarden: Mount = ({ root, music, go }) => {
  const memories = loadMemories();
  const N = memories.length;
  const memZ = (i: number) => -(FIRST + i * SPACING);
  const viewZ = (i: number) => memZ(i) + VIEW;
  const lilyZ = memZ(Math.max(0, N - 1)) - SPACING * 1.5;
  const lilyStart = 1 + N;
  const total = lilyStart + LILY_LEN;

  root.innerHTML = `
    <div class="garden">
      <div class="garden__opening"><h2>${texts.garden.opening}</h2><p>${texts.garden.openingSub}</p></div>
      <div class="caption"><div class="caption__date"></div><div class="caption__title"></div><div class="caption__text"></div><button class="caption__sound" type="button" hidden></button></div>
      <div class="garden__progress"><i></i></div>
      <div class="garden__hint">${texts.garden.hint}<i></i></div>
      <div class="garden__vignette"></div>
      <div class="garden__grain"></div>
      <div class="garden__white"></div>
      <div class="lightbox"><figure class="lightbox__figure"></figure><p class="lightbox__caption"></p></div>
      <div class="garden__veil"></div>
    </div>`;
  const host = root.querySelector<HTMLElement>('.garden')!;
  const $ = <T extends HTMLElement>(s: string) => host.querySelector<T>(s)!;
  const opening = $('.garden__opening'), hint = $('.garden__hint'), white = $('.garden__white'), veil = $('.garden__veil');
  const progressBar = $('.garden__progress i');
  const caption = $('.caption'), capDate = $('.caption__date'), capTitle = $('.caption__title'), capText = $('.caption__text');
  const soundBtn = $<HTMLButtonElement>('.caption__sound');
  const lightbox = $('.lightbox'), lightFigure = $('.lightbox__figure'), lightCaption = $('.lightbox__caption');

  // ─── Three.js setup ───────────────────────────────────────────────────────
  // The canvas itself needs no antialiasing: the composer renders into a 4× MSAA target.
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  const maxPr = Math.min(window.devicePixelRatio, 1.5);
  let pr = maxPr;
  renderer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.NoToneMapping;
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(HORIZON.clone(), FOG_DENSITY);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 420);
  camera.position.set(0, CAM_Y, 6);

  const world = new GardenWorld();
  scene.add(world.group);
  scene.add(new THREE.HemisphereLight('#9fb8c8', '#0b1a10', 0.35));
  const moon = new THREE.DirectionalLight('#cfdcff', 0.5);
  moon.position.set(-3, 6, 4);
  scene.add(moon);

  const lily = new Lily(renderer);
  lily.group.position.set(0, 1.42, lilyZ);
  scene.add(lily.group);

  // Older integrated GPUs may lack float render targets — fall back to 8-bit instead of a black screen.
  const hdr = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
  const rt = new THREE.WebGLRenderTarget(innerWidth * pr, innerHeight * pr, { type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(pr);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.75, 0.9, 1.0);
  composer.addPass(bloom);
  const soft = createSoftPass();
  composer.addPass(soft);
  composer.addPass(new OutputPass());
  const syncSoft = () => {
    soft.uniforms.uResolution.value.set(innerWidth * pr, innerHeight * pr);
    soft.uniforms.uBlur.value = 10 * pr;
  };
  syncSoft();

  const setPixelRatio = (v: number) => {
    pr = v;
    renderer.setPixelRatio(v);
    composer.setPixelRatio(v);
    composer.setSize(innerWidth, innerHeight);
    syncSoft();
  };

  // ─── Memory cards ─────────────────────────────────────────────────────────
  // ImageBitmapLoader decodes photos off the main thread, so new cards don't stutter the walk.
  // Safari ignores ImageBitmap options (photos would come out upside down) — use plain images there.
  const isSafari = /^((?!chrome|android|electron).)*safari/i.test(navigator.userAgent);
  const bitmapLoader = new THREE.ImageBitmapLoader().setOptions({ imageOrientation: 'flipY' });
  const imageLoader = new THREE.TextureLoader();
  const loadTexture = (url: string, done: (t: THREE.Texture) => void) => {
    if (isSafari) { imageLoader.load(url, done); return; }
    bitmapLoader.load(url, (bitmap) => {
      const tex = new THREE.Texture(bitmap as unknown as HTMLImageElement);
      tex.flipY = false;
      tex.needsUpdate = true;
      tex.addEventListener('dispose', () => (bitmap as ImageBitmap).close?.());
      done(tex);
    });
  };
  const cards = new Map<number, Card>();
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,233,190,.5)'); gr.addColorStop(1, 'rgba(255,233,190,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();

  const sideOf = (i: number) => (i % 2 === 0 ? -1 : 1);
  // On a tall screen (iPad/phone held upright) memories sit closer to the middle, above the caption.
  let portrait = false, sideX = SIDE_X, halfWidth = 3;
  const fitLayout = () => {
    portrait = innerWidth < innerHeight;
    halfWidth = VIEW * Math.tan(THREE.MathUtils.degToRad(25)) * (innerWidth / innerHeight);
    sideX = portrait ? halfWidth * 0.42 : Math.min(SIDE_X, halfWidth * 0.45);
  };
  fitLayout();

  function makeCard(i: number): Card {
    const m = memories[i];
    const aspect = m.width / m.height;
    let h = 1.75, w = h * aspect;
    if (w > 2.5) { w = 2.5; h = w / aspect; }
    const group = new THREE.Group();
    const side = sideOf(i);
    const rnd = Math.sin(i * 91.7) * 0.5 + 0.5;
    group.position.set(side * SIDE_X, CAM_Y - 0.05 + (rnd - 0.5) * 0.2, memZ(i));
    group.userData.baseY = group.position.y;
    group.userData.width = w + 0.12;
    group.rotation.set(0, -side * 0.3, side * (rnd - 0.5) * 0.06);

    const glowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35 });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.9, h * 1.7), glowMat);
    glow.position.z = -0.03;
    const border = 0.06;
    const frameMat = new THREE.MeshBasicMaterial({ color: '#efe6d8', toneMapped: false, transparent: true });
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(w + border * 2, h + border * 2 + 0.16), frameMat);
    frame.position.set(0, -0.08, -0.005);
    const photoMat = new THREE.MeshBasicMaterial({ color: '#22302a', toneMapped: false, transparent: true });
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(w, h), photoMat);
    photo.userData.index = i;
    group.add(glow, frame, photo);
    scene.add(group);

    const card: Card = { index: i, group, photo, glow, texture: null, disposed: false, hover: 0, fades: [[glowMat, 0.35], [frameMat, 1], [photoMat, 1]] };
    const setTexture = (tex: THREE.Texture) => {
      if (card.disposed) { tex.dispose(); return; }
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      card.texture?.dispose();
      card.texture = tex;
      photoMat.map = tex;
      photoMat.color.set('#ffffff');
      photoMat.needsUpdate = true;
    };
    if (m.type === 'video') {
      // the poster always shows until the video is actually playing (not merely loaded)
      loadTexture(m.poster!, (t) => { if (card.texture instanceof THREE.VideoTexture) t.dispose(); else setTexture(t); });
      const video = document.createElement('video');
      video.src = m.src;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.addEventListener('playing', () => { if (!(card.texture instanceof THREE.VideoTexture)) setTexture(new THREE.VideoTexture(video)); }, { once: true });
      card.video = video;
    } else {
      loadTexture(m.src, setTexture);
    }
    return card;
  }

  function disposeCard(card: Card): void {
    card.disposed = true;
    if (card.video) { card.video.pause(); card.video.removeAttribute('src'); card.video.load(); }
    card.texture?.dispose();
    card.group.traverse((o) => { const mesh = o as THREE.Mesh; mesh.geometry?.dispose(); (mesh.material as THREE.Material)?.dispose?.(); });
    scene.remove(card.group);
  }

  function syncCards(s: number): void {
    const cur = Math.floor(s - 1);
    for (let i = Math.max(0, cur - 1); i <= Math.min(N - 1, cur + 3); i++) if (!cards.has(i)) cards.set(i, makeCard(i));
    for (const [i, card] of cards) if (i < cur - 1 || i > cur + 3) { disposeCard(card); cards.delete(i); }
  }

  // ─── Lightbox: click a memory to see it big ───────────────────────────────
  let lightboxOpen = false;
  function openLightbox(i: number): void {
    const m = memories[i];
    lightFigure.replaceChildren();
    if (m.type === 'video') {
      const v = document.createElement('video');
      v.src = m.src; v.autoplay = true; v.loop = true; v.playsInline = true; v.controls = false;
      lightFigure.appendChild(v);
      music.setDuck(0.1);
      cards.get(i)?.video?.pause();
    } else {
      const img = document.createElement('img');
      img.src = m.src;
      lightFigure.appendChild(img);
    }
    lightCaption.textContent = [m.title, m.text].filter(Boolean).join(' — ') || formatDate(m.date);
    lightbox.classList.add('is-open');
    lightboxOpen = true;
  }
  function closeLightbox(): void {
    if (!lightboxOpen) return;
    lightboxOpen = false;
    lightbox.classList.remove('is-open');
    const v = lightFigure.querySelector('video');
    if (v) { v.pause(); music.setDuck(soundVideo ? 0.12 : 1); }
    setTimeout(() => { if (!lightboxOpen) lightFigure.replaceChildren(); }, 400);
  }
  lightbox.addEventListener('click', closeLightbox);

  // ─── Pointer: hover cards, part the flowers, gentle parallax ──────────────
  const pointer = new THREE.Vector2(0, 0);
  const parallax = new THREE.Vector2(0, 0);
  let pointerActive = 0;
  let hovered: Card | null = null;
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.25);
  const groundHit = new THREE.Vector3();
  const onPointerMove = (e: PointerEvent) => {
    pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    pointerActive = performance.now();
  };
  const onClick = (e: MouseEvent) => {
    if (lightboxOpen || (e.target as HTMLElement).closest('button')) return;
    // a tap on a touch screen has no hover beforehand, so test the card under the finger right now
    raycaster.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
    const photos = [...cards.values()].filter((c) => c.group.visible).map((c) => c.photo);
    const hit = raycaster.intersectObjects(photos, false)[0];
    if (hit) openLightbox(hit.object.userData.index as number);
  };
  const onPointerDown = (e: PointerEvent) => { if (e.pointerType !== 'mouse') onPointerMove(e); };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerdown', onPointerDown);
  host.addEventListener('click', onClick);

  // ─── Scroll input ─────────────────────────────────────────────────────────
  // ?jump=<segment> (negative = from the end) is a testing shortcut.
  const jump = Number(new URLSearchParams(location.search).get('jump') ?? 0);
  let target = clamp(jump < 0 ? total + jump : jump, 0, total);
  let current = target;
  let autopilot = false;
  const setTarget = (v: number) => { if (!autopilot && !lightboxOpen) target = clamp(v, 0, total); };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const px = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
    setTarget(target + px / PX_PER_SEGMENT);
  };
  let touchY: number | null = null;
  const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY; };
  const onTouchMove = (e: TouchEvent) => {
    if (touchY === null) return;
    const y = e.touches[0].clientY;
    setTarget(target + ((touchY - y) / innerHeight) * 1.1);
    touchY = y;
  };
  const onTouchEnd = () => { touchY = null; };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { closeLightbox(); return; }
    if ((e.target as HTMLElement).closest?.('button')) return;
    if (['ArrowDown', 'PageDown', ' ', 'ArrowRight'].includes(e.key)) { e.preventDefault(); setTarget(Math.floor(target + 0.02) + 1); }
    if (['ArrowUp', 'PageUp', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); setTarget(Math.ceil(target - 0.02) - 1); }
  };
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('touchend', onTouchEnd);
  window.addEventListener('keydown', onKey);

  // ─── Captions ─────────────────────────────────────────────────────────────
  let captionIndex = -1;
  let words: HTMLSpanElement[] = [];
  let soundVideo: HTMLVideoElement | null = null;

  const muteSound = () => {
    if (soundVideo) soundVideo.muted = true;
    soundVideo = null;
    soundBtn.textContent = texts.garden.soundOn;
    if (!lightboxOpen) music.setDuck(1);
  };
  soundBtn.addEventListener('click', () => {
    const video = cards.get(captionIndex)?.video;
    if (!video) return;
    if (soundVideo === video) { muteSound(); return; }
    muteSound();
    video.muted = false;
    video.currentTime = 0;
    void video.play().catch(() => {});
    soundVideo = video;
    soundBtn.textContent = texts.garden.soundOff;
    music.setDuck(0.12);
  });

  function showCaption(i: number): void {
    if (i === captionIndex) return;
    captionIndex = i;
    muteSound();
    if (i < 0) return;
    const m: Memory = memories[i];
    caption.classList.toggle('is-left', sideOf(i) > 0);
    caption.classList.toggle('is-right', sideOf(i) < 0);
    capDate.textContent = formatDate(m.date);
    capTitle.textContent = m.title;
    capTitle.hidden = !m.title;
    capText.replaceChildren();
    words = m.text.split(/\s+/).filter(Boolean).map((w) => {
      const span = document.createElement('span');
      span.textContent = `${w} `;
      capText.appendChild(span);
      return span;
    });
    soundBtn.hidden = m.type !== 'video';
    soundBtn.textContent = texts.garden.soundOn;
  }

  // ─── Frame loop ───────────────────────────────────────────────────────────
  function cameraZ(s: number): number {
    if (s < 1) return 6 - 6 * ease(clamp(s));
    const i = Math.min(Math.floor(s - 1), N);
    const u = s - 1 - i;
    if (i >= N) {
      const from = viewZ(N - 1) - 0.5;
      const t = clamp((s - lilyStart) / (LILY_LEN * 0.55));
      return from + (lilyZ + 2.1 - from) * ease(t);
    }
    const from = i === 0 ? 0 : viewZ(i - 1) - 0.5;
    if (u < TRAVEL) return from + (viewZ(i) - from) * ease(u / TRAVEL);
    // the pause keeps drifting forward a little, starting and ending at zero speed (no jolts)
    return viewZ(i) - 0.5 * smoothstep(TRAVEL, 1, u);
  }

  // Dynamic resolution: keep ~50+ fps by trading a little sharpness, never by removing flowers
  // unless the computer is really struggling at the lowest resolution.
  const perf = { sum: 0, frames: 0, good: 0, thinned: false };
  function adaptQuality(rawDt: number, time: number): void {
    if (time < 1.2 || lightboxOpen) return;
    perf.sum += rawDt; perf.frames++;
    if (perf.frames < 45) return;
    const fps = perf.frames / perf.sum;
    perf.sum = 0; perf.frames = 0;
    if (fps < 46 && pr > 0.75) { setPixelRatio(Math.max(0.75, pr - 0.15)); perf.good = 0; }
    else if (fps < 28 && !perf.thinned) { world.setQuality(0.7); perf.thinned = true; }
    else if (fps > 58 && pr < maxPr && ++perf.good >= 3) { setPixelRatio(Math.min(maxPr, pr + 0.1)); perf.good = 0; }
  }

  const clock = new THREE.Clock();
  const debug = location.search.includes('debug');
  let raf = 0;
  let finished = false;
  let firstFrame = true;
  let camZ = 0;
  const fogColor = new THREE.Color();
  const lilyFog = new THREE.Color('#201e1d');
  const photos: THREE.Object3D[] = [];

  function frame(): void {
    raf = requestAnimationFrame(frame);
    const rawDt = clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    const time = clock.elapsedTime;
    if (debug && Math.floor(time / 2) !== Math.floor((time - rawDt) / 2)) console.warn(`fps ${(1 / rawDt).toFixed(0)} pr ${pr.toFixed(2)}`);
    adaptQuality(rawDt, time);

    if (!autopilot && target > lilyStart + 0.35) autopilot = true;
    if (autopilot) target = Math.min(total, Math.max(target, current) + dt * 0.24);
    current += (target - current) * (1 - Math.exp(-dt * (autopilot ? 2.0 : 2.4)));
    if (Math.abs(target - current) < 1e-4) current = target;
    const s = current;

    // camera with a soft parallax that follows the mouse
    const active = performance.now() - pointerActive < 2500;
    parallax.lerp(active ? pointer : new THREE.Vector2(0, 0), 1 - Math.exp(-dt * 2.5));
    // a second, softer follow on the camera itself gives the inertia of a glide
    camZ = firstFrame ? cameraZ(s) : camZ + (cameraZ(s) - camZ) * (1 - Math.exp(-dt * 4));
    const z = camZ;
    const sway = Math.sin(time * 0.35) * 0.04 + parallax.x * 0.16;
    camera.position.set(sway, CAM_Y + Math.sin(time * 0.5) * 0.025 + parallax.y * 0.07, z);
    const lookY = s >= lilyStart ? CAM_Y - 0.12 - smoothstep(lilyStart, lilyStart + 1.2, s) * 0.06 : CAM_Y - 0.12;
    camera.lookAt(sway * 0.5 + parallax.x * 0.35, lookY + parallax.y * 0.12, z - 10);
    camera.updateMatrixWorld();

    syncCards(s);

    // hover
    raycaster.setFromCamera(pointer, camera);
    photos.length = 0;
    for (const card of cards.values()) if (card.group.visible) photos.push(card.photo);
    const hit = active && !lightboxOpen ? raycaster.intersectObjects(photos, false)[0] : undefined;
    hovered = hit ? cards.get(hit.object.userData.index as number) ?? null : null;
    host.style.cursor = hovered ? 'pointer' : '';
    world.setCursor(active && !lightboxOpen && raycaster.ray.intersectPlane(groundPlane, groundHit) && groundHit.z < z ? groundHit : null);

    for (const card of cards.values()) {
      // far memories wait inside the fog, small; they grow and sharpen as we come closer
      const dist = z - memZ(card.index);
      // float gently and follow the bowl-shaped field down into the distance
      card.group.position.y = card.group.userData.baseY + Math.sin(time * 0.8 + card.index) * 0.03 - BEND_Z * Math.max(0, dist) ** 2 + (portrait ? 0.32 : 0);
      card.group.position.x = sideOf(card.index) * sideX;
      const fade = 1 - smoothstep(24, 34, dist);
      const grow = 0.62 + 0.38 * (1 - smoothstep(6, 28, dist));
      card.hover += ((card === hovered ? 1 : 0) - card.hover) * (1 - Math.exp(-dt * 8));
      // upright screens: keep the whole photo on screen, beside the path
      const fit = portrait ? Math.min(1, (halfWidth * 0.7) / card.group.userData.width) : 1;
      card.group.scale.setScalar(grow * fit * (1 + card.hover * 0.06));
      card.glow.scale.setScalar(1 + card.hover * 0.12);
      card.group.visible = fade > 0.001;
      card.fades.forEach(([mat, base], k) => { mat.opacity = base * fade * (k === 0 ? 1 + card.hover * 0.7 : 1); });
      if (card.video) {
        const local = s - 1 - card.index;
        const near = local > -0.6 && local < 1.35 && !lightboxOpen;
        if (near && card.video.paused) void card.video.play().catch(() => {});
        if (!near && !card.video.paused) card.video.pause();
      }
    }

    // captions: fade in during the pause, out when walking on
    let best = -1, bestOp = 0;
    for (const i of [Math.floor(s - 1), Math.floor(s - 1) - 1]) {
      if (i < 0 || i >= N) continue;
      const local = s - 1 - i;
      const op = smoothstep(TRAVEL - 0.04, TRAVEL + 0.1, local) * (1 - smoothstep(1.02, 1.2, local));
      if (op > bestOp) { bestOp = op; best = i; }
    }
    if (bestOp > 0.01) {
      showCaption(best);
      caption.style.opacity = String(bestOp);
      caption.style.visibility = 'visible';
      const local = s - 1 - best;
      const reveal = smoothstep(TRAVEL + 0.04, 0.92, local);
      const n = Math.ceil(reveal * words.length);
      words.forEach((w, k) => w.classList.toggle('on', k < n));
      caption.style.transform = `translateY(${(1 - bestOp) * 14}px)`;
    } else {
      caption.style.opacity = '0';
      caption.style.visibility = 'hidden';
      if (captionIndex !== -1) showCaption(-1);
    }

    opening.style.opacity = String(1 - smoothstep(0.05, 0.55, s));
    opening.style.transform = `scale(${1 + s * 0.08})`;
    hint.style.opacity = String(0.7 * (1 - smoothstep(0.02, 0.3, s)));
    progressBar.style.height = `${(s / total) * 100}%`;

    // finale: the lily glows as we approach, opens, then floods the screen with light
    const f = clamp((s - lilyStart) / LILY_LEN);
    const approach = smoothstep(SPACING * 2.4, 2.2, z - lilyZ);
    const opened = smoothstep(0.36, 0.8, f);
    lily.group.position.y = 1.42 - BEND_Z * Math.max(0, z - lilyZ) ** 2;
    lily.setOpen(opened);
    lily.head.rotation.y = Math.sin(time * 0.3) * 0.08 + parallax.x * 0.12 * opened;
    const flood = smoothstep(0.84, 1, f);
    lily.setGlow(approach * 0.6 + opened * 0.9 + flood * 7, time);
    world.setGlow(lily.group.position, approach * 0.15 + opened * 0.35 + flood * 3);
    bloom.strength = 0.72 + opened * 0.25 + flood * 2.5;
    bloom.radius = 0.9;
    fogColor.copy(HORIZON).lerp(lilyFog, opened);
    world.setFog(fogColor, FOG_DENSITY * (1 - approach * 0.25));
    (scene.fog as THREE.FogExp2).color.copy(fogColor);
    white.style.opacity = String(smoothstep(0.9, 0.99, f));

    world.update(time, z, renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
    composer.render();

    if (firstFrame) { firstFrame = false; requestAnimationFrame(() => veil.classList.add('is-gone')); }
    if (!finished && f >= 0.995) { finished = true; go('love'); }
  }

  // Compile every shader up front so the lily and flowers never hitch when they first appear.
  renderer.compile(scene, camera);
  frame();

  const onResize = () => {
    fitLayout();
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    syncSoft();
  };
  window.addEventListener('resize', onResize);

  return () => {
    cancelAnimationFrame(raf);
    muteSound();
    closeLightbox();
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    for (const card of cards.values()) disposeCard(card);
    cards.clear();
    world.dispose();
    lily.dispose();
    shadowTex.dispose();
    composer.dispose();
    rt.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };
};
