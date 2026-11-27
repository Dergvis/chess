// Lists user-visible English strings in the game source for translation.
// Sources: strings from the original RU->EN dictionary that still occur in src,
// JSX text, user-facing JSX attributes, and sentence-like literals outside console calls.
const fs=require('fs'),path=require('path'),ts=require('typescript');
const known=new Set();
for(const n of fs.readdirSync('docs').filter(p=>/^en-\d+\.txt$/.test(p)))for(const l of fs.readFileSync('docs/'+n,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/)){const m=l.match(/^(\d+) (.*)$/);if(m)known.add(m[2].trim());}
for(const v of Object.values(JSON.parse(fs.readFileSync('docs/english-extra.json','utf8'))))known.add(String(v).trim());
const norm=s=>s.replace(/\s+/g,' ').trim();
const userAttr=new Set(['placeholder','aria-label','title','alt','label','aria-description']);
const found=new Map();
const add=(t,where)=>{t=norm(t);if(!/[A-Za-z]/.test(t)||t.length<2)return;if(!found.has(t))found.set(t,where);};
function inConsole(n){for(let p=n.parent;p;p=p.parent){if(ts.isCallExpression(p)){const e=p.expression.getText();if(/^console\.|^track\(|^emit|logEvent|captureException/.test(e))return true;}if(ts.isBlock(p)||ts.isSourceFile(p))return false;}return false;}
function sentence(t){return /[a-z]/.test(t)&&(/\s/.test(t)||/^[A-Z][a-z]{2,}[!.?]?$/.test(t))&&!/^[\w.-]+\/[\w./-]+$/.test(t)&&!/^(\.|#|\[|@|--|var\(|rgba?\(|url\(|translate|scale|rotate|linear-gradient|radial-gradient|cubic-bezier)/.test(t)&&!/^[a-z0-9-]+( [a-z0-9-]+)*$/.test(t)&&!/^[a-z]+[A-Z]\w*$/.test(t);}
function visitFile(p){
 const text=fs.readFileSync(p,'utf8'),sf=ts.createSourceFile(p,text,99,true),rel=path.relative('.',p).split(path.sep).join('/');
 (function v(n){
  if(ts.isJsxText(n)){add(n.text,rel);}
  else if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)||ts.isTemplateHead(n)||ts.isTemplateMiddle(n)||ts.isTemplateTail(n)){
   const t=norm(n.text);const par=n.parent;
   if(ts.isImportDeclaration(par)||ts.isExportDeclaration(par)||(par&&ts.isExternalModuleReference&&ts.isExternalModuleReference(par))){}
   else if(par&&ts.isJsxAttribute(par)){const name=par.name.getText();if(userAttr.has(name))add(t,rel);}
   else if(par&&ts.isJsxExpression(par)&&par.parent&&ts.isJsxAttribute(par.parent)){const name=par.parent.name.getText();if(userAttr.has(name)||known.has(t))add(t,rel);}
   else if(known.has(t))add(t,rel);
   else if(!inConsole(n)&&sentence(t)&&!(par&&(ts.isElementAccessExpression(par)||ts.isPropertyAssignment(par)&&par.name===n)))add(t,rel);
  }
  ts.forEachChild(n,v);})(sf);
}
function walkJson(v,rel){if(typeof v==='string'){if(known.has(norm(v))||sentence(v))add(v,rel);}else if(Array.isArray(v))v.forEach(x=>walkJson(x,rel));else if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){if(['id','family','skill','type','fen','player','source','tags','solutions','choices','line','kind','eventName','animation','sound','video','key','src','icon','image'].includes(k))continue;walkJson(x,rel);}}
(function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory()){walk(p);continue;}if(/\.test\./.test(f))continue;if(/\.tsx?$/.test(f))visitFile(p);else if(f.endsWith('.json')&&!/quick-challenge/.test(f))walkJson(JSON.parse(fs.readFileSync(p,'utf8')),path.relative('.',p).split(path.sep).join('/'));}})('src');
const out=[...found].sort((a,b)=>a[1].localeCompare(b[1])||a[0].localeCompare(b[0])).map(([en,file])=>({en,file}));
fs.writeFileSync('docs/i18n/strings.json',JSON.stringify(out,null,1));
const byFile={};for(const o of out)byFile[o.file]=(byFile[o.file]||0)+1;
console.log('strings',out.length);console.log(Object.entries(byFile).sort((a,b)=>b[1]-a[1]).slice(0,40).map(([f,c])=>c+' '+f).join('\n'));
