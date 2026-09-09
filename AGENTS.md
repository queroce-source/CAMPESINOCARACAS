# AGENTS.md

Sistema "Control de Asistencia y Registro de Campo para Vendedores" — Node.js + Express + Firebase Firestore.

## Requisitos

- **Node.js 20.6+** (requiere `--env-file` nativo; no se usa `dotenv`)

## Comandos

| Comando | Uso |
|---------|-----|
| `npm start` | Inicia servidor en puerto 3000 |
| `npm run dev` | Inicia con `--watch` (recarga automática) |
| `npm run seed` | Pobla Firestore con datos de prueba (supervisores, vendedores, usuarios) |
| `npm run importar:estructura` | Importa estructura desde CSVs en `data/` |
| `npm run test` | Ejecuta tests con `--test` nativo de Node.js (`test/*.test.js`) |

## Arquitectura

```
app.js                  ← Express compartido (rutas, middleware, static)
server.js               ← Dev local: app.listen() + limpieza periódica de tokens
api/index.js            ← Vercel serverless: re-exporta app.js
src/config/             ← Firebase, security, cache, rateLimit, seed
src/models/             ← Firestore: VendedorModel, UsuarioModel, RegistroModel, TokenModel
src/controllers/        ← asistenciaController (todo el lógico)
src/routes/             ← apiRoutes (une controllers con middleware)
src/middleware/          ← auth (requireAuth, requireAdmin)
views/                  ← Frontend estático (HTML/CSS/JS vanilla)
```

- `app.js` es el entrypoint compartido: no llama `app.listen()`.
- `server.js` solo se usa en desarrollo local.
- `api/index.js` es el handler de Vercel (solo re-exporta `app.js`).

## Colecciones Firestore (5)

| Colección | Uso |
|-----------|-----|
| `vendedores` | Catálogo de vendedores (código, nombre, supervisor) |
| `supervisores` | Catálogo de supervisores (código, nombre, gerente) |
| `usuarios` | Usuarios del sistema (usuario, rol, claveHash o clave) |
| `registros` | Registros de asistencia (entrada/salida con foto, GPS, comentario) |
| `captura_tokens` | Tokens de un solo uso para captura (TTL 5 min) |

Índices compuestos definidos en `firestore.indexes.json`:
- `registros`: `(codigo ASC, fecha DESC)`
- `registros`: `(codigo ASC, fotoHash ASC, fecha ASC)`

## Autenticación

- **Cookie** `admin_session`, no Bearer token.
- Token: HMAC-SHA256 firmado con `SESSION_SECRET` (variable de entorno).
- TTL de sesión: 8 horas.
- Roles: `ADMIN` y `SUPERVISOR` (ambos pasan `requireAdmin`).
- Migración automática: si un usuario tiene `clave` en texto plano al hacer login, se reemplaza por `claveHash` (scrypt).

## Flujo de captura de asistencia (2 pasos)

1. `POST /api/registros/captura-token` con `{ codigo }` → devuelve `{ token, tipo, expiraMs }`.
2. `POST /api/registros` con `{ idSolicitud, codigo, nombre, capturaToken, comentario, latitud, longitud, accuracy, fotoBase64, fechaDispositivo }`.

El token es de un solo uso y expira en 5 minutos.

## Validaciones de dominio

- **GPS geocerca**: lat 10.00–10.80, lng -67.80 a -64.50 (Maracay a Puerto La Cruz). Máx precisión: 500m.
- **Fotos**: solo JPEG (magic bytes `FF D8 FF`), máx ~1.1 MB. Se almacenan como `data:image/jpeg;base64,...` en el documento. Deduplicación por SHA-256 por vendedor/día.
- **Secuencia**: por vendedor/día solo se permite ENTRADA → SALIDA → ENTRADA → ... (alternado).
- **Fecha/hora**: tolerancia de 5 min entre dispositivo y servidor. Zona horaria hardcoded UTC-4 (Caracas) en `src/config/security.js`.
- **Comentario**: obligatorio, 3–500 caracteres, sanitizado (sin HTML).

## Endpoints API

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Login (`{usuario, clave}`), setea cookie `admin_session` |
| POST | `/api/auth/logout` | No | Borra cookie de sesión |
| GET | `/api/auth/me` | `requireAuth` | Devuelve usuario de la sesión actual |
| GET | `/api/vendedores?q=&supervisor=` | No | Búsqueda/filtrado de vendedores |
| GET | `/api/supervisores` | No | Lista de supervisores |
| GET | `/api/registros/dashboard` | `requireAdmin` | KPIs agregados por supervisor |
| GET | `/api/registros/panel` | `requireAdmin` | Panel completo (KPIs + detalle) |
| GET | `/api/registros/detalle` | `requireAdmin` | Detalle por vendedor con filtros |
| GET | `/api/registros/graficos` | `requireAdmin` | Datos para Chart.js (barras + timeline) |
| GET | `/api/registros/all` | `requireAdmin` | Todos los registros (con filtros) |
| GET | `/api/registros/exportar-excel` | `requireAdmin` | Exporta a `.xlsx` |
| POST | `/api/registros/captura-token` | No | Emite token de un solo uso |
| POST | `/api/registros` | No | Crea registro de asistencia |

## Límites de tasa

| Nombre | Ventana | Máx |
|--------|---------|-----|
| `login` | 15 min | 5 req |
| `captura` | 1 hora | 30 req |
| `registros` | 1 min | 10 req |
| `vendedores` | 1 min | 60 req |
| `admin` | 1 min | 120 req |

## Variables de entorno

| Variable | Uso |
|----------|-----|
| `FIREBASE_SERVICE_ACCOUNT` | JSON de service account de Firebase (una sola línea) |
| `SESSION_SECRET` | Secreto para firmar tokens HMAC (obligatorio en producción) |
| `PORT` | Puerto del servidor (default: 3000) |

## Deploy (Vercel)

- Entrypoint: `api/index.js` → re-exporta `app.js`.
- `vercel.json` redirige todas las rutas al handler.
- En Vercel: configurar `FIREBASE_SERVICE_ACCOUNT` y `SESSION_SECRET` como variables de entorno.
- `trust proxy` está habilitado en Express (requerido para Vercel).

## Convenciones

- Sin TypeScript ni frameworks frontend.
- Textos y comentarios en español.
- Vendedores con nombre "VACANTE" o código "CGV" se excluyen de listados activos.
- Caché en memoria con TTL; se limpia al crear un nuevo registro.
- `server.js` ejecuta limpieza de tokens expirados cada 5 minutos.
