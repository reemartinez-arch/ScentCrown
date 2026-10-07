const express = require('express');
const controller = require('../controllers/cartController');
const requireAuth = require('../middleware/auth');
const validateId = require('../middleware/validateId');

const router = express.Router();
router.use(requireAuth);
router.get('/', controller.list);
router.put('/', controller.setItem);
router.delete('/:productId', validateId, controller.removeItem);

module.exports = router;
