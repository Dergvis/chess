import {useEffect, useState, type ReactNode} from 'react';
import SoundToggle from '../SoundToggle';
import './mobileGame.css';

export type MobileTab = 'map' | 'hero' | 'play' | 'skills' | 'account';
export type MobileDestination = MobileTab | 'parent' | 'help' | 'trophies' | 'polygon';
export function openMobileDestination(destination: MobileDestination) {
  window.dispatchEvent(new CustomEvent('chezzies-mobile-go', {detail:destination}));
}
export function publishMobileScreen(tab: MobileTab, title:string) {
  window.dispatchEvent(new CustomEvent('chezzies-mobile-screen', {detail:{tab,title}}));
}
const tabs: {id:MobileTab;label:string;path:string}[] = [
  {id:'map',label:"Map",path:'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2V5 M9 3v16 M15 5v16'},
  {id:'hero',label:"Hero",path:'M5 21h14l-1-4H7z M8 17c0-5 7-4 5-8l-4 3-4-3 5-6 6 1 3 6-2 7 M10 3V1'},
  {id:'play',label:"Play",path:'M3 3l5 2 12 15 M21 3l-5 2L4 20 M2 16l6 6 M16 22l6-6'},
  {id:'skills',label:"Skills",path:'M12 5c-3-3-7-3-10-2v16c4-1 7 0 10 2 3-2 6-3 10-2V3c-3-1-7-1-10 2v16'},
  {id:'account',label:"Account",path:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-3a8 6 0 0 1 16 0v3z'},
];
export function MobileBottomNav({active,onSelect}:{active:MobileTab;onSelect:(tab:MobileTab)=>void}) {
  return <nav className="mobile-bottom-nav" aria-label="Main sections">
    {tabs.map(tab=><button key={tab.id} aria-current={active===tab.id?'page':undefined} onClick={()=>onSelect(tab.id)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d={tab.path}/></svg><span>{tab.label}</span>
    </button>)}
  </nav>;
}
export default function MobileGameShell({children,path,onNavigate}:{children:ReactNode;path:string;onNavigate:(path:string)=>void}) {
  const [world,setWorld]=useState<{tab:MobileTab;title:string}>({tab:'map',title:'CHEZZIES'});
  useEffect(()=>{const update=(e:Event)=>setWorld((e as CustomEvent).detail);window.addEventListener('chezzies-mobile-screen',update);return()=>window.removeEventListener('chezzies-mobile-screen',update);},[]);
  const inWorld=path==='/home', visible=path!=='/admin'&&path!=='/';
  const active:MobileTab=inWorld?world.tab:path==='/hero-select'?'hero':'account';
  function go(tab:MobileDestination){
    document.querySelector('.mobile-shell-content')?.scrollTo(0,0);
    if(tab==='account'){onNavigate('/account');return;}
    if(inWorld)openMobileDestination(tab);
    else {sessionStorage.setItem('chezzies-mobile-destination',tab);onNavigate('/home');}
  }
  return <div className={'mobile-game-shell'+(visible?' mobile-shell-enabled':'')}>
    {visible&&<header className="mobile-top-bar">
      {active==='map'?<strong>CHEZZIES</strong>:<button className="mobile-back" aria-label="World map" onClick={()=>go('map')}>←</button>}
      {active!=='map'&&<strong>{inWorld?world.title:({'/hero-select':"Choose your hero",'/subscribe':"Subscription",'/login':"Sign in",'/payment-success':"Payment"}[path]||"Account")}</strong>}
      <SoundToggle/><button aria-label="How to play" onClick={()=>go('help')}>?</button>
    </header>}
    <div className="mobile-shell-content">{children}</div>
    {visible&&<MobileBottomNav active={active} onSelect={go}/>}
  </div>;
}
