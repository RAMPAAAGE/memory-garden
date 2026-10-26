// Renders the app icon (a dachshund peeking over a pink tile) to build/icon.png and electron/icon.png.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const body = '#c97b45', dark = '#8a4b26', light = '#f0c194';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd9e4"/><stop offset="1" stop-color="#f79bb8"/></linearGradient>
    <radialGradient id="glow" cx="50%" cy="38%" r="55%"><stop offset="0" stop-color="#fff6ee" stop-opacity=".9"/><stop offset="1" stop-color="#fff6ee" stop-opacity="0"/></radialGradient>
  </defs>
  <rect x="16" y="16" width="480" height="480" rx="112" fill="url(#bg)"/>
  <rect x="16" y="16" width="480" height="480" rx="112" fill="url(#glow)"/>
  <!-- heart -->
  <path d="M256 128 c-20 -34 -76 -26 -76 18 c0 34 44 60 76 84 c32 -24 76 -50 76 -84 c0 -44 -56 -52 -76 -18z" fill="#ef5f8c" opacity=".9"/>
  <!-- ears -->
  <path d="M172 200 Q100 206 110 316 Q134 352 166 300Z" fill="${dark}"/>
  <path d="M340 200 Q412 206 402 316 Q378 352 346 300Z" fill="${dark}"/>
  <!-- head -->
  <ellipse cx="256" cy="268" rx="112" ry="100" fill="${body}"/>
  <ellipse cx="256" cy="318" rx="62" ry="48" fill="${light}"/>
  <ellipse cx="256" cy="292" rx="22" ry="16" fill="#2a1d18"/>
  <ellipse cx="249" cy="286" rx="7" ry="4" fill="#fff" opacity=".6"/>
  <path d="M236 330 Q256 346 276 330" fill="none" stroke="#2a1d18" stroke-width="7" stroke-linecap="round"/>
  <path d="M246 336 Q256 366 266 336Z" fill="#ef7a8c"/>
  <circle cx="212" cy="250" r="14" fill="#2a1d18"/><circle cx="217" cy="245" r="5" fill="#fff"/>
  <circle cx="300" cy="250" r="14" fill="#2a1d18"/><circle cx="305" cy="245" r="5" fill="#fff"/>
  <ellipse cx="180" cy="300" rx="18" ry="10" fill="#f4a3b5" opacity=".8"/><ellipse cx="332" cy="300" rx="18" ry="10" fill="#f4a3b5" opacity=".8"/>
  <!-- paws over the edge -->
  <rect x="150" y="372" width="84" height="56" rx="28" fill="${body}"/>
  <rect x="278" y="372" width="84" height="56" rx="28" fill="${body}"/>
  <path d="M176 398v18M192 398v18M208 398v18M304 398v18M320 398v18M336 398v18" stroke="${dark}" stroke-width="5" stroke-linecap="round" opacity=".55"/>
  <!-- the card edge the dog peeks over, clipped to the rounded tile -->
  <rect x="16" y="414" width="480" height="82" fill="#fff4ec" clip-path="url(#tile)"/>
  <clipPath id="tile"><rect x="16" y="16" width="480" height="480" rx="112"/></clipPath>
</svg>`;

fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
const png = await sharp(Buffer.from(svg)).png().toBuffer();
fs.writeFileSync(path.join(ROOT, 'build', 'icon.png'), png);
await sharp(png).resize(256, 256).toFile(path.join(ROOT, 'electron', 'icon.png'));
console.log('icon written');
