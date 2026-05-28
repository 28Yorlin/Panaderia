const express = require('express');
const router = express.Router();
const kardexController = require('../controllers/kardexController');

router.get('/', kardexController.getKardex);

module.exports = router;
