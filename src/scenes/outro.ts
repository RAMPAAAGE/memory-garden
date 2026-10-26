import { texts } from '../config';
import type { Mount } from '../main';

const INK = '#1f1b16', PAPER = '#f1ebdf', FAR = '#d9d0c0', CLAY = '#d97757';

/** Crumpled paper, rendered once as a background image (an inline SVG filter would re-run on every repaint). */
function paperBackground(w: number, h: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <filter id="c" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="turbulence" baseFrequency="0.0022 0.003" numOctaves="3" seed="12" result="folds"/>
    <feDiffuseLighting in="folds" surfaceScale="7" lighting-color="#f3eee4" diffuseConstant="1.0" result="light"><feDistantLight azimuth="225" elevation="64"/></feDiffuseLighting>
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="grain"/>
    <feColorMatrix in="grain" type="matrix" values="0 0 0 0 .3  0 0 0 0 .26  0 0 0 0 .2  0 0 0 .07 0" result="g2"/>
    <feComposite in="g2" in2="light" operator="over"/>
  </filter>
  <radialGradient id="e" cx="50%" cy="48%" r="75%"><stop offset="60%" stop-color="#e9dfcf" stop-opacity="0"/><stop offset="100%" stop-color="#bfae94" stop-opacity=".45"/></radialGradient>
  <rect width="100%" height="100%" filter="url(#c)"/><rect width="100%" height="100%" fill="url(#e)"/></svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}

const legPaths = (id: string, far: boolean) =>
  `<g id="${id}"><path class="o" fill="none" stroke="${INK}" stroke-width="13"/><path class="i" fill="none" stroke="${far ? FAR : PAPER}" stroke-width="7"/></g>`;

/** Ink dachshund, origin on the ground under its belly, facing +x. */
const dogSvg = `
  <g id="dog">
    <g id="body" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
      ${legPaths('legBF', true)}${legPaths('legFF', true)}
      <g id="tail"><path d="M0 0 Q-16 -8 -20 -30" fill="none" stroke-width="4"/></g>
      <path d="M-70 -50 C-60 -61 30 -61 48 -57 C66 -53 70 -31 56 -24 C30 -18 -40 -20 -58 -24 C-76 -28 -80 -44 -70 -50 Z" fill="${PAPER}"/>
      <path d="M-30 -24 q24 5 50 0" fill="none" stroke-width="2" opacity=".45"/>
      ${legPaths('legBN', false)}${legPaths('legFN', false)}
      <g id="head">
        <path d="M-8 6 C-6 -14 2 -36 22 -38 C34 -39 40 -32 44 -24 L58 -16 C64 -12 62 -6 56 -5 L36 -4 C26 4 8 10 -8 6 Z" fill="${PAPER}"/>
        <circle cx="58" cy="-12" r="4.6" fill="${INK}"/>
        <path d="M20 -27 q4 -5 8 0" fill="none" stroke-width="2.8"/>
        <ellipse cx="22" cy="-16" rx="5" ry="3" fill="${CLAY}" opacity=".35" stroke="none"/>
        <path d="M50 -5 q-6 4 -12 1" fill="none" stroke-width="2.4"/>
        <g id="tongue"><path d="M0 0 q1 12 8 10 q5 -3 0 -11 Z" fill="${CLAY}" stroke-width="2.2"/></g>
        <g id="ear"><path d="M0 0 q-15 4 -15 26 q2 10 10 6 q9 -10 5 -32 Z" fill="${INK}"/></g>
        <path d="M-6 -2 q8 8 18 6" fill="none" stroke="${CLAY}" stroke-width="5"/>
      </g>
    </g>
  </g>`;

export const mountOutro: Mount = ({ root, music, go }) => {
  music.playFinale();
  const t = texts.outro;
  const words = t.title.replace('?', '').split(' ');
  const last = words.pop();
  root.innerHTML = `
    <div class="outro">
      <div class="outro__inner">
        <h1 class="outro__title">${words.join(' ')} <em>${last}</em>?</h1>
        <div class="outro__track">
          <svg class="outro__stage" xmlns="http://www.w3.org/2000/svg">
            <filter id="boil" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="1" seed="1">
              <animate attributeName="seed" values="1;4;7;2" dur="0.45s" calcMode="discrete" repeatCount="indefinite"/></feTurbulence>
              <feDisplacementMap in="SourceGraphic" scale="2"/></filter>
            <path id="ground" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
            <path id="tufts" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity=".55"/>
            <g filter="url(#boil)">${dogSvg}</g>
          </svg>
          <button class="outro__repeat" type="button"><span>${t.repeat}</span></button>
        </div>
      </div>
      <button class="outro__exit" type="button">${t.exit}</button>
      <div class="outro__flash"></div>
      <div class="outro__bye">${t.bye}</div>
    </div>`;

  const outro = root.querySelector<HTMLElement>('.outro')!;
  outro.style.backgroundImage = paperBackground(Math.ceil(innerWidth), Math.ceil(innerHeight));
  const track = root.querySelector<HTMLElement>('.outro__track')!;
  const stage = root.querySelector<SVGSVGElement>('.outro__stage')!;
  const $ = (id: string) => stage.querySelector(`#${id}`)!;
  const ground = $('ground'), tufts = $('tufts');
  const dog = $('dog'), body = $('body'), head = $('head'), ear = $('ear'), tail = $('tail'), tongue = $('tongue');
  const legs = {
    BN: $('legBN').querySelectorAll('path'), BF: $('legBF').querySelectorAll('path'),
    FN: $('legFN').querySelectorAll('path'), FF: $('legFF').querySelectorAll('path'),
  };
  const button = root.querySelector<HTMLButtonElement>('.outro__repeat')!;
  const flash = root.querySelector<HTMLElement>('.outro__flash')!;

  let W = 800, H = 260, baseY = 190, scale = 1;
  const layout = () => {
    W = track.clientWidth; H = track.clientHeight;
    baseY = H - 70;
    scale = Math.min(1.15, W / 720);
    stage.setAttribute('viewBox', `0 0 ${W} ${H}`);
  };
  layout();
  window.addEventListener('resize', layout);

  // rolling hills that never repeat exactly, centred on baseY
  let scroll = 0;
  const hill = (x: number, time: number) => {
    const p = x + scroll;
    const a = 20 * scale;
    return baseY + a * (0.55 * Math.sin(p * 0.0105) + 0.3 * (0.7 + 0.3 * Math.sin(time * 0.13)) * Math.sin(p * 0.023 + 1.7) + 0.15 * Math.sin(p * 0.047 + 0.4));
  };
  const slope = (x: number, time: number) => Math.atan2(hill(x + 6, time) - hill(x - 6, time), 12) * (180 / Math.PI);

  const legPath = (hx: number, hy: number, a: number, k: number) => {
    // short, sturdy dachshund legs: thigh, shin and a little forward-pointing paw
    const r = Math.PI / 180, L1 = 12, L2 = 11;
    const kx = hx + Math.sin(a * r) * L1, ky = hy + Math.cos(a * r) * L1;
    const b = (a + k) * r;
    const px = kx + Math.sin(b) * L2, py = ky + Math.cos(b) * L2;
    return `M${hx} ${hy} L${kx.toFixed(1)} ${ky.toFixed(1)} L${px.toFixed(1)} ${py.toFixed(1)} l6 0.5`;
  };
  const setLeg = (paths: NodeListOf<SVGPathElement>, d: string) => paths.forEach((p) => p.setAttribute('d', d));
  const rot = (el: Element, deg: number, x: number, y: number) => el.setAttribute('transform', `translate(${x} ${y}) rotate(${deg.toFixed(2)})`);

  const spawnHeart = (x: number, y: number) => {
    const h = document.createElement('span');
    h.className = 'ink-heart';
    h.textContent = '♥';
    h.style.left = `${x}px`; h.style.top = `${y}px`;
    h.style.setProperty('--dx', `${(Math.random() - 0.5) * 50}px`);
    track.appendChild(h);
    setTimeout(() => h.remove(), 1600);
  };

  type Mode = 'run' | 'catch' | 'lick' | 'glow';
  let mode: Mode = 'run';
  let modeAt = 0;
  let dogX = -140; // runs in from the left
  let prevNow = performance.now();
  let speed = 1;
  let phase = 0;
  let jumpAt = -10, nextJump = 2.5, hearted = true;
  const start = performance.now();
  let raf = 0;

  const jump = (time: number) => {
    if (mode !== 'run' || time - jumpAt < 0.9) return;
    jumpAt = time; hearted = false;
    nextJump = time + 3 + Math.random() * 2.5;
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const time = (now - start) / 1000;
    const dt = Math.min(0.05, (now - prevNow) / 1000);
    prevNow = now;
    const k = dt * 60; // frame-rate independent easing
    const btnX = W * 0.68;

    // where the dog wants to be
    const runX = W * 0.3 + Math.sin(time * 0.7) * W * 0.05;
    const catchX = btnX - button.offsetWidth / 2 - 104 * scale; // nose just touches the button
    let targetX = runX;
    if (mode === 'catch' || mode === 'lick' || mode === 'glow') targetX = catchX;
    dogX += (targetX - dogX) * Math.min(1, (mode === 'catch' ? 0.07 : 0.04) * k);

    const stopped = mode === 'lick' || mode === 'glow';
    speed += ((stopped ? 0 : mode === 'catch' ? 1.6 : 1) - speed) * Math.min(1, 0.08 * k);
    scroll += 150 * speed * dt;
    phase += Math.PI * 2 * 3.1 * speed * dt;

    if (mode === 'run' && time > nextJump) jump(time);
    if (mode === 'catch' && Math.abs(dogX - catchX) < 4) { mode = 'lick'; modeAt = time; }
    if (mode === 'lick' && time - modeAt > 1.5) {
      mode = 'glow'; modeAt = time;
      button.classList.add('is-glowing');
      const r = button.getBoundingClientRect();
      flash.style.setProperty('--x', `${r.left + r.width / 2}px`);
      flash.style.setProperty('--y', `${r.top + r.height / 2}px`);
      flash.classList.add('on');
      setTimeout(() => go('intro'), 1100);
    }

    // ground + tufts
    let d = '';
    for (let x = -10; x <= W + 10; x += 8) d += `${x === -10 ? 'M' : 'L'}${x} ${hill(x, time).toFixed(1)}`;
    ground.setAttribute('d', d);
    let tu = '';
    for (let k = Math.floor(scroll / 70); k * 70 - scroll < W + 70; k++) {
      const x = k * 70 - scroll + ((k * 37) % 23);
      const y = hill(x, time);
      tu += `M${x.toFixed(1)} ${(y + 7).toFixed(1)} l-4 8 M${(x + 7).toFixed(1)} ${(y + 6).toFixed(1)} l-3 9`;
    }
    tufts.setAttribute('d', tu);

    // dog pose
    const ju = (time - jumpAt) / 0.7;
    const jumping = ju >= 0 && ju <= 1 && mode === 'run';
    const air = jumping ? 4 * ju * (1 - ju) : 0;
    if (!hearted && ju > 1) {
      hearted = true;
      for (let k = 0; k < 3; k++) setTimeout(() => spawnHeart(dogX + 60 * scale, hill(dogX, time) - 110 * scale), k * 140);
    }
    const g = stopped ? 0 : 1 - (jumping ? 1 : 0);
    const bob = -Math.abs(Math.sin(phase)) * 5 * g - air * 38;
    const pitch = jumping ? -12 + ju * 24 : Math.sin(phase) * 2.5 * g;
    dog.setAttribute('transform', `translate(${dogX.toFixed(1)} ${hill(dogX, time).toFixed(1)}) rotate(${slope(dogX, time).toFixed(2)}) scale(${scale})`);
    body.setAttribute('transform', `translate(0 ${bob.toFixed(1)}) rotate(${pitch.toFixed(2)} 0 -30)`);

    const s = Math.sin(phase), c = Math.cos(phase);
    const sF = Math.sin(phase + Math.PI), cF = Math.cos(phase + Math.PI);
    if (jumping) {
      setLeg(legs.BN, legPath(-52, -26, 58, -15)); setLeg(legs.BF, legPath(-42, -27, 50, -10));
      setLeg(legs.FN, legPath(40, -26, -60, -25)); setLeg(legs.FF, legPath(30, -27, -52, -20));
    } else {
      const A = 30 * g;
      setLeg(legs.BN, legPath(-52, -26, 8 + A * s, -42 * Math.max(0, c) * g));
      setLeg(legs.BF, legPath(-42, -27, 8 + A * Math.sin(phase + 0.5), -42 * Math.max(0, Math.cos(phase + 0.5)) * g));
      setLeg(legs.FN, legPath(40, -26, -4 + A * sF, -50 * Math.max(0, cF) * g));
      setLeg(legs.FF, legPath(30, -27, -4 + A * Math.sin(phase + Math.PI + 0.5), -50 * Math.max(0, Math.cos(phase + Math.PI + 0.5)) * g));
    }
    rot(tail, Math.sin(time * Math.PI * 2 * (stopped ? 7 : 5.5)) * 22 - 12, -72, -46);

    // head, ear, tongue — licking bends the head toward the button
    const lickT = mode === 'lick' ? time - modeAt : 0;
    const licking = mode === 'lick' ? Math.max(0, Math.sin(lickT * Math.PI * 2 * 2)) : 0;
    const headRot = jumping ? -10 + ju * 14 : stopped ? 10 + licking * 8 : Math.sin(phase + 0.6) * 4;
    rot(head, headRot, 50, -52);
    rot(ear, jumping ? -50 + ju * 30 : stopped ? 6 + Math.sin(time * 6) * 4 : 8 + Math.sin(phase - 0.8) * 22, 16, -34);
    tongue.setAttribute('transform', `translate(42 -6) rotate(${(-20 * licking + Math.sin(phase * 0.5) * 10 * g).toFixed(1)}) scale(1 ${(1 + licking * 1.2).toFixed(2)})`);
    if (mode === 'lick') {
      button.style.scale = `${1 - licking * 0.04} ${1 + licking * 0.05}`;
      if (licking > 0.98 && !button.dataset.licked) { button.dataset.licked = '1'; spawnHeart(btnX - 10, hill(btnX, time) - 90); }
      if (licking < 0.5) delete button.dataset.licked;
    }

    // the button rides the hills
    const bw = button.offsetWidth, bh = button.offsetHeight;
    button.style.transform = `translate(${(btnX - bw / 2).toFixed(1)}px, ${(hill(btnX, time) - bh + 2).toFixed(1)}px) rotate(${slope(btnX, time).toFixed(2)}deg)`;
  };
  raf = requestAnimationFrame(frame);

  // hovering or tapping the dog makes it hop
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    const x = e.clientX - r.left;
    if (Math.abs(x - dogX) < 90 * scale) jump((performance.now() - start) / 1000);
  });

  let busy = false;
  button.addEventListener('click', () => {
    if (busy) return;
    busy = true;
    mode = 'catch';
    button.classList.add('is-caught');
  });
  // a web page can't close itself (iPad/phone) — the exit button only makes sense in the desktop app
  const exit = root.querySelector<HTMLButtonElement>('.outro__exit')!;
  if (!/Electron/.test(navigator.userAgent)) exit.hidden = true;
  exit.addEventListener('click', () => {
    if (busy) return;
    busy = true;
    root.querySelector('.outro__bye')!.classList.add('on');
    window.setTimeout(() => window.close(), 1800);
  });
  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', layout); };
};
