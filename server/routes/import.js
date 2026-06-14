const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { importTmallFile, importJdFile, importOrderFile, parseOrderXlsx, parseAlipaySettlementXlsx } = require('../utils/csvParser');
const { logMiddleware } = require('../middleware/logger');

const uploadDir = path.resolve(__dirname, '..', config.UPLOAD_DIR.replace('./server/', ''));
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// Normalize orderNo: strip T200/T200P prefix for matching
function normalizeOrderNo(orderNo) {
  return orderNo.replace(/^T200P?/, '');
}

async function importAlipaySettlement(filePath, uploadedBy) {
  const PlatformOrder = require('../models/PlatformOrder');
  const ImportRecord = require('../models/ImportRecord');
  const { parseAlipaySettlementXlsx } = require('../utils/csvParser');
  const rows = parseAlipaySettlementXlsx(filePath);

  const docs = rows.map(r => ({
    platform: 'tmall',
    orderNo: r.orderNo,
    productName: r.productName,
    actualAmount: r.orderAmount,
    refundAmount: r.refundAmount,
    paymentChannel: r.tradeMethod,
    paymentFlowNo: r.alipayTradeNo,
    paymentTime: r.payTime,
    orderTime: r.createTime,
    monthPeriod: r.payTime ? `${r.payTime.getFullYear()}${String(r.payTime.getMonth() + 1).padStart(2, '0')}` : '',
    businessCategory: '交易货款',
    quantity: 1,
    createdAt: new Date()
  }));

  for (const doc of docs) {
    await PlatformOrder.findOneAndUpdate(
      { platform: 'tmall', orderNo: doc.orderNo },
      doc,
      { upsert: true }
    );
  }

  await ImportRecord.create({
    fileName: path.basename(filePath),
    fileType: 'billing',
    platform: 'tmall',
    totalRows: rows.length,
    validRows: rows.length,
    importedBy: uploadedBy
  });

  return { total: rows.length, platform: 'tmall' };
}

// Billing upload: 天猫/京东/支付宝账单 → PlatformOrder
router.post('/upload', upload.single('file'), logMiddleware('import', 'billing', (req, res) => `导入账单: ${req.file?.originalname}`), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { fileType } = req.body;
    let result;
    if (fileType === 'tmall') {
      result = await importTmallFile(req.file.path, req.body.uploadedBy || 'system');
    } else if (fileType === 'jd') {
      result = await importJdFile(req.file.path, req.body.uploadedBy || 'system');
    } else if (fileType === 'alipay') {
      result = await importAlipaySettlement(req.file.path, req.body.uploadedBy || 'system');
    } else {
      return res.status(400).json({ error: 'Unknown file type' });
    }
    res.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Order upload: test.xlsx → SettlementRecord, match against billing
router.post('/upload-order', upload.single('file'), logMiddleware('import', 'order', (req, res) => `导入订单: ${req.file?.originalname}`), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const platform = 'tmall';
    const rows = parseOrderXlsx(req.file.path);
    const { stats } = await importOrderFile(req.file.path, req.body.uploadedBy || 'system');

    // Match orders against billing to determine settlement status
    const SettlementRecord = require('../models/SettlementRecord');
    const PlatformOrder = require('../models/PlatformOrder');
    const billingNos = new Set(
      (await PlatformOrder.find({ platform }).distinct('orderNo')).map(normalizeOrderNo)
    );

    for (const r of rows) {
      const normOrderNo = normalizeOrderNo(r.orderNo);
      const isSettled = billingNos.has(normOrderNo);
      const rec = await SettlementRecord.findOne({ orderNo: r.orderNo });
      if (rec) {
        rec.matchStatus = isSettled ? 'settled' : 'pending';
        await rec.save();
      }
    }

    const allRecords = await SettlementRecord.find({ platform });
    const matchStats = { settled: 0, pending: 0 };
    allRecords.forEach(r => {
      matchStats[r.matchStatus === 'settled' ? 'settled' : 'pending']++;
    });

    res.json({ success: true, total: rows.length, stats: matchStats, platform });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/records', async (req, res) => {
  try {
    const records = await require('../models/ImportRecord').find()
      .sort({ importedAt: -1 }).limit(100);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/settlement-stats', async (req, res) => {
  try {
    const { platform } = req.query;
    const SettlementRecord = require('../models/SettlementRecord');
    const PlatformOrder = require('../models/PlatformOrder');
    const filter = {};
    if (platform && platform !== 'all') filter.platform = platform;

    const allOrders = await SettlementRecord.find(filter);
    const billingNos = new Set(
      (await PlatformOrder.find({ platform: 'tmall' }).distinct('orderNo')).map(normalizeOrderNo)
    );

    let settled = 0, pending = 0;
    for (const r of allOrders) {
      if (billingNos.has(normalizeOrderNo(r.orderNo))) settled++;
      else pending++;
    }

    res.json({ settled, pending, total: allOrders.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/settlement-detail', async (req, res) => {
  try {
    const { status, orderNo, platform, page = 1, pageSize = 10 } = req.query;
    const SettlementRecord = require('../models/SettlementRecord');
    const PlatformOrder = require('../models/PlatformOrder');
    const filter = {};
    if (platform && platform !== 'all') filter.platform = platform;

    const allOrders = await SettlementRecord.find(filter).sort({ orderTime: -1 });

    // Get billing orders with paymentTime for matching
    const billingMap = {};
    const billingOrders = await PlatformOrder.find({ platform: 'tmall' }).select('orderNo paymentTime');
    for (const b of billingOrders) {
      billingMap[normalizeOrderNo(b.orderNo)] = b.paymentTime;
    }

    // Compute matchStatus and paymentTime dynamically
    const rows = allOrders.map(r => {
      const doc = r.toObject();
      const norm = normalizeOrderNo(r.orderNo);
      const isSettled = billingMap[norm] !== undefined;
      doc.matchStatus = isSettled ? 'settled' : 'pending';
      doc.paymentTime = isSettled ? billingMap[norm] : null;
      return doc;
    });

    // Filter by status
    let filtered = rows;
    if (status && status !== 'all') {
      filtered = rows.filter(r => r.matchStatus === status);
    }

    // Filter by orderNo search
    if (orderNo) {
      filtered = filtered.filter(r =>
        r.orderNo.includes(orderNo) ||
        normalizeOrderNo(r.orderNo).includes(orderNo)
      );
    }

    const total = filtered.length;
    const start = (parseInt(page) - 1) * parseInt(pageSize);
    const paged = filtered.slice(start, start + parseInt(pageSize));

    res.json({ total, page: parseInt(page), pageSize: parseInt(pageSize), data: paged });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a settled order (remove from both SettlementRecord and PlatformOrder)
router.delete('/settlement/:id', logMiddleware('import', 'delete', (req, res) => `删除已到账订单: ${req.params.id}`), async (req, res) => {
  try {
    const { id } = req.params;
    const SettlementRecord = require('../models/SettlementRecord');
    const PlatformOrder = require('../models/PlatformOrder');

    const record = await SettlementRecord.findById(id);
    if (!record) return res.status(404).json({ error: '订单不存在' });

    // Remove matching PlatformOrder
    await PlatformOrder.deleteMany({ orderNo: record.orderNo });

    // Remove the SettlementRecord
    await SettlementRecord.findByIdAndDelete(id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
