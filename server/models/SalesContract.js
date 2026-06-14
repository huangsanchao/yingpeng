const mongoose = require('mongoose');

const salesContractSchema = new mongoose.Schema({
  anfeiContractNo: { type: String, index: true },
  salesperson: { type: String, index: true },
  orderChannel: { type: String },
  contractNo: { type: String, required: true, index: true },
  customerName: { type: String },
  productName: { type: String },
  quantity: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  orderDate: { type: Date },
  contractTotalAmount: { type: Number, default: 0 },
  rebateOrCommission: { type: String },
  actualContractAmount: { type: Number, default: 0 },
  settlementMethod: { type: String },
  purchaseUnitPrice: { type: Number, default: 0 },
  purchaseTotalPrice: { type: Number, default: 0 },
  warrantyDueDate: { type: Date },
  isInvoiced: { type: String },
  invoiceDate: { type: Date },
  invoiceNo: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SalesContract', salesContractSchema);
