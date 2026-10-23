import {test} from 'node:test';import assert from 'node:assert/strict';
import {syncIncomingReceipts} from '../scripts/intake-state.mjs';
const receipt={downloadJobId:'job',bookId:'book',zipSha256:'a'.repeat(64),receipt:'verified',import:'complete',generation:'complete',download:'verified',publication:'catalog_ready'};
test('a completed book clears stale awaiting-audio receipt presentation',()=>{
 const row={downloadJobId:receipt.downloadJobId,bookId:receipt.bookId,zipSha256:receipt.zipSha256,generation:'awaiting_audio',publication:'awaiting_audio',sourcePublicationDate:'2026-10-22',receivedDate:'2026-10-23',problems:[]};
 syncIncomingReceipts({incoming:[row],receipts:[receipt]},'server-checkpoint');
 assert.equal(row.publication,'catalog_ready');assert.equal(row.generation,'complete');assert.equal(row.updatedAt,'server-checkpoint');assert.equal(row.sourcePublicationDate,'2026-10-22');assert.equal(row.receivedDate,'2026-10-23');assert.deepEqual(row.problems,[]);
});
test('another ZIP or book cannot make a pending receipt look published',()=>{
 const rows=[{downloadJobId:'job',bookId:'book',zipSha256:'b'.repeat(64),publication:'waiting_book'},{downloadJobId:'job',bookId:'other',zipSha256:receipt.zipSha256,publication:'waiting_book'}];
 const before=structuredClone(rows);syncIncomingReceipts({incoming:rows,receipts:[receipt]});assert.deepEqual(rows,before);
});
test('unverified or absent receipts keep real waiting state',()=>{
 const row={downloadJobId:'job',bookId:'book',zipSha256:receipt.zipSha256,publication:'waiting_book'};
 syncIncomingReceipts({incoming:[row],receipts:[{...receipt,receipt:'pending'}]});assert.equal(row.publication,'waiting_book');assert.equal(syncIncomingReceipts({receipts:[]}).incoming,undefined);
});
