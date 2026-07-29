# AGENTS.md

Sistema "Control de Asistencia y Registro de Campo para Vendedores" — Node.js + Express + SQLite.

## Arquitectura actual

- **MVC**: `src/config/` → `src/models/` → `src/controllers/` → `src/routes/` → `server.js`
- **Frontend estático** en `views/` (HTML/CSS/JS vanilla, servido por Express)
- **BD**: SQLite (`asistencia.db`) con índices en `registros(codigo, fecha)`, `registros(tipo, fecha)`, `vendedores(codigo)`, `usuarios(usuario)`

## Comandos

| Comando | Uso |
|---------|-----|
| `npm start` | Inicia servidor en puerto 3000 |
| `npm run seed` | Pobla DB con datos de prueba (12 vendedores, 3 supervisores, registros) |
| `npm run dev` | Inicia con `--watch` (recarga automática) |

## Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login (JSON: `{usuario, clave}`) |
| GET | `/api/vendedores?q=texto` | Búsqueda predictiva de vendedores |
| GET | `/api/registros/dashboard?fecha=YYYY-MM-DD&supervisor=X` | KPIs agregados por supervisor (LEFT JOIN, una consulta) |
| GET | `/api/registros/detalle?fecha=YYYY-MM-DD&supervisor=X&texto=&estado=` | Detalle por vendedor con filtros |
| GET | `/api/registros/graficos?fecha=YYYY-MM-DD` | Datos para Chart.js (barras + timeline) |
| POST | `/api/registros` | Crear registro + foto (Base64 → archivo en `uploads/`) |

## Turso (base de datos edge)

En lugar de `sqlite3`, se usa `@libsql/client` que soporta tanto local (`file:asistencia.db`) como remoto (Turso edge). La conexión se configura con variables de entorno:

```
TURSO_DB_URL=libsql://...   # remoto
TURSO_DB_TOKEN=eyJ...       # solo remoto
```

Sin variables de entorno → usa `file:asistencia.db` local. Las consultas usan `await db.execute({ sql, args })` en vez de callbacks.

## Deploy (Vercel)

- Entrypoint serverless: `api/index.js` (importa `app.js`)
- `app.js` exporta la app Express sin `app.listen()`
- `server.js` solo para desarrollo local
- Config de rutas en `vercel.json`

## Consultas optimizadas (Fase 1)

- Dashboard y detalle usan **LEFT JOIN doble** en una sola consulta en vez de bucles JS
- Filtros (fecha, supervisor, texto) se aplican en SQL, no en el navegador
- Fotos se guardan como archivos en `uploads/`, ruta en DB (no Base64 en celdas)

## Pendiente para Fase 2

- Reemplazar autenticación simple con **bcryptjs** (hash de claves) + **jsonwebtoken** (JWT)
- Middleware `verifyToken` para rutas protegidas
- Login vía POST con JSON en vez de GET con credenciales en URL (ya implementado parcialmente)

## Convenciones

- Sin TypeScript ni frameworks frontend
- Textos y comentarios en español
- Despliegue en Vercel (`vercel.json` + `api/index.js`)
