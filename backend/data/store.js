const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const dataDir = __dirname;
const dbFile = path.join(dataDir, 'demo-db.json');

const demoPasswordHash = bcrypt.hashSync('demo12345', 10);

const defaultData = {
  users: [
    {
      _id: 'user-demo-1',
      username: 'Aarav Student',
      email: 'user@ridenest.demo',
      password: demoPasswordHash,
      phone: '9876543210',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  agencies: [
    {
      _id: 'agency-demo-1',
      agencyName: 'RideNest Fleet',
      email: 'agency@ridenest.demo',
      password: demoPasswordHash,
      address: 'North Campus, Delhi',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  vehicles: [
    {
      _id: 'vehicle-demo-1',
      agencyId: 'agency-demo-1',
      modelName: 'Honda City',
      type: 'Sedan',
      location: 'Delhi',
      image: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1200&q=80',
      pricePerDay: 2200,
      description: 'Comfortable sedan for city rides and airport pickups.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'vehicle-demo-2',
      agencyId: 'agency-demo-1',
      modelName: 'Hyundai Creta',
      type: 'SUV',
      location: 'Noida',
      image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80',
      pricePerDay: 3200,
      description: 'Spacious SUV for family trips and weekend travel.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'vehicle-demo-3',
      agencyId: 'agency-demo-1',
      modelName: 'Royal Enfield Classic 350',
      type: 'Bike',
      location: 'Gurugram',
      image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80',
      pricePerDay: 1400,
      description: 'A dependable bike for solo commutes and quick rides.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  bookings: []
};

function ensureDbFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify(defaultData, null, 2), 'utf8');
  }
}

function readDb() {
  ensureDbFile();
  return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
}

function writeDb(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf8');
}

function generateId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function timestampRecord(record, isNew = false) {
  const now = new Date().toISOString();
  const nextRecord = { ...record, updatedAt: now };
  if (isNew) {
    nextRecord.createdAt = now;
  }
  return nextRecord;
}

function findUserByEmail(email) {
  return readDb().users.find((user) => user.email.toLowerCase() === email.toLowerCase()) || null;
}

function createUser(user) {
  const db = readDb();
  const newUser = timestampRecord({ _id: generateId('user'), ...user }, true);
  db.users.push(newUser);
  writeDb(db);
  return newUser;
}

function findAgencyByEmail(email) {
  return readDb().agencies.find((agency) => agency.email.toLowerCase() === email.toLowerCase()) || null;
}

function createAgency(agency) {
  const db = readDb();
  const newAgency = timestampRecord({ _id: generateId('agency'), ...agency }, true);
  db.agencies.push(newAgency);
  writeDb(db);
  return newAgency;
}

function getAgencyById(agencyId) {
  return readDb().agencies.find((agency) => agency._id === agencyId) || null;
}

function getUserById(userId) {
  return readDb().users.find((user) => user._id === userId) || null;
}

function getVehicles(filters = {}) {
  const { type, location, agencyId } = filters;
  return readDb().vehicles.filter((vehicle) => {
    const matchesType = !type || vehicle.type === type;
    const matchesAgency = !agencyId || vehicle.agencyId === agencyId;
    const matchesLocation = !location || vehicle.location.toLowerCase().includes(location.toLowerCase());
    return matchesType && matchesAgency && matchesLocation;
  });
}

function getVehicleById(vehicleId) {
  return readDb().vehicles.find((vehicle) => vehicle._id === vehicleId) || null;
}

function createVehicle(vehicle) {
  const db = readDb();
  const newVehicle = timestampRecord(
    {
      _id: generateId('vehicle'),
      ...vehicle,
      pricePerDay: Number(vehicle.pricePerDay)
    },
    true
  );
  db.vehicles.push(newVehicle);
  writeDb(db);
  return newVehicle;
}

function deleteVehicle(vehicleId) {
  const db = readDb();
  const vehicleIndex = db.vehicles.findIndex((vehicle) => vehicle._id === vehicleId);
  if (vehicleIndex === -1) {
    return null;
  }

  const [removedVehicle] = db.vehicles.splice(vehicleIndex, 1);
  db.bookings = db.bookings.filter((booking) => booking.vehicleId !== vehicleId);
  writeDb(db);
  return removedVehicle;
}

function getBookingsByUser(userId) {
  return readDb().bookings.filter((booking) => booking.userId === userId);
}

function getBookingsByAgency(agencyId) {
  return readDb().bookings.filter((booking) => booking.agencyId === agencyId);
}

function getBookingById(bookingId) {
  return readDb().bookings.find((booking) => booking._id === bookingId) || null;
}

function doesBookingBlockVehicle(booking) {
  return booking.status === 'Pending' || booking.status === 'Confirmed';
}

function isBookingActiveOrUpcoming(booking) {
  return doesBookingBlockVehicle(booking) && new Date(booking.endDate) >= new Date(new Date().toDateString());
}

function getActiveBookingForVehicle(vehicleId) {
  return (
    readDb()
      .bookings
      .filter((booking) => booking.vehicleId === vehicleId)
      .filter(isBookingActiveOrUpcoming)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0] || null
  );
}

function isVehicleBooked(vehicleId) {
  return Boolean(getActiveBookingForVehicle(vehicleId));
}

function hasOverlappingBooking(vehicleId, startDate, endDate) {
  const nextStart = new Date(startDate);
  const nextEnd = new Date(endDate);

  return readDb().bookings.some((booking) => {
    if (booking.vehicleId !== vehicleId || !doesBookingBlockVehicle(booking)) {
      return false;
    }

    const bookingStart = new Date(booking.startDate);
    const bookingEnd = new Date(booking.endDate);
    return nextStart <= bookingEnd && nextEnd >= bookingStart;
  });
}

function createBooking(booking) {
  const db = readDb();
  const newBooking = timestampRecord(
    {
      _id: generateId('booking'),
      ...booking,
      totalPrice: Number(booking.totalPrice),
      status: booking.status || 'Pending'
    },
    true
  );
  db.bookings.push(newBooking);
  writeDb(db);
  return newBooking;
}

function updateBookingStatus(bookingId, status) {
  const db = readDb();
  const bookingIndex = db.bookings.findIndex((booking) => booking._id === bookingId);
  if (bookingIndex === -1) {
    return null;
  }

  const updatedBooking = timestampRecord({
    ...db.bookings[bookingIndex],
    status
  });
  db.bookings[bookingIndex] = updatedBooking;
  writeDb(db);
  return updatedBooking;
}

function deleteBooking(bookingId) {
  const db = readDb();
  const bookingIndex = db.bookings.findIndex((booking) => booking._id === bookingId);
  if (bookingIndex === -1) {
    return null;
  }

  const [removedBooking] = db.bookings.splice(bookingIndex, 1);
  writeDb(db);
  return removedBooking;
}

module.exports = {
  createAgency,
  createBooking,
  createUser,
  createVehicle,
  deleteBooking,
  deleteVehicle,
  findAgencyByEmail,
  findUserByEmail,
  getAgencyById,
  getBookingById,
  getBookingsByAgency,
  getBookingsByUser,
  getUserById,
  getActiveBookingForVehicle,
  getVehicleById,
  getVehicles,
  hasOverlappingBooking,
  isVehicleBooked
  ,
  updateBookingStatus
};
