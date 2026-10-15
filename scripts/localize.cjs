const fs=require('fs'),path=require('path'),ts=require('typescript');
const inventory=JSON.parse(fs.readFileSync('docs/translation-inventory.json','utf8'));
const dict=new Map();for(const name of fs.readdirSync('docs').filter(p=>/^en-\d+\.txt$/.test(p))){for(const line of fs.readFileSync('docs/'+name,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/)){const m=line.match(/^(\d+) (.*)$/);if(!m)throw Error('Invalid translation '+line);const key=inventory[+m[1]];if(!key)throw Error('Missing key '+m[1]);dict.set(key,m[2]);}}
if(dict.size!==inventory.length)throw Error(`Translation count ${dict.size}/${inventory.length}`);
const extras=fs.existsSync('docs/english-extra.json')?JSON.parse(fs.readFileSync('docs/english-extra.json','utf8')):{};
for(const [k,v] of Object.entries(extras))dict.set(k,v);
const norm=s=>s.replace(/\s+/g,' ').trim();const normalized=new Map([...dict].map(([k,v])=>[norm(k),v]));
function translate(t){const x=normalized.get(norm(t));if(x===undefined)return null;const before=t.match(/^\s*/)[0],after=t.match(/\s*$/)[0];return before+x+after;}
const missing=new Map();
function walk(dir){for(const name of fs.readdirSync(dir)){const p=path.join(dir,name);if(fs.statSync(p).isDirectory()){walk(p);continue;}if(/\.test\./.test(name))continue;if(/\.tsx?$/.test(name)){
 const text=fs.readFileSync(p,'utf8'),sf=ts.createSourceFile(p,text,99,true),edits=[];
 function visit(n){if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)||ts.isJsxText(n)||ts.isTemplateHead(n)||ts.isTemplateMiddle(n)||ts.isTemplateTail(n)){
  if(/[а-яё]/i.test(n.text)&&!/^\//.test(n.text)&&!n.text.includes('.png')&&!n.text.includes('.mp4')){const en=translate(n.text);if(en===null){missing.set(n.text.trim(),p);}else{const start=n.getStart(sf),end=n.end;let value;if(ts.isJsxText(n)){value=en.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('{','&#123;');edits.push([n.pos,end,value]);}else if(ts.isStringLiteral(n)){value=JSON.stringify(en);edits.push([start,end,value]);}else{value=en.replaceAll('\\','\\\\').replaceAll('`','\\`').replaceAll('${','\\${');const raw=text.slice(start,end),prefix=raw[0],suffix=ts.isTemplateHead(n)||ts.isTemplateMiddle(n)?'${':'`';edits.push([start,end,prefix+value+suffix]);}}}
 }ts.forEachChild(n,visit);}visit(sf);let out=text;for(const [a,b,v]of edits.sort((a,b)=>b[0]-a[0]))out=out.slice(0,a)+v+out.slice(b);fs.writeFileSync(p,out);
 }else if(name.endsWith('.json')){const data=JSON.parse(fs.readFileSync(p,'utf8'));function visit(v){if(typeof v==='string'){if(!/[а-яё]/i.test(v)||v.startsWith('/')||/\.(png|mp4)$/.test(v))return v;const en=translate(v);if(en===null)missing.set(v,p);return en??v;}if(Array.isArray(v))return v.map(visit);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,val])=>[k,visit(val)]));return v;}fs.writeFileSync(p,JSON.stringify(visit(data),null,2));}
}}
walk('src');fs.writeFileSync('docs/translation-remaining.json',JSON.stringify([...missing],null,2));console.log('Untranslated unique strings:',missing.size);
