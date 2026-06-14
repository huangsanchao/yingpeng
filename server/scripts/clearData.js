const mongoose = require('mongoose');
const config = require('../config');

const models = [
  { name: 'PlatformOrder', path: '../models/PlatformOrder' },
  { name: 'BrushOrder', path: '../models/BrushOrder' },
  { name: 'SettlementRecord', path: '../models/SettlementRecord' },
  { name: 'PlatformExpense', path: '../models/PlatformExpense' },
  { name: 'ImportRecord', path: '../models/ImportRecord' },
  { name: 'ProductCost', path: '../models/ProductCost' },
  { name: 'OperationLog', path: '../models/OperationLog' },
  { name: 'User', path: '../models/User' },
];

async function clearData() {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log('已连接数据库:', config.MONGO_URI);

    for (const m of models) {
      const Model = require(m.path);
      const count = await Model.countDocuments();
      await Model.deleteMany({});
      console.log(`  ${m.name}: 删除了 ${count} 条记录`);
    }

    console.log('清理完成！');
  } catch (err) {
    console.error('清理失败:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

clearData();
