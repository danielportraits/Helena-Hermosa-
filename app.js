
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

let SUPABASE_URL = "";
let SUPABASE_ANON_KEY = "";

try {
  const cfg = await import("./supabase-config.js");
  SUPABASE_URL = cfg.SUPABASE_URL || "";
  SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY || "";
} catch (error) {
  console.error("No se pudo cargar supabase-config.js", error);
}

const $ = (id) => document.getElementById(id);
const views = ["welcomeView", "authView", "homeView", "messageView"];

const state = {
  client: null,
  session: null,
  profile: null,
  selectedNeed: null,
  deferredInstall: null,
  audioOn: false,
  audio: null,
  audioStarted: false,
  meterLevel: 50,
  meterEvents: []
};

const NEEDS = {
  escuchar: {
    title: "Necesito que me escuches",
    label: "Necesito que me escuches"
  },
  carino: {
    title: "Quiero un poquito de cariño",
    label: "Quiero un poquito de cariño"
  },
  dificil: {
    title: "Hoy no me siento muy bien",
    label: "Hoy no me siento muy bien"
  },
  hablar: {
    title: "Simplemente quiero hablar contigo",
    label: "Simplemente quiero hablar contigo"
  }
};

/* MÚSICA INSTRUMENTAL */

function setupMusic() {
  const audio = $("ambientAudio");

  if (!audio) {
    console.warn(
      'No existe el elemento "ambientAudio" en index.html.'
    );
    return;
  }

  state.audio = audio;

  // Utiliza el mismo archivo de audio durante toda la sesión.
  audio.src = new URL(
    "./helena-instrumental.mp3",
    import.meta.url
  ).href;

  audio.loop = true;
  audio.volume = 0.35;
  audio.preload = "auto";

  audio.addEventListener("play", () => {
    state.audioOn = true;
    const button = $("musicToggle");
    if (button) button.textContent = "Ⅱ";
  });

  audio.addEventListener("pause", () => {
    state.audioOn = false;
    const button = $("musicToggle");
    if (button) button.textContent = "♫";
  });

  audio.addEventListener("error", () => {
    console.error(
      "No se pudo cargar helena-instrumental.mp3.",
      audio.error
    );
  });

  // Intento automático al abrir la aplicación.
  startMusic();
}

async function startMusic() {
  const audio = state.audio;

  if (!audio || !audio.paused) return;

  try {
    await audio.play();
    state.audioStarted = true;
  } catch (error) {
    // El navegador puede exigir una interacción del usuario.
    console.info(
      "La reproducción automática está bloqueada. Se reintentará al interactuar.",
      error
    );
  }
}

async function toggleMusic() {
  if (!state.audio) {
    setupMusic();
  }

  const audio = state.audio;
  if (!audio) return;

  if (audio.paused) {
    try {
      await audio.play();
      state.audioStarted = true;
      announce("Música activada. ❤️");
    } catch (error) {
      console.error("Error al reproducir la música:", error);
      announce(
        "No se pudo reproducir la música. Comprueba el archivo de audio."
      );
    }
  } else {
    audio.pause();
    announce("Música pausada.");
  }
}

function $(id) {
  return document.getElementById(id);
}

function showView(id) {
  views.forEach(v => {
    const el = $(v);
    if (el) el.hidden = v !== id;
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function status(id, message, error = false) {
  const el = $(id);
  if (el) {
    el.textContent = message;
    el.classList.toggle("error", error);
  }
}

function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function formatDate(s) {
  try {
    return new Intl.DateTimeFormat("es-DO", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(s));
  } catch {
    return s || "";
  }
}

function announce(message) {
  const region = document.createElement("div");
  region.className = "toast";
  region.setAttribute("role", "status");
  region.textContent = message;
  document.body.append(region);
  setTimeout(() => region.remove(), 3500);
}

/* MEDIDOR DE AMOR */

function setupMeter() {
  const heart = document.querySelector(".meter-heart");
  const wrap = document.querySelector(".meter-heart-wrap");

  if (!heart || !wrap) return;

  heart.setAttribute("role", "button");
  heart.setAttribute("tabindex", "0");
  heart.setAttribute("aria-label", "Corazón simbólico. Ver nivel actual");
  heart.style.cursor = "pointer";
  heart.style.touchAction = "manipulation";

  if (!$("meterValue")) {
    const label = document.createElement("p");
    label.id = "meterValue";
    label.className = "meter-value";
    label.style.textAlign = "center";
    label.style.margin = "10px 0 0";
    label.style.fontWeight = "700";
    wrap.append(label);
  }

  heart.addEventListener("click", animateMeterHeart);

  heart.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      animateMeterHeart();
    }
  });

  renderMeter();
}

function renderMeter() {
  const level = Math.max(0, Math.min(100, state.meterLevel));
  const rect = $("heartFillRect");

  if (rect) {
    const height = 0.9 * level;
    rect.setAttribute("y", String(90 - height));
    rect.setAttribute("height", String(height));
    rect.style.transition = "y 800ms ease, height 800ms ease";
  }

  const label = $("meterValue");
  if (label) label.textContent = `${level.toFixed(0)} %`;

  const heart = document.querySelector(".meter-heart");
  if (heart) {
    heart.setAttribute(
      "aria-label",
      `Corazón simbólico. Nivel actual: ${level.toFixed(0)} por ciento`
    );
  }
}

function animateMeterHeart() {
  const heart = document.querySelector(".meter-heart");
  if (!heart) return;

  if (typeof heart.animate === "function") {
    heart.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.13)" },
        { transform: "scale(0.96)" },
        { transform: "scale(1)" }
      ],
      { duration: 650, easing: "ease-in-out" }
    );
  }

  announce(`El corazón está al ${state.meterLevel.toFixed(0)} %. ❤️`);
}

async function loadMeter() {
  if (!state.client || !state.session) return;

  const { data, error } = await state.client
    .from("meter_events")
    .select("change, reason, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error al cargar el medidor:", error);
    announce("No se pudo actualizar el medidor. Comprueba los permisos de Supabase.");
    return;
  }

  state.meterEvents = data || [];

  const totalChange = state.meterEvents.reduce(
    (sum, event) => sum + Number(event.change || 0),
    0
  );

  state.meterLevel = Math.max(0, Math.min(100, 50 + totalChange));
  renderMeter();

  if (state.profile?.role === "admin") renderMeterHistory();
}

function setupAdminMeter() {
  if ($("meterAdminPanel")) return;

  const adminArea = $("adminArea");
  if (!adminArea) return;

  const panel = document.createElement("section");
  panel.id = "meterAdminPanel";
  panel.className = "panel form-stack";
  panel.style.marginBottom = "24px";

  panel.innerHTML = `
    <p class="eyebrow">MEDIDOR DE AMOR</p>
    <h3>Controlar el corazón</h3>
    <p class="muted">
      Nivel actual: <strong id="adminMeterValue">50 %</strong>.
      Cada cambio se suma al historial.
    </p>
    <form id="meterForm" class="form-stack">
      <label>
        Cambio de puntos
        <input id="meterChange" type="number"
          min="-10" max="10" step="1" value="5" required>
      </label>
      <label>
        Motivo del cambio
        <input id="meterReason" type="text"
          maxlength="500" minlength="1" required
          placeholder="Escribe el motivo del cambio">
      </label>
      <button class="primary-button" type="submit">
        Guardar cambio
      </button>
      <p id="meterStatus" class="status" role="status"></p>
    </form>
    <div class="section-heading">
      <div>
        <p class="eyebrow">HISTORIAL</p>
        <h3>Cambios del medidor</h3>
      </div>
    </div>
    <div id="meterHistory">
      <p class="muted">Cargando historial…</p>
    </div>
  `;

  adminArea.prepend(panel);
  $("meterForm").addEventListener("submit", submitMeterChange);
}

async function submitMeterChange(event) {
  event.preventDefault();

  if (!state.client || !state.session || state.profile?.role !== "admin") {
    status("meterStatus", "No tienes permisos de administrador.", true);
    return;
  }

  const change = Number($("meterChange").value);
  const reason = $("meterReason").value.trim();

  if (!Number.isInteger(change) || change < -10 || change > 10) {
    status("meterStatus", "El cambio debe ser un número entero entre -10 y +10.", true);
    return;
  }

  if (!reason || reason.length > 500) {
    status("meterStatus", "Escribe un motivo de hasta 500 caracteres.", true);
    return;
  }

  const button = $("meterForm").querySelector('button[type="submit"]');
  button.disabled = true;
  status("meterStatus", "Guardando cambio…");

  try {
    const { error } = await state.client.from("meter_events").insert({
      created_by: state.session.user.id,
      change,
      reason
    });

    if (error) {
      console.error(error);
      status("meterStatus", "No se pudo guardar. Verifica tu rol y las políticas de Supabase.", true);
      return;
    }

    $("meterReason").value = "";
    status("meterStatus", "Cambio guardado correctamente. ❤️");
    await loadMeter();
  } finally {
    button.disabled = false;
  }
}

function renderMeterHistory() {
  const history = $("meterHistory");
  const value = $("adminMeterValue");

  if (value) value.textContent = `${state.meterLevel.toFixed(0)} %`;
  if (!history) return;

  if (!state.meterEvents.length) {
    history.innerHTML = '<p class="muted">Todavía no hay cambios registrados.</p>';
    return;
  }

  history.innerHTML = [...state.meterEvents].reverse().map(item => {
    const change = Number(item.change);
    const sign = change > 0 ? "+" : "";

    return `
      <article class="entry-card">
        <p class="entry-meta">${escapeHtml(formatDate(item.created_at))}</p>
        <h4>${sign}${change} puntos</h4>
        <p>${escapeHtml(item.reason)}</p>
      </article>
    `;
  }).join("");
}

/* INICIO Y NAVEGACIÓN */

async function init() {
  const year = $("year");
  if (year) year.textContent = new Date().getFullYear();

  setupMeter();
  setupMusic();

  const splash = $("splash");
  if (splash) setTimeout(() => splash.classList.add("hide"), 1650);

  $("startBtn").addEventListener("click", () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      showView("authView");
      status("authError", "Falta la configuración de Supabase en supabase-config.js.", true);
      return;
    }
    showView("authView");
  });

  document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  $("homeBtn").addEventListener("click", () => {
    state.session ? showView("homeView") : showView("welcomeView");
  });

  $("backHome").addEventListener("click", () => showView("homeView"));

  $("logoutBtn").addEventListener("click", async () => {
    if (state.client) await state.client.auth.signOut();

    state.session = null;
    state.profile = null;
    $("logoutBtn").hidden = true;
    showView("welcomeView");
  });

  $("authForm").addEventListener("submit", signIn);

  document.querySelectorAll("[data-need]").forEach(button => {
    button.addEventListener("click", () => selectNeed(button.dataset.need));
  });

  $("cancelNeed").addEventListener("click", () => {
    $("needForm").hidden = true;
    state.selectedNeed = null;
  });

  $("needForm").addEventListener("submit", submitNeed);
  $("journalForm").addEventListener("submit", submitJournal);
  $("replyForm").addEventListener("submit", submitReply);
  $("letterForm").addEventListener("submit", submitLetter);
  $("refreshAdmin").addEventListener("click", loadAdmin);
  $("musicToggle").addEventListener("click", toggleMusic);

  // Si el navegador bloquea el autoplay, el primer toque lo reintenta.
  const retryMusic = () => {
    if (state.audio && state.audio.paused) startMusic();
  };

  document.addEventListener("pointerdown", retryMusic, { once: true });
  document.addEventListener("keydown", retryMusic, { once: true });

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    state.deferredInstall = event;
    $("installBtn").hidden = false;
  });

  $("installBtn").addEventListener("click", async () => {
    if (state.deferredInstall) {
      state.deferredInstall.prompt();
      await state.deferredInstall.userChoice;
      state.deferredInstall = null;
      $("installBtn").hidden = true;
    } else {
      announce("En iPhone: Safari → Compartir → Añadir a pantalla de inicio.");
    }
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(console.warn);
  }

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    state.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data, error } = await state.client.auth.getSession();
    if (error) console.error(error);
    if (data?.session) await onSession(data.session);

    state.client.auth.onAuthStateChange((_event, session) => {
      if (session) onSession(session);
    });
  }
}

async function signIn(event) {
  event.preventDefault();
  status("authError", "");

  if (!state.client) {
    status("authError", "Supabase aún no está configurado.", true);
    return;
  }

  const { data, error } = await state.client.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value
  });

  if (error) {
    status("authError", "No se pudo iniciar sesión. Revisa el correo y la contraseña.", true);
    return;
  }

  await onSession(data.session);
}

async function onSession(session) {
  state.session = session;
  $("logoutBtn").hidden = false;

  const { data: profile, error } = await state.client
    .from("profiles")
    .select("id,display_name,role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    announce("No se pudo cargar el perfil.");
    return;
  }

  state.profile = profile || { display_name: "Helena", role: "helena" };

  $("helloTitle").textContent = `Hola, ${state.profile.display_name || "Helena"}.`;
  showView("homeView");

  await loadLetters();
  await loadMeter();

  if (state.profile.role === "admin") {
    $("adminArea").hidden = false;
    setupAdminMeter();
    await loadAdmin();
    renderMeterHistory();
  } else {
    $("adminArea").hidden = true;
  }

  await requestPushOptIn();
}

/* SOLICITUDES DE CARIÑO */

function selectNeed(key) {
  if (!NEEDS[key]) return;

  state.selectedNeed = key;
  $("needTitle").textContent = NEEDS[key].title;
  $("needMessage").value = "";
  status("needStatus", "");
  $("needForm").hidden = false;
  $("needForm").scrollIntoView({ behavior: "smooth", block: "center" });
}

async function submitNeed(event) {
  event.preventDefault();
  if (!state.client || !state.session || !state.selectedNeed) return;

  status("needStatus", "Enviando…");

  const { error } = await state.client.from("needs").insert({
    user_id: state.session.user.id,
    need_type: state.selectedNeed,
    message: $("needMessage").value.trim()
  });

  if (error) {
    status("needStatus", "No se pudo enviar. Comprueba tu conexión.", true);
    return;
  }

  $("needForm").hidden = true;
  state.selectedNeed = null;
  announce("Tu mensaje se ha enviado con cariño. ❤️");
}

async function submitJournal(event) {
  event.preventDefault();
  if (!state.client || !state.session) return;

  status("journalStatus", "Guardando…");

  const { error } = await state.client.from("entries").insert({
    user_id: state.session.user.id,
    category: $("journalCategory").value,
    body: $("journalText").value.trim()
  });

  if (error) {
    status("journalStatus", "No se pudo guardar. Comprueba tu conexión.", true);
    return;
  }

  $("journalText").value = "";
  status("journalStatus", "Guardado. Gracias por compartir lo que sientes. ❤️");
}

/* CARTAS */

async function loadLetters() {
  if (!state.client || !state.session) return;

  const { data, error } = await state.client
    .from("letters")
    .select("id,title,body,created_at")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    $("lettersList").innerHTML = '<p class="muted">No se pudieron cargar las cartas.</p>';
    return;
  }

  if (!data?.length) {
    $("lettersList").innerHTML = '<p class="muted">Las cartas sorpresa aparecerán aquí cuando estén preparadas para ti.</p>';
    return;
  }

  $("lettersList").innerHTML = data.map(letter => `
    <article class="letter-card">
      <h4>${escapeHtml(letter.title)}</h4>
      <p>${escapeHtml(letter.body)}</p>
    </article>
  `).join("");
}

/* PANEL DE ADMINISTRACIÓN */

async function loadAdmin() {
  if (state.profile?.role !== "admin") return;

  const [needs, entries] = await Promise.all([
    state.client.from("needs")
      .select("id,user_id,need_type,message,created_at,profiles(display_name)")
      .order("created_at", { ascending: false }).limit(100),

    state.client.from("entries")
      .select("id,user_id,category,body,created_at,profiles(display_name)")
      .order("created_at", { ascending: false }).limit(100)
  ]);

  if (needs.error || entries.error) {
    $("adminEntries").innerHTML = '<p class="muted">No se pudieron cargar los mensajes. Comprueba las políticas de acceso.</p>';
    return;
  }

  $("needCount").textContent = needs.data.length;
  $("journalCount").textContent = entries.data.length;

  const combined = [
    ...needs.data.map(item => ({
      ...item,
      _type: "need",
      _label: NEEDS[item.need_type]?.label || item.need_type,
      _body: item.message || "(Sin mensaje escrito)"
    })),
    ...entries.data.map(item => ({
      ...item,
      _type: "entry",
      _label: (item.category || "").replaceAll("_", " "),
      _body: item.body
    }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  $("adminEntries").innerHTML = combined.length
    ? combined.map(item => `
      <article class="entry-card">
        <p class="entry-meta">${item._type === "need" ? "SOLICITUD DE CARIÑO" : "DIARIO"} · ${escapeHtml(formatDate(item.created_at))}</p>
        <h4>${escapeHtml(item._label)}</h4>
        <p>${escapeHtml(item._body)}</p>
      </article>
    `).join("")
    : '<p class="muted">Todavía no hay mensajes compartidos.</p>';
}

async function submitReply(event) {
  event.preventDefault();
  if (state.profile?.role !== "admin" || !state.client) return;

  status("replyStatus", "Enviando…");

  const { error } = await state.client.from("replies").insert({
    author_id: state.session.user.id,
    body: $("replyText").value.trim(),
    recipient_id: null
  });

  if (error) {
    status("replyStatus", "No se pudo enviar. Revisa la configuración de replies.", true);
    return;
  }

  $("replyText").value = "";
  status("replyStatus", "Respuesta guardada. ❤️");
}

async function submitLetter(event) {
  event.preventDefault();
  if (state.profile?.role !== "admin" || !state.client) return;

  status("letterStatus", "Guardando…");

  const { error } = await state.client.from("letters").insert({
    title: $("letterTitle").value.trim(),
    body: $("letterBody").value.trim(),
    published: true,
    author_id: state.session.user.id
  });

  if (error) {
    status("letterStatus", "No se pudo guardar la carta.", true);
    return;
  }

  $("letterTitle").value = "";
  $("letterBody").value = "";
  status("letterStatus", "Carta publicada para Helena. ❤️");
  await loadLetters();
}

async function requestPushOptIn() {
  const enabled = document.querySelector('meta[name="onesignal-app-id"]')?.content;

  if (!enabled || enabled === "REPLACE_WITH_ONESIGNAL_APP_ID") return;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
}

init().catch(error => {
  console.error("Error al iniciar HELENA:", error);
  announce("Hubo un problema al cargar la aplicación. Recarga la página.");
});
