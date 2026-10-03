'use strict';
const crypto=require('crypto');
const path=require('path');
const fs=require('fs');
const paymentsEnabled=false;
const dataDir=path.resolve(process.env.DATA_DIR||path.join(__dirname,'data-international'));
fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
const origins=new Set((process.env.ALLOWED_ORIGINS||'https://chezzies.app').split(',').map(s=>s.trim()).filter(Boolean));
const bridgeToken=process.env.API_BRIDGE_TOKEN||'';
function install(app,express){
 app.disable('x-powered-by');
 app.use((req,res,next)=>{
  res.set('Cache-Control','no-store');
  if(req.path==='/api/health')return res.json({product:'CHEZZIES',market:'international',paymentsEnabled:false});
  const received=String(req.headers['x-chezzies-bridge']||'');
  const receivedBytes=Buffer.from(received),expectedBytes=Buffer.from(bridgeToken);
  const bridge=!!bridgeToken&&receivedBytes.length===expectedBytes.length&&crypto.timingSafeEqual(receivedBytes,expectedBytes);
  if(req.headers.origin&&!origins.has(req.headers.origin)&&!bridge)return res.status(403).json({error:'This origin is not allowed.'});
  if(process.env.REQUIRE_BRIDGE==='true'&&!bridge)return res.status(403).json({error:'Bridge authentication required.'});
  if(/^\/api\/(billing|promo|subscription)/.test(req.path))return res.status(404).json({error:'Payments are not available in this product.'});
  if(req.path==='/api/analytics/events'||req.path==='/api/world/events')return res.status(204).end();
  next();
 });
 app.post('/api/site-events',express.json({limit:'2kb'}),(req,res)=>{
  const events=new Set(['homepage_view','landing_view','play_click','game_start','puzzle_start','puzzle_complete','return_visit','signup_start','signup_complete']);
  const sources=new Set(['direct','internal','google','bing','referral']);
  const paths=new Set(['/','/play/','/chess-games-for-kids/','/online-chess-for-kids/','/learn-chess-for-kids/','/how-to-play-chess-for-kids/','/chess-puzzles-for-kids/','/parents/']);
  if(!events.has(req.body?.event)||!sources.has(req.body?.source)||!paths.has(req.body?.landing_page))return res.status(400).json({error:'Invalid event.'});
  const event={event:req.body.event,source:req.body.source,landing_page:req.body.landing_page,at:new Date().toISOString()};
  fs.appendFile(path.join(dataDir,'site-events.jsonl'),JSON.stringify(event)+'\n',err=>err?res.status(503).end():res.status(204).end());
 });
}
module.exports={paymentsEnabled,dataDir,origins,install};
