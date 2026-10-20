# HELENA ❤️

Aplicación web instalable (PWA) en español, con estética negra y tipografía blanca, corazón simbólico, diario, botón **«Hoy necesito cariño»**, cartas sorpresa y panel privado de administración.

> Este repositorio es una base funcional de proyecto. Las notificaciones push y el almacenamiento compartido requieren que completes las credenciales y pasos de configuración de los servicios. No subas secretos privados al repositorio.

## Incluye

- PWA para Android y iPhone; pantalla de bienvenida minimalista HELENA.
- Interfaz responsive y modo oscuro.
- Acceso por cuenta Supabase.
- Diario privado y cuatro tipos de solicitud de cariño.
- Panel admin con historial de solicitudes y entradas, respuestas y creación de cartas.
- SQL con tablas y políticas RLS.
- Service worker para shell offline y recepción de push.
- Función de ejemplo para recordatorios diarios mediante OneSignal.
- Música opcional: coloca un archivo instrumental con licencia propia en `assets/ambient.mp3`.

## 1. Crear el repositorio GitHub

1. Crea un repositorio nuevo, por ejemplo `helena-app`.
2. Sube todo el contenido de esta carpeta a la raíz del branch `main`.
3. En GitHub entra a **Settings → Pages** y selecciona **Deploy from a branch**, branch `main`, carpeta `/ (root)`.
4. Espera a que GitHub Pages publique la página. El enlace tendrá formato `https://TU-USUARIO.github.io/helena-app/`.
5. GitHub Pages sirve por HTTPS, necesario para PWA y notificaciones.

## 2. Configurar Supabase

1. Crea un proyecto en Supabase.
2. Abre **SQL Editor**, pega y ejecuta `supabase/schema.sql`.
3. En Project Settings → API, copia Project URL y la clave `anon`/publishable.
4. Copia `supabase-config.example.js` como `supabase-config.js` y rellena `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
5. `supabase-config.js` está en `.gitignore`. Para publicar desde GitHub Pages tendrás que crear ese archivo durante el despliegue o, más sencillo para un proyecto personal, subirlo solo si contiene la URL y la clave pública anon/publishable. La seguridad debe depender de RLS; nunca incluyas `service_role`.
6. En Authentication → Users, crea el usuario de Helena y tu usuario administrador. Usa contraseñas fuertes y no compartas la de administrador.
7. Después de crear ambos usuarios, en SQL Editor actualiza tu usuario admin (sustituye el correo):
   ```sql
   update public.profiles
   set role = 'admin', display_name = 'Administrador'
   where id = (select id from auth.users where email = 'TU_CORREO_ADMIN');
   update public.profiles
   set display_name = 'Helena', role = 'helena'
   where id = (select id from auth.users where email = 'CORREO_HELENA');
   ```
8. En Authentication → URL Configuration, añade el dominio GitHub Pages a Site URL y Redirect URLs si usas recuperación de contraseña.

### Seguridad importante
- Nunca uses `service_role` en el navegador.
- Revisa RLS y prueba con ambas cuentas antes de añadir datos reales.
- El panel solo se muestra cuando `profiles.role = 'admin'`.
- Helena debe saber que lo que envía puede ser leído por el administrador.
- Este prototipo guarda solicitudes y entradas; el indicador del corazón es simbólico y no cambia automáticamente al pulsar “necesito cariño”.

## 3. Notificaciones push diarias a las 20:00 de República Dominicana

Las notificaciones no funcionan con GitHub Pages por sí solo. El ejemplo usa OneSignal para el envío push y una Supabase Edge Function para llamar a la API sin exponer la clave privada.

1. Crea una aplicación web en OneSignal y configura Web Push con el origen HTTPS de tu GitHub Pages. Sigue el asistente oficial para integrar su SDK y el service worker requerido por la configuración actual de OneSignal.
2. En OneSignal, asigna el `external_id` `helena` al dispositivo de Helena al completar la suscripción. Hazlo solo después de que ella acepte recibir notificaciones.
3. Configura los secretos de la función:
   ```sh
   supabase secrets set ONESIGNAL_APP_ID="..."
   supabase secrets set ONESIGNAL_REST_API_KEY="..."
   supabase secrets set CRON_SECRET="un-secreto-largo-aleatorio"
   supabase secrets set HELENA_PUBLIC_URL="https://TU-USUARIO.github.io/helena-app/"
   ```
4. Despliega:
   ```sh
   supabase functions deploy notify-daily
   ```
5. Programa una invocación POST diaria con Supabase Cron/pg_cron o un programador externo seguro, enviando el encabezado `x-cron-secret`. **20:00 en República Dominicana = 00:00 UTC del día siguiente.** Confirma que el programador usa UTC y prueba la ejecución manual antes de activar el horario.
6. Prueba con un dispositivo Android y uno iPhone. La persona debe instalar la PWA y conceder permiso. En iPhone, se requiere iOS 16.4 o posterior y añadir a pantalla de inicio para Web Push.
7. Ofrece en la interfaz una forma visible de desactivar los avisos y elimina la suscripción cuando se retire el consentimiento.

Los mensajes del ejemplo alternan entre siete textos. Ajusta la función para enviar únicamente a la suscripción autorizada de Helena y no a todos los usuarios de OneSignal.

## 4. Instalar en el teléfono

### Android
Abre la URL en Chrome → menú ⋮ → **Instalar aplicación** o **Añadir a pantalla de inicio**. Acepta las notificaciones cuando se solicite.

### iPhone
Abre la URL en Safari → **Compartir** → **Añadir a pantalla de inicio**. Abre la app instalada y activa las notificaciones desde la interfaz de suscripción configurada con OneSignal.

## 5. Música y sonidos

Los navegadores bloquean el audio automático en muchos casos. El botón ♫ permite activar música de forma manual. Para habilitarla, añade `assets/ambient.mp3` con música instrumental que tengas permiso de usar. El sonido de bienvenida está representado visualmente por ahora; el proyecto no incluye audio comercial.

## 6. Qué probar antes de usar

- Inicio de sesión con Helena y con administrador.
- Que Helena solo vea sus propios datos y cartas publicadas.
- Que el administrador pueda ver entradas/solicitudes y enviar cartas/respuestas.
- Que las credenciales privadas no aparezcan en los archivos publicados.
- Instalación y notificaciones push en iPhone y Android.
- Que el recordatorio diario llegue una sola vez y se pueda desactivar.

## Limitaciones de esta primera versión

- La interfaz de push requiere completar la integración SDK/consentimiento de OneSignal en el proyecto.
- La función Edge Function de recordatorios es un ejemplo y necesita un cron autenticado.
- La sección de respuestas está preparada para persistir mensajes, pero la vista de lectura de respuestas para Helena debe completarse antes de producción.
- El icono es SVG; algunos dispositivos pueden preferir PNG de 192×192 y 512×512.
- No hay una aplicación nativa ni widget de pantalla de inicio del sistema; es una PWA.
