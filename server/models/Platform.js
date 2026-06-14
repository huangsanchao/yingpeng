const mongoose = require('mongoose');

const platformSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, index: true },
  code: { type: String },
  description: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Platform', platformSchema);
