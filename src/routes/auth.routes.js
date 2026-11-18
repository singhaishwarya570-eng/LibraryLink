const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', protect, authController.getMe);
router.get('/my-reservations', protect, authController.getMyReservations);
router.patch('/my-reservations/:id/cancel', protect, authController.cancelMyReservation);

module.exports = router;
