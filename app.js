import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/*
 * CONFIGURACIÓN:
 * Copia supabase-config.example.js a supabase-config.js y completa la URL y
 * la clave anon/public de tu proyecto Supabase. Nunca pongas la service_role aquí.
 */
let SUPABASE_URL = "";
let SUPABASE_ANON_KEY = "";
try {
  const cfg = await import("./supabase-config.js");
  SUPABASE_URL = cfg.SUPABASE_URL || "";
  SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY || "";
} catch (_) {}

const $ = (id) => document.getElementById(id);
const views = ["welcomeView", "authView", "homeView", "messageView"];
const state = { client: null, session: null, profile: null, selectedNeed: null, deferredInstall: null, audioOn: false };
const NEEDS = {
  escuchar: { title: "Necesito que me escuches", label: "Necesito que me escuches" },
  carino: { title: "Quiero un poquito de cariño", label: "Quiero un poquito de cariño" },
  dificil: { title: "Hoy no me siento muy bien", label: "Hoy no me siento muy bien" },
  hablar: { title: "Simplemente quiero hablar contigo", label: "Simplemente quiero hablar contigo" }
};
function showView(id) { views.forEach(v => $(v).hidden = v !== id); window.scrollTo({top:0,behavior:"smooth"}); }
function status(id, message, error=false) { const el=$(id); if(el){el.textContent=message;el.classList.toggle("error",error);} }
function escapeHtml(s="") { return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function formatDate(s) { try{return new Intl.DateTimeFormat("es-DO",{dateStyle:"medium",timeStyle:"short"}).format(new Date(s));}catch{return s||"";} }
function announce(text) { const region = document.createElement("div"); region.className="toast"; region.setAttribute("role","status"); region.textContent=text; document.body.append(region); setTimeout(()=>region.remove(),3500); }

async function init() {
  $("year").textContent = new Date().getFullYear();
  setTimeout(()=>$("splash").classList.add("hide"), 1650);
  $("startBtn").addEventListener("click", async()=> {
    if(!SUPABASE_URL || !SUPABASE_ANON_KEY){ showView("authView"); status("authError","Antes de iniciar sesión, el administrador debe configurar Supabase en supabase-config.js.",true); return; }
    showView("authView");
  });
  document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
  $("homeBtn").addEventListener("click",()=>state.session?showView("homeView"):showView("welcomeView"));
  $("backHome").addEventListener("click",()=>showView("homeView"));
  $("logoutBtn").addEventListener("click", async()=>{ if(state.client) await state.client.auth.signOut(); state.session=null;state.profile=null;$("logoutBtn").hidden=true;showView("welcomeView");});
  $("authForm").addEventListener("submit", signIn);
  document.querySelectorAll("[data-need]").forEach(b=>b.addEventListener("click",()=>selectNeed(b.dataset.need)));
  $("cancelNeed").addEventListener("click",()=>{$("needForm").hidden=true;state.selectedNeed=null;});
  $("needForm").addEventListener("submit", submitNeed);
  $("journalForm").addEventListener("submit", submitJournal);
  $("replyForm").addEventListener("submit", submitReply);
  $("letterForm").addEventListener("submit", submitLetter);
  $("refreshAdmin").addEventListener("click",loadAdmin);
  $("musicToggle").addEventListener("click",toggleMusic);
  window.addEventListener("beforeinstallprompt", e=>{e.preventDefault();state.deferredInstall=e;$("installBtn").hidden=false;});
  $("installBtn").addEventListener("click",async()=>{if(state.deferredInstall){state.deferredInstall.prompt();await state.deferredInstall.userChoice;state.deferredInstall=null;$("installBtn").hidden=true;}else announce("En iPhone: Safari → Compartir → Añadir a pantalla de inicio.");});
  if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(console.warn);
  if(SUPABASE_URL && SUPABASE_ANON_KEY) {
    state.client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
    const {data:{session}}=await state.client.auth.getSession();
    if(session) await onSession(session);
    state.client.auth.onAuthStateChange((_event,session)=>{if(session) onSession(session);});
  }
  // Keep splash sound opt-in to avoid unexpected audio and browser autoplay blocks.
}
async function signIn(e) {
  e.preventDefault(); status("authError","");
  if(!state.client){status("authError","Supabase aún no está configurado. Revisa la guía README.",true);return;}
  const {data,error}=await state.client.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
  if(error){status("authError","No se pudo iniciar sesión. Revisa el correo y la contraseña.",true);return;}
  await onSession(data.session);
}
async function onSession(session) {
  state.session=session; $("logoutBtn").hidden=false;
  const {data:profile,error}=await state.client.from("profiles").select("id,display_name,role").eq("id",session.user.id).maybeSingle();
  if(error){console.error(error);announce("No se pudo cargar el perfil.");return;}
  state.profile=profile||{display_name:"Helena",role:"helena"};
  $("helloTitle").textContent=`Hola, ${state.profile.display_name||"Helena"}.`;
  showView("homeView"); await loadLetters();
  if(state.profile.role==="admin"){ $("adminArea").hidden=false; await loadAdmin(); }
  else $("adminArea").hidden=true;
  await requestPushOptIn();
}
function selectNeed(key) {
  if(!NEEDS[key])return;
  state.selectedNeed=key; $("needTitle").textContent=NEEDS[key].title;
  $("needMessage").value=""; status("needStatus",""); $("needForm").hidden=false;
  $("needForm").scrollIntoView({behavior:"smooth",block:"center"});
}
async function submitNeed(e) {
  e.preventDefault(); if(!state.client||!state.session||!state.selectedNeed)return;
  status("needStatus","Enviando…");
  const {error}=await state.client.from("needs").insert({user_id:state.session.user.id,need_type:state.selectedNeed,message:$("needMessage").value.trim()});
  if(error){status("needStatus","No se pudo enviar. Comprueba tu conexión e inténtalo de nuevo.",true);return;}
  $("needForm").hidden=true;state.selectedNeed=null;announce("Tu mensaje se ha enviado con cariño. ❤️");
}
async function submitJournal(e) {
  e.preventDefault(); if(!state.client||!state.session)return;
  status("journalStatus","Guardando…");
  const {error}=await state.client.from("entries").insert({user_id:state.session.user.id,category:$("journalCategory").value,body:$("journalText").value.trim()});
  if(error){status("journalStatus","No se pudo guardar. Comprueba tu conexión.",true);return;}
  $("journalText").value="";status("journalStatus","Guardado. Gracias por compartir lo que sientes. ❤️");
}
async function loadLetters() {
  if(!state.client||!state.session)return;
  const {data,error}=await state.client.from("letters").select("id,title,body,created_at").eq("published",true).order("created_at",{ascending:false});
  if(error){$("lettersList").innerHTML='<p class="muted">No se pudieron cargar las cartas.</p>';return;}
  if(!data?.length){$("lettersList").innerHTML='<p class="muted">Las cartas sorpresa aparecerán aquí cuando estén preparadas para ti.</p>';return;}
  $("lettersList").innerHTML=data.map(l=>`<article class="letter-card"><h4>${escapeHtml(l.title)}</h4><p>${escapeHtml(l.body)}</p></article>`).join("");
}
async function loadAdmin() {
  if(state.profile?.role!=="admin")return;
  const [needs,entries]=await Promise.all([
    state.client.from("needs").select("id,user_id,need_type,message,created_at,profiles(display_name)").order("created_at",{ascending:false}).limit(100),
    state.client.from("entries").select("id,user_id,category,body,created_at,profiles(display_name)").order("created_at",{ascending:false}).limit(100)
  ]);
  if(needs.error||entries.error){$("adminEntries").innerHTML='<p class="muted">No se pudieron cargar los mensajes. Comprueba las políticas de acceso.</p>';return;}
  $("needCount").textContent=needs.data.length;$("journalCount").textContent=entries.data.length;
  const combined=[
    ...needs.data.map(x=>({...x,_type:"need",_label:NEEDS[x.need_type]?.label||x.need_type,_body:x.message||"(Sin mensaje escrito)"})),
    ...entries.data.map(x=>({...x,_type:"entry",_label:x.category.replaceAll("_"," "),_body:x.body}))
  ].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  $("adminEntries").innerHTML=combined.length?combined.map(x=>`<article class="entry-card"><p class="entry-meta">${x._type==="need"?"SOLICITUD DE CARIÑO":"DIARIO"} · ${escapeHtml(formatDate(x.created_at))}</p><h4>${escapeHtml(x._label)}</h4><p>${escapeHtml(x._body)}</p></article>`).join(""):'<p class="muted">Todavía no hay mensajes compartidos.</p>';
}
async function submitReply(e) {
  e.preventDefault();if(state.profile?.role!=="admin"||!state.client)return;
  status("replyStatus","Enviando…");
  const {error}=await state.client.from("replies").insert({author_id:state.session.user.id,body:$("replyText").value.trim(),recipient_id:null});
  if(error){status("replyStatus","No se pudo enviar. Revisa la configuración de la tabla replies.",true);return;}
  $("replyText").value="";status("replyStatus","Respuesta guardada. ❤️");
}
async function submitLetter(e) {
  e.preventDefault();if(state.profile?.role!=="admin"||!state.client)return;
  status("letterStatus","Guardando…");
  const {error}=await state.client.from("letters").insert({title:$("letterTitle").value.trim(),body:$("letterBody").value.trim(),published:true,author_id:state.session.user.id});
  if(error){status("letterStatus","No se pudo guardar la carta.",true);return;}
  $("letterTitle").value="";$("letterBody").value="";status("letterStatus","Carta publicada para Helena. ❤️");await loadLetters();
}
async function requestPushOptIn() {
  // OneSignal is optional until app ID and SDK are configured. Never ask on first load unexpectedly.
  const enabled=document.querySelector('meta[name="onesignal-app-id"]')?.content;
  if(!enabled||enabled==="REPLACE_WITH_ONESIGNAL_APP_ID")return;
  if(!("Notification" in window)||!("serviceWorker" in navigator))return;
  // Actual subscription initialization is documented in README and OneSignal dashboard.
}
async function toggleMusic() {
  // Music is opt-in. Place a licensed audio file at assets/ambient.mp3 to enable.
  let audio=$("ambientAudio");
  if(!audio.src || audio.src.endsWith(window.location.pathname) || !audio.querySelector("source")) {
    audio.src="./assets/ambient.mp3";
  }
  if(!state.audioOn) {
    try { await audio.play();state.audioOn=true;$("musicToggle").textContent="Ⅱ";announce("Música activada."); }
    catch { announce("Añade una pista instrumental con licencia a assets/ambient.mp3 para activar la música."); }
  } else {audio.pause();state.audioOn=false;$("musicToggle").textContent="♫";}
}
init();