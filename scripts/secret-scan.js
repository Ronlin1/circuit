import { readFileSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { repositoryFiles } from './repository-files.js';

const RULES=[
  {name:'GITHUB_TOKEN',regex:/\b(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g},
  {name:'OPENAI_KEY',regex:/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g},
  {name:'AWS_ACCESS_KEY',regex:/\bAKIA[A-Z0-9]{16}\b/g},
  {name:'PRIVATE_KEY',regex:/-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----/g},
  {name:'SENSITIVE_ENV',regex:/^\s*(?:BINANCE_MCP_BEARER_TOKEN|BINANCE_API_SECRET|BINANCE_SECRET_KEY|OPENAI_API_KEY|GITHUB_TOKEN)\s*=\s*([A-Za-z0-9._-]{8,})\s*$/gm,valueGroup:1}
];
const SAFE_VALUES=new Set(['your-token-here','changeme','placeholder','example-token','example']);
function lineOf(text,index){return text.slice(0,index).split('\n').length;}
export function scanText(text,file='unknown'){
  const findings=[];
  for(const rule of RULES){rule.regex.lastIndex=0;let match;while((match=rule.regex.exec(text))){const value=rule.valueGroup?match[rule.valueGroup]:match[0];if(SAFE_VALUES.has(String(value).toLowerCase()))continue;findings.push({file,line:lineOf(text,match.index),rule:rule.name});if(match.index===rule.regex.lastIndex)rule.regex.lastIndex++;}}
  return findings;
}
export function scanRepository(){
  const findings=[];
  for(const file of repositoryFiles()){
    try{if(statSync(file).size>1_000_000)continue;const text=readFileSync(file,'utf8');findings.push(...scanText(text,file));}catch{}
  }
  return findings;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const findings=scanRepository();
  if(findings.length){console.error(`CIRCUIT secret scan failed: ${findings.length} finding(s).`);for(const f of findings)console.error(`- ${f.file}:${f.line} [${f.rule}]`);process.exit(1);}console.log('CIRCUIT secret scan: clean');
}
