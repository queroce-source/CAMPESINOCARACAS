const app = require('./app');
const TokenModel = require('./src/models/TokenModel');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

const LIMPIEZA_TOKEN_MS = 5 * 60 * 1000;
const limpiarTokens = setInterval(async () => {
  try {
    const eliminados = await TokenModel.limpiarExpirados();
    if (eliminados > 0) console.log(`Limpieza de tokens de captura: ${eliminados} expirados eliminados`);
  } catch (err) {
    console.error('Error en limpieza de tokens de captura:', err.message);
  }
}, LIMPIEZA_TOKEN_MS);
limpiarTokens.unref();
