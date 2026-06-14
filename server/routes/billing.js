const router = require('express').Router();
const PlatformOrder = require('../models/PlatformOrder');
const { logMiddleware } = require('../middleware/logger');

router.get('/list', async (req, res) => {
  try {
    const { month, platform, orderNo, page = 1, pageSize = 10 } = req.query;
    const filter = {};
    if (month) filter.monthPeriod = month;
    if (platform && platform !== 'all') filter.platform = platform;
    if (orderNo) {
      filter.$or = [
        { orderNo: { $regex: orderNo, $options: 'i' } },
        { orderNo: { $regex: `T200${orderNo}`, $options: 'i' } },
        { orderNo: { $regex: `T200P${orderNo}`, $options: 'i' } }
      ];
    }

    const total = await PlatformOrder.countDocuments(filter);
    const billings = await PlatformOrder.find(filter)
      .sort({ paymentTime: -1 })
      .skip((page - 1) * pageSize)
      .limit(parseInt(pageSize));

    res.json({ total, page: parseInt(page), pageSize: parseInt(pageSize), data: billings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', logMiddleware('billing', 'delete', (req, res) => `删除账单: ${req.params.id}`), async (req, res) => {
  try {
    const record = await PlatformOrder.findById(req.params.id);
    if (!record) return res.status(404).json({ error: '账单不存在' });
    await PlatformOrder.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
