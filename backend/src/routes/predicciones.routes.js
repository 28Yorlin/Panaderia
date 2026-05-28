const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/prediccionController');

router.post('/generar', ctrl.generar);
router.get('/historial', ctrl.historial);
router.get('/resumen/:fecha', ctrl.resumen);
router.post('/entrenar', ctrl.entrenar);

module.exports = router;