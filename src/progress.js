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
// Listening history is independent of a replay's current position. An explicit
// false starts a new reading cycle; absent values retain legacy completion.
export function chapterWasFinished(saved, duration) {
 return typeof saved?.completedOnce === 'boolean' ? saved.completedOnce : chapterProgress(saved, duration).completed;
}
export function allChaptersFinished(book, saved = {}) {
 return book.chapters.length > 0 && book.chapters.every(ch => chapterWasFinished(saved.chapters?.[ch.chapterId], ch.durationSec));
}
export function updateChapterProgress(saved, duration, changes, ended = false) {
 return {...saved, ...changes, completedOnce: ended || chapterWasFinished(saved, duration)};
}
export function reconcileBookProgress(book, saved) {
 const legacyUnreadReset = saved.shelfOverride === 'unread' && allChaptersFinished(book, saved) && book.chapters.every(ch => typeof saved.chapters?.[ch.chapterId]?.completedOnce !== 'boolean');
 const result = {...saved, chapters: {...saved.chapters}};
 for (const ch of book.chapters) {
  const p = result.chapters[ch.chapterId];
  if (p && typeof p.completedOnce !== 'boolean' && chapterWasFinished(p, ch.durationSec)) result.chapters[ch.chapterId] = {...p, completedOnce:true};
 }
 if (legacyUnreadReset) return setBookShelf(book, result, 'unread');
 if (result.shelfOverride === 'reading' && allChaptersFinished(book, result)) delete result.shelfOverride;
 return result;
}
export function setBookShelf(book, saved, shelf) {
 if (!shelves.includes(shelf)) return saved;
 const result = {...saved, shelfOverride:shelf, chapters:{...saved.chapters}};
 // Deliberately reclassifying an already finished book starts a new cycle.
 // Keep every listening position, speed, reader offset and current-pass flag.
 if (shelf !== 'completed' && allChaptersFinished(book, saved)) {
  for (const ch of book.chapters) result.chapters[ch.chapterId] = {...result.chapters[ch.chapterId], completedOnce:false};
 }
 return result;
}
export function bookStatus(book, saved = {}) {
 if (saved.shelfOverride === 'unread' || saved.shelfOverride === 'completed') return saved.shelfOverride;
 if (allChaptersFinished(book, saved)) return 'completed';
 if (saved.shelfOverride === 'reading') return 'reading';
 // Metadata preloading can save an active chapter at zero. That is not reading.
 if (saved.started === true || saved.readChapter || book.chapters.some(ch => {
  const p = saved.chapters?.[ch.chapterId];
  return nonnegative(p?.positionSec) > 0 || nonnegative(p?.readingY) > 0 || p?.completed === true || p?.completedOnce === true;
 })) return 'reading';
 return 'unread';
}
