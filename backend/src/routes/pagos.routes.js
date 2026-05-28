const express = require('express');
const router = express.Router();
const pagoController = require('../controllers/pagoController');

router.get('/', pagoController.getAll);

module.exports = router;
