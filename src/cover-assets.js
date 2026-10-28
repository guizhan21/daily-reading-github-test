// Display derivatives are only for cards. Detail, player and media metadata
// retain the original cover; catalog objects and progress keys stay unchanged.
export function cardCoverPath(book){
 if(book.coverKind==='original-template')return book.cover;
 if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,100}$/.test(book.bookId)||!/^\d+$/.test(String(book.version)))throw Error('Invalid cover identity');
 return 'covers/cards/'+book.bookId+'-v'+book.version+'.webp';
}
