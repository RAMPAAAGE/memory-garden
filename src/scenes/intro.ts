import { bone, dachshund, dogPalettes, minion, pawBadge, pawPrint, peekingDog, pixelHeart, pups } from '../art';
import { texts } from '../config';
import type { Mount } from '../main';

// Optional extra stickers: drop PNG/WebP files into src/stickers/ and they appear automatically.
const userStickers = Object.values(
  import.meta.glob('../stickers/*.{png,webp,svg,gif}', { eager: true, query: '?url', import: 'default' }),
) as string[];

const HEART = [
  '..XXX.XXX..',
  '.XXXXXXXXX.',
  'XXXXXXXXXXX',
  'XXXXXXXXXXX',
  'XXXXXXXXXXX',
  '.XXXXXXXXX.',
  '..XXXXXXX..',
  '...XXXXX...',
  '....XXX....',
  '.....X.....',
];

export const GARDEN_NIGHT = '#0d1915';

/** p = [x, y, size] used instead on upright screens (iPad/phone), so nothing hides behind the card. */
type Deco = { html: string; x: number; y: number; size: number; rot?: number; flip?: boolean; cls?: string; p?: [number, number, number] };

function decorations(): Deco[] {
  const p = dogPalettes;
  const list: Deco[] = [
    { html: dachshund(p.caramel, 'collar'), x: 3, y: 72, size: 30, cls: 'walk' },
    { html: dachshund(p.blackTan, 'bow'), x: 69, y: 77, size: 26, flip: true, cls: 'walk' },
    { html: dachshund(p.chocolate, 'heart'), x: 72, y: 6, size: 20, flip: true, rot: 4, cls: 'walk' },
    { html: dachshund(p.cream, 'none'), x: 4, y: 8, size: 18, rot: -5, cls: 'walk' },
    { html: pups.chase(), x: 27, y: 4, size: 11, rot: -6, cls: 'pup' },
    { html: pups.marshall(), x: 55, y: 79, size: 11, rot: 5, cls: 'pup' },
    { html: pups.skye(), x: 15, y: 41, size: 11, rot: -4, cls: 'pup', p: [30, 18, 11] },
    { html: pups.rubble(), x: 77, y: 41, size: 11, rot: 6, cls: 'pup', p: [58, 18, 11] },
    { html: minion(false), x: 2, y: 36, size: 10.5, rot: -8, p: [3, 18, 10] },
    { html: minion(true), x: 90, y: 36, size: 10, rot: 7, p: [86, 17, 9.5] },
    { html: pawBadge(), x: 58, y: 6, size: 6.5, rot: 12 },
    { html: pawBadge('#e9473f', '#2f6fe0'), x: 88, y: 64, size: 6.5, rot: 10, p: [86, 70, 6] },
    { html: bone(), x: 40, y: 89, size: 8, rot: -14 },
    { html: bone(), x: 16, y: 26, size: 6, rot: 20, p: [70, 30, 6] },
    { html: pixelHeart('#f48fb1'), x: 22, y: 64, size: 3.4, rot: -10, p: [14, 69, 3.4] },
    { html: pixelHeart('#ffb4a2'), x: 82, y: 28, size: 3, rot: 12, p: [76, 29, 3] },
    { html: pixelHeart('#f48fb1'), x: 50, y: 90, size: 2.6 },
    { html: pixelHeart('#c3a6ff'), x: 41, y: 8, size: 2.4, rot: 8 },
  ];
  const trail = [[24, 86], [28, 82], [32, 85], [36, 81]];
  trail.forEach(([x, y], i) => list.push({ html: pawPrint('#e8c9b0'), x, y, size: 3, rot: 70 + (i % 2) * 18 }));
  const slots = [[16, 46], [80, 84], [44, 6], [86, 14], [12, 58], [60, 90]];
  userStickers.slice(0, slots.length).forEach((url, i) => {
    list.push({ html: `<img src="${url}" alt="">`, x: slots[i][0], y: slots[i][1], size: 13, rot: (i % 2 ? 1 : -1) * 8 });
  });
  return list;
}

export const mountIntro: Mount = ({ root, music, go }) => {
  music.playMain(true);
  const t = texts.intro;
  root.innerHTML = `
    <div class="intro">
      <div class="intro__bg"></div>
      <div class="intro__deco"></div>
      <section class="intro__card">
        <div class="intro__peek">${peekingDog(dogPalettes.caramel)}</div>
        <p class="intro__eyebrow">${t.eyebrow}</p>
        <h1 class="intro__title">${t.title.replace('\n', '<br>')}</h1>
        <div class="intro__actions">
          <button class="pix-btn pix-btn--yes" type="button">${t.yes}</button>
          <button class="pix-btn pix-btn--no" type="button" tabindex="-1">${t.no}</button>
        </div>
      </section>
    </div>`;

  const deco = root.querySelector<HTMLElement>('.intro__deco')!;
  decorations().forEach((d, i) => {
    const el = document.createElement('div');
    el.className = `sticker ${d.cls ?? ''}`;
    const [x, y, size] = innerHeight > innerWidth && d.p ? d.p : [d.x, d.y, d.size];
    el.style.cssText = `left:${x}%;top:${y}%;width:${size}vmin;--rot:${d.rot ?? 0}deg;--flip:${d.flip ? -1 : 1};--delay:${i * 60}ms;--bob:${2.6 + (i % 5) * 0.45}s`;
    el.innerHTML = `<div class="sticker__inner">${d.html}</div>`;
    deco.appendChild(el);
  });

  const yes = root.querySelector<HTMLButtonElement>('.pix-btn--yes')!;
  const no = root.querySelector<HTMLButtonElement>('.pix-btn--no')!;
  const timers: number[] = [];
  let done = false;

  // --- «Нет» runs away -----------------------------------------------------
  let tauntIndex = 0;
  let lastJump = 0;
  const jump = (px: number, py: number) => {
    const now = performance.now();
    if (done || now - lastJump < 120) return;
    lastJump = now;
    const r = no.getBoundingClientRect();
    if (!no.classList.contains('is-free')) {
      no.style.left = `${r.left}px`;
      no.style.top = `${r.top}px`;
      no.classList.add('is-free');
      root.querySelector('.intro')!.appendChild(no);
      void no.offsetWidth;
    }
    const yr = yes.getBoundingClientRect();
    const m = 24;
    let x = 0, y = 0;
    for (let i = 0; i < 40; i++) {
      x = m + Math.random() * (innerWidth - r.width - m * 2);
      y = m + Math.random() * (innerHeight - r.height - m * 2);
      const farFromPointer = Math.hypot(x + r.width / 2 - px, y + r.height / 2 - py) > Math.min(innerWidth, innerHeight) * 0.35;
      const clearOfYes = x + r.width < yr.left - 20 || x > yr.right + 20 || y + r.height < yr.top - 20 || y > yr.bottom + 20;
      if (farFromPointer && clearOfYes) break;
    }
    no.style.left = `${x}px`;
    no.style.top = `${y}px`;
    no.classList.remove('hop');
    void no.offsetWidth;
    no.classList.add('hop');
    no.dataset.taunt = t.taunts[tauntIndex++ % t.taunts.length];
  };
  const card = root.querySelector<HTMLElement>('.intro__card')!;
  const onMove = (e: PointerEvent) => {
    if (!done) {
      // the card tilts gently toward the cursor
      const dx = (e.clientX / innerWidth - 0.5) * 2, dy = (e.clientY / innerHeight - 0.5) * 2;
      card.style.transform = `perspective(900px) rotateY(${dx * 6}deg) rotateX(${-dy * 5}deg)`;
    }
    const r = no.getBoundingClientRect();
    const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
    const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
    if (Math.hypot(dx, dy) < 46) jump(e.clientX, e.clientY);
  };
  const onNoDown = (e: PointerEvent) => { e.preventDefault(); jump(e.clientX, e.clientY); };
  window.addEventListener('pointermove', onMove);
  no.addEventListener('pointerdown', onNoDown);
  no.addEventListener('click', (e) => e.preventDefault());

  // --- «Да» becomes a pixel heart -----------------------------------------
  yes.addEventListener('click', () => {
    if (done) return;
    done = true;
    card.style.transform = '';
    root.querySelector('.intro')!.classList.add('is-leaving');
    buildHeart(yes, root, timers, () => go('garden'));
  });

  return () => {
    timers.forEach(clearTimeout);
    window.removeEventListener('pointermove', onMove);
  };
};

function buildHeart(button: HTMLButtonElement, root: HTMLElement, timers: number[], finish: () => void): void {
  const br = button.getBoundingClientRect();
  const cols = HEART[0].length;
  const rows = HEART.length;
  const scale = Math.min(1, (innerWidth * 0.6) / (cols * br.width), (innerHeight * 0.62) / (rows * br.height));
  const cw = br.width * scale;
  const ch = br.height * scale;
  const gap = Math.max(2, 6 * scale);
  const W = cols * cw + (cols - 1) * gap;
  const H = rows * ch + (rows - 1) * gap;

  const stage = document.createElement('div');
  stage.className = 'heart-stage';
  const heart = document.createElement('div');
  heart.className = 'pixel-heart';
  heart.style.cssText = `width:${W}px;height:${H}px;left:${(innerWidth - W) / 2}px;top:${(innerHeight - H) / 2}px;--sx:${(cw + gap + 1) / cw};--sy:${(ch + gap + 1) / ch}`;
  stage.appendChild(heart);
  root.appendChild(stage);

  const cells: { x: number; y: number; edge: boolean }[] = [];
  HEART.forEach((row, y) => [...row].forEach((c, x) => {
    if (c !== 'X') return;
    const on = (xx: number, yy: number) => HEART[yy]?.[xx] === 'X';
    cells.push({ x, y, edge: !(on(x - 1, y) && on(x + 1, y) && on(x, y - 1) && on(x, y + 1)) });
  }));

  // The pressed button flies into the center cell first.
  const home = cells.find((c) => c.x === 5 && c.y === 4)!;
  const cx = (cols - 1) / 2;
  const cy = 3.6;
  const edges = cells.filter((c) => c.edge && c !== home).sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  const inner = cells.filter((c) => !c.edge && c !== home).sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
  // Alternate «то с краю, то в центре»: walk the outline from two ends while the middle grows outward.
  const order: typeof cells = [];
  let lo = 0, hi = edges.length - 1, k = 0;
  while (lo <= hi || k < inner.length) {
    if (lo <= hi) order.push(edges[lo++]);
    if (k < inner.length) order.push(inner[k++]);
    if (lo <= hi) order.push(edges[hi--]);
  }

  const place = (c: { x: number; y: number }, el: HTMLElement) => {
    el.style.cssText = `width:${cw}px;height:${ch}px;left:${c.x * (cw + gap)}px;top:${c.y * (ch + gap)}px;font-size:${Math.max(7, 15 * scale)}px`;
  };
  const makeCell = (c: { x: number; y: number }) => {
    const el = document.createElement('div');
    el.className = 'pixel-cell';
    el.textContent = button.textContent;
    place(c, el);
    heart.appendChild(el);
    return el;
  };

  // FLIP the real button into its cell.
  const first = makeCell(home);
  const hx = (innerWidth - W) / 2 + home.x * (cw + gap);
  const hy = (innerHeight - H) / 2 + home.y * (ch + gap);
  first.style.transform = `translate(${br.left - hx}px, ${br.top - hy}px) scale(${1 / scale})`;
  first.style.transformOrigin = '0 0';
  button.style.visibility = 'hidden';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    first.style.transition = 'transform .45s cubic-bezier(.5,0,.2,1)';
    first.style.transform = 'none';
  }));
  timers.push(window.setTimeout(() => { first.style.transition = ''; first.style.transform = ''; first.style.transformOrigin = ''; }, 520));

  const step = 900 / order.length;
  order.forEach((c, i) => {
    timers.push(window.setTimeout(() => makeCell(c).classList.add('pop'), 380 + i * step));
  });

  const filled = 380 + order.length * step + 260;
  timers.push(window.setTimeout(() => heart.classList.add('is-filled'), filled));
  timers.push(window.setTimeout(() => {
    // Zoom into the middle of the heart until one pixel covers the screen, shifting to the garden palette.
    const ox = home.x * (cw + gap) + cw / 2;
    const oy = home.y * (ch + gap) + ch / 2;
    heart.style.transformOrigin = `${ox}px ${oy}px`;
    heart.classList.add('is-zooming');
    heart.style.transform = `scale(${(Math.max(innerWidth, innerHeight) / Math.min(cw, ch)) * 2.6})`;
    stage.classList.add('is-night');
  }, filled + 420));
  timers.push(window.setTimeout(finish, filled + 420 + 1250));
}
