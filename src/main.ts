import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/600.css';
import '@fontsource/press-start-2p/400.css';
import './styles.css';
import { Music } from './audio';
import { passGate, waitForUnlock } from './gate';
import { mountIntro } from './scenes/intro';
import { mountGarden } from './scenes/garden';
import { mountLove } from './scenes/love';
import { mountOutro } from './scenes/outro';

export type SceneName = 'intro' | 'garden' | 'love' | 'outro';

export interface Ctx {
  root: HTMLElement;
  music: Music;
  go(next: SceneName): void;
}

/** A scene mounts into ctx.root and returns its cleanup. */
export type Mount = (ctx: Ctx) => () => void;

const scenes: Record<SceneName, Mount> = { intro: mountIntro, garden: mountGarden, love: mountLove, outro: mountOutro };

const app = document.getElementById('app')!;
const music = new Music();
let cleanup: (() => void) | null = null;
let layer: HTMLElement | null = null;

function go(next: SceneName): void {
  const old = layer;
  const oldCleanup = cleanup;
  layer = document.createElement('div');
  layer.className = `scene scene--${next}`;
  app.appendChild(layer);
  try {
    cleanup = scenes[next]({ root: layer, music, go });
  } catch (error) {
    // e.g. no WebGL on a very old laptop: skip the 3D garden rather than freeze on a dark screen
    console.error(error);
    cleanup = null;
    if (next === 'garden') { layer.remove(); layer = old; cleanup = oldCleanup; go('love'); return; }
  }
  // Each scene draws its own entrance; the old layer is removed underneath it.
  if (old) {
    setTimeout(() => { oldCleanup?.(); old.remove(); }, 900);
  }
}

const start = (new URLSearchParams(location.search).get('scene') as SceneName | null) ?? 'intro';
void waitForUnlock(app).then(() => passGate(app)).then(() => go(scenes[start] ? start : 'intro'));
