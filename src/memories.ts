import captions from '../воспоминания.txt?raw';
import media from './media.json';

export interface Memory {
  source: string;
  src: string;
  poster?: string;
  type: 'photo' | 'video';
  width: number;
  height: number;
  date: string;
  title: string;
  text: string;
}

type MediaEntry = Omit<Memory, 'title' | 'text'>;

const byName = new Map<string, MediaEntry>();
for (const entry of media as MediaEntry[]) byName.set(entry.source.toLowerCase(), entry);

/** Reads воспоминания.txt: one line per memory, in scroll order. */
export function loadMemories(): Memory[] {
  const list: Memory[] = [];
  for (const raw of captions.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split('|').map((p) => p.trim());
    const entry = byName.get(parts[0].toLowerCase());
    if (!entry) {
      console.warn(`воспоминания.txt: файл «${parts[0]}» не найден`);
      continue;
    }
    const [title, text] = parts.length >= 3 ? [parts[1], parts.slice(2).join(' | ')] : ['', parts[1] ?? ''];
    list.push({ ...entry, src: `memories/${entry.src}`, poster: entry.poster && `memories/${entry.poster}`, title, text });
  }
  return list;
}

const monthFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return monthFormat.format(new Date(y, m - 1, d)).replace(' г.', '');
}
