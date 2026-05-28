const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/recetasController');

router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.get('/producto/:id_producto', ctrl.getByProducto);

module.exports = router;
