const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const agencySchema = new Schema({
  agencyName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true // Agency owner's email
  },
  password: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Agency', agencySchema);