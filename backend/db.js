const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://127.0.0.1:27017/vehicleRental';


const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully.');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
};
module.exports = connectDB;