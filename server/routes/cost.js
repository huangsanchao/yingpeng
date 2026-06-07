const router = require('express').Router();
const PlatformOrder = require('../models/PlatformOrder');
const ProductCost = require('../models/ProductCost');
const BrushOrder = require('../models/BrushOrder');

router.get('/summary', async (req, res) => {
  try {
    const { month, platform } = req.query;
    const filter = {};
    if (month) filter.monthPeriod = month;
    if (platform && platform !== 'all') filter.platform = platform;

    const brushOrders = await BrushOrder.find(filter);
    const brushOrderNos = new Set(brushOrders.map(b => b.orderNo));

    const orders = await PlatformOrder.find(filter);
    let totalCost = 0, brushCost = 0;
    const productCosts = await ProductCost.find({});
    const costMap = {};
    productCosts.forEach(pc => { costMap[pc.productId] = pc.costPrice; costMap[pc.sku] = pc.costPrice; });

    for (const o of orders) {
      const unitCost = costMap[o.productId] || costMap[o.sku] || 0;
      const orderCost = o.quantity * unitCost;
      totalCost += orderCost;
      if (brushOrderNos.has(o.orderNo)) brushCost += orderCost;
    }

    res.json({
      totalCost: Math.round(totalCost * 100) / 100,
      brushCost: Math.round(brushCost * 100) / 100,
      realCost: Math.round((totalCost - brushCost) * 100) / 100
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/list', async (req, res) => {
  try {
    const costs = await ProductCost.find({}).sort({ updatedAt: -1 });
    res.json(costs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cost', async (req, res) => {
  try {
    const { productId, sku, productName, costPrice, platform } = req.body;
    const doc = await ProductCost.findOneAndUpdate(
      { productId },
      { productId, sku, productName, costPrice: parseFloat(costPrice), platform, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/cost/:id', async (req, res) => {
  try {
    await ProductCost.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cost/batch', async (req, res) => {
  try {
    const { items } = req.body;
    let count = 0;
    for (const item of items) {
      await ProductCost.findOneAndUpdate(
        { productId: item.productId },
        { ...item, costPrice: parseFloat(item.costPrice), updatedAt: new Date() },
        { upsert: true }
      );
      count++;
    }
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
