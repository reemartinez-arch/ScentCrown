const express = require('express');
const controller = require('../controllers/productController');
const validateId = require('../middleware/validateId');

const router = express.Router();
router.get('/', controller.list);
router.get('/:id', validateId, controller.get);

module.exports = router;
