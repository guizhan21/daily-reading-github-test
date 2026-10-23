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
