# CLAUDE.md — velinex-crm

## Contexto del proyecto

CRM personalizable (repo GitHub: `customizable-crm`, carpeta local `velinex-crm`). Frontend en JavaScript vanilla (sin framework) con `index.html`, `styles/` (`main.css`, `auth.css`) y `js/` (`app.js`, `auth.js`, `store.js`, `utils.js`, `components/`). Backend: Firebase (Auth + Firestore). `js/firebase-config.js` se genera en build vía `generate-config.js` a partir de variables de entorno (`FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, etc.) — no se hardcodea ni se commitea. Deploy en Netlify (`netlify.toml`: `node generate-config.js` como build command, publish `.`). Incluye funcionalidad de pipeline de leads (drag & drop, filtros, actividad).

## Contexto de sesión — UPDATES.md

- Al iniciar cualquier conversación nueva, revisar `UPDATES.md` (raíz del repo) si existe, para confirmar contexto de la última sesión trabajada antes de responder o actuar.
- Nunca escribir ni actualizar `UPDATES.md` salvo que el usuario lo pida explícitamente.
- Retención basada en días, no en cantidad de sesiones: mantener las últimas 3 secciones de día. Al agregar un día nuevo más allá de ese total, eliminar el día más antiguo completo.
- Dentro de un mismo día pueden existir sesiones ilimitadas — documentar todas, nunca truncar por volumen.
- Cada sesión dentro de un día lleva su propio título corto.
- Sesiones del mismo día se separan entre sí con una línea horizontal `---`.
- Orden cronológico dentro del día: de la sesión más antigua a la más reciente.
