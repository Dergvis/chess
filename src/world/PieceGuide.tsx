import {useEffect, useRef, useState} from 'react';
import MobilePieceGuide from './mobile/MobilePieceGuide';
import {pieceNames,pieceSymbols} from '../features/game/pieceLabels';
export default function PieceGuide({initialOpen=false}:{initialOpen?:boolean}){
 const [mobile,setMobile]=useState(()=>window.matchMedia('(max-width:767px), (max-width:960px) and (max-height:500px)').matches);
 useEffect(()=>{const q=window.matchMedia('(max-width:767px), (max-width:960px) and (max-height:500px)');const update=()=>setMobile(q.matches);q.addEventListener('change',update);return()=>q.removeEventListener('change',update);},[]);
 const track=useRef<HTMLDivElement>(null),drag=useRef<{x:number,scroll:number}|null>(null);
 const slide=(direction:number)=>track.current?.scrollBy({left:direction*160,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 if(mobile)return <MobilePieceGuide/>;
 return <details className="piece-guide piece-carousel" open={initialOpen||undefined}><summary>♟ Meet the pieces?</summary>
 <div className="piece-carousel-controls"><button type="button" aria-label="Previous piece" onClick={()=>slide(-1)}>←</button><small>Swipe through the pieces</small><button type="button" aria-label="Next piece" onClick={()=>slide(1)}>→</button></div>
 <div ref={track} className="piece-carousel-track" tabIndex={0} aria-label="Chess pieces" onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();slide(e.key==='ArrowRight'?1:-1);}}}
 onPointerDown={e=>{if(e.pointerType==='mouse'){drag.current={x:e.clientX,scroll:e.currentTarget.scrollLeft};e.currentTarget.setPointerCapture(e.pointerId);}}}
 onPointerMove={e=>{if(drag.current)e.currentTarget.scrollLeft=drag.current.scroll-(e.clientX-drag.current.x);}}
 onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
 {(Object.keys(pieceNames) as (keyof typeof pieceNames)[]).map(type=><article className="piece-carousel-card" key={type}><div><img draggable={false} src={'/assets/pieces/w-'+type+'.png'} alt={"White side: "+pieceNames[type]}/><img draggable={false} src={'/assets/pieces/b-'+type+'.png'} alt={"Black side: "+pieceNames[type]}/></div><strong>{pieceSymbols.w[type]} {pieceNames[type]} {pieceSymbols.b[type]}</strong></article>)}
 </div></details>;
}
