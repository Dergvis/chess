// Retire the legacy April PWA cache on this origin when existing browsers update it.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith('workbox-'))await caches.delete(name);
 await self.registration.unregister();
 await self.clients.claim();
})()));
