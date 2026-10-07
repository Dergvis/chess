import {useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './app/App';
import {connectAnalytics} from './world/events';
import {track,recordVisit} from './analytics';
import './index.css';
import './international.css';
function InternationalGame(){
 useEffect(()=>{recordVisit();track('game_start');return connectAnalytics(e=>{if(['puzzle_started','challenge_started','misty_puzzle_started','post_game_puzzle_started'].includes(e.eventName))track('puzzle_start');if(['puzzle_solved','challenge_completed','misty_puzzle_solved','post_game_puzzle_completed'].includes(e.eventName))track('puzzle_complete');if(e.eventName==='registration_started')track('signup_start');if(e.eventName==='registration_completed')track('signup_complete');});},[]);
 return <BrowserRouter basename="/play"><a className="game-home" href="/" aria-label="CHEZZIES home">CHEZZIES <span>↗</span></a><App/></BrowserRouter>;
}
createRoot(document.getElementById('root')!).render(<InternationalGame/>);

if ('serviceWorker' in navigator) void navigator.serviceWorker.getRegistration('/').then(r=>r?.update()).catch(()=>{});
