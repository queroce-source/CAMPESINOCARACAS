# PLAN DE AUDITORÍA Y OPTIMIZACIÓN — MÓDULO "REGISTRO DE CAMPO"

**Proyecto:** `CONTROLES DE ASISTENCIA\CARACAS`
**Fecha:** 31/07/2026
**Estado:** ✅ Aprobado — implementación completa (réplica de la auditoría BARINAS adaptada a la zona Caracas).

---

## 1. DIAGNÓSTICO ACTUAL

### 1.1 Arquitectura detectada

| Capa | Tecnología | Archivos |
|---|---|---|
| Servidor | Node.js + Express 4.18 | `app.js`, `server.js`, `api/index.js` |
| Base de datos | Firestore (Firebase Admin 14) | `src/config/firebase.js` |
| Modelos | Firestore SDK (queries directas) | `src/models/*.js` |
| Controladores | Lógica de negocio | `src/controllers/asistenciaController.js` |
| Rutas | Express Router | `src/routes/apiRoutes.js` |
| Frontend registro | HTML/CSS/JS plano | `views/index.html` |
| Frontend admin | HTML/CSS/JS plano + Chart.js + html2canvas | `views/admin.html`, `views/login.html` |
| Cache | En memoria (Map) | `src/config/cache.js` |

### 1.2 Vulnerabilidades detectadas (ordenadas por severidad)

| ID | Severidad | Hallazgo | Impacto |
|---|---|---|---|
| V1 | 🔴 Crítica | `POST /api/registros` **sin autenticación**; no se verifica identidad, token ni origen. | Suplantación total: con curl/Postman se crea asistencia de cualquier vendedor. |
| V2 | 🔴 Crítica | Endpoints GET administrativos (`/api/registros/all`, `/dashboard`, `/detalle`, `/graficos`) **sin autenticación**. | Fuga de toda la operación (nombres, fotos, GPS, comentarios). |
| V3 | 🔴 Crítica | Login con contraseñas **en texto plano** en Firestore (seed) y comparación directa `user.clave !== clave`. | Exposición de credenciales; facilita fuerza bruta. |
| V4 | 🔴 Crítica | "Sesión" del panel admin basada en **localStorage** editable (`userControlAsistencia`). | Escalada trivial a rol ADMIN editando localStorage. |
| V5 | 🟠 Alta | **Sin rate limiting** en login ni en registros. | Fuerza bruta y envíos masivos automatizados (DoS). |
| V6 | 🟠 Alta | `express.json({limit:'50mb'})` + foto como **data URL en Firestore**. | Documentos que superan el límite de 1 MiB de Firestore → error 500; DoS por payloads grandes. |
| V7 | 🟠 Alta | Sin validación server-side de **lat/lng** (0,0, NaN, rangos inválidos, fuera de la ciudad) ni de **fechaDispositivo** (backdating). | Manipulación de datos geolocalizados y fechas falsas. |
| V8 | 🟠 Alta | No se verifica que `codigo`+`nombre` correspondan a un vendedor real; el `tipo` (ENTRADA/SALIDA) lo decide el cliente. | Registros para vendedores inventados; SALIDA a las 6am o ENTRADA a las 8pm. |
| V9 | 🟠 Alta | **Sin idempotencia**: doble POST = registro duplicado. | Duplicados en dashboard y KPIs. |
| V10 | 🟠 Alta | **XSS almacenado** en `admin.html`/`login.html` (`innerHTML` sin escapar). | Ejecución de scripts maliciosos en el navegador del administrador. |
| V11 | 🟠 Alta | Foto sin validación de **formato real (magic bytes JPEG)**, tamaño ni origen. | Base64 arbitrario/gigante; sin garantía de provenir de la cámara. |
| V12 | 🟠 Alta | Sin token en el flujo de registro: scripts externos simulan a otro vendedor. | Fraude operativo directo. |
| V13 | 🟡 Media | Headers de seguridad ausentes (CSP, nosniff, frame-options). | Clickjacking/sniffing. |
| V14 | 🟡 Media | La fecha "hoy" del backend usa **UTC** (UTC-4 en Venezuela). | Dashboard/detalle muestran el día equivocado 00:00–03:59. |
| V15 | 🟡 Media | Contraseñas compartidas para todos los supervisores (`BB12345*`). | Compromiso de una = compromiso de todas. |
| V16 | 🟡 Media | Sin auditoría de quién/dispositivo creó la marcación. | Imposible trazar fraudes. |

### 1.3 Puntos de fricción funcional / UX

| ID | Hallazgo | Efecto |
|---|---|---|
| F1 | Búsqueda de vendedor sin debounce, sin teclado y sin forzar selección válida. | Errores de tipeo; se puede marcar a otro colega. |
| F2 | **Sin modo offline**: sin red se pierde el registro. | Vendedores en zonas sin cobertura no marcan. |
| F3 | Foto a 1280×720 sin redimensionar (≈300–500 KB). | Alto consumo de datos móviles y envío lento. |
| F4 | GPS con `getCurrentPosition` (10 s) sin validar `accuracy` y sin reintentos. | GPS lento/impreciso bloquea la marcación sin feedback. |
| F5 | Doble envío sin **clave de idempotencia**; reintento tras timeout puede duplicar. | Registros duplicados por ansiedad de red. |
| F6 | Selector de cámara limitado (solo botón "Cambiar"); sin `enumerateDevices`. | Mala compatibilidad cámara frontal/trasera/externa. |
| F7 | `tipo` depende del reloj del dispositivo, sin validación cruzada con servidor. | Marcaciones mal clasificadas. |
| F8 | Mensajes de error genéricos; sin indicador de cola offline. | Poca transparencia. |

---

## 2. PROPUESTA DE ARQUITECTURA Y CAMBIOS

### 2.1 Decisiones de diseño (sin dependencias nuevas)

1. **Autenticación Admin** — token **HMAC-SHA256** firmado con `crypto` (nativo), expiración 8 h, en **cookie HttpOnly** (`SameSite=Strict`, `Secure` en producción). Middleware `requireAuth` / `requireAdmin`.
2. **Flujo de registro de campo** — los vendedores no tienen cuenta. Se emite un **token de captura de un solo uso** (`POST /api/registros/captura-token`) con **rate limit por IP**, vinculado al `codigo`, con expiración de 5 min y consumo en Firestore (colección `captura_tokens`). `POST /api/registros` exige y consume el token → impide suplantación por scripts externos y reutilización (duplicados).
3. **Hash de contraseñas** — `crypto.scrypt` nativo (formato `salt:hash`). Migración en caliente al primer login (se actualiza el documento, eliminando `clave`). El seed genera `claveHash`.
4. **Idempotencia garantizada** — el documento se crea con **`set()` usando `idSolicitud` (UUID del cliente) como ID**.
5. **Integridad de la foto** — servidor decodifica, verifica **magic bytes JPEG**, tamaño ≤ 1 MB y calcula **hash SHA-256**; se **rechaza** una foto con el mismo hash para el mismo vendedor en el mismo día (detección de fotos reutilizadas/galería).
6. **Timestamps** — hora canónica en **America/Caracas (UTC-4, sin DST)** calculada en servidor; `fechaDispositivo` solo se acepta si difiere < 5 min de la del servidor. Se guardan ambas para auditoría.
7. **Secuencia ENTRADA/SALIDA** — validada en **transacción** (`db.runTransaction`): sin ENTRADA previa hoy → solo ENTRADA; última ENTRADA → SALIDA; última SALIDA → ENTRADA. El `tipo` se deriva del servidor.
8. **Rate limiting** — middleware propio en memoria (sin dependencias): login 5/15 min, captura-token 30/h, registros 10/min, vendedores 60/min. Límite aproximado en serverless multi-instancia (documentado).
9. **Headers de seguridad** — middleware propio: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy` compatible con CDNs e iframes usados.
10. **Sanitización** — `sanitizarTexto()` (strip de etiquetas y caracteres de control, límite 500 chars) en servidor + **`escapeHtml()`** en el frontend admin.
11. **Protección de datos admin** — rutas `GET /api/registros/*` exigen sesión; `GET /api/vendedores` (usado por el registro de campo) queda público con rate limit.
12. **Validación GPS** — lat ∈ [-90,90], lng ∈ [-180,180], dentro del **bbox de Caracas** (lat 10.25–10.65, lng -67.15 a -66.60), `accuracy` requerido ≤ 500 m (el cliente bloquea hasta ≤ 150 m).

### 2.2 Cambios por archivo

**Backend (nuevos)**
| Archivo | Contenido |
|---|---|
| `src/config/security.js` | `hashClave`/`verificarClave` (scrypt); `firmarToken`/`verificarToken` (HMAC); `fechaHoraCaracas()`; `sanitizarTexto()`; bbox Caracas; `validarGeo()`. |
| `src/config/rateLimit.js` | Middleware de limitación por IP en memoria. |
| `src/middleware/auth.js` | `requireAuth`, `requireAdmin`, `obtenerCookie`. |
| `src/models/TokenModel.js` | `emitir`, `verificarYConsumir` (single-use, TTL). |

**Backend (modificados)**
| Archivo | Cambio |
|---|---|
| `src/controllers/asistenciaController.js` | `login` con scrypt + cookie HttpOnly + migración; nuevos `logout`, `me`, `emitirCapturaToken`; `crearRegistro` con validación integral; rutas GET protegidas. |
| `src/models/RegistroModel.js` | `crear` con `set(idSolicitud)` + transacción de secuencia + `fotoHash`; helpers `getUltimoTipo`, `existeFotoHashHoy`. |
| `src/models/UsuarioModel.js` | `findByUsuario` con `claveHash`; `actualizarCredenciales`. |
| `src/routes/apiRoutes.js` | Nuevas rutas; middleware en rutas admin. |
| `app.js` | Headers, rate limit, body limit 4 mb, `trust proxy`. |
| `src/config/seed.js` | Genera `claveHash` (no re-ejecutar en producción). |

**Frontend `views/index.html`** — autocompletado con debounce/teclado y selección forzada; compresión de foto (max 800 px, calidad 0.6, ≤ 150 KB) con sello visible (código+fecha+hora); selector de cámaras vía `enumerateDevices()`; GPS con `accuracy ≤ 150 m`, reintentos y mensajes progresivos; `idSolicitud` (UUID) + bloqueo de doble envío; `capturaToken` al seleccionar vendedor (tipo = hora del servidor); **offline-first con IndexedDB** y sincronización automática.

**Frontend `views/admin.html` + `views/login.html`** — `escapeHtml()` anti-XSS; `verificarSesion()` valida con `GET /api/auth/me`; logout con invalidación en servidor; login con rate limit.

### 2.3 Dependencias
**Ninguna nueva.** Todo el cifrado con `crypto` nativo; rate limit y headers con middleware propio.

---

## 3. ESTRATEGIA DE PRUEBAS Y PLAN DE REVERSIÓN

### 3.1 Pruebas automatizadas (Node nativo, `node --test`)
| Módulo | Casos |
|---|---|
| `test/security.test.js` | scrypt hash/verify; HMAC token (alterado/expirado → rechazo); sanitización de `<script>`, HTML y control chars. |
| `test/geo.test.js` | lat/lng válidas, inválidas (NaN, fuera de rango, 0,0, fuera de bbox Caracas, accuracy ausente/excesivo). |
| `test/fecha.test.js` | `fechaHoraCaracas()`; tolerancia 5 min; rechazo de fechas falsas. |
| `test/tokens.test.js` | Token expirado, reutilizado y con codigo distinto → rechazo (con mock del modelo). |

**Pruebas de integración (curl contra el servidor local con `.env`):** login→cookie→panel; POST sin token → 403; POST con token reutilizado → 409; doble POST mismo `idSolicitud` → un solo registro; foto con bytes no JPEG → 400; GPS fuera de bbox → 400; comentario malicioso almacenado como texto plano.

**Checklist manual de campo:** cámara frontal/trasera/externa; peso de foto ≤ 150 KB con sello; GPS lento bloquea con mensaje; modo avión → cola → sincronización al reconectar; doble clic → un solo registro; XSS en panel; reloj adelantado → rechazo con mensaje; 6 logins fallidos → 429; editar localStorage no otorga rol.

### 3.2 Plan de reversión
- Tag `pre-auditoria-optimizacion` + branch `backup-pre-auditoria` ya creados.
- Commits por fase; reversión con `git revert <commit>` o restauración del tag.
- No se alteran datos existentes; la migración de credenciales es idempotente y reversible (la verificación soporta ambos formatos).
- No se re-ejecuta el seed en producción.

---

## 4. FASEADO DE IMPLEMENTACIÓN

| Fase | Alcance | Estado |
|---|---|---|
| 0 | Backup (tag + branch) | ✅ |
| 1 | Seguridad backend | ✅ |
| 2 | Frontend Registro de Campo | ✅ |
| 3 | Frontend Admin (anti-XSS + sesión) | ✅ |
| 4 | Pruebas + informe final | ✅ |
