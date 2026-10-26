// npm run password -- <пароль>   → stores only the SHA-256 of the password in src/config.ts
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const password = process.argv.slice(2).join(' ').trim().toLowerCase();
const hash = password ? crypto.createHash('sha256').update(password, 'utf8').digest('hex') : '';
const file = path.resolve(import.meta.dirname, '..', 'src', 'config.ts');
const src = fs.readFileSync(file, 'utf8').replace(/export const webPasswordHash = '[0-9a-f]*';/, `export const webPasswordHash = '${hash}';`);
fs.writeFileSync(file, src);
console.log(password ? 'Пароль установлен.' : 'Пароль убран.');
