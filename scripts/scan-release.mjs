import {spawnSync} from 'node:child_process';import {readFile,writeFile} from 'node:fs/promises';import {parseEnv} from 'node:util';
const run=(args)=>{const result=spawnSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024});if(result.status!==0)throw new Error('Could not inspect release index.');return result.stdout;};
const files=run(['ls-files','-z']).split('\0').filter(Boolean);
let secrets=[];try{secrets=Object.entries(parseEnv(await readFile('.env','utf8'))).filter(([key,value])=>/KEY|TOKEN|SECRET|ACCESS_CODE/.test(key)&&value.length>=8).map(([,value])=>value);}catch{}
const issues=[];
for(const file of files){if(/(^|\/)(\.env($|\.)|\.data|node_modules|dist)(\/|$)/.test(file)&&file!=='.env.example')issues.push(file+': private/generated path');const data=run(['show',':'+file]);if(secrets.some(secret=>data.includes(secret)))issues.push(file+': matches local credential');if(/github_pat_[A-Za-z0-9_]{40,}|gh[pousr]_[A-Za-z0-9]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{32,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(data))issues.push(file+': credential pattern');}
if(issues.length)throw new Error('Release scan failed: '+issues.join('; '));
const result={checkedAt:new Date().toISOString(),files:files.length,localCredentialMatches:0,credentialPatternMatches:0,privatePaths:0};console.log(JSON.stringify(result));await writeFile('artifacts/release-scan.json',JSON.stringify(result,null,2));
