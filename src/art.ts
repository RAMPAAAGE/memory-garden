// Cute flat SVG stickers for the intro scene: one consistent style — soft fills, gentle
// top-light gradients, no outlines — with small hand-placed details.

let uid = 0;
const nextId = (p: string) => `${p}${uid++}`;

export interface DogColors { body: string; dark: string; light: string; top: string; tan?: boolean }

export const dogPalettes: Record<string, DogColors> = {
  caramel: { body: '#c97b45', dark: '#8a4b26', light: '#f0c194', top: '#d99459' },
  chocolate: { body: '#7a4a32', dark: '#4a2a1b', light: '#c99572', top: '#8d5a3f' },
  blackTan: { body: '#3a2e2a', dark: '#1f1815', light: '#d79a5c', top: '#4a3c37', tan: true },
  cream: { body: '#e7c08f', dark: '#b88553', light: '#fbe6c8', top: '#f0d0a4' },
};

const EYE = '#2a1d18';

/** Side-view dachshund, facing right. */
export function dachshund(c: DogColors, accessory: 'bow' | 'heart' | 'collar' | 'none' = 'collar'): string {
  const id = nextId('dx');
  const leg = (x: number, fill: string, cls: string) => `
    <g class="leg ${cls}">
      <rect x="${x}" y="66" width="15" height="36" rx="7.5" fill="${fill}"/>
      <ellipse cx="${x + 9}" cy="100" rx="9.5" ry="4.8" fill="${fill}"/>
      <path d="M${x + 9} 97.5 v4 M${x + 13} 97.5 v4" stroke="${c.dark}" stroke-width="1.2" stroke-linecap="round" opacity=".45"/>
    </g>`;
  const collar = accessory === 'collar' || accessory === 'heart'
    ? `<path d="M142 50 Q149 69 166 67" fill="none" stroke="#ef5f8c" stroke-width="7" stroke-linecap="round"/>
       <path d="M143 52 Q149 66 163 65" fill="none" stroke="#ff9fbd" stroke-width="2" stroke-linecap="round" opacity=".7"/>`
    : '';
  const charm = accessory === 'heart'
    ? `<path d="M156 70 c-3.5 -5.5 -12 -2 -8.5 4.5 l8.5 7.5 l8.5 -7.5 c3.5 -6.5 -5 -10 -8.5 -4.5z" fill="#ef5f8c"/><path d="M151 73 q1 -2 3 -2" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".7"/>`
    : accessory === 'collar'
      ? `<circle cx="156" cy="73" r="5" fill="#ffd166"/><circle cx="154.5" cy="71.5" r="1.6" fill="#fff" opacity=".7"/>`
      : '';
  const bow = accessory === 'bow'
    ? `<g transform="translate(141 22) rotate(-15)"><path d="M0 0 C-5 -10 -15 -9 -14 0 C-15 9 -5 10 0 0 Z" fill="#f48fb1"/><path d="M0 0 C5 -10 15 -9 14 0 C15 9 5 10 0 0 Z" fill="#f48fb1"/><path d="M-10 -3 q3 -2 6 0 M10 -3 q-3 -2 -6 0" stroke="#fff" stroke-width="1.2" fill="none" opacity=".6"/><ellipse rx="3.6" ry="4" fill="#e7638f"/></g>`
    : '';
  const tan = c.tan
    ? `<ellipse cx="172" cy="30" rx="3.6" ry="2.4" fill="${c.light}"/>
       <ellipse cx="139" cy="72" rx="9" ry="6" fill="${c.light}" opacity=".9"/>`
    : '';
  return `<svg viewBox="0 0 214 112" xmlns="http://www.w3.org/2000/svg" overflow="visible">
  <defs>
    <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.top}"/><stop offset=".55" stop-color="${c.body}"/><stop offset="1" stop-color="${c.body}"/></linearGradient>
    <radialGradient id="${id}h" cx=".42" cy=".35" r=".7"><stop offset="0" stop-color="${c.top}"/><stop offset="1" stop-color="${c.body}"/></radialGradient>
  </defs>
  <g class="tail">
    <path d="M36 52 Q16 44 14 24" fill="none" stroke="${c.body}" stroke-width="8" stroke-linecap="round"/>
    <path d="M17 32 Q15 27 14 24" fill="none" stroke="${c.tan ? c.light : c.top}" stroke-width="5" stroke-linecap="round" opacity=".7"/>
  </g>
  ${leg(40, c.dark, 'leg--b')}${leg(124, c.dark, 'leg--a')}
  <rect x="26" y="38" width="138" height="44" rx="22" fill="url(#${id}b)"/>
  <path d="M44 44 q4 -2 8 0 M70 41 q4 -2 8 0 M98 40 q4 -2 8 0 M126 41 q4 -2 8 0" stroke="${c.dark}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".25"/>
  ${leg(58, c.body, 'leg--a')}${leg(142, c.body, 'leg--b')}
  <ellipse cx="96" cy="74" rx="56" ry="7" fill="${c.light}" opacity=".7"/>
  <path d="M146 70 l3 5 l3 -5 l3 5 l3 -5" stroke="${c.light}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>
  ${tan}
  <circle cx="164" cy="42" r="25" fill="url(#${id}h)"/>
  ${collar}
  <ellipse cx="188" cy="53" rx="20" ry="13" fill="${c.light}"/>
  <g fill="${c.dark}" opacity=".35"><circle cx="186" cy="55" r="1"/><circle cx="190" cy="57" r="1"/><circle cx="186" cy="59" r="1"/></g>
  <path d="M196 59 q4 3 9 1" stroke="${EYE}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <ellipse cx="204" cy="48" rx="6.2" ry="5.6" fill="${EYE}"/>
  <ellipse cx="202.5" cy="46" rx="2.2" ry="1.3" fill="#fff" opacity=".55"/>
  <circle cx="171" cy="37" r="4.2" fill="${EYE}"/><circle cx="172.6" cy="35.4" r="1.5" fill="#fff"/><circle cx="169.8" cy="38.6" r=".7" fill="#fff"/>
  <path d="M166 30 q4 -3 9 -1" stroke="${c.dark}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".6"/>
  <ellipse cx="180" cy="55" rx="6" ry="3.5" fill="#f4a3b5" opacity=".75"/>
  <path d="M150 26 Q136 28 138 60 Q146 70 156 56 Q160 38 150 26Z" fill="${c.dark}"/>
  <path d="M148 32 Q141 36 142 56 Q146 61 151 54" fill="none" stroke="${c.body}" stroke-width="2" stroke-linecap="round" opacity=".45"/>
  ${charm}
  ${bow}
</svg>`;
}

/** Dachshund head and paws peeking over an edge. */
export function peekingDog(c: DogColors): string {
  const id = nextId('pk');
  return `<svg viewBox="0 0 140 86" xmlns="http://www.w3.org/2000/svg" overflow="visible">
  <defs><radialGradient id="${id}h" cx=".42" cy=".35" r=".7"><stop offset="0" stop-color="${c.top}"/><stop offset="1" stop-color="${c.body}"/></radialGradient></defs>
  <path d="M38 30 Q16 30 20 66 Q30 76 40 60Z" fill="${c.dark}" class="ear ear--l"/>
  <path d="M102 30 Q124 30 120 66 Q110 76 100 60Z" fill="${c.dark}" class="ear ear--r"/>
  <ellipse cx="70" cy="44" rx="36" ry="32" fill="url(#${id}h)"/>
  <path d="M64 14 q2 4 0 7 M70 13 q2 4 0 8 M76 14 q2 4 0 7" stroke="${c.dark}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".35"/>
  <ellipse cx="70" cy="60" rx="20" ry="15" fill="${c.light}"/>
  <ellipse cx="70" cy="52" rx="7.4" ry="5.4" fill="${EYE}"/><ellipse cx="68" cy="50.5" rx="2.6" ry="1.3" fill="#fff" opacity=".55"/>
  <path d="M70 57 v4 M64 63 Q70 68 76 63" fill="none" stroke="${EYE}" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M67 65.5 Q70 72 73 65.5Z" fill="#ef7a8c"/>
  <circle cx="56" cy="38" r="4.8" fill="${EYE}"/><circle cx="57.8" cy="36.2" r="1.7" fill="#fff"/><circle cx="54.8" cy="39.6" r=".7" fill="#fff"/>
  <circle cx="84" cy="38" r="4.8" fill="${EYE}"/><circle cx="85.8" cy="36.2" r="1.7" fill="#fff"/><circle cx="82.8" cy="39.6" r=".7" fill="#fff"/>
  <path d="M50 30 q5 -3 10 -1 M80 29 q5 -2 10 1" stroke="${c.dark}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".55"/>
  <ellipse cx="46" cy="52" rx="6" ry="3.5" fill="#f4a3b5" opacity=".8"/><ellipse cx="94" cy="52" rx="6" ry="3.5" fill="#f4a3b5" opacity=".8"/>
  <rect x="30" y="70" width="24" height="16" rx="8" fill="${c.body}"/><rect x="86" y="70" width="24" height="16" rx="8" fill="${c.body}"/>
  <path d="M37 78v6M42 78v6M47 78v6M93 78v6M98 78v6M103 78v6" stroke="${c.dark}" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>
</svg>`;
}

export function minion(twoEyes = false): string {
  const id = nextId('mn');
  const eye = (cx: number, r: number) => `
    <circle cx="${cx}" cy="44" r="${r + 5}" fill="url(#${id}m)"/>
    <circle cx="${cx}" cy="44" r="${r}" fill="#fbfaf6"/>
    <circle cx="${cx + 1.5}" cy="45" r="${r * 0.48}" fill="#7a5230"/>
    <circle cx="${cx + 1.5}" cy="45" r="${r * 0.24}" fill="#111"/>
    <circle cx="${cx + 3}" cy="42.5" r="${r * 0.15}" fill="#fff"/>`;
  return `<svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" overflow="visible">
  <defs>
    <linearGradient id="${id}y" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f2c72a"/><stop offset=".4" stop-color="#ffe066"/><stop offset="1" stop-color="#e9b81c"/></linearGradient>
    <linearGradient id="${id}j" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a68ad"/><stop offset=".45" stop-color="#4b7fc6"/><stop offset="1" stop-color="#335f9f"/></linearGradient>
    <radialGradient id="${id}m" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#e9ecef"/><stop offset="1" stop-color="#8b9099"/></radialGradient>
  </defs>
  <path d="M42 12 Q40 2 36 0 M50 11 V0 M58 12 Q60 2 64 0" stroke="#222" stroke-width="2" fill="none" stroke-linecap="round"/>
  <rect x="18" y="72" width="10" height="34" rx="5" fill="#f7cf2d" transform="rotate(18 23 72)"/>
  <rect x="72" y="72" width="10" height="34" rx="5" fill="#f7cf2d" transform="rotate(-18 77 72)"/>
  <circle cx="14" cy="104" r="5" fill="#2b2b2b"/><circle cx="86" cy="104" r="5" fill="#2b2b2b"/>
  <rect x="20" y="10" width="60" height="118" rx="30" fill="url(#${id}y)"/>
  <rect x="20" y="38" width="60" height="9" fill="#2b2b2b"/>
  ${twoEyes ? eye(39, 8) + eye(61, 8) : eye(50, 11)}
  <path d="M38 70 Q50 80 62 70" fill="none" stroke="#4a2c1a" stroke-width="3" stroke-linecap="round"/>
  <path d="M20 96 H80 V100 Q80 128 50 128 Q20 128 20 100Z" fill="url(#${id}j)"/>
  <rect x="34" y="88" width="32" height="18" rx="4" fill="url(#${id}j)"/>
  <rect x="38" y="92" width="24" height="10" rx="2" fill="none" stroke="#a9c4ea" stroke-width="1" stroke-dasharray="2 2"/>
  <circle cx="50" cy="97" r="3.4" fill="#2b2b2b"/><circle cx="49" cy="96" r="1" fill="#777"/>
  <path d="M20 90 L36 92 M80 90 L64 92" stroke="#3e6fb5" stroke-width="5" stroke-linecap="round"/>
  <circle cx="35" cy="92" r="2.5" fill="#222"/><circle cx="65" cy="92" r="2.5" fill="#222"/>
  <rect x="32" y="126" width="14" height="14" rx="3" fill="#3e6fb5"/><rect x="54" y="126" width="14" height="14" rx="3" fill="#3e6fb5"/>
  <ellipse cx="38" cy="142" rx="11" ry="5" fill="#222"/><ellipse cx="62" cy="142" rx="11" ry="5" fill="#222"/>
</svg>`;
}

interface Pup {
  fur: string; top: string; dark: string; muzzle: string;
  ears: 'pointy' | 'floppy' | 'small';
  vest: string; vestDark: string; hat: string; spots?: boolean; jowls?: boolean;
}

/** Sitting rescue puppy, front view (fan-art style). */
function puppy(p: Pup): string {
  const id = nextId('pp');
  const ears = {
    pointy: `<path d="M30 46 L20 6 L52 30Z" fill="${p.dark}"/><path d="M33 38 L27 15 L45 31Z" fill="#f2b6a8"/>
             <path d="M90 46 L100 6 L68 30Z" fill="${p.dark}"/><path d="M87 38 L93 15 L75 31Z" fill="#f2b6a8"/>`,
    floppy: `<path d="M30 34 Q8 40 14 76 Q22 86 34 70Z" fill="${p.dark}"/><path d="M90 34 Q112 40 106 76 Q98 86 86 70Z" fill="${p.dark}"/>
             <path d="M26 44 Q16 52 19 70" stroke="${p.fur}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".35"/><path d="M94 44 Q104 52 101 70" stroke="${p.fur}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".35"/>`,
    small: `<path d="M30 34 Q18 26 22 46 Q28 52 36 42Z" fill="${p.dark}"/><path d="M90 34 Q102 26 98 46 Q92 52 84 42Z" fill="${p.dark}"/>`,
  }[p.ears];
  const spots = p.spots
    ? `<g fill="#2b2b2b"><ellipse cx="40" cy="40" rx="5" ry="4"/><ellipse cx="82" cy="46" rx="4" ry="3"/><ellipse cx="72" cy="30" rx="3" ry="2.5"/><ellipse cx="42" cy="122" rx="4" ry="3"/><ellipse cx="80" cy="126" rx="5" ry="3.5"/></g>`
    : '';
  const muzzle = p.jowls
    ? `<path d="M38 72 Q38 58 60 60 Q82 58 82 72 Q82 90 60 88 Q38 90 38 72Z" fill="${p.muzzle}"/>`
    : `<ellipse cx="60" cy="73" rx="19" ry="14" fill="${p.muzzle}"/>`;
  return `<svg viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg" overflow="visible">
  <defs>
    <radialGradient id="${id}f" cx=".42" cy=".32" r=".75"><stop offset="0" stop-color="${p.top}"/><stop offset="1" stop-color="${p.fur}"/></radialGradient>
    <linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.vest}"/><stop offset="1" stop-color="${p.vestDark}"/></linearGradient>
  </defs>
  <ellipse cx="60" cy="116" rx="31" ry="27" fill="url(#${id}f)"/>
  <ellipse cx="60" cy="122" rx="14" ry="15" fill="${p.muzzle}" opacity=".85"/>
  <!-- rescue vest wraps the chest; the badge hangs on the collar -->
  <path d="M31 104 Q60 88 89 104 L90 120 Q83 116 76 116 L74 128 Q60 132 46 128 L44 116 Q37 116 30 120 Z" fill="url(#${id}v)"/>
  <path d="M36 103 Q60 92 84 103" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".45"/>
  <path d="M38 93 Q60 101 82 93" stroke="${p.vestDark}" stroke-width="5" fill="none" stroke-linecap="round"/>
  <circle cx="60" cy="101" r="9" fill="${p.vest}" stroke="#fff" stroke-width="2"/>
  <g fill="#fff"><ellipse cx="60" cy="104" rx="3.4" ry="2.8"/><circle cx="55.8" cy="99.4" r="1.4"/><circle cx="58.6" cy="97.6" r="1.4"/><circle cx="61.4" cy="97.6" r="1.4"/><circle cx="64.2" cy="99.4" r="1.4"/></g>
  ${spots}
  <ellipse cx="45" cy="140" rx="11" ry="7" fill="${p.muzzle}"/><ellipse cx="75" cy="140" rx="11" ry="7" fill="${p.muzzle}"/>
  <path d="M41 137v5M45 137v6M49 137v5M71 137v5M75 137v6M79 137v5" stroke="${p.dark}" stroke-width="1.3" stroke-linecap="round" opacity=".4"/>
  ${p.ears === 'pointy' ? ears : ''}
  <circle cx="60" cy="56" r="34" fill="url(#${id}f)"/>
  ${p.ears !== 'pointy' ? ears : ''}
  <path d="M54 24 q3 -6 6 -2 q3 -6 6 1" stroke="${p.dark}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".4"/>
  ${muzzle}
  <ellipse cx="60" cy="65" rx="7.5" ry="5.2" fill="${EYE}"/><ellipse cx="58" cy="63.5" rx="2.4" ry="1.4" fill="#fff" opacity=".6"/>
  <path d="M60 70 v4 M52 76 Q60 82 68 76" fill="none" stroke="${EYE}" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M56.5 79 Q60 87 63.5 79Z" fill="#ef7a8c"/>
  <circle cx="46" cy="51" r="7.2" fill="${EYE}"/><circle cx="74" cy="51" r="7.2" fill="${EYE}"/>
  <circle cx="46" cy="52.5" r="4.4" fill="#6b4022"/><circle cx="74" cy="52.5" r="4.4" fill="#6b4022"/>
  <circle cx="46" cy="52.5" r="2.2" fill="${EYE}"/><circle cx="74" cy="52.5" r="2.2" fill="${EYE}"/>
  <circle cx="48.5" cy="48.5" r="2.6" fill="#fff"/><circle cx="76.5" cy="48.5" r="2.6" fill="#fff"/>
  <circle cx="44" cy="54.5" r="1.1" fill="#fff"/><circle cx="72" cy="54.5" r="1.1" fill="#fff"/>
  <path d="M39 41 q6 -4 12 -1 M69 40 q6 -3 12 1" stroke="${p.dark}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".55"/>
  <ellipse cx="38" cy="66" rx="5" ry="3" fill="#f4a3b5" opacity=".7"/><ellipse cx="82" cy="66" rx="5" ry="3" fill="#f4a3b5" opacity=".7"/>
  ${p.hat}
</svg>`;
}

export const pups = {
  // police pup: shepherd, blue cap
  chase: () => puppy({ fur: '#b9783f', top: '#cf9358', dark: '#5a3a22', muzzle: '#f3d6ae', ears: 'pointy', vest: '#2f5fc4', vestDark: '#22479a',
    hat: `<path d="M30 34 Q60 2 90 34Z" fill="#2c56b8"/><path d="M38 24 Q60 10 82 24" stroke="#4f78d6" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/><rect x="26" y="31" width="68" height="7" rx="3.5" fill="#1d3f8f"/><path d="M60 12 l3 6 l6 1 l-4.5 4 l1 6 l-5.5 -3 l-5.5 3 l1 -6 l-4.5 -4 l6 -1z" fill="#ffd34d"/>` }),
  // fire pup: dalmatian, red helmet
  marshall: () => puppy({ fur: '#f6f5f0', top: '#ffffff', dark: '#2b2b2b', muzzle: '#ffffff', ears: 'floppy', vest: '#e2412f', vestDark: '#b8301f', spots: true,
    hat: `<path d="M28 36 Q30 6 60 6 Q90 6 92 36Z" fill="#e2412f"/><path d="M38 16 Q48 9 60 9" stroke="#ff8a74" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/><path d="M22 36 Q60 46 98 36 L98 40 Q60 50 22 40Z" fill="#b8301f"/><circle cx="60" cy="22" r="7" fill="#ffd34d"/><path d="M60 6 V15" stroke="#ff6a52" stroke-width="3"/>` }),
  // flying pup: cockapoo, pink goggles
  skye: () => puppy({ fur: '#e2b98a', top: '#efcfa6', dark: '#b07a4f', muzzle: '#f6e1c4', ears: 'floppy', vest: '#f27fae', vestDark: '#d65f92',
    hat: `<path d="M26 36 Q60 26 94 36" fill="none" stroke="#c74f86" stroke-width="5"/><circle cx="46" cy="32" r="9" fill="#ffd6ea" stroke="#f27fae" stroke-width="4"/><circle cx="74" cy="32" r="9" fill="#ffd6ea" stroke="#f27fae" stroke-width="4"/><circle cx="43" cy="29" r="2.5" fill="#fff"/><circle cx="71" cy="29" r="2.5" fill="#fff"/><path d="M60 23 q-5 -10 0 -17 q5 7 0 17" fill="#efcfa6"/>` }),
  // construction pup: bulldog, yellow hard hat
  rubble: () => puppy({ fur: '#d9a066', top: '#e8b67f', dark: '#a8703f', muzzle: '#fbecd6', ears: 'small', vest: '#f2b705', vestDark: '#d49c00', jowls: true,
    hat: `<path d="M30 34 Q30 8 60 8 Q90 8 90 34Z" fill="#f7c518"/><path d="M38 20 Q46 12 56 11" stroke="#ffe680" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/><rect x="24" y="31" width="72" height="7" rx="3.5" fill="#d9a400"/><path d="M60 8 V31" stroke="#ffe066" stroke-width="5"/>` }),
};

/** Rescue-pup style badge: shield + paw. */
export function pawBadge(fill = '#2f6fe0', ring = '#e9473f'): string {
  return `<svg viewBox="0 0 100 112" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 4 L92 18 Q94 70 50 108 Q6 70 8 18Z" fill="${ring}"/>
  <path d="M50 14 L83 25 Q84 66 50 96 Q16 66 17 25Z" fill="${fill}"/>
  <g fill="#fff"><ellipse cx="50" cy="66" rx="16" ry="13"/><ellipse cx="32" cy="48" rx="6.5" ry="8"/><ellipse cx="44" cy="38" rx="6.5" ry="8.5"/><ellipse cx="56" cy="38" rx="6.5" ry="8.5"/><ellipse cx="68" cy="48" rx="6.5" ry="8"/></g>
  <path d="M50 4 L92 18 Q94 70 50 108" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>
</svg>`;
}

export function pawPrint(color: string): string {
  return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><g fill="${color}">
  <ellipse cx="20" cy="27" rx="9" ry="7.5"/><ellipse cx="9" cy="16" rx="3.6" ry="4.6"/><ellipse cx="16" cy="10" rx="3.6" ry="4.8"/><ellipse cx="24" cy="10" rx="3.6" ry="4.8"/><ellipse cx="31" cy="16" rx="3.6" ry="4.6"/></g></svg>`;
}

export function bone(color = '#fbf1de'): string {
  return `<svg viewBox="0 0 64 26" xmlns="http://www.w3.org/2000/svg" overflow="visible">
  <path d="M15 9 C10 1 1 4 3 11 C0 17 7 23 14 17 L50 17 C57 23 64 17 61 11 C63 4 54 1 49 9 Z" fill="${color}" stroke="#d9bc90" stroke-width="2" stroke-linejoin="round"/>
  <path d="M17 11.5 H47" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/></svg>`;
}

/** Tiny pixel heart (7×6). */
export function pixelHeart(color: string): string {
  const rows = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  const rects = rows.flatMap((r, y) => [...r].map((ch, x) => (ch === 'X' ? `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>` : '')));
  return `<svg viewBox="0 0 7 6" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><g fill="${color}">${rects.join('')}</g></svg>`;
}
