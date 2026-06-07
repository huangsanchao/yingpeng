const router = require('express').Router();
const PlatformOrder = require('../models/PlatformOrder');

router.get('/summary', async (req, res) => {
  try {
    const { month, platform } = req.query;
    const filter = {};
    if (month) filter.monthPeriod = month;
    if (platform && platform !== 'all') filter.platform = platform;

    const orders = await PlatformOrder.find(filter);
    let shouldPay = 0, actualPay = 0, orderCount = 0;

    for (const o of orders) {
      shouldPay += o.actualAmount;
      orderCount++;
      if (o.paymentTime) actualPay += o.actualAmount;
    }

    const diff = shouldPay - actualPay;
    res.json({
      orderCount,
      shouldPay: Math.round(shouldPay * 100) / 100,
      actualPay: Math.round(actualPay * 100) / 100,
      diff: Math.round(diff * 100) / 100,
      payRate: shouldPay > 0 ? Math.round(actualPay / shouldPay * 10000) / 100 : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
