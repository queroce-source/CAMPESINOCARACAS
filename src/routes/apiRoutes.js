const express = require('express');
const router = express.Router();
const asistenciaController = require('../controllers/asistenciaController');

router.post('/auth/login', asistenciaController.login);

router.get('/vendedores', asistenciaController.getVendedores);

router.get('/registros/dashboard', asistenciaController.getDashboard);
router.get('/registros/detalle', asistenciaController.getDetalle);
router.get('/registros/graficos', asistenciaController.getGraficos);
router.post('/registros', asistenciaController.crearRegistro);

module.exports = router;
