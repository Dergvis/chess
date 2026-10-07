import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=readFileSync(new URL('../src/googleAnalytics.ts',import.meta.url),'utf8').replace("import './googleAnalytics.css';",'');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function run(host='www.chezzies.app',saved=null){
 const elements=[],scripts=[],storage=new Map(saved?[['chezzies-google-analytics-consent-v1',saved]]:[]);
 const create=tag=>{const e={tag,children:[],removed:false,setAttribute(){},append(...children){this.children.push(...children);},remove(){this.removed=true;}};elements.push(e);return e;};
 const location={hostname:host,href:`https://${host}/play/reset-password/?token=private#private`,pathname:'/play/reset-password/',reload(){this.reloaded=true;}};
 const window={addEventListener(){}};
 const context={exports:{},window,location,URL,document:{title:'Play CHEZZIES',cookie:'',createElement:create,head:{append(s){scripts.push(s);}},body:{append(){}}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
 vm.runInNewContext(code,context);
 return {...context,elements,scripts,storage};
}
test('Google sends nothing before consent, or on preview domains',()=>{
 for(const c of [run(),run('www.chezzies.app','denied'),run('example.vercel.app','granted')]){
  c.exports.trackGoogle('game_start',{source:'direct',landing_page:'/play/'});
  assert.equal(c.scripts.length,0);assert.equal(c.window.dataLayer,undefined);
 }
});
test('Consent loads the requested tag once and strips sensitive URLs',()=>{
 const c=run();c.elements.find(e=>e.textContent==='Allow analytics').onclick();
 assert.equal(c.scripts.length,1);assert.ok(c.scripts[0].src.endsWith('G-NCWBHEH877'));
 c.exports.trackGoogle('puzzle_complete',{source:'google',landing_page:'/play/'});
 const queue=c.window.dataLayer.map(x=>Array.from(x));
 assert.equal(queue.filter(x=>x[0]==='config').length,1);
 assert.ok(!JSON.stringify(queue).includes('private'));
 assert.ok(queue.some(x=>x[1]==='puzzle_complete'));
 assert.equal(queue.find(x=>x[0]==='config')[2].allow_google_signals,false);
});
test('Revocation disables measurement and reloads without the tag',()=>{
 const c=run('chezzies.app','granted');
 c.elements.find(e=>e.textContent==='Privacy settings').onclick();
 c.elements.find(e=>e.textContent==='No thanks').onclick();
 assert.equal(c.window['ga-disable-G-NCWBHEH877'],true);
 assert.equal(c.storage.get('chezzies-google-analytics-consent-v1'),'denied');
 assert.equal(c.location.reloaded,true);
});
