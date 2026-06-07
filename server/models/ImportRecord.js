const mongoose = require('mongoose');

const importRecordSchema = new mongoose.Schema({
  fileName: { type: String },
  fileType: { type: String },
  platform: { type: String },
  totalRows: { type: Number, default: 0 },
  validRows: { type: Number, default: 0 },
  importedBy: { type: String, default: 'system' },
  importedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'success' },
  errorMsg: { type: String }
});

module.exports = mongoose.model('ImportRecord', importRecordSchema);
