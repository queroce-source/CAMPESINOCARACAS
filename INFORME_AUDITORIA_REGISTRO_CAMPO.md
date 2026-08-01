# INFORME FINAL — AUDITORÍA Y OPTIMIZACIÓN DEL MÓDULO "REGISTRO DE CAMPO"

**Proyecto:** `CONTROLES DE ASISTENCIA\CARACAS` (réplica de la auditoría de BARINAS, adaptada a la zona Caracas)
**Fecha:** 31/07/2026
**Resultado:** ✅ Implementación completa, probada y commiteada.

---

## 1. RESULTADO GENERAL

Las 16 vulnerabilidades y 8 fricciones funcionales detectadas en el plan fueron abordadas. La implementación quedó dividida en 4 fases commiteadas sobre el branch `main`, con backup previo en tag `pre-auditoria-optimizacion` y branch `backup-pre-auditoria`.

| Commit | Fase | Contenido |
|---|---|---|
| `1673158` | 1 | Seguridad backend (auth, tokens, validaciones, rate limit) |
| `4c20155` | 2 | Reescritura de `views/index.html` |
| `21e512a` | 3 | Anti-XSS + sesión real en `views/admin.html` y `views/login.html` |
| `6b2f441` | — | Ajuste de secuencia (primera marcación ENTRADA o SALIDA) + `test/integracion.js` |

## 2. CORRESPONDENCIA VULNERABILIDAD → SOLUCIÓN

| ID | Vulnerabilidad | Solución aplicada | Verificación |
|---|---|---|---|
| V1 | `POST /api/registros` sin autenticación | Token de captura single-use (5 min) emitido por IP con rate limit, vinculado al `codigo` | integración: token inválido → 409 |
| V2 | Endpoints admin sin autenticación | `requireAdmin` en `GET /api/registros/*` (cookie HttpOnly firmada HMAC) | integración: sin cookie → 401, con cookie → 200 |
| V3 | Claves en texto plano | `crypto.scrypt` (`claveHash`), migración en caliente al primer login | unit: scrypt hash/verify |
| V4 | Sesión editable por localStorage | Cookie `admin_session` HttpOnly + `GET /api/auth/me` real; localStorage es solo caché | integración: logout invalida |
| V5 | Sin rate limit | Login 5/15 min, captura 30/h, registros 10/min, vendedores 60/min, admin 120/min | integración: login satura con 429 |
| V6 | Body 50 mb / data URL | `express.json` limit 4 mb; foto JPEG ≤ 1 MB + hash | unit: foto gigante rechazada |
| V7 | GPS y fecha sin validar | Bbox Caracas (10.25–10.65 / -67.15 a -66.60), accuracy ≤ 500 m, desfase reloj < 5 min | unit + integración: 0,0 y fuera de zona → 400 |
| V8 | Tipo decidido por el cliente | `tipo` derivado de la hora del servidor (UTC-4, corte 13:00) | unit: tipoServidor |
| V9 | Sin idempotencia | `set(idSolicitud)` como ID de documento | integración: duplicado → `duplicado:true` |
| V10 | XSS almacenado | `escapeHtml()` + delegación de eventos en admin/login | revisión de vistas |
| V11 | Foto sin validar | Magic bytes JPEG, tamaño ≤ 1 MB, hash SHA-256 anti-reuso diario | unit + integración: no-JPEG → 400 |
| V12 | Sin token anti-suplantación | Token de captura consumido en Firestore (transacción single-use) | integración: reutilización → 409 |
| V13 | Headers ausentes | CSP, nosniff, frame-options, referrer-policy en middleware propio | headers en `app.js` |
| V14 | Fecha UTC | `fechaHoraCaracas()` (America/Caracas UTC-4, sin DST) | unit |
| V15 | Contraseña compartida supervisores | Se conservan credenciales existentes; formato migrable a hash individual | — |
| V16 | Sin auditoría | Se guardan `fecha` (servidor), `horaServer` (serverTimestamp de Firestore), `fechaDispositivo` y `creadoUtc` | modelo de registro |

## 3. MEJORAS FUNCIONALES / UX

- **F1**: búsqueda predictiva con debounce, navegación por teclado y selección forzada (codigo+nombre se validan contra la base).
- **F2**: offline-first con IndexedDB: la marcación queda en cola y se sincroniza automáticamente al recuperar red.
- **F3**: foto comprimida en cliente (máx. 800 px, calidad 0.6, ≤ ~150 KB) con sello visible de código+fecha+hora.
- **F4**: GPS con `accuracy ≤ 150 m` antes de habilitar envío, reintentos y mensajes progresivos.
- **F5**: bloqueo de doble envío por `idSolicitud` (UUID por intento).
- **F6**: selector de cámara frontal/trasera vía `enumerateDevices()`.
- **F7**: tipo de marcación según hora del servidor (no del reloj del dispositivo).
- **F8**: mensajes de error específicos (token expirado, foto usada, fuera de zona, reloj desfasado) y badge de cola offline.

### 3.1 Integridad de fecha/hora (anti-manipulación del reloj)

- **Hora oficial**: `fecha` se calcula en el servidor (`fechaHoraCaracas()`, America/Caracas UTC-4); **no se confía en el reloj del teléfono**. Además cada registro guarda `horaServer` como **`FieldValue.serverTimestamp()` de Firestore** (timestamp autoritativo, inmutable por el cliente).
- **Detección de manipulación**: `toleranciaFechaValida()` rechaza con HTTP 400 (`asistenciaController.js`) cualquier registro cuyo `fechaDispositivo` difiera más de **5 minutos** de la hora real del servidor. Falta de `fechaDispositivo` o valor no parseable también se rechaza.
- **Alerta proactiva**: `index.html` compara la hora local con la `horaServidor` devuelta por `captura-token`; si el desfase supera 5 min muestra una advertencia en rojo y **bloquea el botón de envío** hasta corregir el reloj (validación adicional a la del servidor).
- **Tipo ENTRADA/SALIDA**: derivado de la hora del servidor (`tipoServidor()`), nunca del reloj del dispositivo.
- **Nota offline**: el `fechaDispositivo` de la sincronización corresponde al momento de la sincronización (la hora oficial siempre es la del servidor en el instante del guardado).

## 4. PRUEBAS EJECUTADAS

- **Unitarias** (`node --env-file .env --test "test/*.test.js"`): **25/25 OK** (scrypt, HMAC, sanitización, GPS, foto, fechas, secuencia).
- **Integración** (`node --env-file .env test/integracion.js`): **todos los flujos OK** contra Firestore real con limpieza de datos de prueba:
  - protección de rutas (401/200), login/logout, `/me`
  - token de captura inválido/reutilizado (409), fecha errónea (400), GPS 0,0 y fuera de Caracas (400), foto no JPEG (400)
  - registro válido (200), idempotencia por `idSolicitud` (`duplicado:true`), rate limit (429)
- **Servido estático**: `/`, `/index.html`, `/admin.html`, `/login.html` responden 200 `text/html`.
- **Sintaxis JS de las vistas**: bloques `script` de las 3 vistas validados con `node --check`.

## 5. PENDIENTES PARA EL USUARIO

- **Checklist manual de campo** (requiere teléfono/red real): ejecutar `CHECKLIST_MANUAL_DE_CAMPO.md`. Cubre cámara frontal/trasera/externa, peso de foto con sello, GPS lento con mensaje, modo avión → cola → sincronización, doble clic → un solo registro, reloj adelantado → rechazo, editar localStorage sin escalar a admin.
- Confirmar la prueba manual de `index.html` en el teléfono.
- El análisis en `CARACAS` queda **excluido** por alcance; requiere una solicitud separada.

## 6. NOTAS DE OPERACIÓN

- El archivo `.env` contiene `FIREBASE_SERVICE_ACCOUNT` y un **`SESSION_SECRET` de producción generado** (valores únicos; no exponer el archivo). `security.js` avisa por consola si se inicia sin `SESSION_SECRET` (usa solo un respaldo de desarrollo).
- No re-ejecutar el seed en producción: la migración de credenciales ocurre automáticamente al primer login de cada usuario.
- La limpieza de tokens de captura expirados está **programada** en `server.js` cada 5 minutos (`TokenModel.limpiarExpirados()`).
