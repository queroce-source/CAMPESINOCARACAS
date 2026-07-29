# AGENTS.md

Sistema "Control de Asistencia y Registro de Campo para Vendedores" — Node.js + Express + Firebase Firestore.

## Arquitectura actual

- **MVC**: `src/config/` → `src/models/` → `src/controllers/` → `src/routes/` → `server.js`
- **Frontend estático** en `views/` (HTML/CSS/JS vanilla, servido por Express)
- **BD**: Firebase Firestore (3 colecciones: `vendedores`, `usuarios`, `registros`)

## Comandos

| Comando | Uso |
|---------|-----|
| `npm start` | Inicia servidor en puerto 3000 |
| `npm run seed` | Pobla Firestore con datos de prueba (12 vendedores, 4 usuarios, registros) |
| `npm run dev` | Inicia con `--watch` (recarga automática) |

## Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login (JSON: `{usuario, clave}`) |
| GET | `/api/vendedores?q=texto` | Búsqueda predictiva de vendedores |
| GET | `/api/registros/dashboard?fecha=YYYY-MM-DD&supervisor=X` | KPIs agregados por supervisor |
| GET | `/api/registros/detalle?fecha=YYYY-MM-DD&supervisor=X&texto=&estado=` | Detalle por vendedor con filtros |
| GET | `/api/registros/graficos?fecha=YYYY-MM-DD` | Datos para Chart.js (barras + timeline) |
| POST | `/api/registros` | Crear registro (foto en Base64, se almacena en DB como data URL) |

## Firebase (Firestore)

- Se usa `firebase-admin` (SDK server-side) con una service account.
- La conexión se configura con la variable de entorno `FIREBASE_SERVICE_ACCOUNT` que debe contener el JSON completo de la service account en una sola línea.
- Las fotos se almacenan como `data:image/jpeg;base64,...` directamente en el campo `foto` del documento.

## Deploy (Vercel)

- Entrypoint serverless: `api/index.js` (importa `app.js`)
- `app.js` exporta la app Express sin `app.listen()`
- `server.js` solo para desarrollo local
- Config de rutas en `vercel.json` (todo al handler Express)
- En Vercel agregar la variable `FIREBASE_SERVICE_ACCOUNT` con el JSON de la service account

## Pendiente para Fase 2

- Reemplazar autenticación simple con **bcryptjs** (hash de claves) + **jsonwebtoken** (JWT)
- Middleware `verifyToken` para rutas protegidas

## Convenciones

- Sin TypeScript ni frameworks frontend
- Textos y comentarios en español
- Despliegue en Vercel (`vercel.json` + `api/index.js`)