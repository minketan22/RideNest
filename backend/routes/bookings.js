const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createBooking,
  deleteBooking,
  getAgencyById,
  getBookingById,
  getBookingsByAgency,
  getBookingsByUser,
  getUserById,
  getVehicleById,
  hasOverlappingBooking,
  updateBookingStatus
} = require('../data/store');

function serializeBooking(booking) {
  const vehicle = getVehicleById(booking.vehicleId);
  const user = getUserById(booking.userId);
  const agency = getAgencyById(booking.agencyId);

  return {
    ...booking,
    vehicleId: vehicle
      ? {
          _id: vehicle._id,
          modelName: vehicle.modelName,
          type: vehicle.type,
          pricePerDay: vehicle.pricePerDay
        }
      : null,
    userId: user
      ? {
          _id: user._id,
          username: user.username,
          email: user.email
        }
      : null,
    agencyId: agency
      ? {
          _id: agency._id,
          agencyName: agency.agencyName
        }
      : null
  };
}

/*
 * @route   POST /api/bookings
 * @desc    Create a new booking
 * @access  Private (User only)
 */
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'user') {
    return res.status(403).json({ msg: 'Access denied: Not a user' });
  }
  try {
    const { vehicleId, startDate, endDate, totalPrice, agencyId, pickupTime, status } = req.body;
    const userId = req.user.id;

    if (!vehicleId || !agencyId || !startDate || !endDate || !pickupTime || !totalPrice) {
      return res.status(400).json({ msg: 'Please provide all booking details' });
    }

    const vehicle = getVehicleById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ msg: 'Vehicle not found' });
    }

    if (vehicle.agencyId !== agencyId) {
      return res.status(400).json({ msg: 'Agency does not match vehicle' });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ msg: 'End date must be after start date' });
    }

    if (hasOverlappingBooking(vehicleId, startDate, endDate)) {
      return res.status(400).json({ msg: 'Vehicle is not available for the selected dates' });
    }

    const booking = createBooking({
      userId,
      vehicleId,
      agencyId,
      startDate,
      endDate,
      pickupTime,
      totalPrice,
      status: status === 'Confirmed' ? 'Confirmed' : 'Pending'
    });
    res.status(201).json(serializeBooking(booking));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/*
 * @route   GET /api/bookings/my-bookings
 * @desc    Get all bookings for the logged-in user
 * @access  Private (User only)
 */
router.get('/my-bookings', auth, async (req, res) => {
  if (req.user.role !== 'user') {
    return res.status(403).json({ msg: 'Access denied: Not a user' });
  }
  try {
    const bookings = getBookingsByUser(req.user.id).map(serializeBooking);
    res.json(bookings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/*
 * @route   GET /api/bookings/agency-bookings
 * @desc    Get all bookings for the logged-in agency's vehicles
 * @access  Private (Agency only)
 */
router.get('/agency-bookings', auth, async (req, res) => {
  if (req.user.role !== 'agency') {
    return res.status(403).json({ msg: 'Access denied: Not an agency' });
  }
  try {
    const bookings = getBookingsByAgency(req.user.id).map(serializeBooking);
    res.json(bookings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/*
 * @route   PATCH /api/bookings/:id/confirm
 * @desc    Confirm a pending booking by the owning agency
 * @access  Private (Agency only)
 */
router.patch('/:id/confirm', auth, async (req, res) => {
  if (req.user.role !== 'agency') {
    return res.status(403).json({ msg: 'Access denied: Not an agency' });
  }

  try {
    const booking = getBookingById(req.params.id);

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    if (booking.agencyId !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    if (booking.status !== 'Pending') {
      return res.status(400).json({ msg: `Only pending bookings can be confirmed` });
    }

    const updatedBooking = updateBookingStatus(req.params.id, 'Confirmed');
    res.json(serializeBooking(updatedBooking));
  } catch (err) {
    console.error('Confirm booking error:', err.message);
    res.status(500).send('Server Error');
  }
});

/*
 * @route   PATCH /api/bookings/:id/reject
 * @desc    Reject a pending booking by the owning agency
 * @access  Private (Agency only)
 */
router.patch('/:id/reject', auth, async (req, res) => {
  if (req.user.role !== 'agency') {
    return res.status(403).json({ msg: 'Access denied: Not an agency' });
  }

  try {
    const booking = getBookingById(req.params.id);

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    if (booking.agencyId !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    if (booking.status !== 'Pending') {
      return res.status(400).json({ msg: 'Only pending bookings can be rejected' });
    }

    const updatedBooking = updateBookingStatus(req.params.id, 'Rejected');
    res.json(serializeBooking(updatedBooking));
  } catch (err) {
    console.error('Reject booking error:', err.message);
    res.status(500).send('Server Error');
  }
});


// --- UPDATED ROUTE ---
/*
 * @route   DELETE /api/bookings/:id
 * @desc    Delete a booking (by user or agency)
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
    try {
        const booking = getBookingById(req.params.id);

        if (!booking) {
            return res.status(404).json({ msg: 'Booking not found' });
        }

        // --- Safer ownership check ---
        let isUserOwner = false;
        if (booking.userId) {
            isUserOwner = booking.userId.toString() === req.user.id;
        }
        let isAgencyOwner = false;
        if (booking.agencyId) {
            isAgencyOwner = booking.agencyId.toString() === req.user.id;
        }
        if (!isUserOwner && !isAgencyOwner) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // --- Permanently delete the booking ---
        deleteBooking(req.params.id);

        res.json({ msg: 'Booking removed' }); // Send back a success message

    } catch (err) {
        console.error('Delete booking error:', err.message);
        res.status(500).send('Server Error'); 
    }
});

module.exports = router;
