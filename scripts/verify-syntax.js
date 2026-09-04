import { execFileSync } from 'node:child_process';
import { repositoryFiles } from './repository-files.js';

const files=repositoryFiles().filter(file=>file.endsWith('.js'));
for(const file of files)execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
console.log(`Syntax check: ${files.length} JavaScript files clean`);
