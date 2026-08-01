const express = require('express');
const path = require('path');
const apiRoutes = require('./src/routes/apiRoutes');
const { headersSeguridad } = require('./src/config/security');

const app = express();

app.set('trust proxy', true);

app.use(headersSeguridad);
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true, limit: '4mb' }));

app.use(express.static(path.join(__dirname, 'views')));

app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

module.exports = app;
