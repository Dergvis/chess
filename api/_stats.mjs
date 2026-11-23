// Anonymous first-party gameplay statistics and the owner's admin data (admin 2.0).
// Kept apart from player accounts: every table here is created by statsDb(), so a stats failure
// never breaks sign-in or saves. The leading underscore keeps Vercel from exposing this file as a route.
import {timingSafeEqual} from 'node:crypto';

const out=(res,status,body)=>res.status(status).json(body);
let statsInit;
export async function statsDb(sql){
  statsInit||=(async()=>{
    await sql`CREATE TABLE IF NOT EXISTS international_site_events (id BIGSERIAL PRIMARY KEY,visit_id TEXT NOT NULL,kind TEXT NOT NULL,name TEXT NOT NULL,lang TEXT NOT NULL,path TEXT NOT NULL,source TEXT NOT NULL,device TEXT NOT NULL,country TEXT NOT NULL DEFAULT '',is_return BOOLEAN NOT NULL DEFAULT false,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
    await sql`ALTER TABLE international_site_events ADD COLUMN IF NOT EXISTS player_id TEXT NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE international_site_events ADD COLUMN IF NOT EXISTS params JSONB`;
    await sql`ALTER TABLE international_site_events ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT ''`;
    await sql`CREATE INDEX IF NOT EXISTS international_site_events_time_idx ON international_site_events(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS international_site_events_player_idx ON international_site_events(player_id,created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS international_site_events_visit_idx ON international_site_events(visit_id,created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS international_site_events_name_idx ON international_site_events(name,created_at)`;
    await sql`CREATE TABLE IF NOT EXISTS international_admin_codes (code_hash TEXT PRIMARY KEY,expires_at TIMESTAMPTZ NOT NULL,used_at TIMESTAMPTZ)`;
    await sql`CREATE TABLE IF NOT EXISTS international_admin_sessions (token_hash TEXT PRIMARY KEY,expires_at TIMESTAMPTZ NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS international_seo_snapshots (id BIGSERIAL PRIMARY KEY,taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),kind TEXT NOT NULL,data JSONB NOT NULL)`;
    await sql`CREATE INDEX IF NOT EXISTS international_seo_snapshots_kind_idx ON international_seo_snapshots(kind,taken_at)`;
  })().catch(e=>{statsInit=undefined;throw e;});
  await statsInit;
}

// ---- Input cleaning (mirrors src/analyticsCore.ts) ----
const KEY=/^[A-Za-z][A-Za-z0-9_]{0,29}$/,VALUE=/^[A-Za-z0-9_-]{1,40}$/;
export function cleanParams(input){
  if(!input||typeof input!=='object'||Array.isArray(input))return null;
  const o={};let n=0;
  for(const [k,v] of Object.entries(input)){
    if(n>=12||!KEY.test(k))continue;
    if(typeof v==='string'&&VALUE.test(v))o[k]=v;
    else if(typeof v==='number'&&Number.isFinite(v))o[k]=Math.round(v*1000)/1000;
    else if(typeof v==='boolean')o[k]=v;
    else continue;
    n++;
  }
  return n?o:null;
}
export function cleanLabel(text){
  const s=String(text??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,40).trim();
  return !s||/@|\d{5,}/.test(s)?'':s;
}
const BOTS=/bot|crawl|spider|slurp|headless|lighthouse|preview|monitor/i;
const KINDS=['event','screen','ping','click'],SOURCES=['direct','internal','google','bing','referral'];

/** POST /api/site-events — one anonymous event. Invalid input is silently ignored (204). */
export async function ingest(sql,req,res,b){
  if(BOTS.test(String(req.headers['user-agent']||'')))return res.status(204).end();
  const e=b||{};
  if(!/^[a-f0-9]{16}$/.test(String(e.v))||!KINDS.includes(e.kind)||!/^[a-z_:]{2,48}$/.test(String(e.name))||!['en','es'].includes(e.lang)||!/^\/[a-z\-/]{0,60}$/.test(String(e.path))||!SOURCES.includes(e.source)||!['mobile','desktop'].includes(e.device))return res.status(204).end();
  if(/premium|payment|paywall|subscri|billing/.test(e.name))return res.status(204).end();
  const player=/^[a-f0-9]{16}$/.test(String(e.p||''))?String(e.p):'';
  const params=e.kind==='ping'?null:cleanParams(e.params);
  const label=e.kind==='click'?cleanLabel(e.label):'';
  if(e.kind==='click'&&!label)return res.status(204).end();
  const country=/^[A-Z]{2}$/.test(String(req.headers['x-vercel-ip-country']||''))?String(req.headers['x-vercel-ip-country']):'';
  await sql`INSERT INTO international_site_events(visit_id,player_id,kind,name,label,params,lang,path,source,device,country,is_return) VALUES(${e.v},${player},${e.kind},${e.name},${label},${params?JSON.stringify(params):null}::jsonb,${e.lang},${e.path},${e.source},${e.device},${country},${e.ret===true})`;
  return res.status(204).end();
}

/** POST /api/admin/seo-import — the pult pushes Search Console snapshots with a shared token. */
export async function seoImport(sql,req,res,b){
  const want=process.env.ADMIN_IMPORT_TOKEN;
  if(!want)return out(res,503,{error:'Import is not configured'});
  const got=String(req.headers['x-import-token']||'');
  const a=Buffer.from(got),w=Buffer.from(want);
  if(a.length!==w.length||!timingSafeEqual(a,w))return out(res,401,{error:'Bad token'});
  if(!['queries','pages','index'].includes(b?.kind)||!b.data||typeof b.data!=='object')return out(res,400,{error:'Need {kind:"queries"|"pages"|"index", data:{...}}'});
  const json=JSON.stringify(b.data);if(json.length>2_000_000)return out(res,413,{error:'Snapshot is too large'});
  await sql`INSERT INTO international_seo_snapshots(kind,data) VALUES(${b.kind},${json}::jsonb)`;
  await sql`DELETE FROM international_seo_snapshots WHERE kind=${b.kind} AND id NOT IN (SELECT id FROM international_seo_snapshots WHERE kind=${b.kind} ORDER BY taken_at DESC LIMIT 60)`;
  return out(res,200,{ok:true});
}

let prunedAt=0;
/** Data older than ~13 months is deleted (owner decision). At most once an hour per instance. */
async function prune(sql){
  if(Date.now()-prunedAt<3600000)return;prunedAt=Date.now();
  await sql`DELETE FROM international_site_events WHERE created_at<now()-interval '395 days'`;
}
const daysOf=req=>Math.min(395,Math.max(1,Math.floor(Number(new URL(req.url,'https://chezzies.app').searchParams.get('days')))||7));
const param=(req,k)=>new URL(req.url,'https://chezzies.app').searchParams.get(k)||'';

/** GET admin data endpoints; returns false if the path is not one of them. Caller has checked the admin session. */
export async function adminData(sql,req,res,path){
  if(path==='/api/admin/stats'){
    const days=daysOf(req);await prune(sql);
    const visits=await sql`SELECT visit_id,max(player_id) AS player,min(created_at) AS started,max(created_at) AS ended,max(country) AS country,max(lang) AS lang,max(device) AS device,(array_agg(source ORDER BY created_at))[1] AS source,(array_agg(path ORDER BY created_at))[1] AS landing,bool_or(is_return) AS ret,array_agg(name ORDER BY created_at) FILTER (WHERE kind='screen') AS screens,count(*) FILTER (WHERE kind='event')::int AS events,count(*) FILTER (WHERE kind='ping')::int AS pings,count(*) FILTER (WHERE kind='click')::int AS clicks FROM international_site_events WHERE created_at>now()-make_interval(days=>${days}) GROUP BY visit_id ORDER BY min(created_at) DESC LIMIT 20000`;
    const events=await sql`SELECT name,count(*)::int AS times,count(DISTINCT visit_id)::int AS visits FROM international_site_events WHERE kind='event' AND created_at>now()-make_interval(days=>${days}) GROUP BY name ORDER BY 3 DESC LIMIT 60`;
    const players=await sql`SELECT count(DISTINCT player_id) FILTER (WHERE player_id<>'')::int AS players FROM international_site_events WHERE created_at>now()-make_interval(days=>${days})`;
    const users=await sql`SELECT count(*)::int AS total,count(*) FILTER (WHERE created_at>now()-make_interval(days=>${days}))::int AS fresh FROM international_users`;
    const support=await sql`SELECT count(*)::int AS total,count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM international_support_replies p WHERE p.request_id=r.id))::int AS unanswered FROM international_support_requests r`;
    const byDay=await sql`SELECT to_char((created_at AT TIME ZONE 'UTC')::date,'YYYY-MM-DD') AS day,count(DISTINCT visit_id)::int AS visits,count(DISTINCT player_id) FILTER (WHERE player_id<>'')::int AS players,count(*) FILTER (WHERE name='game:game_started')::int AS games FROM international_site_events WHERE created_at>now()-make_interval(days=>${days}) GROUP BY 1 ORDER BY 1`;
    out(res,200,{days,visits,events,players:players[0],users:users[0],support:support[0],byDay});return true;
  }
  if(path==='/api/admin/players'){
    const days=daysOf(req),q=param(req,'q').trim().toLowerCase().slice(0,20);await prune(sql);
    const rows=await sql`WITH fin AS (SELECT DISTINCT params->>'id' AS gid FROM international_site_events WHERE name IN ('game:game_finished','game:game_result') AND params ? 'id' AND created_at>now()-make_interval(days=>${days+1})),
      e AS (SELECT CASE WHEN x.player_id<>'' THEN x.player_id ELSE 'v'||x.visit_id END AS pid,x.*,(x.name='game:game_abandoned' AND fin.gid IS NULL) AS ab FROM international_site_events x LEFT JOIN fin ON x.name='game:game_abandoned' AND fin.gid=x.params->>'id' WHERE x.created_at>now()-make_interval(days=>${days}))
      SELECT pid,min(created_at) AS first_in_period,max(created_at) AS last_seen,count(DISTINCT visit_id)::int AS visits,count(DISTINCT (created_at AT TIME ZONE 'UTC')::date)::int AS days_active,
        (array_agg(country ORDER BY created_at DESC) FILTER (WHERE country<>''))[1] AS country,(array_agg(lang ORDER BY created_at DESC))[1] AS lang,(array_agg(device ORDER BY created_at DESC))[1] AS device,
        (array_agg(source ORDER BY created_at))[1] AS source,(array_agg(path ORDER BY created_at))[1] AS landing,count(*) FILTER (WHERE kind='ping')::int AS pings,
        count(*) FILTER (WHERE name='game:game_started')::int AS started,count(*) FILTER (WHERE name='game:game_finished')::int AS finished,
        count(DISTINCT COALESCE(params->>'id',id::text)) FILTER (WHERE ab)::int AS abandoned,count(*) FILTER (WHERE name='game:game_result' AND params->>'result'='win')::int AS won,
        (array_agg(name ORDER BY created_at DESC) FILTER (WHERE kind='screen'))[1] AS last_screen,bool_or(is_return) AS ret
      FROM e GROUP BY pid HAVING ${q}='' OR pid LIKE ${q+'%'} OR lower(max(country))=${q} ORDER BY max(created_at) DESC LIMIT 300`;
    const ids=rows.filter(r=>!r.pid.startsWith('v')).map(r=>r.pid);
    const first=ids.length?await sql`SELECT player_id,min(created_at) AS first_seen,count(DISTINCT visit_id)::int AS all_visits FROM international_site_events WHERE player_id = ANY(${ids}) GROUP BY player_id`:[];
    const f=new Map(first.map(r=>[r.player_id,r]));
    out(res,200,{days,players:rows.map(r=>({...r,id:r.pid,first_seen:f.get(r.pid)?.first_seen||r.first_in_period,all_visits:f.get(r.pid)?.all_visits||r.visits,seconds:r.pings*30}))});return true;
  }
  if(path==='/api/admin/player'){
    const id=param(req,'id');if(!/^v?[a-f0-9]{16}$/.test(id)){out(res,400,{error:'Нет такого игрока'});return true;}
    const rows=id.startsWith('v')
      ?await sql`SELECT visit_id,kind,name,label,params,lang,path,source,device,country,is_return,created_at FROM international_site_events WHERE visit_id=${id.slice(1)} ORDER BY created_at DESC LIMIT 5000`
      :await sql`SELECT visit_id,kind,name,label,params,lang,path,source,device,country,is_return,created_at FROM international_site_events WHERE player_id=${id} ORDER BY created_at DESC LIMIT 5000`;
    if(!rows.length){out(res,404,{error:'Игрок не найден'});return true;}
    rows.reverse();
    const visits=new Map();
    for(const r of rows){
      let v=visits.get(r.visit_id);
      if(!v){v={visit:r.visit_id,started:r.created_at,ended:r.created_at,country:r.country,lang:r.lang,device:r.device,source:r.source,landing:r.path,ret:r.is_return,pings:0,items:[]};visits.set(r.visit_id,v);}
      v.ended=r.created_at;if(r.country)v.country=r.country;
      if(r.kind==='ping'){v.pings++;continue;}
      v.items.push({t:r.created_at,kind:r.kind,name:r.name,label:r.label||undefined,params:r.params||undefined,path:r.path});
    }
    const list=[...visits.values()].map(v=>({...v,seconds:Math.max(v.pings*30,Math.round((new Date(v.ended)-new Date(v.started))/1000))})).reverse();
    const c=n=>rows.filter(r=>r.name===n).length;
    const last=rows[rows.length-1];
    out(res,200,{id,summary:{first_seen:rows[0].created_at,last_seen:last.created_at,visits:list.length,country:list.find(v=>v.country)?.country||'',lang:last.lang,device:last.device,source:list[list.length-1].source,landing:list[list.length-1].landing,seconds:list.reduce((s,v)=>s+v.seconds,0),started:c('game:game_started'),finished:c('game:game_finished'),won:rows.filter(r=>r.name==='game:game_result'&&r.params?.result==='win').length,abandoned:c('game:game_abandoned'),clicks:c('click'),truncated:rows.length>=5000},visits:list});return true;
  }
  if(path==='/api/admin/retention'){
    const days=daysOf(req);await prune(sql);
    const daily=await sql`WITH a AS (SELECT player_id,(created_at AT TIME ZONE 'UTC')::date AS d FROM international_site_events WHERE player_id<>'' GROUP BY 1,2),
      f AS (SELECT player_id,min(d) AS d0 FROM a GROUP BY 1),
      r AS (SELECT f.player_id,f.d0,bool_or(a.d=f.d0+1) AS r1,bool_or(a.d>f.d0 AND a.d<=f.d0+7) AS r7,bool_or(a.d>f.d0 AND a.d<=f.d0+30) AS r30 FROM f JOIN a USING(player_id) GROUP BY 1,2),
      t AS (SELECT (now() AT TIME ZONE 'UTC')::date AS today)
      SELECT to_char(d0,'YYYY-MM-DD') AS day,count(*)::int AS new_players,
        CASE WHEN d0<=max(t.today)-1 THEN count(*) FILTER (WHERE r1)::int END AS d1,
        CASE WHEN d0<=max(t.today)-7 THEN count(*) FILTER (WHERE r7)::int END AS d7,
        CASE WHEN d0<=max(t.today)-30 THEN count(*) FILTER (WHERE r30)::int END AS d30
      FROM r CROSS JOIN t WHERE d0>t.today-${days}::int GROUP BY d0 ORDER BY d0`;
    const weekly=await sql`WITH a AS (SELECT player_id,(created_at AT TIME ZONE 'UTC')::date AS d FROM international_site_events WHERE player_id<>'' GROUP BY 1,2),
      f AS (SELECT player_id,date_trunc('week',min(d))::date AS w0 FROM a GROUP BY 1),
      r AS (SELECT f.player_id,f.w0,bool_or(a.d>=f.w0+7 AND a.d<f.w0+14) AS w1,bool_or(a.d>=f.w0+14 AND a.d<f.w0+21) AS w2,bool_or(a.d>=f.w0+21 AND a.d<f.w0+28) AS w3,bool_or(a.d>=f.w0+28 AND a.d<f.w0+35) AS w4 FROM f JOIN a USING(player_id) GROUP BY 1,2),
      t AS (SELECT (now() AT TIME ZONE 'UTC')::date AS today)
      SELECT to_char(w0,'YYYY-MM-DD') AS week,count(*)::int AS players,
        CASE WHEN w0+7<=max(t.today) THEN count(*) FILTER (WHERE w1)::int END AS w1,
        CASE WHEN w0+14<=max(t.today) THEN count(*) FILTER (WHERE w2)::int END AS w2,
        CASE WHEN w0+21<=max(t.today) THEN count(*) FILTER (WHERE w3)::int END AS w3,
        CASE WHEN w0+28<=max(t.today) THEN count(*) FILTER (WHERE w4)::int END AS w4
      FROM r CROSS JOIN t WHERE w0>t.today-GREATEST(${days}::int,56) GROUP BY w0 ORDER BY w0 DESC LIMIT 16`;
    const avg=await sql`SELECT count(DISTINCT player_id)::int AS players,count(DISTINCT visit_id)::int AS visits,count(DISTINCT player_id||'|'||((created_at AT TIME ZONE 'UTC')::date)::text)::int AS player_days FROM international_site_events WHERE player_id<>'' AND created_at>now()-make_interval(days=>${days})`;
    const back=await sql`SELECT count(*)::int AS returning FROM (SELECT player_id FROM international_site_events WHERE player_id<>'' AND created_at>now()-make_interval(days=>${days}) GROUP BY player_id HAVING count(DISTINCT (created_at AT TIME ZONE 'UTC')::date)>1) s`;
    const s=avg[0];
    const sum=k=>daily.filter(d=>d[k]!==null&&d[k]!==undefined).reduce((a,d)=>({n:a.n+d.new_players,r:a.r+d[k]}),{n:0,r:0});
    out(res,200,{days,daily,weekly,totals:{players:s.players,visits:s.visits,avg_visits:s.players?Math.round(s.visits/s.players*10)/10:0,avg_days:s.players?Math.round(s.player_days/s.players*10)/10:0,returning:back[0].returning,d1:sum('d1'),d7:sum('d7'),d30:sum('d30')}});return true;
  }
  if(path==='/api/admin/games'){
    const days=daysOf(req);
    const totals=await sql`SELECT name,count(*)::int AS times,count(DISTINCT CASE WHEN player_id<>'' THEN player_id ELSE visit_id END)::int AS players FROM international_site_events WHERE kind='event' AND created_at>now()-make_interval(days=>${days}) GROUP BY name ORDER BY 2 DESC LIMIT 100`;
    const results=await sql`SELECT COALESCE(params->>'level','?') AS level,COALESCE(params->>'opponent','') AS opponent,COALESCE(params->>'result','?') AS result,count(*)::int AS n FROM international_site_events WHERE name='game:game_result' AND created_at>now()-make_interval(days=>${days}) GROUP BY 1,2,3 ORDER BY 1,3`;
    const started=await sql`SELECT COALESCE(params->>'level','?') AS level,COALESCE(params->>'opponent','') AS opponent,count(*)::int AS n FROM international_site_events WHERE name='game:game_started' AND created_at>now()-make_interval(days=>${days}) GROUP BY 1,2 ORDER BY 1`;
    const reasons=await sql`SELECT COALESCE(params->>'reason','?') AS reason,count(*)::int AS n FROM international_site_events WHERE name='game:game_finished' AND created_at>now()-make_interval(days=>${days}) GROUP BY 1 ORDER BY 2 DESC`;
    const abandoned=await sql`WITH fin AS (SELECT DISTINCT params->>'id' AS gid FROM international_site_events WHERE name IN ('game:game_finished','game:game_result') AND params ? 'id' AND created_at>now()-make_interval(days=>${days+1})),
      ab AS (SELECT DISTINCT ON (COALESCE(x.params->>'id',x.id::text)) x.params FROM international_site_events x LEFT JOIN fin ON fin.gid=x.params->>'id' WHERE x.name='game:game_abandoned' AND fin.gid IS NULL AND x.created_at>now()-make_interval(days=>${days}) ORDER BY COALESCE(x.params->>'id',x.id::text),x.created_at DESC)
      SELECT COALESCE(params->>'level','?') AS level,CASE WHEN params->>'moves' IS NULL THEN '?' WHEN (params->>'moves')::numeric=0 THEN '0' WHEN (params->>'moves')::numeric<=6 THEN '1-6' WHEN (params->>'moves')::numeric<=14 THEN '7-14' WHEN (params->>'moves')::numeric<=30 THEN '15-30' ELSE '31+' END AS moves,COALESCE(params->>'screen','?') AS screen,COALESCE(params->>'reason','?') AS reason,count(*)::int AS n FROM ab GROUP BY 1,2,3,4 ORDER BY 5 DESC LIMIT 200`;
    const screens=await sql`SELECT name,count(DISTINCT visit_id)::int AS visits FROM international_site_events WHERE kind='screen' AND created_at>now()-make_interval(days=>${days}) GROUP BY name ORDER BY 2 DESC LIMIT 40`;
    const buttons=await sql`SELECT label,COALESCE(params->>'screen','') AS screen,count(*)::int AS times,count(DISTINCT visit_id)::int AS visits FROM international_site_events WHERE kind='click' AND created_at>now()-make_interval(days=>${days}) GROUP BY 1,2 ORDER BY 3 DESC LIMIT 60`;
    out(res,200,{days,totals,results,started,reasons,abandoned,screens,buttons});return true;
  }
  if(path==='/api/admin/seo'){
    const rows=await sql`SELECT DISTINCT ON (kind) kind,taken_at,data FROM international_seo_snapshots ORDER BY kind,taken_at DESC`;
    out(res,200,{snapshots:Object.fromEntries(rows.map(r=>[r.kind,{taken_at:r.taken_at,data:r.data}]))});return true;
  }
  return false;
}
