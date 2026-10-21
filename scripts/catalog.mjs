import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export const root = path.resolve(import.meta.dirname, '..');
export const hash = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
export const load = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
export function safeRelative(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_./-]+$/.test(value) || value.startsWith('/') || value.split('/').some(p => !p || p === '..' || p === '.')) throw Error('Unsafe relative path');
  return value;
}
export function audioURL(url, repository) {
  const u = new URL(url);
  if (u.origin !== 'https://github.com' || u.username || u.password || u.search || u.hash || !u.pathname.startsWith(`/${repository}/releases/download/`) || !/^\/[\w.-]+\/[\w.-]+\/releases\/download\/[\w.-]+\/[\w.-]+\.(m4a|aac)$/.test(u.pathname)) throw Error('Use a stable canonical Release audio URL');
  return url;
}
export function validate(catalog, config) {
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.books)) throw Error('Invalid catalog');
  if (!/^[\w.-]+\/[\w.-]+$/.test(config.repository) || config.basePath !== `/${config.repository.split('/')[1]}/`) throw Error('Invalid Pages basePath');
  const ids = new Set(),chapterIds=new Set();
  for (const book of catalog.books) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,100}$/.test(book.bookId) || ids.has(book.bookId) || typeof book.title !== 'string' || !Array.isArray(book.chapters) || !book.chapters.length) throw Error('Invalid/duplicate book');
    ids.add(book.bookId); safeRelative(book.cover);
    const chapters = new Set();
    for (const ch of book.chapters) {
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,120}$/.test(ch.chapterId) || chapters.has(ch.chapterId) || chapterIds.has(ch.chapterId) || typeof ch.title !== 'string' || !Number.isFinite(ch.durationSec) || ch.durationSec <= 0 || !Number.isSafeInteger(ch.bytes) || ch.bytes <= 0 || !/^[a-f0-9]{64}$/.test(ch.sha256)||!/^[a-f0-9]{64}$/.test(ch.textSha256)) throw Error('Invalid/duplicate chapter');
      chapters.add(ch.chapterId);chapterIds.add(ch.chapterId); safeRelative(ch.markdown); audioURL(ch.audioUrl, config.repository);
    }
  }
  return true;
}
