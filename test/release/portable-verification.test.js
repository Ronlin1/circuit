import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot=resolve(import.meta.dirname,'../..');
const syntaxScript=join(repoRoot,'scripts/verify-syntax.js');
const secretScript=join(repoRoot,'scripts/secret-scan.js');

function withExportedTree(fn){
  const root=mkdtempSync(join(tmpdir(),'circuit-export-'));
  try{
    mkdirSync(join(root,'src'),{recursive:true});
    writeFileSync(join(root,'src','good.js'),'export const ok = true;\n');
    writeFileSync(join(root,'README.md'),'CIRCUIT exported source\n');
    fn(root);
  }finally{rmSync(root,{recursive:true,force:true});}
}

test('syntax verification works on an exported source tree without Git metadata',()=>{
  withExportedTree(root=>{
    const result=spawnSync(process.execPath,[syntaxScript],{cwd:root,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr||result.stdout);
    assert.match(result.stdout,/1 JavaScript files clean/);
  });
});

test('secret scan works on an exported source tree without Git metadata and still detects secrets',()=>{
  withExportedTree(root=>{
    let result=spawnSync(process.execPath,[secretScript],{cwd:root,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr||result.stdout);
    writeFileSync(join(root,'leak.txt'),'GITHUB_TOKEN=ghp_'+'1234567890abcdefghijklmnopqrstuvwxyzABCD\n');
    result=spawnSync(process.execPath,[secretScript],{cwd:root,encoding:'utf8'});
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/GITHUB_TOKEN/);
  });
});
