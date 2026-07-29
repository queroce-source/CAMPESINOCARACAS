const express = require('express');
const path = require('path');
const fs = require('fs');
const { initDB } = require('./src/config/database');
const apiRoutes = require('./src/routes/apiRoutes');

const app = express();

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static(path.join(__dirname, 'views')));
app.use('/uploads', express.static(uploadsDir));

app.use('/api', apiRoutes);

initDB().catch(err => {
  console.error('Error al inicializar la base de datos:', err);
  process.exit(1);
});

module.exports = app;
