// Keep the pre-import receipt view consistent with canonical chapter/publication state.
export function syncIncomingReceipts(ledger,now=new Date().toISOString()){
 for(const row of ledger.incoming||[]){
  const receipt=ledger.receipts.find(r=>r.downloadJobId===row.downloadJobId&&r.bookId===row.bookId&&r.zipSha256===row.zipSha256&&r.receipt==='verified');
  if(!receipt)continue;
  Object.assign(row,{import:receipt.import,generation:receipt.generation,download:receipt.download,publication:receipt.publication,updatedAt:now});
 }
 return ledger;
}
