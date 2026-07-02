const router = require('express').Router();
const PlatformOrder = require('../models/PlatformOrder');
const multer = require('multer');
const iconv = require('iconv-lite');
const fs = require('fs');
const { logMiddleware } = require('../middleware/logger');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// 列表（支持分页、筛选）
router.get('/list', async (req, res) => {
  try {
    const { month, startDate, endDate, orderNo, subOrderNo, productId, flowNo, page = 1, pageSize = 20 } = req.query;
    const filter = {};
    if (month) filter.monthPeriod = month;
    if (startDate && endDate) {
      filter.paymentTime = { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') };
    }
    if (orderNo) {
      const cleanNo = orderNo.replace(/^T200P?/i, '');
      filter.$or = filter.$or || [];
      filter.$or.push({ orderNo: { $regex: orderNo, $options: 'i' } });
      filter.$or.push({ orderNo: { $regex: cleanNo, $options: 'i' } });
    }
    if (subOrderNo) filter.subOrderNo = { $regex: subOrderNo, $options: 'i' };
    if (productId) filter.productId = { $regex: productId, $options: 'i' };
    if (flowNo) filter.paymentFlowNo = { $regex: flowNo, $options: 'i' };

    const total = await PlatformOrder.countDocuments(filter);
    const data = await PlatformOrder.find(filter)
      .sort({ paymentTime: -1 })
      .skip((page - 1) * pageSize)
      .limit(parseInt(pageSize));

    res.json({ total, page: parseInt(page), pageSize: parseInt(pageSize), data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 新增
router.post('/', async (req, res) => {
  try {
    const doc = await PlatformOrder.create(req.body);
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 编辑
router.put('/:id', async (req, res) => {
  try {
    const doc = await PlatformOrder.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: '未找到' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 批量删除（必须放在 /:id 之前）
router.delete('/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请选择要删除的记录' });
    }
    const result = await PlatformOrder.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除单个
router.delete('/:id', logMiddleware('billing', 'delete', (req, res) => `删除账单: ${req.params.id}`), async (req, res) => {
  try {
    const doc = await PlatformOrder.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: '未找到' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 导入交易货款 CSV
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传文件' });

    // GBK 解码
    const text = iconv.decode(req.file.buffer, 'gbk');
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return res.status(400).json({ error: '文件为空或格式错误' });

    // CSV 列映射
    // 账期,账单大类,业务大类,业务小类,订单号,子订单号,下单时间,确认收货时间,商品ID,sku,商品名称,数量,单价,订单实际金额,退款单号,退款金额,收/付渠道,业务流水号,商户订单号,打款时间,打款更新时间,备注
    const clean = (s) => (s || '').trim().replace(/^["']+|["']+$/g, ''); // 去两端引号
    const parseDate = (s) => { const v=clean(s); return v ? new Date(v) : null; };
    const parseNum = (s) => { const v=clean(s); return v ? parseFloat(v.replace(/[¥,]/g, '')) || 0 : 0; };

    const rows = [];
    const existingNos = new Set();

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < 20) continue;

      const orderNo = clean(cols[4]);
      if (!orderNo) continue;

      // 去重
      if (existingNos.has(orderNo)) continue;

      const doc = {
        platform: 'tmall',
        accountPeriod: clean(cols[0]),
        billCategory: clean(cols[1]),
        businessCategory: clean(cols[2]),
        subCategory: clean(cols[3]),
        orderNo,
        subOrderNo: clean(cols[5]),
        orderTime: parseDate(cols[6]),
        confirmTime: parseDate(cols[7]),
        productId: clean(cols[8]),
        sku: clean(cols[9]),
        productName: clean(cols[10]),
        quantity: parseNum(cols[11]),
        unitPrice: parseNum(cols[12]),
        actualAmount: parseNum(cols[13]),
        refundNo: clean(cols[14]),
        refundAmount: parseNum(cols[15]),
        paymentChannel: clean(cols[16]),
        paymentFlowNo: clean(cols[17]),
        merchantOrderNo: clean(cols[18]),
        paymentTime: parseDate(cols[19]),
        paymentUpdateTime: parseDate(cols[20]),
        remarks: clean(cols[21]),
        monthPeriod: clean(cols[0])
      };

      existingNos.add(orderNo);
      rows.push(doc);
    }

    if (rows.length === 0) return res.status(400).json({ error: '未识别到有效数据' });

    // 按订单号去重导入：已存在的跳过
    let inserted = 0, skipped = 0;
    for (const doc of rows) {
      const exists = await PlatformOrder.findOne({ orderNo: doc.orderNo });
      if (exists) {
        skipped++;
      } else {
        await PlatformOrder.create(doc);
        inserted++;
      }
    }

    console.log(`[billing-import] 新增 ${inserted} 条, 跳过 ${skipped} 条`);
    res.json({ success: true, total: rows.length, inserted, skipped });
  } catch (err) {
    console.error('[billing-import] 错误:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
