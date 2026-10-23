// Stable chapter IDs keep positions independent when the catalog grows.
export const validRate = rate => [.75, 1, 1.25, 1.5, 2].includes(rate) ? rate : 1;
const nonnegative = value => Number.isFinite(value) && value >= 0 ? value : 0;
export function chapterProgress(saved, duration) {
 const length = nonnegative(duration), position = Math.min(nonnegative(saved?.positionSec), length);
 const completed = saved?.completed === true || (length > 0 && position >= length - 1);
 return {positionSec: completed ? 0 : position, completed, rate: validRate(saved?.rate)};
}
export function continueIndex(book, saved = {}) {
 const active = book.chapters.findIndex(c => c.chapterId === saved.activeChapter);
 if (active >= 0 && !chapterProgress(saved.chapters?.[book.chapters[active].chapterId], book.chapters[active].durationSec).completed) return active;
 return Math.max(0, book.chapters.findIndex(c => !chapterProgress(saved.chapters?.[c.chapterId], c.durationSec).completed));
}

export const shelves = ['unread', 'reading', 'completed'];
export function bookStatus(book, saved = {}) {
 if (shelves.includes(saved.shelfOverride)) return saved.shelfOverride;
 if (book.chapters.length && book.chapters.every(ch => chapterProgress(saved.chapters?.[ch.chapterId], ch.durationSec).completed)) return 'completed';
 // Metadata preloading can save an active chapter at zero. That is not reading.
 if (saved.started === true || saved.readChapter || book.chapters.some(ch => {
  const p = saved.chapters?.[ch.chapterId];
  return nonnegative(p?.positionSec) > 0 || nonnegative(p?.readingY) > 0 || p?.completed === true;
 })) return 'reading';
 return 'unread';
}
