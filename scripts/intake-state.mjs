// A delayed delivery retains its original daily slot while recording the real receipt date.
export function intakeDates({publicationDate,receivedDate=publicationDate,slotDate=receivedDate}){
 const valid=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
 for(const value of [publicationDate,receivedDate,slotDate])if(!valid(value))throw Error('Invalid publication, receipt or daily slot date');
 if(slotDate>receivedDate)throw Error('Daily slot cannot be after receipt date');
 return {publicationDate,receivedDate,slotDate};
}
// Keep the pre-import receipt view consistent with canonical chapter/publication state.
export function syncIncomingReceipts(ledger,now=new Date().toISOString()){
 for(const row of ledger.incoming||[]){
  const receipt=ledger.receipts.find(r=>r.downloadJobId===row.downloadJobId&&r.bookId===row.bookId&&r.zipSha256===row.zipSha256&&r.receipt==='verified');
  if(!receipt)continue;
  Object.assign(row,{import:receipt.import,generation:receipt.generation,download:receipt.download,publication:receipt.publication,updatedAt:now});
 }
 return ledger;
}
