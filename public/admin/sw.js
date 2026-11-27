// Admin app shell only (scope /admin/). API answers are never cached: /api/ is outside this scope
// and is not intercepted. The page is network-first, with the last copy used only when offline.
const CACHE='chezzies-admin-v1',SHELL=['/admin/','/admin/manifest.webmanifest','/admin/icon-192.png','/admin/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('chezzies-admin-')&&k!==CACHE)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin||!u.pathname.startsWith('/admin/')||u.pathname.startsWith('/api/'))return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok&&SHELL.includes(u.pathname)){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return r;}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('/admin/'))));
});
