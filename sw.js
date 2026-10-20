const CACHE_NAME = "helena-shell-v1";
const SHELL = ["./","./index.html","./styles.css","./app.js","./manifest.webmanifest","./assets/helena-icon.svg"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const req=event.request;
  if(req.method!=="GET" || new URL(req.url).origin!==self.location.origin)return;
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(CACHE_NAME).then(cache=>cache.put(req,copy));}
    return res;
  }).catch(()=>caches.match("./index.html"))));
});
self.addEventListener("push", event => {
  let data={title:"HELENA",body:"Helena, ¿tienes algo que contarme? Entra y dímelo ❤️",url:"./"};
  try { data={...data,...event.data.json()}; } catch(_){}
  event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:"./assets/helena-icon.svg",badge:"./assets/helena-icon.svg",data:{url:data.url||"./"},tag:"helena-daily",renotify:false}));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target=new URL(event.notification.data?.url||"./",self.location.origin).href;
  event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    for(const client of list){if(client.url.startsWith(self.location.origin)&&"focus" in client){client.navigate(target);return client.focus();}}
    return self.clients.openWindow(target);
  }));
});