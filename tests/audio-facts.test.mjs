import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {sha,loadFacts,loadWebReview,requireFactReview,requireFactSubmission,requirePreverifiedArtifact,prepareGenerationPlan} from '../scripts/audio-facts.mjs';
import {DedupStore,candidateOf} from '../scripts/dedup.mjs';

test('Markdown dividers are not facts, but every substantive line still requires coverage',t=>{
 const workspace=fs.mkdtempSync(path.join(path.dirname(import.meta.filename),'audio-facts-test-'));
 t.after(()=>fs.rmSync(workspace,{recursive:true}));
 const source='# Chapter\n\nA supported statement.\n\n---\n\nAnother supported statement.\n\n## 本章實際查閱來源\n\n- [S01] Source https://example.org/source\n';
 fs.writeFileSync(path.join(workspace,'source.md'),source);
 const row=line=>({line,quote:line===3?'A supported statement.':'Another supported statement.',fact:'Supported statement',conclusion:'Preserve meaning',condition:'Keep conditions',terms:'No new definitions',exclude:'No new facts',pitfall:'Do not overgeneralize'});
 const facts={chapterId:'chapter',sourceSha256:sha(source),paragraphs:[row(3),row(7)]};
 fs.writeFileSync(path.join(workspace,'fact_constraints.json'),JSON.stringify(facts));
 assert.equal(loadFacts(workspace,{id:'chapter'},{sourcePath:'source.md'}).facts.paragraphs.length,2);
 facts.paragraphs.pop();fs.writeFileSync(path.join(workspace,'fact_constraints.json'),JSON.stringify(facts));
 assert.throws(()=>loadFacts(workspace,{id:'chapter'},{sourcePath:'source.md'}),/cover every/);
});

test('R bibliography URL rows are excluded while in-body R citations and non-reference bullets remain required',t=>{
 const workspace=fs.mkdtempSync(path.join(path.dirname(import.meta.filename),'audio-facts-test-'));
 t.after(()=>fs.rmSync(workspace,{recursive:true}));
 const source='# Chapter\n\nFact with [R01].\n\n- Important non-reference claim.\n\n## 本章參考資料\n- [R01] Original source https://example.org/reference\n';
 fs.writeFileSync(path.join(workspace,'source.md'),source);
 const row=line=>({line,quote:source.split('\n')[line-1],fact:'Covered body',conclusion:'Preserve meaning',condition:'Limited scope',terms:'Original terms',exclude:'No additions',pitfall:'No overstatement'});
 const facts={chapterId:'chapter',sourceSha256:sha(source),paragraphs:[row(3),row(5)]};
 fs.writeFileSync(path.join(workspace,'fact_constraints.json'),JSON.stringify(facts));
 assert.equal(loadFacts(workspace,{id:'chapter'},{sourcePath:'source.md'}).facts.paragraphs.length,2);
 for(const omitted of[3,5]){fs.writeFileSync(path.join(workspace,'fact_constraints.json'),JSON.stringify({...facts,paragraphs:facts.paragraphs.filter(r=>r.line!==omitted)}));assert.throws(()=>loadFacts(workspace,{id:'chapter'},{sourcePath:'source.md'}),/cover every/);}
});

test('gates bind the source, attempt, audio, transcript and original-audio review', t => {
 const workspace=fs.mkdtempSync(path.join(path.dirname(import.meta.filename),'audio-facts-test-'));
 t.after(()=>fs.rmSync(workspace,{recursive:true}));
 const write=(name,value)=>fs.writeFileSync(path.join(workspace,name),typeof value==='string'?value:JSON.stringify(value));
 const artifactId='81779f28-f0d1-4d85-b684-31ed9a8f38c3';
 const attempt='attempts/'+artifactId;
 fs.mkdirSync(path.join(workspace,attempt),{recursive:true});
 const chapter={id:'chapter',book_id:'book',title:'Fixture chapter',markdown:'# Title\n\nA source fact.\n',prompt:'Original fixture audience and case'};chapter.content_hash=sha(chapter.markdown+'\0'+chapter.prompt);
 const state={chapterId:chapter.id,bookId:'book',sourcePath:'source.md',promptPath:'original-prompt.txt',contentHash:chapter.content_hash,sourceSha256:sha(chapter.markdown),promptSha256:sha(chapter.prompt),artifactId,status:'pending',events:[]};
 write('original-prompt.txt',chapter.prompt);const book={id:'book',version:1,title:'Synthetic fixture'};new DedupStore(workspace).initialize([{...candidateOf(book,[chapter]),historical:true}],{});
 write('source.md','# Title\n\nA source fact.\n');
 const facts={chapterId:chapter.id,sourceSha256:sha('# Title\n\nA source fact.\n'),paragraphs:[]};
 write('fact_constraints.json',facts);
 assert.throws(()=>loadFacts(workspace,chapter,state),/cover every/);
 facts.paragraphs.push({line:3,quote:'A source fact.',fact:'fact',conclusion:'conclusion',condition:'condition',terms:'terms',exclude:'exclude',pitfall:'pitfall'});
 write('fact_constraints.json',facts);
 const constraintsSha256=loadFacts(workspace,chapter,state).digest;
 assert.throws(()=>loadWebReview(workspace,chapter,state),{code:'ENOENT'});
 const evidence={title:'Fixture',publisher:'Publisher A',evidence:'Relevant passage',accessedAt:'2026-11-04',url:'https://a.example/fact'};
 const claim={text:'A source fact.',conclusion:'Supported',sources:[evidence,{...evidence,url:'https://a.example/mirror'}]};
 const webReview={chapterId:chapter.id,sourceSha256:facts.sourceSha256,constraintsSha256,status:'PASS',coverage:[{line:3,status:'verified',explanation:'Fixture',claims:[claim]}]};
 write('source-web-review.json',webReview);
 assert.throws(()=>loadWebReview(workspace,chapter,state),/independent sources/);
 claim.sources[1]={...evidence,publisher:'Publisher B',url:'https://b.example/fact'};
 write('source-web-review.json',webReview);
 const settings=prepareGenerationPlan(workspace,chapter,state);state.status='source_ready';
 state.settingsVerified=settings;
 const proof={artifactId,settingsVerified:settings,generationSubmissionCount:1,sourceCount:1,sourceSelectionVerified:true};
 requireFactSubmission(workspace,chapter,state,proof);
 state.events=Array.from({length:4},(_,index)=>({status:'generating',settingsVerified:settings,generationSubmissionCount:index+1}));
 assert.throws(()=>requireFactSubmission(workspace,chapter,state,proof),/remaining attempts/);
 Object.assign(state,{generationCompleted:true,notebookId:'notebook',sourceId:'source'});
 Object.assign(proof,{notebookId:'notebook',sourceId:'source'});
 assert.equal(requirePreverifiedArtifact(workspace,chapter,state,proof),settings.webReviewSha256);
 assert.throws(()=>requirePreverifiedArtifact(workspace,chapter,state,{...proof,artifactId:'wrong'}),/recorded/);
 write('source-web-review.json',{...webReview,sourceSha256:sha('different source')});
 assert.throws(()=>requirePreverifiedArtifact(workspace,chapter,state,proof),/Current chapter/);
 const transcript={duration:10,segments:[{text:'A source fact.'}]};
 write(attempt+'/transcript.json',transcript);
 const review={artifactId,audioSha256:'audio-hash',constraintsSha256,transcriptSha256:sha(JSON.stringify(transcript)),
  textStatus:'PASS',semanticStatus:'PASS',audioStatus:'UNVERIFIED',audioMethod:'Fixture review',
  audioChecks:[{start:0,end:2,status:'PASS',heard:'A source fact.'}],findings:[],
  coverage:[{line:3,segment:0,status:'PASS',explanation:'Matches source.'}]};
 write(attempt+'/fact-review.json',review);
 requireFactReview(workspace,chapter,state,proof,'audio-hash');
 review.audioStatus='FAIL';
 write(attempt+'/fact-review.json',review);
 assert.throws(()=>requireFactReview(workspace,chapter,state,proof,'audio-hash'),/must pass/);
 review.audioStatus='PASS';
 write(attempt+'/fact-review.json',review);
 requireFactReview(workspace,chapter,state,proof,'audio-hash');
 assert.throws(()=>requireFactReview(workspace,chapter,state,proof,'other-audio'),/must pass/);
 write(attempt+'/transcript.json',{...transcript,duration:11});
 assert.throws(()=>requireFactReview(workspace,chapter,state,proof,'audio-hash'),/must pass/);
});
