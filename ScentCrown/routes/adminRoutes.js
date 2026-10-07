const express = require('express');
const controller = require('../controllers/adminController');
const requireAuth = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const validateId = require('../middleware/validateId');

const router = express.Router();
router.use(requireAuth, requireAdmin);
router.get('/summary', controller.summary);
router.get('/products', controller.listProducts);
router.post('/products', controller.createProduct);
router.put('/products/:id', validateId, controller.updateProduct);
router.delete('/products/:id', validateId, controller.archiveProduct);
router.get('/inventory', controller.inventory);
router.patch('/inventory/:id', validateId, controller.updateStock);
router.get('/orders', controller.listOrders);
router.patch('/orders/:id', validateId, controller.updateOrderStatus);
router.get('/customers', controller.customers);
router.get('/payments', controller.payments);
router.get('/reports', controller.reports);

module.exports = router;
