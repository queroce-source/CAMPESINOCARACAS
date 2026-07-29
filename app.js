const express = require('express');
const path = require('path');
const apiRoutes = require('./src/routes/apiRoutes');

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static(path.join(__dirname, 'views')));

app.use('/api', apiRoutes);

module.exports = app;
