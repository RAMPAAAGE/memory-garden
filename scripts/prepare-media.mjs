// Converts the raw photos/videos into web-friendly files (src/media.json) and keeps воспоминания.txt in sync.
// Usage: node scripts/prepare-media.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import heicConvert from 'heic-convert';

const ROOT = path.resolve(import.meta.dirname, '..');
const PHOTOS_PARENT = path.resolve(ROOT, '..', 'фотки');
const SOURCE = fs.readdirSync(PHOTOS_PARENT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== '__MACOSX')
  .map((e) => path.join(PHOTOS_PARENT, e.name))[0];
const OUT = path.join(ROOT, 'public', 'memories');
const MANIFEST = path.join(ROOT, 'src', 'media.json');
const CAPTIONS = path.join(ROOT, 'воспоминания.txt');
// ffmpeg is needed only for videos: set FFMPEG=<path to ffmpeg.exe> or have ffmpeg on PATH.
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

// Per-file edits. Image crop = [left, top, width, height] as fractions of the photo.
// Video: trim = [startSec, endSec], crop = ffmpeg "w:h:x:y" in source pixels.
const EDITS = {
  // 'IMG_0001.PNG': { crop: [0, 0.25, 1, 0.5] },   // keep only the middle of a screenshot
  // 'IMG_0002.MOV': { trim: [0, 10] },             // first 10 seconds of a video
};

const IMAGE = new Set(['.heic', '.jpg', '.jpeg', '.png', '.webp']);
const VIDEO = new Set(['.mov', '.mp4']);

fs.mkdirSync(OUT, { recursive: true });

const files = fs.readdirSync(SOURCE)
  .map((name) => ({ name, full: path.join(SOURCE, name), ext: path.extname(name).toLowerCase() }))
  .filter((f) => IMAGE.has(f.ext) || VIDEO.has(f.ext))
  .map((f) => ({ ...f, time: fs.statSync(f.full).mtime }))
  .sort((a, b) => a.time - b.time);

const result = [];
for (const file of files) {
  const base = path.basename(file.name, path.extname(file.name)).replace(/^-/, 'n');
  const isVideo = VIDEO.has(file.ext);
  const id = `${base}${isVideo ? '_v' : ''}`;
  const src = isVideo ? `${id}.mp4` : `${id}.webp`;
  const poster = isVideo ? `${id}.jpg` : undefined;
  const target = path.join(OUT, src);

  // an edit marker next to the output: when the edit changes, the file is rebuilt
  const edit = EDITS[file.name];
  const marker = `${target}.edit`;
  const editKey = edit ? JSON.stringify(edit) : '';
  const markerKey = fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8') : '';
  if (!fs.existsSync(target) || editKey !== markerKey) {
    process.stdout.write(`→ ${file.name}${edit ? ' (edited)' : ''}\n`);
    if (isVideo) {
      const trim = edit?.trim ? ['-ss', String(edit.trim[0]), '-to', String(edit.trim[1])] : [];
      const crop = edit?.crop ? `crop=${edit.crop},` : '';
      execFileSync(FFMPEG, ['-v', 'error', '-y', ...trim, '-i', file.full,
        '-vf', `${crop}scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))',fps=30,format=yuv420p`,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-profile:v', 'high',
        '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', target]);
      execFileSync(FFMPEG, ['-v', 'error', '-y', '-ss', '0.3', '-i', target, '-frames:v', '1', '-q:v', '3', path.join(OUT, poster)]);
    } else {
      const input = file.ext === '.heic'
        ? Buffer.from(await heicConvert({ buffer: fs.readFileSync(file.full), format: 'JPEG', quality: 0.95 }))
        : fs.readFileSync(file.full);
      let img = sharp(await sharp(input).rotate().toBuffer());
      if (edit?.crop) {
        const { width, height } = await img.metadata();
        const [l, t, w, h] = edit.crop;
        img = img.extract({ left: Math.round(l * width), top: Math.round(t * height), width: Math.round(w * width), height: Math.round(h * height) });
      }
      await img.resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toFile(target);
    }
    if (edit) fs.writeFileSync(marker, editKey);
    else if (fs.existsSync(marker)) fs.rmSync(marker);
  }

  const meta = isVideo
    ? await sharp(path.join(OUT, poster)).metadata()
    : await sharp(target).metadata();
  result.push({
    source: file.name,
    src,
    ...(poster ? { poster } : {}),
    type: isVideo ? 'video' : 'photo',
    width: meta.width,
    height: meta.height,
    date: file.time.toISOString().slice(0, 10),
  });
}

fs.writeFileSync(MANIFEST, JSON.stringify(result, null, 2) + '\n');

// воспоминания.txt is edited by hand: create it once, later only append files it doesn't mention yet.
const header = [
  '# Порядок строк = порядок воспоминаний в скролле.',
  '# Формат:  имя_файла | текст',
  '# Можно добавить заголовок:  имя_файла | заголовок | текст',
  '# Строки, начинающиеся с #, не показываются (так можно спрятать фото).',
  '',
];
const current = fs.existsSync(CAPTIONS) ? fs.readFileSync(CAPTIONS, 'utf8') : header.join('\n');
const mentioned = new Set(current.split(/\r?\n/).map((l) => l.replace(/^#\s*/, '').split('|')[0].trim()));
const missing = result.filter((m) => !mentioned.has(m.source)).map((m) => `${m.source} | `);
if (missing.length || !fs.existsSync(CAPTIONS)) {
  fs.writeFileSync(CAPTIONS, current.replace(/\s*$/, '\n') + missing.join('\n') + '\n');
}
console.log(`Done: ${result.length} files, ${missing.length} new lines in воспоминания.txt`);
