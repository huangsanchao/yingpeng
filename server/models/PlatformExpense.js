const mongoose = require('mongoose');

const platformExpenseSchema = new mongoose.Schema({
  platform: { type: String, required: true, enum: ['tmall', 'jd'] },
  orderNo: { type: String, index: true },
  documentNo: { type: String },
  documentType: { type: String },
  productId: { type: String },
  productName: { type: String },
  expenseItem: { type: String },
  expenseCategory: { type: String },
  amount: { type: Number, default: 0 },
  currency: { type: String },
  direction: { type: String },
  occurrenceTime: { type: Date },
  settlementTime: { type: Date },
  shopId: { type: String },
  remark: { type: String },
  monthPeriod: { type: String, index: true },
  quantity: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PlatformExpense', platformExpenseSchema);
