const router = require('express').Router();
const PlatformOrder = require('../models/PlatformOrder');
const BrushOrder = require('../models/BrushOrder');
const SettlementRecord = require('../models/SettlementRecord');

router.get('/summary', async (req, res) => {
  try {
    const { month, platform } = req.query;
    const filter = {};
    if (month) filter.monthPeriod = month;
    if (platform && platform !== 'all') filter.platform = platform;

    const brushOrders = await BrushOrder.find(filter);
    const brushOrderNos = new Set(brushOrders.map(b => b.orderNo));

    const orders = await PlatformOrder.find(filter);
    let totalSales = 0, brushAmount = 0, orderCount = 0;
    const byProduct = {};

    for (const o of orders) {
      if (o.actualAmount <= 0 && o.refundAmount <= 0) continue;
      orderCount++;
      totalSales += o.actualAmount;
      if (brushOrderNos.has(o.orderNo)) brushAmount += o.actualAmount;
      const key = o.productId || o.productName || 'unknown';
      if (!byProduct[key]) byProduct[key] = { name: o.productName, count: 0, amount: 0 };
      byProduct[key].count++;
      byProduct[key].amount += o.actualAmount;
    }

    const realSales = totalSales - brushAmount;
    const products = Object.values(byProduct).sort((a, b) => b.amount - a.amount);

    res.json({
      totalSales: Math.round(totalSales * 100) / 100,
      brushAmount: Math.round(brushAmount * 100) / 100,
      realSales: Math.round(realSales * 100) / 100,
      orderCount,
      products
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/detail', async (req, res) => {
  try {
    const { month, platform, settlement, page = 1, pageSize = 10 } = req.query;
    const orderFilter = {};
    const settlementFilter = {};
    if (month) { orderFilter.monthPeriod = month; settlementFilter.monthPeriod = month; }
    if (platform && platform !== 'all') { orderFilter.platform = platform; settlementFilter.platform = platform; }

    // Fetch all orders and all settlement records for the platform/month
    const orders = await PlatformOrder.find(orderFilter);
    const settlements = await SettlementRecord.find(settlementFilter);

    // Build settlement map by orderNo
    const settlementMap = {};
    settlements.forEach(s => { settlementMap[s.orderNo] = s; });

    // Merge: start with PlatformOrder records, attach settlement fields
    const merged = orders.map(o => {
      const doc = o.toObject();
      const s = settlementMap[o.orderNo];
      if (s) {
        doc.matchStatus = s.matchStatus || 'pending';
        doc.logisticsNo = s.logisticsNo || '';
        doc.logisticsCompany = s.logisticsCompany || '';
        doc.orderStatus = s.orderStatus || '';
        doc.paymentFlowNo = s.paymentFlowNo || doc.paymentFlowNo;
        doc.confirmTime = s.confirmTime || doc.confirmTime;
        doc.settlementTotalAmount = s.totalAmount;
        doc.sellerServiceFee = s.sellerServiceFee;
      } else {
        doc.matchStatus = null; // unmatched
      }
      return doc;
    });

    // Also add settlement records that have no matching order (standalone settlement entries)
    const unmatchedSettlements = settlements
      .filter(s => !settlementMap[s.orderNo] || !orders.some(o => o.orderNo === s.orderNo))
      .map(s => {
        const doc = s.toObject();
        doc.platform = doc.platform || platform || 'unknown';
        doc.matchStatus = s.matchStatus || 'pending';
        doc.actualAmount = s.actualPayment;
        doc.productName = s.productName;
        doc.orderNo = s.orderNo;
        doc.confirmTime = s.confirmTime;
        return doc;
      });

    // Deduplicate: only add settlement records whose orderNo is NOT in orders
    const orderNos = new Set(orders.map(o => o.orderNo));
    const extraSettlements = settlements
      .filter(s => !orderNos.has(s.orderNo))
      .map(s => ({
        _id: s._id,
        platform: s.platform,
        orderNo: s.orderNo,
        productName: s.productName,
        quantity: s.quantity || 0,
        actualAmount: s.totalAmount,
        confirmTime: s.confirmTime,
        matchStatus: s.matchStatus || 'pending',
        logisticsNo: s.logisticsNo || '',
        logisticsCompany: s.logisticsCompany || '',
        orderStatus: s.orderStatus || '',
        settlementTotalAmount: s.totalAmount,
        sellerServiceFee: s.sellerServiceFee,
        isSettlementOnly: true
      }));

    let allRows = [...merged, ...extraSettlements];

    // Apply settlement filter
    if (settlement && settlement !== 'all') {
      if (settlement === 'unmatched') {
        allRows = allRows.filter(r => !r.matchStatus || r.matchStatus === null);
      } else {
        allRows = allRows.filter(r => r.matchStatus === settlement);
      }
    }

    // Sort by confirmTime desc
    allRows.sort((a, b) => {
      const ta = a.confirmTime ? new Date(a.confirmTime).getTime() : 0;
      const tb = b.confirmTime ? new Date(b.confirmTime).getTime() : 0;
      return tb - ta;
    });

    const total = allRows.length;
    const start = (page - 1) * pageSize;
    const pagedRows = allRows.slice(start, start + parseInt(pageSize));

    res.json({ total, page: parseInt(page), pageSize: parseInt(pageSize), data: pagedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
