import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {supportBoard,boardLine} from '../api/_stats.mjs';

const require=createRequire(import.meta.url);
const code=ts.transpileModule(readFileSync(new URL('../src/features/game/moveReason.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};vm.runInNewContext(code,{module:mod,exports:mod.exports,require});
const {explainMove,castleByRook,reasonText}=mod.exports;
const why=(fen,from,to)=>explainMove(fen,from,to)?.reason??null;

test('Castling: rights lost, pieces in between, through check',()=>{
 assert.equal(why('r3k2r/8/8/8/8/8/8/R3K2R w kq - 0 1','e1','c1'),'castle_moved');
 assert.equal(why('r3k2r/8/8/8/8/8/8/R3K2R w Kkq - 0 1','e1','a1'),'castle_moved');
 assert.equal(why('r3k2r/8/8/8/8/8/8/RN2K2R w KQkq - 0 1','e1','c1'),'castle_blocked');
 assert.equal(why('r3k2r/8/8/8/8/8/8/RN2K2R w KQkq - 0 1','e1','a1'),'castle_blocked');
 assert.equal(why('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1','e1','g1'),null);
 assert.equal(why('3rk3/8/8/8/8/8/8/R3K2R w KQ - 0 1','e1','c1'),'castle_check');
 assert.equal(why('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1','e1','c1'),null);
 assert.equal(why('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1','e1','a1'),null,'king onto own rook is handled as castling (legal)');
 assert.equal(why('4r1k1/8/8/8/8/8/8/R3K2R w KQ - 0 1','e1','g1'),'castle_check','castle out of check');
 assert.equal(castleByRook('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1','e1','h1'),'g1');
 assert.equal(castleByRook('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1','e1','a1'),'c1');
 assert.equal(castleByRook('4k3/8/8/8/8/8/8/R3K2R w Q - 0 1','e1','h1'),null);
 assert.equal(why('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1','e1','c1'),'castle_blocked');
});
test('Check, pin, blocked slider and plain illegal moves',()=>{
 assert.equal(why('4k3/8/8/8/8/8/4q3/R3K3 w Q - 0 1','a1','a5'),'in_check');
 assert.equal(why('4k3/4r3/8/8/8/8/4B3/4K3 w - - 0 1','e2','d3'),'pinned');
 assert.equal(why('4k3/8/8/8/8/8/3r4/4K3 w - - 0 1','e1','d2'),null,'king takes an unprotected rook');
 assert.equal(why('3rk3/8/8/8/8/8/8/4K3 w - - 0 1','e1','d1'),'into_check');
 assert.equal(why('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1','a1','a4'),'blocked');
 assert.equal(why('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1','c1','e3'),'blocked');
 assert.equal(why('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1','g1','g3'),'not_legal');
 assert.equal(why('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1','e2','e5'),'not_legal');
 assert.equal(why('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1','e2','e4'),null);
 assert.equal(why('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1','e7','e5'),null,'not the side to move');
 assert.equal(why('not a fen','e2','e4'),null);
});
test('Reason texts exist in English and Spanish',()=>{
 const es=JSON.parse(readFileSync(new URL('../docs/i18n/es.json',import.meta.url),'utf8'));
 for(const reason of ['in_check','pinned','into_check','castle_moved','castle_blocked','castle_check','blocked','not_legal'])for(const piece of ['k','q','r','b','n','p']){
  const t=reasonText({reason,piece});assert.ok(t&&es[t],`${reason}/${piece}: ${t}`);
 }
 assert.equal(es[reasonText({reason:'blocked',piece:'r'})],'La torre no puede saltar por encima de otras piezas.');
});
test('Help board snapshot is validated and summarised in Russian',()=>{
 const b=supportBoard({fen:'r3k2r/8/8/8/8/8/8/R3K2R w kq - 0 12',mode:'arena',level:5,refused:[{from:'e1',to:'c1',piece:'k',reason:'castle_moved'},{from:'x9',to:'c1',piece:'k',reason:'castle_moved'},{from:'a1',to:'a2',piece:'r',reason:'evil'}],name:'Alex'});
 assert.deepEqual(b,{fen:'r3k2r/8/8/8/8/8/8/R3K2R w kq - 0 12',mode:'arena',level:5,refused:[{from:'e1',to:'c1',piece:'k',reason:'castle_moved'}]});
 assert.match(boardLine(b),/^Доска: Арена, уровень 5; последние отказы: Крe1→c1 \(рокировка нельзя: король или ладья уже ходили\)/);
 assert.equal(supportBoard({fen:'<script>',mode:'arena'}),null);
 assert.equal(supportBoard({fen:'8/8/8/8/8/8/8/8 w - - 0 1',mode:'hack'}),null);
 assert.equal(supportBoard(null),null);
 assert.equal(supportBoard({fen:'8/8/8/8/8/8/8/8 w - - 0 1',mode:'puzzle',refused:Array.from({length:50},()=>({from:'a1',to:'a2',piece:'r',reason:'blocked'}))}).refused.length,5);
});
