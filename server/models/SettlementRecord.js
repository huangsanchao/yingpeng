const mongoose = require('mongoose');

const settlementRecordSchema = new mongoose.Schema({
  platform: { type: String, required: true, enum: ['tmall', 'jd'] },
  orderNo: { type: String, index: true },
  matchStatus: { type: String, enum: ['settled', 'pending', 'refunded', 'expense'] },
  totalAmount: { type: Number, default: 0 },
  actualPayment: { type: Number, default: 0 },
  sellerServiceFee: { type: Number, default: 0 },
  orderStatus: { type: String },
  paymentMethod: { type: String },
  paymentFlowNo: { type: String },
  logisticsNo: { type: String },
  logisticsCompany: { type: String },
  productName: { type: String },
  orderTime: { type: Date },
  shipTime: { type: Date },
  confirmTime: { type: Date },
  shopName: { type: String },
  importId: { type: mongoose.Schema.Types.ObjectId },
  createdAt: { type: Date, default: Date.now }
});

settlementRecordSchema.index({ platform: 1, matchStatus: 1 });
settlementRecordSchema.index({ platform: 1, orderNo: 1 });

module.exports = mongoose.model('SettlementRecord', settlementRecordSchema);
