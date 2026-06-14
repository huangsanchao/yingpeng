const mongoose = require('mongoose');

const salespersonSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  phone: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Salesperson', salespersonSchema);
