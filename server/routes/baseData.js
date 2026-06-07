const router = require('express').Router();
const BrushOrder = require('../models/BrushOrder');
const ProductCost = require('../models/ProductCost');

router.get('/brush-orders', async (req, res) => {
  try {
    const orders = await BrushOrder.find({}).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/brush-order', async (req, res) => {
  try {
    const doc = await BrushOrder.create(req.body);
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/brush-order/:id', async (req, res) => {
  try {
    await BrushOrder.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/product-costs', async (req, res) => {
  try {
    const costs = await ProductCost.find({}).sort({ updatedAt: -1 });
    res.json(costs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/product-cost', async (req, res) => {
  try {
    const doc = await ProductCost.findOneAndUpdate(
      { productId: req.body.productId },
      { ...req.body, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/product-cost/:id', async (req, res) => {
  try {
    await ProductCost.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
