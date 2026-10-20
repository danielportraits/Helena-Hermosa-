// Deploy: supabase functions deploy notify-daily
// Configure secrets: ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY, CRON_SECRET
// Invoke daily from Supabase Cron/pg_cron at 00:00 UTC (20:00 Dominican time).
// Set OneSignal subscriptions to external_id = 'helena' for the recipient.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const messages = [
  "Helena, ¿tienes algo que contarme? Entra y dímelo. Estoy aquí para escucharte. ❤️",
  "Un ratito para nosotros: ¿hay algo que llevas en el corazón y quieras compartir? 💕",
  "Antes de terminar el día, cuéntame cómo te sientes. Quiero escucharte. 🌙",
  "Helena, ¿cómo estuvo tu día? Si quieres hablar, aquí tienes tu espacio. ❤️",
  "No tienes que guardarte todo para ti. Si necesitas contarme algo, HELENA está aquí. 🫶",
  "Paso por aquí para recordarte que tus sentimientos importan. ¿Quieres contarme algo? ✨",
  "¿Necesitas que te escuche o simplemente un poquito de cariño? Entra cuando quieras. 💗"
];

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected || req.headers.get("x-cron-secret") !== expected) return new Response("Unauthorized", { status: 401 });
  const appId = Deno.env.get("ONESIGNAL_APP_ID");
  const apiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
  if (!appId || !apiKey) return new Response("Missing OneSignal secrets", { status: 500 });

  const day = Math.floor(Date.now() / 86400000);
  const body = {
    app_id: appId,
    include_aliases: { external_id: ["helena"] },
    target_channel: "push",
    headings: { es: "HELENA ❤️" },
    contents: { es: messages[day % messages.length] },
    url: Deno.env.get("HELENA_PUBLIC_URL") || "https://TU-USUARIO.github.io/helena-app/",
    idempotency_key: `helena-daily-${new Date().toISOString().slice(0,10)}`
  };
  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Key ${apiKey}` },
    body: JSON.stringify(body)
  });
  const result = await response.text();
  return new Response(result, { status: response.status, headers: { "Content-Type": "application/json" } });
});