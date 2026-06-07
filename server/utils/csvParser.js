const fs = require('fs');
const iconv = require('iconv-lite');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const PlatformOrder = require('../models/PlatformOrder');
const PlatformExpense = require('../models/PlatformExpense');
const ImportRecord = require('../models/ImportRecord');
const path = require('path');

function parseMonth(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.getFullYear().toString() + String(d.getMonth() + 1).padStart(2, '0');
}

function cleanVal(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v);
}

function safeDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function parseTmallXlsx(filePath) {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  return rows.map(row => {
    const orderNo = cleanVal(row['订单号']);
    if (!orderNo) return null;
    return {
      orderNo,
      subOrderNo: cleanVal(row['子订单号']),
      orderTime: row['下单时间'] ? new Date(row['下单时间']) : null,
      confirmTime: row['确认收货时间'] ? new Date(row['确认收货时间']) : null,
      productId: cleanVal(row['商品ID']),
      sku: cleanVal(row['sku']),
      productName: cleanVal(row['商品名称']),
      quantity: parseFloat(row['数量'] || 0),
      unitPrice: parseFloat(row['单价（元）'] || 0),
      actualAmount: parseFloat(row['订单实际金额（元）'] || 0),
      refundNo: cleanVal(row['退款单号']),
      refundAmount: parseFloat(row['退款金额（元）'] || 0),
      paymentChannel: cleanVal(row['收/付渠道']),
      paymentFlowNo: cleanVal(row['业务流水号']),
      paymentTime: row['打款时间'] ? new Date(row['打款时间']) : null,
      monthPeriod: parseMonth(cleanVal(row['账期']) || cleanVal(row['确认收货时间'])),
      businessCategory: cleanVal(row['业务大类']),
      subCategory: cleanVal(row['业务小类'])
    };
  }).filter(r => r !== null);
}

function parseJdXlsx(filePath) {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  return rows.map(row => {
    const orderNo = cleanVal(row['订单编号']).replace(/^="|"$/g, '');
    if (!orderNo) return null;
    return {
      orderNo,
      documentNo: cleanVal(row['单据编号']).replace(/^="|"$/g, ''),
      documentType: cleanVal(row['单据类型']),
      productId: cleanVal(row['商品编号']),
      productName: cleanVal(row['商品名称']),
      expenseItem: cleanVal(row['费用项']),
      amount: parseFloat(row['金额'] || 0),
      currency: cleanVal(row['币种']),
      direction: cleanVal(row['商家应收/应付'] || row['收支方向'] || ''),
      occurrenceTime: row['费用发生时间'] ? new Date(row['费用发生时间']) : null,
      settlementTime: row['费用结算时间'] ? new Date(row['费用结算时间']) : null,
      shopId: cleanVal(row['店铺号']),
      remark: cleanVal(row['备注']),
      monthPeriod: parseMonth(cleanVal(row['账单日期']) || cleanVal(row['费用结算时间'])),
      quantity: parseFloat(row['商品数量'] || 0)
    };
  }).filter(r => r !== null);
}

function detectCsvSeparator(buffer) {
  const firstLine = buffer.toString('binary').split('\n')[0];
  if (firstLine.includes('\t')) return '\t';
  if (firstLine.includes(';')) return ';';
  return ',';
}

function parseTmallCsv(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    const buffer = fs.readFileSync(filePath);
    const decoded = iconv.decode(buffer, 'gbk');
    fs.writeFileSync(filePath + '.utf8.csv', decoded, 'utf8');

    const separator = detectCsvSeparator(buffer);
    fs.createReadStream(filePath + '.utf8.csv')
      .pipe(csv({ separator, skipLines: 0 }))
      .on('data', (row) => {
        const orderNo = (row['订单号'] || '').trim();
        if (!orderNo) return;
        results.push({
          orderNo,
          subOrderNo: (row['子订单号'] || '').trim(),
          orderTime: row['下单时间'] ? new Date(row['下单时间'].trim()) : null,
          confirmTime: row['确认收货时间'] ? new Date(row['确认收货时间'].trim()) : null,
          productId: (row['商品ID'] || '').trim(),
          sku: (row['sku'] || '').trim(),
          productName: (row['商品名称'] || '').trim(),
          quantity: parseFloat(row['数量'] || 0),
          unitPrice: parseFloat(row['单价（元）'] || 0),
          actualAmount: parseFloat(row['订单实际金额（元）'] || 0),
          refundNo: (row['退款单号'] || '').trim(),
          refundAmount: parseFloat(row['退款金额（元）'] || 0),
          paymentChannel: (row['收/付渠道'] || '').trim(),
          paymentFlowNo: (row['业务流水号'] || '').trim(),
          paymentTime: row['打款时间'] ? new Date(row['打款时间'].trim()) : null,
          monthPeriod: parseMonth(row['账期'] || row['确认收货时间']),
          businessCategory: (row['业务大类'] || '').trim(),
          subCategory: (row['业务小类'] || '').trim()
        });
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

function parseJdCsv(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    const buffer = fs.readFileSync(filePath);
    const decoded = iconv.decode(buffer, 'gbk');
    fs.writeFileSync(filePath + '.utf8.csv', decoded, 'utf8');

    fs.createReadStream(filePath + '.utf8.csv')
      .pipe(csv({ separator: ',' }))
      .on('data', (row) => {
        const orderNo = (row['订单编号'] || '').replace(/^="|"$/g, '').trim();
        if (!orderNo) return;
        results.push({
          orderNo,
          documentNo: (row['单据编号'] || '').replace(/^="|"$/g, '').trim(),
          documentType: (row['单据类型'] || '').trim(),
          productId: (row['商品编号'] || '').trim(),
          productName: (row['商品名称'] || '').trim(),
          expenseItem: (row['费用项'] || '').trim(),
          amount: parseFloat(row['金额'] || 0),
          currency: (row['币种'] || '').trim(),
          direction: (row['商家应收/应付'] || row['收支方向'] || '').trim(),
          occurrenceTime: row['费用发生时间'] ? new Date(row['费用发生时间'].trim()) : null,
          settlementTime: row['费用结算时间'] ? new Date(row['费用结算时间'].trim()) : null,
          shopId: (row['店铺号'] || '').trim(),
          remark: (row['备注'] || '').trim(),
          monthPeriod: parseMonth(row['账单日期'] || row['费用结算时间']),
          quantity: parseFloat(row['商品数量'] || 0)
        });
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function categorizeJdExpense(item, direction) {
  if (!item) return '其他费用';
  const map = {
    '佣金': '平台佣金',
    '交易服务费': '平台佣金',
    '商品保险服务费': '保险费用',
    '运费保险服务费': '保险费用',
    '随单送的京豆': '其他费用',
    '综合违约金': '违约金',
    '货款': '销售收入'
  };
  return map[item] || '其他费用';
}

async function importTmallFile(filePath, uploadedBy) {
  const ext = path.extname(filePath).toLowerCase();
  const rows = ext === '.xlsx' || ext === '.xls' ? parseTmallXlsx(filePath) : await parseTmallCsv(filePath);
  const docs = rows.map(r => ({
    ...r,
    platform: 'tmall'
  }));
  if (docs.length) {
    await PlatformOrder.insertMany(docs, { ordered: false }).catch(() => {
      for (const doc of docs) {
        PlatformOrder.findOneAndUpdate(
          { platform: 'tmall', orderNo: doc.orderNo, monthPeriod: doc.monthPeriod },
          doc,
          { upsert: true }
        ).exec();
      }
    });
  }
  await ImportRecord.create({
    fileName: path.basename(filePath),
    fileType: 'sales',
    platform: 'tmall',
    totalRows: rows.length,
    validRows: rows.length,
    importedBy: uploadedBy
  });
  return { total: rows.length, platform: 'tmall' };
}

async function importJdFile(filePath, uploadedBy) {
  const ext = path.extname(filePath).toLowerCase();
  const rows = ext === '.xlsx' || ext === '.xls' ? parseJdXlsx(filePath) : await parseJdCsv(filePath);
  const orders = [];
  const expenses = [];

  for (const r of rows) {
    const category = await categorizeJdExpense(r.expenseItem, r.direction);
    const expenseDoc = {
      platform: 'jd',
      orderNo: r.orderNo,
      documentNo: r.documentNo,
      documentType: r.documentType,
      productId: r.productId,
      productName: r.productName,
      expenseItem: r.expenseItem,
      expenseCategory: category,
      amount: r.amount,
      currency: r.currency,
      direction: r.direction,
      occurrenceTime: r.occurrenceTime,
      settlementTime: r.settlementTime,
      shopId: r.shopId,
      remark: r.remark,
      monthPeriod: r.monthPeriod,
      quantity: r.quantity
    };
    expenses.push(expenseDoc);

    if (category === '销售收入' && r.amount > 0) {
      orders.push({
        platform: 'jd',
        orderNo: r.orderNo,
        productId: r.productId,
        productName: r.productName,
        actualAmount: r.amount,
        orderTime: r.occurrenceTime,
        confirmTime: r.settlementTime,
        monthPeriod: r.monthPeriod,
        quantity: r.quantity,
        businessCategory: '交易货款'
      });
    }
  }

  if (expenses.length) {
    for (const doc of expenses) {
      await PlatformExpense.findOneAndUpdate(
        { platform: 'jd', documentNo: doc.documentNo, expenseItem: doc.expenseItem },
        doc,
        { upsert: true }
      );
    }
  }
  if (orders.length) {
    for (const doc of orders) {
      await PlatformOrder.findOneAndUpdate(
        { platform: 'jd', orderNo: doc.orderNo },
        doc,
        { upsert: true }
      );
    }
  }

  await ImportRecord.create({
    fileName: require('path').basename(filePath),
    fileType: 'expense',
    platform: 'jd',
    totalRows: rows.length,
    validRows: rows.length,
    importedBy: uploadedBy
  });
  return { total: rows.length, platform: 'jd' };
}

function parsePaymentDetail(raw) {
  const result = { method: '', flowNo: '', amount: 0 };
  if (!raw || typeof raw !== 'string') return result;
  const m1 = raw.match(/支付方式[：:](.+?)[，,]/);
  if (m1) result.method = m1[1].trim();
  const m2 = raw.match(/支付单号[：:](.+?)[，,]/);
  if (m2) result.flowNo = m2[1].trim();
  const m3 = raw.match(/金额[：:](.+?)[；;]/);
  if (m3) result.amount = parseFloat(m3[1].trim()) || 0;
  return result;
}

function classifySettlement(row) {
  const status = cleanVal(row['订单状态']);
  const confirmTime = cleanVal(row['确认收货时间']);
  const actualPay = parseFloat(row['买家实付金额'] || 0);
  const serviceFee = parseFloat(row['卖家服务费'] || 0);

  if (serviceFee > 0) return 'expense';
  if (status.includes('退款') || status.includes('交易关闭') || status.includes('已取消') || actualPay === 0) return 'refunded';
  if (confirmTime || status.includes('交易成功')) return 'settled';
  return 'pending';
}

function parseOrderXlsx(filePath) {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  return rows.map(row => {
    const orderNo = cleanVal(row['订单编号']);
    if (!orderNo) return null;
    const pay = parsePaymentDetail(row['支付详情']);
    const status = cleanVal(row['订单状态']);

    return {
      orderNo,
      totalAmount: parseFloat(row['总金额'] || 0),
      actualPayment: parseFloat(row['买家实付金额'] || 0),
      sellerServiceFee: parseFloat(row['卖家服务费'] || 0),
      orderStatus: status,
      paymentMethod: pay.method,
      paymentFlowNo: pay.flowNo,
      logisticsNo: cleanVal(row['物流单号']),
      logisticsCompany: cleanVal(row['物流公司']),
      productName: cleanVal(row['商品标题']),
      orderTime: row['订单付款时间'] ? new Date(row['订单付款时间']) : null,
      shipTime: row['发货时间'] ? new Date(row['发货时间']) : null,
      confirmTime: row['确认收货时间'] ? new Date(row['确认收货时间']) : null,
      shopName: cleanVal(row['店铺名称'])
    };
  }).filter(r => r !== null);
}

async function importOrderFile(filePath, uploadedBy) {
  const rows = parseOrderXlsx(filePath);

  for (const r of rows) {
    const existing = await require('../models/SettlementRecord').findOne({ orderNo: r.orderNo });
    if (!existing) {
      await require('../models/SettlementRecord').create({ ...r, platform: 'tmall' });
    } else {
      Object.assign(existing, r);
      await existing.save();
    }
  }

  await ImportRecord.create({
    fileName: path.basename(filePath),
    fileType: 'order',
    platform: 'tmall',
    totalRows: rows.length,
    validRows: rows.length,
    importedBy: uploadedBy || 'system'
  });

  return { total: rows.length };
}

// Legacy alias
function parseSettlementXlsx(filePath) { return parseOrderXlsx(filePath); }
async function matchSettlement(rows, platform) {
  const result = await importOrderFileForMatch(rows, platform);
  return result;
}

async function importOrderFileForMatch(rows, platform) {
  const SettlementRecord = require('../models/SettlementRecord');
  const stats = { settled: 0, pending: 0, refunded: 0, expense: 0 };
  const orders = rows;

  for (const r of orders) {
    const existing = await SettlementRecord.findOne({ orderNo: r.orderNo });
    if (!existing) {
      await SettlementRecord.create({ ...r, platform });
    } else {
      Object.assign(existing, r);
      await existing.save();
    }
  }

  // Now check against billing (PlatformOrder) to determine settlement status
  const PlatformOrder = require('../models/PlatformOrder');
  const billingNos = new Set((await PlatformOrder.find({ platform }).distinct('orderNo')));

  for (const r of orders) {
    const isSettled = billingNos.has(r.orderNo);
    if (isSettled) stats.settled++;
    else stats.pending++;
    // Update the record with correct match status
    const rec = await SettlementRecord.findOne({ orderNo: r.orderNo });
    if (rec) {
      rec.matchStatus = isSettled ? 'settled' : 'pending';
      await rec.save();
    }
  }

  return { records: orders, stats };
}

// Parse 支付宝到账明细 XLS (header on row 3, meta on rows 1-2)
function parseAlipaySettlementXlsx(filePath) {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });

  // Find the header row (contains '序号', '商户订单号', etc.)
  let headerIdx = -1;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i][0] === '序号' && raw[i][4] === '商户订单号') {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return [];

  const headers = raw[headerIdx];
  const rows = [];
  for (let i = headerIdx + 1; i < raw.length; i++) {
    const r = raw[i];
    const orderNo = cleanVal(r[4]); // 商户订单号
    if (!orderNo || orderNo.startsWith('#')) continue; // skip meta rows

    rows.push({
      orderNo,
      alipayTradeNo: cleanVal(r[5]),       // 支付宝交易号
      productName: cleanVal(r[3]),          // 商品名称
      orderAmount: parseFloat(r[8] || 0),   // 订单金额
      refundAmount: parseFloat(r[9] || 0),  // 退款金额
      serviceFee: parseFloat(r[10] || 0),   // 服务费
      actualReceived: parseFloat(r[13] || 0), // 商家实收
      tradeStatus: cleanVal(r[11]),         // 交易状态
      tradeCategory: cleanVal(r[17]),       // 交易分类
      tradeMethod: cleanVal(r[18]),         // 交易方式
      createTime: safeDate(r[1]),
      payTime: safeDate(r[2])
    });
  }
  return rows;
}

module.exports = {
  importTmallFile,
  importJdFile,
  importOrderFile,
  parseTmallCsv,
  parseJdCsv,
  parseTmallXlsx,
  parseJdXlsx,
  parseOrderXlsx,
  parseSettlementXlsx,
  matchSettlement,
  parseAlipaySettlementXlsx
};
