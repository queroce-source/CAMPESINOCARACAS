# CHECKLIST MANUAL DE CAMPO — REGISTRO DE ASISTENCIA

**Proyecto:** `CONTROLES DE ASISTENCIA\CARACAS`
**Fecha de ejecución:** ________
**Responsable:** ________

Instrucciones: marcar ✅ cada ítem. Ejecutar sobre un teléfono Android/iOS con cámara, GPS y datos móviles, contra el servidor desplegado (no localhost).

## A. Cámara y fotografía
- [ ] Se inicia la cámara (trasera) al abrir el registro.
- [ ] El selector permite cambiar entre cámara frontal y trasera (`enumerateDevices`).
- [ ] La foto capturada muestra el sello con código, fecha y hora.
- [ ] El peso de la foto enviada es ≤ ~150 KB (verificar en red/DevTools).

## B. GPS
- [ ] Con el GPS encendido y a la intemperie, la marcación se habilita (precisión ≤ 150 m).
- [ ] Con GPS lento/impreciso se muestra un mensaje y NO se habilita el envío.
- [ ] Fuera del bbox de Caracas se rechaza con mensaje claro.

## C. Offline
- [ ] En modo avión, la marcación queda en cola (badge visible).
- [ ] Al recuperar red, la cola se sincroniza automáticamente y aparece en el panel admin.

## D. Anti-duplicados y secuencia
- [ ] Un doble clic en "Enviar" genera una sola marcación (idempotencia por `idSolicitud`).
- [ ] Enviar dos veces el mismo intento no duplica el registro en el panel admin.
- [ ] Sin ENTRADA previa hoy, la primera marcación es ENTRADA (mañana) o SALIDA (tarde) según la hora del servidor.
- [ ] No se puede marcar SALIDA dos veces ni ENTRADA dos veces el mismo día.

## E. Anti-suplantación y validación
- [ ] Con el reloj del teléfono adelantado/atrasado > 5 min, la marcación se rechaza con mensaje.
- [ ] Editar `userControlAsistencia` en localStorage NO otorga rol ADMIN (el panel usa la cookie del servidor).
- [ ] Intentar 6 veces un login incorrecto bloquea con "Demasiadas solicitudes" (429).

## F. Panel admin
- [ ] Login correcto entra al panel; el logout cierra la sesión en el servidor.
- [ ] Las fotos se abren en modal/pestaña nueva.
- [ ] El mapa abre la ubicación en Google Maps.
- [ ] Las observaciones se muestran como texto plano (sin HTML ejecutable).
- [ ] Filtros por fecha/supervisor/estado funcionan.

## G. Registro de incidentes
| Fecha | Ítem fallido | Descripción |
|---|---|---|
|  |  |  |
|  |  |  |

## H. Sistema de notificaciones (toasts)
- [ ] Enviar sin vendedor/foto/GPS/observación muestra toast **rojo** indicando el campo faltante y aplica **shake** + resaltado al campo.
- [ ] Con el reloj desfasado > 5 min aparece toast **ámbar** + banner persistente y el botón **Enviar** queda bloqueado.
- [ ] Durante el envío se muestra **overlay de carga** (spinner) que bloquea la interfaz.
- [ ] Al éxito aparece toast **verde** con check animado y **confeti**; el formulario se limpia (recarga) al cerrar.
- [ ] Los toasts se cierran solos con barra de progreso y también con el botón ×.
