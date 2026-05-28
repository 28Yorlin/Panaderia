const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productoController');

// Usar multer solo en las rutas que necesitan subir archivo
router.get('/', ctrl.getAll);
router.post('/', ctrl.upload.single('imagen'), ctrl.create);
router.put('/:id', ctrl.upload.single('imagen'), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;