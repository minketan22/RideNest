const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true // No two users can have the same email
  },
  password: {
    type: String,
    required: true // We will hash this password later
  },
  phone: {
    type: String,
    required: true
  }
}, {
  timestamps: true // Adds 'createdAt' and 'updatedAt' fields
});

module.exports = mongoose.model('User', userSchema);