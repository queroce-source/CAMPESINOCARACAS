const { test } = require('node:test');
const assert = require('node:assert');
const { TIPO_ENTRADA, TIPO_SALIDA } = require('../src/config/security');

function tipoPermitido(ultimo) {
  const esEntrada = (t) => String(t || '').toUpperCase().includes('ENTRADA');
  let permitidos;
  if (!ultimo) {
    permitidos = [TIPO_ENTRADA, TIPO_SALIDA];
  } else {
    permitidos = esEntrada(ultimo) ? [TIPO_SALIDA] : [TIPO_ENTRADA];
  }
  return permitidos;
}

test('secuencia: sin registros permite ENTRADA y SALIDA', () => {
  assert.ok(tipoPermitido(null).includes(TIPO_ENTRADA));
  assert.ok(tipoPermitido(null).includes(TIPO_SALIDA));
});

test('secuencia: tras ENTRADA permite SALIDA', () => {
  const permitidos = tipoPermitido(TIPO_ENTRADA);
  assert.ok(permitidos.includes(TIPO_SALIDA));
  assert.ok(!permitidos.includes(TIPO_ENTRADA));
});

test('secuencia: tras SALIDA permite ENTRADA (día nuevo)', () => {
  const permitidos = tipoPermitido(TIPO_SALIDA);
  assert.ok(permitidos.includes(TIPO_ENTRADA));
  assert.ok(!permitidos.includes(TIPO_SALIDA));
});

test('secuencia: compatibilidad con valores legados', () => {
  assert.ok(tipoPermitido('ENTRADA (Mañana)').includes(TIPO_SALIDA));
  assert.ok(tipoPermitido('SALIDA (Tarde)').includes(TIPO_ENTRADA));
});
