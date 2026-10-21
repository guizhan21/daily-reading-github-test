import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {root} from '../scripts/catalog.mjs';
import {readStagedFile} from '../scripts/git-staged.mjs';
const cache=path.join(root,'.tmp');fs.mkdirSync(cache,{recursive:true});
const fixture=fs.mkdtempSync(path.join(cache,'staged-cover-'));
execFileSync('git',['init','-q'],{cwd:fixture,windowsHide:true});
function stage(name,bytes){fs.writeFileSync(path.join(fixture,name),bytes);execFileSync('git',['add','--',name],{cwd:fixture,windowsHide:true});}
after(()=>{if(path.dirname(fixture)!==cache||fs.realpathSync(fixture)!==fixture)throw Error('Unsafe fixture cleanup');fs.rmSync(fixture,{recursive:true,force:true});});
test('a staged 3 MiB image cover retains its complete bytes',()=>{const bytes=Buffer.alloc(3*1024*1024,17);stage('cover.png',bytes);assert.deepEqual(readStagedFile(fixture,'cover.png'),bytes);});
test('oversize image is rejected before a binary buffer error',()=>{stage('oversize.png',Buffer.alloc(9*1024*1024));assert.throws(()=>readStagedFile(fixture,'oversize.png'),e=>e.message.includes('Unexpected large Git file')&&!e.message.includes('ENOBUFS'));});
test('non-image files keep the original two-million-byte limit',()=>{stage('large.js',Buffer.alloc(2_000_001));assert.throws(()=>readStagedFile(fixture,'large.js'),/Unexpected large Git file/);});
test('partial staging inspects index bytes rather than changed working bytes',()=>{stage('note.txt','reviewed content');fs.writeFileSync(path.join(fixture,'note.txt'),'different working content');assert.equal(readStagedFile(fixture,'note.txt').toString(),'reviewed content');});
