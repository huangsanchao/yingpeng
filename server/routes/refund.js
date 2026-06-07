const router = require('express').Router();
const PlatformOrder = require('../models/PlatformOrder');
const ProductCost = require('../models/ProductCost');

router.get('/summary', async (req, res) => {
  try {
    const { month, platform } = req.query;
    const filter = {};
    if (month) filter.monthPeriod = month;
    if (platform && platform !== 'all') filter.platform = platform;

    const orders = await PlatformOrder.find(filter);
    let refundCount = 0, refundAmount = 0;
    const byReason = {};

    const productCosts = await ProductCost.find({});
    const costMap = {};
    productCosts.forEach(pc => { costMap[pc.productId] = pc.costPrice; });

    let refundCost = 0;
    for (const o of orders) {
      if (o.refundNo && o.refundAmount > 0) {
        refundCount++;
        refundAmount += o.refundAmount;
        const unitCost = costMap[o.productId] || 0;
        refundCost += o.quantity * unitCost;
      }
    }

    res.json({
      refundCount,
      refundAmount: Math.round(refundAmount * 100) / 100,
      refundCost: Math.round(refundCost * 100) / 100
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/detail', async (req, res) => {
  try {
    const { month, platform, page = 1, pageSize = 10 } = req.query;
    const filter = {};
    if (month) filter.monthPeriod = month;
    if (platform && platform !== 'all') filter.platform = platform;
    filter.refundNo = { $ne: '', $exists: true };

    const total = await PlatformOrder.countDocuments(filter);
    const orders = await PlatformOrder.find(filter)
      .skip((page - 1) * pageSize)
      .limit(parseInt(pageSize));
    res.json({ total, page: parseInt(page), pageSize: parseInt(pageSize), data: orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
