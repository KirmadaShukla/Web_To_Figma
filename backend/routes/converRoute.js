const express = require('express');
const { convertToFigma } = require('../controllers/converterController');
const router = express.Router();

router.post('/convert', convertToFigma);

module.exports = router;