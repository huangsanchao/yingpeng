/**
 * 从 5月.xlsx 提取数据初始化数据库
 * 运行方式: node server/scripts/initBaseData.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
const config = require('../config');

const Product = require('../models/Product');
const Platform = require('../models/Platform');
const Warehouse = require('../models/Warehouse');
const Salesperson = require('../models/Salesperson');
const SalesContract = require('../models/SalesContract');

const EXCEL_PATH = path.join(__dirname, '../../word/5月.xlsx');

async function main() {
  await mongoose.connect(config.MONGO_URI);
  console.log('MongoDB connected');

  // 读取 Excel
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // 跳过前3行（标题行），第4行开始是数据
  const rows = allRows.slice(3);
  console.log(`读取到 ${rows.length} 条数据`);

  // ===== 1. 销售员 =====
  const salespersonNames = new Set();
  rows.forEach(r => { if (r[1]) salespersonNames.add(r[1]); });
  console.log(`\n销售员 (${salespersonNames.size}人):`, [...salespersonNames]);

  await Salesperson.deleteMany({});
  for (const name of salespersonNames) {
    await Salesperson.create({ name, status: 'active' });
  }
  console.log(`✓ 销售员已导入 ${salespersonNames.size} 条`);

  // ===== 2. 平台（下单渠道归一化） =====
  const channelMap = {
    '天猫下单': '天猫', '天猫线下': '天猫',
    '京东下单': '京东', '京东线下': '京东', '京东 复购客户': '京东',
    '淘宝下单': '淘宝', '淘宝线下': '淘宝',
    '抖音': '抖音',
    '微信添加': '微信',
    '官网手机号搜索': '官网',
    '爱番番': '官网',
    '复购客户': '线下', '老客户': '线下', '私账': '线下', '线下': '线下',
    '微软': '其他'
  };
  const platforms = new Set();
  rows.forEach(r => {
    if (r[2] && channelMap[r[2]]) platforms.add(channelMap[r[2]]);
  });
  console.log(`\n平台 (${platforms.size}个):`, [...platforms]);

  await Platform.deleteMany({});
  const platformCodes = { '天猫': 'tmall', '京东': 'jd', '淘宝': 'taobao', '抖音': 'douyin', '微信': 'wechat', '官网': 'website', '线下': 'offline', '其他': 'other' };
  for (const name of platforms) {
    await Platform.create({ name, code: platformCodes[name] || name.toLowerCase(), status: 'active' });
  }
  console.log(`✓ 平台已导入 ${platforms.size} 条`);

  // ===== 3. 仓库（从客户名称提取地域） =====
  const regionKeywords = ['上海', '东莞', '北京', '南通', '宁波', '唐山', '四川', '天津', '安康', '山东', '华东', '十堰'];
  const warehouses = new Map();
  rows.forEach(r => {
    if (r[4]) {
      for (const kw of regionKeywords) {
        if (r[4].includes(kw)) {
          if (!warehouses.has(kw)) {
            warehouses.set(kw, { name: kw + '仓库', code: kw.toLowerCase(), address: kw, status: 'active' });
          }
          break;
        }
      }
    }
  });
  warehouses.set('默认', { name: '默认仓库', code: 'default', address: '', status: 'active' });
  console.log(`\n仓库 (${warehouses.size}个):`, [...warehouses.values()].map(w => w.name));

  await Warehouse.deleteMany({});
  for (const w of warehouses.values()) {
    await Warehouse.create(w);
  }
  console.log(`✓ 仓库已导入 ${warehouses.size} 条`);

  // ===== 4. 商品 =====
  const products = new Map();
  rows.forEach(r => {
    if (r[5]) {
      const name = r[5];
      if (!products.has(name)) {
        products.set(name, { productName: name, costPrice: parseFloat(r[7]) || 0 });
      }
    }
  });
  console.log(`\n商品 (${products.size}个):`);
  [...products.keys()].slice(0, 5).forEach(p => console.log(`  - ${p}`));
  console.log('  ...');

  await Product.deleteMany({});
  for (const p of products.values()) {
    await Product.create(p);
  }
  console.log(`✓ 商品已导入 ${products.size} 条`);

  // ===== 5. 销售合同 =====
  await SalesContract.deleteMany({});
  let count = 0;
  for (const r of rows) {
    if (!r[3]) continue;
    await SalesContract.create({
      anfeiContractNo: r[0] || '',
      salesperson: r[1] || '',
      orderChannel: r[2] || '',
      contractNo: r[3] || '',
      customerName: r[4] || '',
      productName: r[5] || '',
      quantity: parseFloat(r[6]) || 0,
      unitPrice: parseFloat(r[7]) || 0,
      totalAmount: parseFloat(r[8]) || 0,
      orderDate: parseDate(r[9]),
      contractTotalAmount: parseFloat(r[10]) || 0,
      rebateOrCommission: r[11] !== '' ? r[11] : '',
      actualContractAmount: parseFloat(r[12]) || 0,
      settlementMethod: r[13] || '',
      purchaseUnitPrice: parseFloat(r[14]) || 0,
      purchaseTotalPrice: parseFloat(r[15]) || 0,
      warrantyDueDate: parseDate(r[16]),
      isInvoiced: r[17] || '',
      invoiceDate: parseDate(r[18]),
      invoiceNo: r[19] || ''
    });
    count++;
  }
  console.log(`\n✓ 销售合同已导入 ${count} 条`);

  console.log('\n=== 数据初始化完成 ===');
  process.exit(0);
}

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  // Excel serial date number
  if (typeof val === 'number') {
    const epoch = new Date(1899, 11, 30);
    const ms = epoch.getTime() + val * 86400000;
    return new Date(ms);
  }
  return new Date(val);
}

main().catch(err => {
  console.error('初始化失败:', err);
  process.exit(1);
});
