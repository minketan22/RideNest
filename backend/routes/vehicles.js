const express = require('express');
const router = express.Router();
const { auth, isAgency } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const {
  createVehicle,
  deleteVehicle,
  getActiveBookingForVehicle,
  getAgencyById,
  getVehicleById,
  getVehicles,
  isVehicleBooked
} = require('../data/store');

// --- Multer Storage Configuration ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });
const uploadMiddleware = upload.single('image');

function serializeVehicle(vehicle) {
  const agency = getAgencyById(vehicle.agencyId);
  const activeBooking = getActiveBookingForVehicle(vehicle._id);
  return {
    ...vehicle,
    isBooked: isVehicleBooked(vehicle._id),
    bookedByDateRange: activeBooking
      ? {
          startDate: activeBooking.startDate,
          endDate: activeBooking.endDate,
          status: activeBooking.status
        }
      : null,
    agencyId: agency
      ? {
          _id: agency._id,
          agencyName: agency.agencyName,
          address: agency.address
        }
      : null
  };
}

/*
 * @route   POST /api/vehicles
 * @desc    Add a new vehicle
 * @access  Private (Agency only)
 */
router.post('/', [auth, isAgency, uploadMiddleware], async (req, res) => {
  try {
    const { modelName, type, location, pricePerDay, description } = req.body;

    if (!modelName || !type || !location || !pricePerDay) {
      return res.status(400).json({ msg: 'Model, type, location and price are required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ msg: 'Image file is required' });
    }
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    const vehicle = createVehicle({
      agencyId: req.user.id,
      modelName,
      type,
      location,
      pricePerDay,
      description,
      image: imageUrl
    });
    res.status(201).json(serializeVehicle(vehicle));

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// --- UPDATED ROUTE ---
/*
 * @route   GET /api/vehicles
 * @desc    Get all vehicles (for search), with filters
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { type = '', location = '' } = req.query;
    const vehicles = getVehicles({ type, location }).map(serializeVehicle);
    res.json(vehicles);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// --- ROUTE ORDER FIX ---
/*
 * @route   GET /api/vehicles/my-vehicles
 * @desc    Get all vehicles for the logged-in agency
 * @access  Private (Agency only)
 */
router.get('/my-vehicles', [auth, isAgency], async (req, res) => {
    try {
        const vehicles = getVehicles({ agencyId: req.user.id }).map(serializeVehicle);
        res.json(vehicles);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


/*
 * @route   GET /api/vehicles/:id
 * @desc    Get a single vehicle by its ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const vehicle = getVehicleById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ msg: 'Vehicle not found' });
    }
    res.json(serializeVehicle(vehicle));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


/*
 * @route   DELETE /api/vehicles/:id
 * @desc    Delete a vehicle
 * @access  Private (Agency only)
 */
router.delete('/:id', [auth, isAgency], async (req, res) => {
    try {
        const vehicle = getVehicleById(req.params.id);

        if (!vehicle) {
            return res.status(404).json({ msg: 'Vehicle not found' });
        }

        if (vehicle.agencyId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        deleteVehicle(req.params.id);

        res.json({ msg: 'Vehicle removed' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;
