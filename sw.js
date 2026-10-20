// Garde l'application en cache pour qu'elle s'ouvre sans réseau.
// Avec réseau, la dernière version est toujours chargée (sans passer par le cache du navigateur) :
// une nouvelle version déposée sur le serveur s'affiche dès l'ouverture. Sans réseau, la copie en cache est utilisée.
const CACHE='constat-decence-v2';
const FILES=['./','index.html','jspdf.umd.min.js','manifest.webmanifest','icon-192.png','icon-512.png'];
const WAIT=4000; // réseau trop lent : on se rabat sur la copie en cache au bout de 4 s

self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'||new URL(req.url).origin!==location.origin)return;
  const key=req.mode==='navigate'?'index.html':req;
  e.respondWith(caches.open(CACHE).then(async c=>{
    const net=fetch(req.mode==='navigate'?'index.html':req.url,{cache:'no-store'}).then(r=>{if(r.ok){c.put(key,r.clone());return r}throw new Error(r.status)});
    const hit=await c.match(key,{ignoreSearch:true});
    if(!hit)return net.catch(()=>fetch(req));
    // Le réseau d'abord ; en cas d'échec ou de lenteur, la copie en cache.
    return Promise.race([net,new Promise((_,ko)=>setTimeout(ko,WAIT))]).catch(()=>{e.waitUntil(net.catch(()=>{}));return hit});
  }));
});
