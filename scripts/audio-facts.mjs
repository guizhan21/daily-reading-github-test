import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inside} from './local-paths.mjs';
import {resolveChapterSource,assertProviderActionAllowed,canonicalSource} from './chapter-source-versions.mjs';
import {DedupStore,durable} from './dedup.mjs';

export const sha = value => createHash('sha256').update(value).digest('hex');

export function loadFacts(workspace, chapter, state) {
 const context=resolveChapterSource(workspace,chapter,state);state=context.state;
 const directory = path.dirname(inside(workspace, state.sourcePath));
 const file = path.join(directory, 'fact_constraints.json');
 if (!fs.existsSync(file)) throw Error('Read the full chapter and create fact_constraints.json before generation');
 const bytes = fs.readFileSync(inside(workspace, file));
 const facts = JSON.parse(bytes);
 const source = fs.readFileSync(inside(workspace, state.sourcePath));
 if (facts.chapterId !== chapter.id || facts.sourceSha256 !== sha(source)) throw Error('Fact constraints are for a different source');
 validateFactConstraints(chapter.id,source,facts);
 return {directory, facts, digest:sha(bytes),binding:context.binding,generationChapter:context.chapter};
}

export function validateFactConstraints(chapterId,source,facts){
 if(facts.chapterId!==chapterId||facts.sourceSha256!==sha(source))throw Error('Fact constraints are for a different source');
 const lines = source.toString('utf8').split(/\r?\n/);
 const bodyEnd = lines.findIndex(line => line.startsWith('## 本章實際查閱來源'));
 const expected = lines.slice(0, bodyEnd < 0 ? lines.length : bodyEnd)
  .flatMap((line, index) => line.trim() && !/^\s*#/.test(line) && !/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line) &&
   !/^\s*[-*]\s+\[(?:S|R)\d+\].*https:\/\//.test(line) ? [index + 1] : []);
 if (!expected.length || !Array.isArray(facts.paragraphs) || facts.paragraphs.map(row => row.line).join() !== expected.join()) throw Error('Fact constraints must cover every source body line in order');
 for (const row of facts.paragraphs) {
  if (!row.quote || !lines[row.line - 1].includes(row.quote) ||
   !['fact','conclusion','condition','terms','exclude','pitfall'].every(key => typeof row[key] === 'string' && row[key].trim())) throw Error('Incomplete or untraceable fact constraints');
 }
 return true;
}

export function buildFactPrompt(chapter, facts, corrections = []) {
 if(typeof chapter.prompt!=='string'||!chapter.prompt.trim())throw Error('Original chapter prompt required');
 const prompt=[
  '【原章提示全文；保留章別對象、案例、限制與風格】',chapter.prompt,
  '【本次查證綁定的逐段約束；不增加原稿之外的素材】',
  '用臺灣繁體中文，以雙主持人自然問答講解「'+chapter.title+'」。依下列順序，用自己的話串聯，不朗讀這份指令。問答可釐清已列出的差異，不新增事例、研究、數據、技術機制或操作建議。保留條件與不確定性，不將相關改說成因果。',
  ...facts.paragraphs.map(row => row.line+'｜'+row.fact+' '+row.conclusion+' 條件：'+row.condition+'。術語：'+row.terms+'。略過：'+row.exclude+'。避免：'+row.pitfall+'。'),
  ...corrections,
 ].join('\n')+'\n';
 if(prompt.length>5000)throw Error('Full original prompt and source outline exceed 5000 characters; do not truncate');
 return prompt;
}

export function loadWebReview(workspace, chapter, state) {
 const {directory, facts, digest} = loadFacts(workspace, chapter, state);
 const bytes = fs.readFileSync(inside(workspace, path.join(directory, 'source-web-review.json')));
 const review = JSON.parse(bytes);
 const nonempty = value => typeof value === 'string' && value.trim().length > 0;
 if (review.chapterId !== chapter.id || review.sourceSha256 !== facts.sourceSha256 ||
  review.constraintsSha256 !== digest || review.status !== 'PASS' ||
  !Array.isArray(review.coverage) || review.coverage.map(row => row.line).join() !== facts.paragraphs.map(row => row.line).join()) throw Error('Current chapter web review required');
 let verified = 0;
 for (const row of review.coverage) {
  if (!nonempty(row.explanation)) throw Error('Explain each source review decision');
  if (row.status === 'not_factual') {if(row.claims?.length||row.documentaryChecks?.length)throw Error('Mixed factual claims cannot be exempted');continue;}
  if(row.documentaryChecks?.some(c=>c.status!=='CROSS_CHECKED'))throw Error('Unverified documentary assertion remains');
  if (row.status !== 'verified' || !Array.isArray(row.claims) || !row.claims.length) throw Error('Unverified source claims cannot enter NotebookLM');
  for (const claim of row.claims) {
   if (!nonempty(claim.text) || !nonempty(claim.conclusion) || !Array.isArray(claim.sources)) throw Error('Claim-specific web evidence required');
   const publishers = new Set(), hosts = new Set();
   for (const source of claim.sources) {
    const url = new URL(source.url);
    if (url.protocol !== 'https:' || url.username || url.password ||
     ![source.title,source.publisher,source.evidence].every(nonempty) || !Number.isFinite(Date.parse(source.accessedAt))) throw Error('Invalid web evidence');
    publishers.add(source.publisher.trim().toLowerCase());
    hosts.add(url.hostname.replace(/^www\./,''));
   }
   if (publishers.size < 2 || hosts.size < 2) throw Error('Two independent sources required for each factual claim');
   verified++;
  }
 }
 if (!verified) throw Error('At least one factual claim must be cross-checked');
 return {digest:sha(bytes)};
}

export function currentPlanInputs(workspace,chapter,state){
 canonicalSource(workspace,chapter,state);
 const facts=loadFacts(workspace,chapter,state),web=loadWebReview(workspace,chapter,state),context=resolveChapterSource(workspace,chapter,state);
 const store=new DedupStore(workspace),ledger=store.load(),book=ledger.entries.find(e=>e.bookId===chapter.book_id),canonical=book?.chapters.find(c=>c.chapterId===chapter.id);if(!book||canonical?.rawSha256!==sha(chapter.markdown)||canonical?.promptSha256!==sha(chapter.prompt))throw Error('Current canonical admission required');store.assert(book);
 if(context.manifest&&context.manifest.compiledPromptSha256!==sha(buildFactPrompt(chapter,facts.facts)))throw Error('Working manifest complete prompt differs from current compiler');
 return {...facts,web,binding:context.binding,workingAdmissionReceipt:context.admissionReceipt??null,admissionRevision:ledger.revision,prompt:buildFactPrompt(chapter,facts.facts),planPath:path.join(facts.directory,'fact-generation-v2.json')};
}
export function prepareGenerationPlan(workspace,chapter,state){
 if(!['pending','failed'].includes(state.status))throw Error('Resolve existing work before preparing a new generation');
 const current=currentPlanInputs(workspace,chapter,state),attempts=new Set(state.events.filter(e=>e.status==='generating'&&e.settingsVerified?.constraintsSha256).map(e=>e.generationSubmissionCount));if(attempts.size>=4)throw Error('Initial generation and three automatic retries exhausted');
 const promptFile=path.join(current.directory,'submitted-full-v2-'+(attempts.size+1)+'-'+sha(current.prompt).slice(0,16)+'.txt');
 if(fs.existsSync(promptFile)){if(fs.readFileSync(promptFile,'utf8')!==current.prompt)throw Error('Prepared full prompt differs');}else fs.writeFileSync(promptFile,current.prompt,{flag:'wx'});
 const plan={compilerVersion:'original-prompt-v2',sourceVersionBinding:current.binding,workingAdmissionReceipt:current.workingAdmissionReceipt,admissionRevision:current.admissionRevision,originalPromptSha256:sha(chapter.prompt),submittedPromptPath:path.relative(workspace,promptFile),submittedPromptSha256:sha(current.prompt),constraintsSha256:current.digest,webReviewSha256:current.web.digest};
 if(fs.existsSync(current.planPath)){const bytes=fs.readFileSync(current.planPath);if(bytes.toString('utf8')===JSON.stringify(plan,null,2)+'\n')return plan;const archive=path.join(current.directory,'plan-history',sha(bytes)+'.json');if(!fs.existsSync(archive)){fs.mkdirSync(path.dirname(archive),{recursive:true});fs.writeFileSync(archive,bytes,{flag:'wx'});}}
 durable(current.planPath,plan);return plan;
}
export function requireCurrentPlan(workspace,chapter,state,{providerAction=false,artifact=false}={}){
 if(providerAction)assertProviderActionAllowed(workspace,chapter.id);
 const current=currentPlanInputs(workspace,chapter,state),file=inside(workspace,current.planPath);
 if(!fs.existsSync(file))throw Error('Full original-prompt v2 plan required; legacy plan is invalid');const plan=JSON.parse(fs.readFileSync(file));
 if(plan.compilerVersion!=='original-prompt-v2'||JSON.stringify(plan.sourceVersionBinding)!==JSON.stringify(current.binding)||(!artifact&&(plan.admissionRevision!==current.admissionRevision||JSON.stringify(plan.workingAdmissionReceipt)!==JSON.stringify(current.workingAdmissionReceipt)))||plan.originalPromptSha256!==sha(chapter.prompt)||plan.constraintsSha256!==current.digest||plan.webReviewSha256!==current.web.digest||plan.submittedPromptSha256!==sha(current.prompt)||fs.readFileSync(inside(workspace,plan.submittedPromptPath),'utf8')!==current.prompt)throw Error('Current source, complete original prompt, facts, web review and admission required');
 return {...current,plan};
}
export function requireConfiguredPlan(workspace,chapter,state,proof){
 const {plan}=requireCurrentPlan(workspace,chapter,state,{providerAction:true});
 for(const key of ['compilerVersion','sourceVersionBinding','workingAdmissionReceipt','admissionRevision','originalPromptSha256','submittedPromptPath','submittedPromptSha256','constraintsSha256','webReviewSha256'])if(JSON.stringify(proof.settingsVerified?.[key])!==JSON.stringify(plan[key]))throw Error('Configured source or full prompt differs from active plan');
 if(proof.sourceCount!==1||!proof.sourceSelectionVerified)throw Error('One isolated selected source required');return plan;
}

export function requirePreverifiedArtifact(workspace, chapter, state, proof) {
 if(state.status!=='playable'||state.settingsVerified?.compilerVersion||state.sourceVersionBinding?.sourceVersionId&&state.sourceVersionBinding.sourceVersionId!=='canonical'){
  const {plan}=requireCurrentPlan(workspace,chapter,state,{artifact:true});
  if(JSON.stringify(state.settingsVerified?.sourceVersionBinding)!==JSON.stringify(plan.sourceVersionBinding)||JSON.stringify(proof.settingsVerified?.sourceVersionBinding)!==JSON.stringify(plan.sourceVersionBinding)||state.settingsVerified?.compilerVersion!=='original-prompt-v2'||state.settingsVerified?.submittedPromptSha256!==plan.submittedPromptSha256)throw Error('Artifact has another source version or incomplete prompt');
 }
 const {digest} = loadWebReview(workspace, chapter, state);
 if (state.artifactId !== proof.artifactId || state.notebookId !== proof.notebookId ||
  state.sourceId !== proof.sourceId || state.generationCompleted !== true ||
  state.settingsVerified?.webReviewSha256 !== digest ||
  !state.events.some(event => event.status === 'generating' &&
   event.settingsVerified?.webReviewSha256 === digest &&
   event.settingsVerified.submittedPromptSha256 === state.settingsVerified.submittedPromptSha256))
  throw Error('Artifact must originate from the recorded, web-verified source and prompt');
 return digest;
}

export function requireFactReview(workspace, chapter, state, proof, audioSha256) {
 const {directory, facts, digest} = loadFacts(workspace, chapter, state);
 const attempt = path.join(directory, 'attempts', proof.artifactId);
 if (!/^[a-f0-9-]{36}$/.test(proof.artifactId || '')) throw Error('Artifact identity required');
 const read = name => fs.readFileSync(inside(workspace, path.join(attempt, name)));
 const transcriptBytes = read('transcript.json');
 const transcript = JSON.parse(transcriptBytes);
 const review = JSON.parse(read('fact-review.json'));
 if (proof.artifactId !== state.artifactId || review.artifactId !== proof.artifactId ||
  review.audioSha256 !== audioSha256 || review.transcriptSha256 !== sha(transcriptBytes) ||
  review.constraintsSha256 !== digest || proof.settingsVerified?.constraintsSha256 !== digest ||
  review.textStatus !== 'PASS' || review.semanticStatus !== 'PASS' || !['PASS', 'UNVERIFIED'].includes(review.audioStatus) ||
  typeof review.audioMethod !== 'string' || !review.audioMethod.trim() ||
  !Array.isArray(review.findings) || !Array.isArray(review.audioChecks) ||
  (review.audioStatus === 'PASS' && review.audioChecks.length === 0) || !review.audioChecks.every(check => Number.isFinite(check.start) &&
   Number.isFinite(check.end) && check.start >= 0 && check.end > check.start && check.end <= transcript.duration &&
   (check.status === 'PASS' ? typeof check.heard === 'string' && check.heard.trim() : review.audioStatus === 'UNVERIFIED' && check.status === 'UNVERIFIED')) ||
  !Array.isArray(review.coverage) || review.coverage.map(row => row.line).join() !== facts.paragraphs.map(row => row.line).join() ||
  !review.coverage.every(row => ['PASS', 'MINOR'].includes(row.status) && typeof row.explanation === 'string' && row.explanation.trim() && Number.isInteger(row.segment) && transcript.segments[row.segment]) ||
  review.findings.some(row => !row.sourceBasis || !row.generated || !row.type || !row.severity || !row.correction ||
   (row.severity === 'material' && (row.resolved !== true || (review.audioStatus === 'PASS' && !review.audioChecks.some(check => check.start <= row.start && check.end >= row.end)))))) throw Error('Source, transcript, semantic and original audio review must pass for this artifact');
}

export function requireFactSubmission(workspace, chapter, state, proof) {
 const {digest} = loadFacts(workspace,chapter,state);
 const web = loadWebReview(workspace,chapter,state);
 const plan = requireConfiguredPlan(workspace,chapter,state,proof);
 const prompt = fs.readFileSync(inside(workspace,plan.submittedPromptPath));
 const prior = new Set(state.events.filter(event => event.status === 'generating' &&
  event.settingsVerified?.constraintsSha256).map(event => event.generationSubmissionCount));
 if (prior.size >= 4 || state.status !== 'source_ready' ||
  plan.webReviewSha256 !== web.digest || proof.settingsVerified?.webReviewSha256 !== web.digest ||
  state.settingsVerified?.webReviewSha256 !== web.digest ||
  proof.generationSubmissionCount !== (state.generationSubmissionCount || 0)+1 ||
  proof.settingsVerified?.constraintsSha256 !== digest || plan.constraintsSha256 !== digest ||
  proof.settingsVerified.submittedPromptPath !== plan.submittedPromptPath ||
  proof.settingsVerified.submittedPromptSha256 !== sha(prompt) || plan.submittedPromptSha256 !== sha(prompt) ||
  state.settingsVerified?.submittedPromptSha256 !== sha(prompt)) throw Error('Current fact plan, configured prompt and remaining attempts required');
}
