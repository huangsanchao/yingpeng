const mongoose = require('mongoose');

const productCostSchema = new mongoose.Schema({
  platform: { type: String },
  productId: { type: String },
  sku: { type: String },
  productName: { type: String },
  costPrice: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, default: 'system' }
}, { timestamps: true });

module.exports = mongoose.model('ProductCost', productCostSchema);
