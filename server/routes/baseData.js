const router = require('express').Router();
const BrushOrder = require('../models/BrushOrder');
const ProductCost = require('../models/ProductCost');
const Product = require('../models/Product');
const Platform = require('../models/Platform');
const Warehouse = require('../models/Warehouse');
const Salesperson = require('../models/Salesperson');

// ========== 刷单订单 ==========
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

// ========== 商品成本 ==========
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

// ========== 商品列表 ==========
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/products', async (req, res) => {
  try {
    const doc = await Product.create(req.body);
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const doc = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 平台列表 ==========
router.get('/platforms', async (req, res) => {
  try {
    const platforms = await Platform.find({}).sort({ createdAt: -1 });
    res.json(platforms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/platforms', async (req, res) => {
  try {
    const doc = await Platform.create(req.body);
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/platforms/:id', async (req, res) => {
  try {
    const doc = await Platform.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/platforms/:id', async (req, res) => {
  try {
    await Platform.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 仓库列表 ==========
router.get('/warehouses', async (req, res) => {
  try {
    const warehouses = await Warehouse.find({}).sort({ createdAt: -1 });
    res.json(warehouses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/warehouses', async (req, res) => {
  try {
    const doc = await Warehouse.create(req.body);
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/warehouses/:id', async (req, res) => {
  try {
    const doc = await Warehouse.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/warehouses/:id', async (req, res) => {
  try {
    await Warehouse.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 销售员列表 ==========
router.get('/salespeople', async (req, res) => {
  try {
    const salespeople = await Salesperson.find({}).sort({ createdAt: -1 });
    res.json(salespeople);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/salespeople', async (req, res) => {
  try {
    const doc = await Salesperson.create(req.body);
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/salespeople/:id', async (req, res) => {
  try {
    const doc = await Salesperson.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/salespeople/:id', async (req, res) => {
  try {
    await Salesperson.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
