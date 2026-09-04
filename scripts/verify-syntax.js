import { execFileSync } from 'node:child_process';
const files=execFileSync('git',['ls-files','*.js'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
for(const file of files)execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
console.log(`Syntax check: ${files.length} JavaScript files clean`);
