const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ventaController');
router.get('/', ctrl.getAll);
router.get('/stats', ctrl.getStats);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
module.exports = router;