const express = require('express');
const controller = require('../controllers/orderController');
const requireAuth = require('../middleware/auth');
const validateId = require('../middleware/validateId');

const router = express.Router();
router.use(requireAuth);
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', validateId, controller.get);

module.exports = router;
