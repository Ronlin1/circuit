import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const IGNORED_DIRS=new Set(['.git','node_modules','.vercel','.netlify','coverage','.data']);

function walk(root,current=root,files=[]){
  for(const entry of readdirSync(current,{withFileTypes:true})){
    if(entry.isDirectory()&&IGNORED_DIRS.has(entry.name))continue;
    const full=join(current,entry.name);
    if(entry.isDirectory())walk(root,full,files);
    else if(entry.isFile())files.push(relative(root,full).split('\\').join('/'));
  }
  return files;
}

export function repositoryFiles(root=process.cwd()){
  try{
    return execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']})
      .split('\0').filter(Boolean);
  }catch{
    return walk(root).sort();
  }
}
