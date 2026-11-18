const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect, requireAdmin } = require('../middleware/auth');

router.post('/login', adminController.login);
router.get('/stats', protect, requireAdmin, adminController.getStats);
router.get('/inventory/copies', protect, requireAdmin, adminController.getBookCopies);
router.post('/inventory/copies', protect, requireAdmin, adminController.addBookCopy);

module.exports = router;
