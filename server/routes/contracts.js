const router = require('express').Router();
const SalesContract = require('../models/SalesContract');
const ExcelJS = require('exceljs');

// 分页列表
router.get('/list', async (req, res) => {
  try {
    const { month, platform, salesperson, page = 1, pageSize = 20, startDate, endDate } = req.query;
    const filter = {};

    if (month) {
      const start = new Date(month + '-01');
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      filter.orderDate = { $gte: start, $lt: end };
    }
    if (startDate && endDate) {
      filter.orderDate = { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') };
    }
    if (platform && platform !== 'all') {
      filter.orderChannel = { $regex: platform, $options: 'i' };
    }
    if (salesperson) {
      filter.salesperson = salesperson;
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

// 编辑合同
router.put('/:id', async (req, res) => {
  try {
    const doc = await SalesContract.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除合同
router.delete('/:id', async (req, res) => {
  try {
    await SalesContract.findByIdAndDelete(req.params.id);
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

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('销售合同');

    // 表头
    const headers = [
      '安菲合同编号', '销售员', '下单渠道', '合同编号', '客户名称',
      '产品名称', '数量', '单价', '总金额', '日期',
      '合同总金额（元）', '反款或佣金', '实际合同金额', '结算方式',
      '进货单价', '进货总价', '质保金到期时间', '是否开票', '开票日期', '发票号'
    ];
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 数据行
    contracts.forEach(c => {
      worksheet.addRow([
        c.anfeiContractNo || '',
        c.salesperson || '',
        c.orderChannel || '',
        c.contractNo || '',
        c.customerName || '',
        c.productName || '',
        c.quantity || 0,
        c.unitPrice || 0,
        c.totalAmount || 0,
        c.orderDate ? formatDate(c.orderDate) : '',
        c.contractTotalAmount || 0,
        c.rebateOrCommission || '',
        c.actualContractAmount || 0,
        c.settlementMethod || '',
        c.purchaseUnitPrice || 0,
        c.purchaseTotalPrice || 0,
        c.warrantyDueDate ? formatDate(c.warrantyDueDate) : '',
        c.isInvoiced || '',
        c.invoiceDate ? formatDate(c.invoiceDate) : '',
        c.invoiceNo || ''
      ]);
    });

    // 列宽
    worksheet.columns = [
      { width: 20 }, { width: 12 }, { width: 14 }, { width: 25 }, { width: 25 },
      { width: 40 }, { width: 8 }, { width: 10 }, { width: 12 }, { width: 12 },
      { width: 15 }, { width: 14 }, { width: 15 }, { width: 12 },
      { width: 10 }, { width: 12 }, { width: 15 }, { width: 10 }, { width: 12 }, { width: 15 }
    ];

    // 返回 Excel
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=销售合同_${startDate}_${endDate}.xlsx`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function formatDate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

module.exports = router;
