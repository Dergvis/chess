const methods=new Map([
 ['/api/site-events',['POST']],
 ['/api/auth/register',['POST']],['/api/auth/login',['POST']],['/api/auth/logout',['POST']],['/api/auth/me',['GET']],['/api/auth/request-password-reset',['POST']],['/api/auth/reset-password',['POST']],['/api/player/progress',['GET','PUT']],['/api/world/account',['GET','PUT']],['/api/world/health',['GET']],['/api/support/my',['GET']],['/api/support/messages',['POST']]
]);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const path=req.query?.route ? '/api/'+String(req.query.route).replace(/\/$/,'') : new URL(req.url,'https://chezzies.app').pathname.replace(/\/$/,'');
 if(!methods.get(path)?.includes(req.method))return res.status(404).json({error:'This endpoint is not available.'});
 const host=process.env.VERCEL_URL;
 const origins=new Set(['https://chezzies.app','https://www.chezzies.app',host?'https://'+host:'',process.env.VERCEL_BRANCH_URL?'https://'+process.env.VERCEL_BRANCH_URL:'']);
 if(req.headers.origin&&!origins.has(req.headers.origin))return res.status(403).json({error:'This origin is not allowed.'});
 if(!process.env.CHEZZIES_API_ORIGIN||!process.env.API_BRIDGE_TOKEN)return res.status(503).json({error:'Account service is not connected yet. You can continue playing as a guest.'});
 let upstream;try{upstream=new URL(process.env.CHEZZIES_API_ORIGIN);if(upstream.protocol!=='https:'||upstream.username||upstream.password||/(^|\.)chezzies\.ru$/.test(upstream.hostname))throw Error();}catch{return res.status(503).json({error:'The international account service is not configured correctly.'});}
 const target=new URL(path,upstream);const query=new URL(req.url,'https://chezzies.app').searchParams;
 // Preserve only the existing support guest identifier; never forward arbitrary destinations.
 if(path==='/api/support/my'&&query.has('guestId'))target.searchParams.set('guestId',query.get('guestId'));
 const cookie=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('chezzies_international_session='));
 const body=req.method==='GET'?undefined:typeof req.body==='string'?req.body:JSON.stringify(req.body||{});
 if(body&&Buffer.byteLength(body)>4*1024*1024)return res.status(413).json({error:'Request is too large.'});
 try{const response=await fetch(target,{method:req.method,headers:{'Content-Type':'application/json','x-chezzies-bridge':process.env.API_BRIDGE_TOKEN,...(cookie?{Cookie:cookie}:{})},body,redirect:'manual',signal:AbortSignal.timeout(15000)});
  const session=response.headers.getSetCookie?.()||[];for(const value of session){if(value.startsWith('chezzies_international_session='))res.setHeader('Set-Cookie',value.replace(/;\s*Domain=[^;]*/gi,''));}
  res.setHeader('Content-Type','application/json');return res.status(response.status).send(await response.text());
 }catch{return res.status(502).json({error:'The account service is temporarily unavailable. Please try again.'});}
}

