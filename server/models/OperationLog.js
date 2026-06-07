const mongoose = require('mongoose');

const operationLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: { type: String },
  action: { type: String, required: true },       // 'import', 'delete', 'login', etc.
  resource: { type: String },                      // 'billing', 'order', 'user', etc.
  detail: { type: String, default: '' },           // human-readable description
  ip: { type: String },
  createdAt: { type: Date, default: Date.now, index: true }
});

operationLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('OperationLog', operationLogSchema);
