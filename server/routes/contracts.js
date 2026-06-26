const router = require('express').Router();
const SalesContract = require('../models/SalesContract');
const ExcelJS = require('exceljs');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Excel 完整表头（60列，与模板完全一致）
const EXPORT_COLUMNS = [
  { key: 'month', label: '月份', type: 'calc' },
  { key: 'group', label: '分组', type: 'calc' },
  { key: 'salesperson', label: '销售人员' },
  { key: 'salespersonCopy', label: '销售人员 副本', type: 'calc' },
  { key: 'salespersonDept', label: '销售人员 副本.部门', type: 'calc' },
  { key: 'contractNo', label: '合同编号' },
  { key: 'contractAttachment', label: '合同成交附件' },
  { key: 'customerName', label: '客户名称' },
  { key: 'channel', label: '成交渠道' },
  { key: 'brand', label: '品牌' },
  { key: 'productCategory1', label: '产品一级类目' },
  { key: 'productCategory2', label: '产品二级类目' },
  { key: 'productModel', label: '产品型号' },
  { key: 'specification', label: '规格' },
  { key: 'specialRequirements', label: '特殊要求' },
  { key: 'quantity', label: '数量' },
  { key: 'unitPrice', label: '单价' },
  { key: 'totalAmount', label: '总金额' },
  { key: 'orderDate', label: '日期' },
  { key: 'contractTotalAmount', label: '合同总金额（元）' },
  { key: 'rebateOrCommission', label: '返款或佣金' },
  { key: 'deliveryProvince', label: '收货地区（省份）' },
  { key: 'actualContractAmount', label: '实际合同金额' },
  { key: 'quoteStatus', label: '报价情况' },
  { key: 'paymentDate1', label: '付款日期（1）' },
  { key: 'settlementMethod1', label: '结算方式（1）' },
  { key: 'paymentAmount1', label: '金额（1）' },
  { key: 'paymentDate2', label: '付款日期（2）' },
  { key: 'settlementMethod2', label: '结算方式（2）' },
  { key: 'paymentAmount2', label: '金额（2）' },
  { key: 'paymentDate3', label: '付款日期（3）' },
  { key: 'settlementMethod3', label: '结算方式（3）' },
  { key: 'paymentAmount3', label: '金额（3）' },
  { key: 'paymentDate4', label: '付款日期（4）' },
  { key: 'settlementMethod4', label: '结算方式（4）' },
  { key: 'paymentAmount4', label: '金额（4）' },
  { key: 'remainingAmount', label: '余款金额', type: 'calc' },
  { key: 'actualReceivedAmount', label: '实际到款金额' },
  { key: 'warrantyDueDate', label: '质保金到期时间' },
  { key: 'platform', label: '渠道平台' },
  { key: 'isInvoiced', label: '是否开票' },
  { key: 'invoiceDate', label: '开票日期' },
  { key: 'invoiceCompany', label: '发票公司抬头名称' },
  { key: 'invoiceNo', label: '发票号' },
  { key: 'purchaseUnitPrice', label: '进货单价' },
  { key: 'purchaseTotalPrice', label: '进货总价' },
  { key: 'purchaseContractNo', label: '采购合同编号' },
  { key: 'installationFee', label: '安装费' },
  { key: 'difference', label: '差异', type: 'calc' },
  { key: 'remarks', label: '备注说明' },
  { key: 'parentRecord', label: '父记录', type: 'calc' },
  { key: 'parentRecord2', label: '父记录 2', type: 'calc' },
  { key: 'priceRange', label: '单价区间段', type: 'calc' },
  { key: 'yearMonth', label: '年月', type: 'calc' },
  { key: 'quarter', label: '季度', type: 'calc' },
  { key: 'actualUnitPrice', label: '实际单价', type: 'calc' },
  { key: 'grossProfit', label: '毛利', type: 'calc' },
  { key: 'grossProfitRate', label: '毛利率', type: 'calc' },
  { key: 'platformFeeRate', label: '平台费率' },
  { key: 'platformFee', label: '平台费', type: 'calc' },
];

// 计算字段的值
function calcField(c, key) {
  const d = c.orderDate ? new Date(c.orderDate) : null;
  switch (key) {
    case 'month': return d ? `${d.getMonth() + 1}月` : '';
    case 'group': return 'YP';
    case 'salespersonCopy': return c.salesperson || '';
    case 'salespersonDept': return '深圳英鹏, 销售部';
    case 'remainingAmount': return (c.contractTotalAmount || 0) - (c.actualReceivedAmount || 0);
    case 'difference': return (c.totalAmount || 0) - (c.purchaseTotalPrice || 0) - (c.installationFee || 0);
    case 'parentRecord': return '';
    case 'parentRecord2': return '';
    case 'priceRange': {
      const p = c.unitPrice || 0;
      if (p === 0) return '';
      if (p < 100) return '100元以下';
      if (p < 500) return '100~500元';
      if (p < 1000) return '500~1000元';
      if (p < 5000) return '1000~5000元';
      return '5000元以上';
    }
    case 'yearMonth': return d ? `${String(d.getFullYear()).slice(2)}年${String(d.getMonth() + 1).padStart(2, '0')}月` : '';
    case 'quarter': {
      if (!d) return '';
      const m = d.getMonth();
      return m < 3 ? 'Q1' : m < 6 ? 'Q2' : m < 9 ? 'Q3' : 'Q4';
    }
    case 'actualUnitPrice': return c.unitPrice || 0;
    case 'grossProfit': return (c.totalAmount || 0) - (c.purchaseTotalPrice || 0) - (c.installationFee || 0);
    case 'grossProfitRate': {
      const profit = (c.totalAmount || 0) - (c.purchaseTotalPrice || 0) - (c.installationFee || 0);
      return c.totalAmount ? Math.round(profit / c.totalAmount * 100) + '%' : '';
    }
    case 'platformFee': return c.totalAmount ? (c.totalAmount * (c.platformFeeRate || 0) / 100).toFixed(2) : 0;
    default: return '';
  }
}

// 分页列表
router.get('/list', async (req, res) => {
  try {
    const { startDate, endDate, platform, salesperson, channel, page = 1, pageSize = 20 } = req.query;
    const filter = {};

    if (startDate && endDate) {
      filter.orderDate = { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') };
    }
    if (platform && platform !== 'all') {
      filter.platform = { $regex: platform, $options: 'i' };
    }
    if (salesperson) {
      filter.salesperson = salesperson;
    }
    if (channel) {
      filter.channel = { $regex: channel, $options: 'i' };
    }

    const total = await SalesContract.countDocuments(filter);
    const data = await SalesContract.find(filter)
      .sort({ orderDate: -1 })
      .skip((page - 1) * pageSize)
      .limit(parseInt(pageSize));

    res.json({ total, page: parseInt(page), pageSize: parseInt(pageSize), data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 新增合同
router.post('/', async (req, res) => {
  try {
    const doc = await SalesContract.create(req.body);
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 导入 Excel（必须放在 /:id 之前，否则会被参数路由拦截）
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传文件' });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const ws = workbook.worksheets[0];

    const rows = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const values = {};
      row.eachCell((cell, colNum) => {
        if (colNum <= EXPORT_COLUMNS.length) {
          values[EXPORT_COLUMNS[colNum - 1].key] = cell.value;
        }
      });
      if (!values.contractNo && !values.salesperson && !values.customerName) continue;

      const doc = {};
      EXPORT_COLUMNS.forEach(h => {
        if (h.type === 'calc') return;
        const val = values[h.key];
        if (val === undefined || val === null || val === '') return;

        if (h.key.includes('Date') || ['paymentDate1','paymentDate2','paymentDate3','paymentDate4','orderDate','invoiceDate','warrantyDueDate'].includes(h.key)) {
          if (val instanceof Date) doc[h.key] = val;
          else if (typeof val === 'string') {
            const d = new Date(val);
            if (!isNaN(d.getTime())) doc[h.key] = d;
          }
        } else if (['quantity','unitPrice','totalAmount','contractTotalAmount','actualContractAmount',
          'paymentAmount1','paymentAmount2','paymentAmount3','paymentAmount4',
          'actualReceivedAmount','purchaseUnitPrice','purchaseTotalPrice','installationFee','platformFeeRate'].includes(h.key)) {
          doc[h.key] = typeof val === 'number' ? val : parseFloat(String(val).replace(/[¥,]/g, '')) || 0;
        } else {
          doc[h.key] = String(val);
        }
      });

      rows.push(doc);
    }

    if (rows.length === 0) return res.status(400).json({ error: '未识别到有效数据' });

    // 按合同编号去重：已存在的更新，不存在的插入
    let inserted = 0, updated = 0, skipped = 0;
    for (const doc of rows) {
      if (!doc.contractNo) { skipped++; continue; }
      const existing = await SalesContract.findOne({ contractNo: doc.contractNo });
      if (existing) {
        await SalesContract.findByIdAndUpdate(existing._id, doc);
        updated++;
      } else {
        await SalesContract.create(doc);
        inserted++;
      }
    }

    console.log(`[import] 新增 ${inserted} 条, 更新 ${updated} 条, 跳过 ${skipped} 条`);
    res.json({ success: true, total: rows.length, inserted, updated, skipped });
  } catch (err) {
    console.error('[import] 错误:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 编辑合同
router.put('/:id', async (req, res) => {
  try {
    const doc = await SalesContract.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: '未找到' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 批量删除合同（必须放在 /:id 之前）
router.delete('/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请选择要删除的记录' });
    }
    const result = await SalesContract.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除单个合同
router.delete('/:id', async (req, res) => {
  try {
    const doc = await SalesContract.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: '未找到' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 导出 Excel（必须选择日期范围）
router.get('/export', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: '必须选择日期范围' });
    }

    const filter = {
      orderDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59')
      }
    };

    const contracts = await SalesContract.find(filter).sort({ orderDate: 1 });
    console.log(`[export] 找到 ${contracts.length} 条合同`);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('销售合同');

    // 表头（60列）
    worksheet.addRow(EXPORT_COLUMNS.map(h => h.label));
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    // 数据行
    contracts.forEach(c => {
      const row = EXPORT_COLUMNS.map(h => {
        if (h.type === 'calc') return calcField(c, h.key);
        const val = c[h.key];
        if (typeof val === 'number') return val;
        if (h.key.includes('Date') && val) return formatDate(val);
        return val ? String(val) : '';
      });
      worksheet.addRow(row);
    });

    // 列宽
    worksheet.columns = EXPORT_COLUMNS.map(() => ({ width: 14 }));
    worksheet.getColumn(6).width = 28;   // 合同编号
    worksheet.getColumn(8).width = 22;   // 客户名称
    worksheet.getColumn(13).width = 22;  // 产品型号
    worksheet.getColumn(43).width = 22;  // 发票抬头

    // 返回 Excel
    const buffer = await workbook.xlsx.writeBuffer();
    console.log(`[export] Excel生成成功, ${buffer.length} bytes`);
    const filename = `销售合同_${startDate}_${endDate}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(buffer);
  } catch (err) {
    console.error('[export] 错误:', err.message);
    res.status(500).json({ error: err.message });
  }
});

function formatDate(date) {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

module.exports = router;
