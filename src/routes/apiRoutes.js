const express = require('express');
const router = express.Router();
const asistenciaController = require('../controllers/asistenciaController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { login, captura, registros, vendedores, admin } = require('../config/rateLimit');

router.post('/auth/login', login, asistenciaController.login);
router.post('/auth/logout', asistenciaController.logout);
router.get('/auth/me', requireAuth, asistenciaController.me);

router.get('/vendedores', vendedores, asistenciaController.getVendedores);

router.get('/registros/dashboard', requireAdmin, admin, asistenciaController.getDashboard);
router.get('/registros/detalle', requireAdmin, admin, asistenciaController.getDetalle);
router.get('/registros/graficos', requireAdmin, admin, asistenciaController.getGraficos);
router.get('/registros/all', requireAdmin, admin, asistenciaController.getAllRegistros);

router.post('/registros/captura-token', captura, asistenciaController.emitirCapturaToken);
router.post('/registros', registros, asistenciaController.crearRegistro);

module.exports = router;
