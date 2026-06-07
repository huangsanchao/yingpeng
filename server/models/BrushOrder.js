const mongoose = require('mongoose');

const brushOrderSchema = new mongoose.Schema({
  platform: { type: String, enum: ['tmall', 'jd'] },
  orderNo: { type: String, index: true },
  amount: { type: Number, default: 0 },
  brushDate: { type: Date },
  remark: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BrushOrder', brushOrderSchema);
