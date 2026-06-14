const mongoose = require('mongoose');

const platformOrderSchema = new mongoose.Schema({
  platform: { type: String, required: true, enum: ['tmall', 'jd'] },
  orderNo: { type: String, index: true, unique: true },
  subOrderNo: { type: String },
  merchantOrderNo: { type: String },
  productId: { type: String },
  sku: { type: String },
  productName: { type: String },
  quantity: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  actualAmount: { type: Number, default: 0 },
  orderTime: { type: Date },
  confirmTime: { type: Date },
  refundNo: { type: String },
  refundAmount: { type: Number, default: 0 },
  paymentChannel: { type: String },
  paymentFlowNo: { type: String },
  paymentTime: { type: Date },
  isBrushOrder: { type: Boolean, default: false },
  monthPeriod: { type: String, index: true },
  businessCategory: { type: String },
  subCategory: { type: String },
  createdAt: { type: Date, default: Date.now }
});

platformOrderSchema.index({ platform: 1, orderNo: 1 }, { unique: true });

module.exports = mongoose.model('PlatformOrder', platformOrderSchema);
