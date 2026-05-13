const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const vehicleSchema = new Schema({
  agencyId: {
    type: Schema.Types.ObjectId,
    ref: 'Agency', 
    required: true
  },
  modelName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Sedan', 'SUV', 'Hatchback', 'Bike', 'Truck']
  },
  // CHANGED: From an array to a single string
  image: {
    type: String,
    required: true 
  },
  pricePerDay: {
    type: Number,
    required: true
  },
  // NEW: Optional description
  description: {
    type: String,
    required: false 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Vehicle', vehicleSchema);