import confetti from 'canvas-confetti';
import { texts } from '../config';
import type { Mount } from '../main';

export const mountLove: Mount = ({ root, go }) => {
  const t = texts.love;
  const title = t.title.split(' ').map((w, i) => `<span style="animation-delay:${0.3 + i * 0.16}s">${w}</span>`).join(' ');
  const petals = Array.from({ length: 18 }, (_, i) =>
    `<i style="left:${(i * 53) % 100}%;--dx:${((i * 37) % 20) - 10}vw;animation-duration:${9 + (i % 5) * 2.4}s;animation-delay:${-i * 1.3}s;transform:scale(${0.6 + (i % 4) * 0.2})"></i>`).join('');
  root.innerHTML = `
    <div class="love">
      <div class="love__petals">${petals}</div>
      <canvas class="love__confetti" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></canvas>
      <div class="love__inner">
        <h1 class="love__title">${title}</h1>
        <p class="love__body">${t.body}</p>
        <div class="love__ask">
          <p class="love__question">${t.question}</p>
          <div class="love__actions">
            <button class="soft-btn soft-btn--yes" type="button">${t.yes}</button>
            <button class="soft-btn soft-btn--no" type="button">${t.no}</button>
          </div>
          <div class="love__correct">${t.correct}</div>
          <button class="love__next" type="button">${t.next} →</button>
        </div>
      </div>
      <div class="love__wipe"></div>
    </div>`;

  const q = root.querySelector<HTMLElement>('.love__question')!;
  const yes = root.querySelector<HTMLButtonElement>('.soft-btn--yes')!;
  const no = root.querySelector<HTMLButtonElement>('.soft-btn--no')!;
  const actions = root.querySelector<HTMLElement>('.love__actions')!;
  const correct = root.querySelector<HTMLElement>('.love__correct')!;
  const next = root.querySelector<HTMLButtonElement>('.love__next')!;
  const wipe = root.querySelector<HTMLElement>('.love__wipe')!;
  const shoot = confetti.create(root.querySelector('canvas')!, { resize: true });
  const timers: number[] = [];

  let noCount = 0;
  no.addEventListener('click', () => {
    q.textContent = t.noReplies[noCount % t.noReplies.length];
    q.classList.remove('swap'); void q.offsetWidth; q.classList.add('swap');
    noCount++;
    yes.style.transform = `scale(${Math.min(1.7, 1 + noCount * 0.1)})`;
    no.style.transform = `scale(${Math.max(0.6, 1 - noCount * 0.06)})`;
  });

  let answered = false;
  yes.addEventListener('click', () => {
    if (answered) return;
    answered = true;
    q.textContent = t.question;
    actions.style.transition = 'opacity .5s ease';
    actions.style.opacity = '0';
    actions.style.pointerEvents = 'none';
    const heart = confetti.shapeFromPath({ path: 'M12 21s-7-4.5-9.5-9C.5 8 3 4 6.8 4 9 4 11 5.5 12 7c1-1.5 3-3 5.2-3C21 4 23.5 8 21.5 12 19 16.5 12 21 12 21z' });
    const colors = ['#f48fb1', '#ffd1dc', '#ffe28a', '#bfe3f5', '#c3a6ff', '#ffffff', '#e86f96'];
    const burst = (x: number, angle: number) => shoot({ particleCount: 90, spread: 70, startVelocity: 52, origin: { x, y: 0.75 }, angle, colors, scalar: 1.05, ticks: 260 });
    burst(0.2, 60); burst(0.8, 120);
    timers.push(window.setTimeout(() => shoot({ particleCount: 60, spread: 120, startVelocity: 30, origin: { x: 0.5, y: 0.45 }, shapes: [heart], colors: ['#f48fb1', '#e86f96', '#ffb4c6'], scalar: 2, ticks: 300 }), 350));
    timers.push(window.setTimeout(() => { burst(0.35, 75); burst(0.65, 105); }, 900));
    timers.push(window.setTimeout(() => correct.classList.add('on'), 450));
    timers.push(window.setTimeout(() => next.classList.add('on'), 2400));
    timers.push(window.setTimeout(leave, 11000));
  });

  let left = false;
  function leave(): void {
    if (left) return;
    left = true;
    wipe.classList.add('on');
    timers.push(window.setTimeout(() => go('outro'), 900));
  }
  next.addEventListener('click', leave);

  return () => { timers.forEach(clearTimeout); shoot.reset(); };
};
