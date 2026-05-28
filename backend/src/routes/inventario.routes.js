const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.get('/', requireAuth, inventarioController.getAll);

module.exports = router;
