import fs from 'node:fs';
import {hash} from './catalog.mjs';
import {inside} from './local-paths.mjs';

export function mapCollidingIdentity(workspace, file, job, raw, parsed, catalog) {
  const mapping = JSON.parse(fs.readFileSync(inside(workspace, file)));
  const {manifest, chapters} = parsed;
  const validId = id => typeof id === 'string' && /^[a-z0-9][a-z0-9_-]{0,79}$/.test(id);
  if (mapping.downloadJobId !== job.id || mapping.zipSha256 !== hash(raw) ||
      mapping.originalBookId !== manifest.id || mapping.version !== manifest.version ||
      !validId(mapping.bookId) || mapping.bookId === manifest.id ||
      !Array.isArray(mapping.chapters) || mapping.chapters.length !== chapters.length) {
    throw Error('Identity mapping does not match the verified ZIP');
  }
  const existing = catalog.tables.books.find(book => book.id === manifest.id);
  const priorMapping = catalog.pipeline?.receipts.find(receipt =>
    receipt.bookId === mapping.bookId && receipt.version === manifest.version && receipt.zipSha256 === mapping.zipSha256);
  if (!existing || existing.title === manifest.title ||
      (!priorMapping && catalog.tables.books.some(book => book.id === mapping.bookId))) {
    throw Error('Expected a distinct work colliding with an existing book');
  }
  const ids = new Map();
  for (const [index, chapter] of chapters.entries()) {
    const entry = mapping.chapters[index];
    if (entry.originalId !== chapter.id || !validId(entry.id) ||
        !catalog.tables.chapters.some(item => item.id === chapter.id && item.book_id === manifest.id) ||
        catalog.tables.chapters.some(item => item.id === entry.id && (!priorMapping || item.book_id !== mapping.bookId))) {
      throw Error('Invalid or occupied chapter identity mapping');
    }
    ids.set(chapter.id, entry.id);
  }
  if (new Set(ids.values()).size !== chapters.length) throw Error('Duplicate mapped chapter ID');
  return {
    ...parsed,
    manifest: {...manifest,id:mapping.bookId,chapters:manifest.chapters.map(chapter => ({...chapter,id:ids.get(chapter.id)}))},
    chapters: chapters.map(chapter => ({...chapter,id:ids.get(chapter.id)})),
  };
}
