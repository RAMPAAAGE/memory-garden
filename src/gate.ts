import { dogPalettes, peekingDog } from './art';
import { gateTexts, lockTexts, unlockAt, webPasswordHash } from './config';

/** Countdown screen until `unlockAt` (website only). Opens by itself the moment the time comes. */
export function waitForUnlock(host: HTMLElement): Promise<void> {
  const target = unlockAt ? new Date(unlockAt).getTime() : 0;
  const preview = new URLSearchParams(location.search).get('preview') === '2810';
  if (!target || Date.now() >= target || preview || /Electron/.test(navigator.userAgent)) return Promise.resolve();

  return new Promise((resolve) => {
    const lock = document.createElement('div');
    lock.className = 'gate lock';
    lock.innerHTML = `
      <div class="gate__card">
        <div class="intro__peek">${peekingDog(dogPalettes.caramel)}</div>
        <h1 class="gate__title">${lockTexts.title}</h1>
        <p class="lock__sub">${lockTexts.sub}</p>
        <div class="lock__timer">${lockTexts.units.map((u) => `<div><b>00</b><span>${u}</span></div>`).join('')}</div>
      </div>`;
    host.appendChild(lock);
    const cells = [...lock.querySelectorAll('b')];
    const labels = [...lock.querySelectorAll('.lock__timer span')];
    const forms = [['день', 'дня', 'дней'], ['час', 'часа', 'часов'], ['минута', 'минуты', 'минут'], ['секунда', 'секунды', 'секунд']];
    const plural = (n: number, [one, few, many]: string[]) =>
      n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many;
    const tick = () => {
      const left = Math.max(0, target - Date.now());
      const s = Math.floor(left / 1000);
      [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60].forEach((v, i) => {
        cells[i].textContent = String(v).padStart(2, '0');
        labels[i].textContent = plural(v, forms[i]);
      });
      if (left <= 0) {
        clearInterval(timer);
        lock.classList.add('is-open');
        setTimeout(() => { lock.remove(); resolve(); }, 600);
      }
    };
    const timer = setInterval(tick, 1000);
    tick();
  });
}

const KEY = 'gift-unlocked';

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Password screen for the website version only. The desktop app skips it, and once the right
 * password was entered on a device it's remembered there.
 */
export function passGate(host: HTMLElement): Promise<void> {
  const remembered = (() => { try { return localStorage.getItem(KEY); } catch { return null; } })();
  if (!webPasswordHash || /Electron/.test(navigator.userAgent) || remembered === webPasswordHash) return Promise.resolve();

  return new Promise((resolve) => {
    const gate = document.createElement('div');
    gate.className = 'gate';
    gate.innerHTML = `
      <form class="gate__card" autocomplete="off">
        <div class="intro__peek">${peekingDog(dogPalettes.caramel)}</div>
        <h1 class="gate__title">${gateTexts.title}</h1>
        <input class="gate__input" type="password" placeholder="${gateTexts.hint}" autocapitalize="off" autocorrect="off" spellcheck="false" />
        <p class="gate__wrong" aria-live="polite"></p>
        <button class="pix-btn pix-btn--yes gate__btn" type="submit">${gateTexts.enter}</button>
      </form>`;
    host.appendChild(gate);
    const form = gate.querySelector('form')!;
    const input = gate.querySelector<HTMLInputElement>('.gate__input')!;
    const wrong = gate.querySelector<HTMLElement>('.gate__wrong')!;
    setTimeout(() => input.focus(), 300);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const hash = await sha256(input.value.trim().toLowerCase());
      if (hash === webPasswordHash) {
        try { localStorage.setItem(KEY, hash); } catch { /* private mode: just ask again next time */ }
        gate.classList.add('is-open');
        setTimeout(() => { gate.remove(); resolve(); }, 600);
      } else {
        wrong.textContent = gateTexts.wrong;
        form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
        input.select();
      }
    });
  });
}
