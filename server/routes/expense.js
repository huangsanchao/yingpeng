const router = require('express').Router();
const PlatformExpense = require('../models/PlatformExpense');

const CATEGORY_MAP = {
  '佣金': '平台佣金',
  '交易服务费': '平台佣金',
  '商品保险服务费': '保险费用',
  '运费保险服务费': '保险费用',
  '随单送的京豆': '其他费用',
  '综合违约金': '违约金',
  '货款': '销售收入',
  '推广费': '推广费用',
  '直通车': '推广费用',
  '快车': '推广费用'
};

router.get('/summary', async (req, res) => {
  try {
    const { month, platform } = req.query;
    const filter = {};
    if (month) filter.monthPeriod = month;
    if (platform && platform !== 'all') filter.platform = platform;

    const expenses = await PlatformExpense.find(filter);
    const byCategory = {};

    for (const e of expenses) {
      const cat = e.expenseCategory || CATEGORY_MAP[e.expenseItem] || '其他费用';
      if (!byCategory[cat]) byCategory[cat] = { category: cat, amount: 0, count: 0 };
      if (e.amount < 0) {
        byCategory[cat].amount += Math.abs(e.amount);
        byCategory[cat].count++;
      }
    }

    const categories = Object.values(byCategory).sort((a, b) => b.amount - a.amount);
    const total = categories.reduce((s, c) => s + c.amount, 0);

    res.json({ categories, total: Math.round(total * 100) / 100 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/detail', async (req, res) => {
  try {
    const { month, platform, category, page = 1, pageSize = 10 } = req.query;
    const filter = {};
    if (month) filter.monthPeriod = month;
    if (platform && platform !== 'all') filter.platform = platform;
    if (category) filter.expenseCategory = category;

    const total = await PlatformExpense.countDocuments(filter);
    const expenses = await PlatformExpense.find(filter)
      .sort({ settlementTime: -1 })
      .skip((page - 1) * pageSize)
      .limit(parseInt(pageSize));
    res.json({ total, page: parseInt(page), pageSize: parseInt(pageSize), data: expenses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
