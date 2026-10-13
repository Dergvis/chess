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
  })().catch(e=>{initialized=undefined;throw e;});
  await initialized;return sql;
}
async function hashPassword(password){const salt=randomBytes(16).toString('hex');return `scrypt:${salt}:${(await scrypt(password,salt,64)).toString('hex')}`;}
async function verifyPassword(password,stored){const [a,s,h]=String(stored).split(':');if(a!=='scrypt'||!/^[a-f0-9]{32}$/.test(s)||!/^[a-f0-9]{128}$/.test(h))return false;return timingSafeEqual(await scrypt(password,s,64),Buffer.from(h,'hex'));}
function tokenOf(req){return String(req.headers.cookie||'').match(/(?:^|;\s*)chezzies_international_session=([^;]*)/)?.[1]||'';}
function setCookie(req,res,token,age){res.setHeader('Set-Cookie',`${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${process.env.VERCEL==='1'||req.headers['x-forwarded-proto']==='https'?'; Secure':''}`);}
async function currentUser(sql,req){const token=tokenOf(req);if(!/^[a-f0-9]{64}$/.test(token))return null;const r=await sql`SELECT u.id,u.email,u.child_name FROM international_sessions s JOIN international_users u ON u.id=s.user_id WHERE s.token_hash=${sha(token)} AND s.expires_at>now() LIMIT 1`;return r[0]||null;}
async function session(sql,req,res,id){const token=randomBytes(32).toString('hex');await sql`INSERT INTO international_sessions(token_hash,user_id,expires_at) VALUES(${sha(token)},${id},now()+interval '30 days')`;setCookie(req,res,token,2592000);}
async function limited(sql,key,max=8){const r=await sql`INSERT INTO international_auth_attempts(key_hash,attempts,window_start) VALUES(${sha(key)},1,now()) ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN international_auth_attempts.window_start<now()-interval '15 minutes' THEN 1 ELSE international_auth_attempts.attempts+1 END,window_start=CASE WHEN international_auth_attempts.window_start<now()-interval '15 minutes' THEN now() ELSE international_auth_attempts.window_start END RETURNING attempts`;return r[0].attempts>max;}
function validSave(s){return s&&s.version===1&&s.player&&['inventor','mage','knight',null].includes(s.player.selectedCharacter)&&Array.isArray(s.worldProgress?.completedChallenges)&&Array.isArray(s.games)&&s.mastery&&typeof s.mastery==='object'&&!Array.isArray(s.mastery)&&Number.isSafeInteger(s.updatedAt)&&s.updatedAt>=0&&s.updatedAt<Date.now()+86400000;}
async function sendResetEmail(email,token){const base=process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_URL?`https://${process.env.VERCEL_URL}`:'https://chezzies.app';const link=`${base}/play/reset-password/?token=${encodeURIComponent(token)}`;const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.RESET_EMAIL_FROM,to:email,subject:'Reset your CHEZZIES password',text:`Open this link to reset your CHEZZIES password:\n${link}\n\nThis link expires in one hour. If you did not request it, ignore this email.`}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('reset-email-failed');}

export default async function account(req,res,path){
  if(path==='/api/world/health')return out(res,200,{mode:'production',production:true,version:1});
  if(path==='/api/site-events')return res.status(204).end();
  let sql;try{sql=await db();}catch(e){console.error('[account database]',e.message);return out(res,503,{error:'Account storage is temporarily unavailable. Guest play still works.'});}
  try{
    const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
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
