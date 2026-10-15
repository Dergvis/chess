import {createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {neon} from '@neondatabase/serverless';

const scrypt=promisify(scryptCallback), name='chezzies_international_session';
const sha=value=>createHash('sha256').update(value).digest('hex');
const out=(res,status,body)=>res.status(status).json(body);
const emailOf=value=>String(value||'').trim().toLowerCase();
const validEmail=value=>value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const publicUser=u=>({id:u.id,email:u.email,childName:u.child_name,provider:'email'});
let initialized;
async function db(){
  const sql=neon(process.env.DATABASE_URL);
  initialized||=(async()=>{
    await sql`CREATE TABLE IF NOT EXISTS international_users (id UUID PRIMARY KEY,email TEXT NOT NULL UNIQUE,child_name TEXT NOT NULL,password_hash TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS international_sessions (token_hash TEXT PRIMARY KEY,user_id UUID NOT NULL REFERENCES international_users(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL)`;
    await sql`CREATE INDEX IF NOT EXISTS international_sessions_user_idx ON international_sessions(user_id)`;
    await sql`CREATE TABLE IF NOT EXISTS international_world_saves (user_id UUID PRIMARY KEY REFERENCES international_users(id) ON DELETE CASCADE,save_json JSONB NOT NULL,updated_at BIGINT NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS international_player_progress (user_id UUID PRIMARY KEY REFERENCES international_users(id) ON DELETE CASCADE,progress_json JSONB NOT NULL,updated_at TIMESTAMPTZ NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS international_reset_tokens (token_hash TEXT PRIMARY KEY,user_id UUID NOT NULL REFERENCES international_users(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL,used_at TIMESTAMPTZ)`;
    await sql`CREATE TABLE IF NOT EXISTS international_auth_attempts (key_hash TEXT PRIMARY KEY,attempts INTEGER NOT NULL,window_start TIMESTAMPTZ NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS international_support_requests (id UUID PRIMARY KEY,user_id UUID REFERENCES international_users(id) ON DELETE SET NULL,message TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
    await sql`ALTER TABLE international_support_requests ADD COLUMN IF NOT EXISTS guest_hash TEXT`;
    await sql`ALTER TABLE international_support_requests ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS international_support_telegram_idx ON international_support_requests(telegram_message_id)`;
    await sql`CREATE INDEX IF NOT EXISTS international_support_guest_idx ON international_support_requests(guest_hash)`;
    await sql`CREATE TABLE IF NOT EXISTS international_support_replies (id BIGSERIAL PRIMARY KEY,request_id UUID NOT NULL REFERENCES international_support_requests(id) ON DELETE CASCADE,telegram_message_id BIGINT NOT NULL UNIQUE,message TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  })().catch(e=>{initialized=undefined;throw e;});
  await initialized;return sql;
}
async function hashPassword(password){const salt=randomBytes(16).toString('hex');return `scrypt:${salt}:${(await scrypt(password,salt,64)).toString('hex')}`;}
async function verifyPassword(password,stored){const [a,s,h]=String(stored).split(':');if(a!=='scrypt'||!/^[a-f0-9]{32}$/.test(s)||!/^[a-f0-9]{128}$/.test(h))return false;return timingSafeEqual(await scrypt(password,s,64),Buffer.from(h,'hex'));}
function tokenOf(req){return String(req.headers.cookie||'').match(/(?:^|;\s*)chezzies_international_session=([^;]*)/)?.[1]||'';}
function guestOf(req){return String(req.headers.cookie||'').match(/(?:^|;\s*)chezzies_support_guest=([a-f0-9]{64})(?:;|$)/)?.[1]||'';}
function setGuestCookie(req,res,token){res.appendHeader('Set-Cookie',`chezzies_support_guest=${token}; Path=/api/support; HttpOnly; SameSite=Lax; Max-Age=31536000${process.env.VERCEL==='1'||req.headers['x-forwarded-proto']==='https'?'; Secure':''}`);}
const webhookSecret=()=>sha(`chezzies-telegram-webhook:${process.env.TELEGRAM_BOT_TOKEN||''}`);
let webhookReady=false;
async function registerWebhook(){
  if(webhookReady||process.env.VERCEL_ENV!=='production')return;
  const response=await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:'https://chezzies.app/api/support/telegram-webhook/',secret_token:webhookSecret(),allowed_updates:['message'],drop_pending_updates:false}),signal:AbortSignal.timeout(10000)});
  const result=await response.json();if(!response.ok||!result.ok)throw Error('telegram-webhook-registration-failed');
  webhookReady=true;
}
function setCookie(req,res,token,age){res.setHeader('Set-Cookie',`${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${process.env.VERCEL==='1'||req.headers['x-forwarded-proto']==='https'?'; Secure':''}`);}
async function currentUser(sql,req){const token=tokenOf(req);if(!/^[a-f0-9]{64}$/.test(token))return null;const r=await sql`SELECT u.id,u.email,u.child_name FROM international_sessions s JOIN international_users u ON u.id=s.user_id WHERE s.token_hash=${sha(token)} AND s.expires_at>now() LIMIT 1`;return r[0]||null;}
async function session(sql,req,res,id){const token=randomBytes(32).toString('hex');await sql`INSERT INTO international_sessions(token_hash,user_id,expires_at) VALUES(${sha(token)},${id},now()+interval '30 days')`;setCookie(req,res,token,2592000);}
async function limited(sql,key,max=8){const r=await sql`INSERT INTO international_auth_attempts(key_hash,attempts,window_start) VALUES(${sha(key)},1,now()) ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN international_auth_attempts.window_start<now()-interval '15 minutes' THEN 1 ELSE international_auth_attempts.attempts+1 END,window_start=CASE WHEN international_auth_attempts.window_start<now()-interval '15 minutes' THEN now() ELSE international_auth_attempts.window_start END RETURNING attempts`;return r[0].attempts>max;}
function validSave(s){return s&&s.version===1&&s.player&&['inventor','mage','knight',null].includes(s.player.selectedCharacter)&&Array.isArray(s.worldProgress?.completedChallenges)&&Array.isArray(s.games)&&s.mastery&&typeof s.mastery==='object'&&!Array.isArray(s.mastery)&&Number.isSafeInteger(s.updatedAt)&&s.updatedAt>=0&&s.updatedAt<Date.now()+86400000;}
async function sendResetEmail(email,token){const base=process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_URL?`https://${process.env.VERCEL_URL}`:'https://chezzies.app';const link=`${base}/play/reset-password/?token=${encodeURIComponent(token)}`;const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.RESET_EMAIL_FROM,to:email,subject:'Reset your CHEZZIES password',text:`Open this link to reset your CHEZZIES password:\n${link}\n\nThis link expires in one hour. If you did not request it, ignore this email.`,html:`<p>Open the button below to reset your CHEZZIES password.</p><p><a href="${link}">Reset password</a></p><p>This link expires in one hour. If you did not request it, ignore this email.</p>`}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('reset-email-failed');}

export default async function account(req,res,path){
  if(path==='/api/world/health')return out(res,200,{mode:'production',production:true,version:1});
  if(path==='/api/site-events')return res.status(204).end();
  let sql;try{sql=await db();}catch(e){console.error('[account database]',e.message);return out(res,503,{error:'Account storage is temporarily unavailable. Guest play still works.'});}
  try{
    const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    if(path==='/api/support/telegram-webhook'){
      const received=String(req.headers['x-telegram-bot-api-secret-token']||'');
      const expected=webhookSecret();
      if(!process.env.TELEGRAM_BOT_TOKEN||received.length!==expected.length||!timingSafeEqual(Buffer.from(received),Buffer.from(expected)))return out(res,403,{error:'Forbidden'});
      if(Buffer.byteLength(JSON.stringify(b))>100000)return out(res,413,{error:'Update is too large'});
      const message=b.message;
      if(String(message?.chat?.id)!==String(process.env.TELEGRAM_CHAT_ID)||message?.from?.is_bot||!Number.isSafeInteger(message?.message_id)||!Number.isSafeInteger(message?.reply_to_message?.message_id)||typeof message?.text!=='string')return out(res,200,{ok:true});
      const reply=message.text.trim();if(!reply||reply.length>4000)return out(res,200,{ok:true});
      const parent=message.reply_to_message.message_id;
      const request=await sql`SELECT id FROM international_support_requests WHERE telegram_message_id=${parent} UNION SELECT request_id AS id FROM international_support_replies WHERE telegram_message_id=${parent} LIMIT 1`;
      if(request[0])await sql`INSERT INTO international_support_replies(request_id,telegram_message_id,message) VALUES(${request[0].id},${message.message_id},${reply}) ON CONFLICT(telegram_message_id) DO NOTHING`;
      return out(res,200,{ok:true});
    }
    if(path==='/api/support/my'){
      const u=await currentUser(sql,req),guest=guestOf(req);
      if(!u&&!guest)return out(res,200,{requests:[]});
      const requests=await sql`SELECT id,message,created_at FROM (SELECT id,message,created_at FROM international_support_requests WHERE (${u?.id||null}::uuid IS NOT NULL AND user_id=${u?.id||null}) OR (${guest?sha(guest):null}::text IS NOT NULL AND guest_hash=${guest?sha(guest):null}) ORDER BY created_at DESC LIMIT 50) recent ORDER BY created_at ASC`;
      const ids=requests.map(r=>r.id);
      const replies=ids.length?await sql`SELECT request_id,message,created_at FROM international_support_replies WHERE request_id=ANY(${ids}::uuid[]) ORDER BY created_at ASC`:[];
      return out(res,200,{requests:requests.map(r=>({ticket:r.id.slice(0,8).toUpperCase(),message:r.message,createdAt:r.created_at,replies:replies.filter(a=>a.request_id===r.id).map(a=>({message:a.message,createdAt:a.created_at}))}))});
    }
    if(path==='/api/support/messages'){
      const message=String(b.message||'').trim();
      if(!message||message.length>2000)return out(res,400,{error:'Write a question of up to 2,000 characters.'});
      if(!process.env.TELEGRAM_BOT_TOKEN||!process.env.TELEGRAM_CHAT_ID)return out(res,503,{error:'Support is temporarily unavailable. Please try again later.'});
      await registerWebhook();
      const u=await currentUser(sql,req);
      const address=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
      if(await limited(sql,`support:${u?.id||sha(address)}`,5))return out(res,429,{error:'Too many questions. Please try again later.'});
      const id=randomUUID(),ticket=id.slice(0,8).toUpperCase();
      const telegram=await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({chat_id:process.env.TELEGRAM_CHAT_ID,text:`CHEZZIES question #${ticket}\n\n${message}`,disable_web_page_preview:true}),
        signal:AbortSignal.timeout(10000)
      });
      const sent=await telegram.json();
      if(!telegram.ok||!sent.ok||!Number.isSafeInteger(sent.result?.message_id))return out(res,502,{error:'Could not deliver your question. Please try again later.'});
      const guest=guestOf(req)||randomBytes(32).toString('hex');
      await sql`INSERT INTO international_support_requests(id,user_id,guest_hash,telegram_message_id,message) VALUES(${id},${u?.id||null},${sha(guest)},${sent.result.message_id},${message})`;
      if(!guestOf(req))setGuestCookie(req,res,guest);
      return out(res,201,{ticket});
    }
    if(path==='/api/auth/register'){
      const email=emailOf(b.email),password=String(b.password||''),childName=String(b.childName||'').trim();
      if(!validEmail(email))return out(res,400,{error:'Enter a valid email address'});
      if(password.length<8||password.length>256)return out(res,400,{error:'Use 8 to 256 characters for your password'});
      if(!childName||childName.length>80)return out(res,400,{error:'Enter a child name of up to 80 characters'});
      if(await limited(sql,`register:${email}`,5))return out(res,429,{error:'Too many attempts. Try again later.'});
      const id=randomUUID(),r=await sql`INSERT INTO international_users(id,email,child_name,password_hash) VALUES(${id},${email},${childName},${await hashPassword(password)}) ON CONFLICT(email) DO NOTHING RETURNING id,email,child_name`;
      if(!r.length)return out(res,409,{error:'This email is already registered. Sign in or reset your password.'});
      await session(sql,req,res,id);return out(res,201,{user:publicUser(r[0])});
    }
    if(path==='/api/auth/login'){
      const email=emailOf(b.email),password=String(b.password||'');
      if(!validEmail(email)||!password)return out(res,401,{error:'Incorrect email or password'});
      if(await limited(sql,`login:${email}`))return out(res,429,{error:'Too many attempts. Try again later.'});
      const r=await sql`SELECT id,email,child_name,password_hash FROM international_users WHERE email=${email} LIMIT 1`;
      if(!r[0]||!(await verifyPassword(password,r[0].password_hash)))return out(res,401,{error:'Incorrect email or password'});
      await sql`DELETE FROM international_auth_attempts WHERE key_hash=${sha(`login:${email}`)}`;
      await session(sql,req,res,r[0].id);return out(res,200,{user:publicUser(r[0])});
    }
    if(path==='/api/auth/me'){const u=await currentUser(sql,req);return out(res,200,{user:u?publicUser(u):null});}
    if(path==='/api/auth/logout'){const t=tokenOf(req);if(t)await sql`DELETE FROM international_sessions WHERE token_hash=${sha(t)}`;setCookie(req,res,'',0);return out(res,200,{ok:true});}
    if(path==='/api/auth/request-password-reset'){
      const email=emailOf(b.email);if(!validEmail(email))return out(res,400,{error:'Enter a valid email address'});
      if(!process.env.RESEND_API_KEY||!process.env.RESET_EMAIL_FROM)return out(res,503,{error:'Password reset email is not configured yet. Please contact support.'});
      if(await limited(sql,`reset:${email}`,3))return out(res,429,{error:'Too many requests. Try again later.'});
      const r=await sql`SELECT id,email FROM international_users WHERE email=${email} LIMIT 1`;
      if(r[0]){const token=randomBytes(32).toString('hex');await sql`INSERT INTO international_reset_tokens(token_hash,user_id,expires_at) VALUES(${sha(token)},${r[0].id},now()+interval '1 hour')`;await sendResetEmail(r[0].email,token);}
      return out(res,200,{ok:true});
    }
    if(path==='/api/auth/reset-password'){
      const token=String(b.token||''),password=String(b.password||'');
      if(!/^[a-f0-9]{64}$/.test(token))return out(res,400,{error:'This link has expired or has already been used'});
      if(password.length<8||password.length>256)return out(res,400,{error:'Use 8 to 256 characters for your password'});
      const r=await sql`UPDATE international_reset_tokens SET used_at=now() WHERE token_hash=${sha(token)} AND used_at IS NULL AND expires_at>now() RETURNING user_id`;
      if(!r.length)return out(res,400,{error:'This link has expired or has already been used'});
      await sql`UPDATE international_users SET password_hash=${await hashPassword(password)} WHERE id=${r[0].user_id}`;
      await sql`DELETE FROM international_sessions WHERE user_id=${r[0].user_id}`;
      return out(res,200,{ok:true});
    }
    const u=await currentUser(sql,req);if(!u)return out(res,401,{error:'login-required'});
    if(path==='/api/player/progress'&&req.method==='GET'){
      const r=await sql`SELECT progress_json,updated_at FROM international_player_progress WHERE user_id=${u.id}`;
      return out(res,200,{progress:r[0]?.progress_json||null,updatedAt:r[0]?.updated_at||null});
    }
    if(path==='/api/player/progress'&&req.method==='PUT'){
      const progress=b.progress;
      if(!progress||typeof progress!=='object'||Array.isArray(progress))return out(res,400,{error:'Invalid progress.'});
      const text=JSON.stringify(progress);
      if(Buffer.byteLength(text)>500000)return out(res,413,{error:'Progress is too large.'});
      const now=new Date().toISOString(),r=await sql`INSERT INTO international_player_progress(user_id,progress_json,updated_at)
        VALUES(${u.id},${text}::jsonb,${now}) ON CONFLICT(user_id) DO UPDATE
        SET progress_json=excluded.progress_json,updated_at=excluded.updated_at RETURNING progress_json,updated_at`;
      return out(res,200,{ok:true,progress:r[0].progress_json,updatedAt:r[0].updated_at});
    }
    if(path==='/api/world/account'&&req.method==='GET'){const r=await sql`SELECT save_json FROM international_world_saves WHERE user_id=${u.id}`;return r.length?out(res,200,r[0].save_json):out(res,404,{});}
    if(path==='/api/world/account'&&req.method==='PUT'){
      if(!validSave(b))return out(res,400,{error:'invalid-save'});
      const text=JSON.stringify(b);if(Buffer.byteLength(text)>4*1024*1024)return out(res,413,{error:'Save is too large.'});
      const r=await sql`INSERT INTO international_world_saves(user_id,save_json,updated_at) VALUES(${u.id},${text}::jsonb,${b.updatedAt}) ON CONFLICT(user_id) DO UPDATE SET save_json=excluded.save_json,updated_at=excluded.updated_at WHERE international_world_saves.updated_at<=excluded.updated_at RETURNING user_id`;
      return r.length?out(res,200,{saved:true}):out(res,409,{error:'newer-save'});
    }
    return out(res,404,{error:'This endpoint is not available.'});
  }catch(e){console.error('[account api]',e.message);return out(res,500,{error:'Account request failed. Please try again.'});}
}
