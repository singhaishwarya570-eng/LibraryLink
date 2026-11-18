const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservation.controller');
const { protect, requireAdmin } = require('../middleware/auth');

router.post('/', reservationController.createReservation);
router.get('/', reservationController.getReservations);
router.get('/:id', reservationController.getReservationById);
router.patch('/:id/status', reservationController.updateReservationStatus);

module.exports = router;
