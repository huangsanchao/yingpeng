const mongoose = require('mongoose');

const salesContractSchema = new mongoose.Schema({
  // 基本信息
  salesperson: { type: String },                         // 3: 销售人员
  salespersonCopy: { type: String },                     // 4: 销售人员 副本
  salespersonDept: { type: String },                     // 5: 销售人员 副本.部门
  contractNo: { type: String, required: true, index: true }, // 6: 合同编号
  contractAttachment: { type: String },                  // 7: 合同成交附件
  customerName: { type: String },                        // 8: 客户名称
  channel: { type: String },                             // 9: 成交渠道
  brand: { type: String },                               // 10: 品牌
  productCategory1: { type: String },                    // 11: 产品一级类目
  productCategory2: { type: String },                    // 12: 产品二级类目
  productModel: { type: String },                        // 13: 产品型号
  specification: { type: String },                       // 14: 规格
  specialRequirements: { type: String },                 // 15: 特殊要求

  // 金额信息
  quantity: { type: Number, default: 0 },                // 16: 数量
  unitPrice: { type: Number, default: 0 },               // 17: 单价
  totalAmount: { type: Number, default: 0 },             // 18: 总金额
  orderDate: { type: Date, index: true },                // 19: 日期
  contractTotalAmount: { type: Number, default: 0 },     // 20: 合同总金额（元）
  rebateOrCommission: { type: String },                  // 21: 返款或佣金
  deliveryProvince: { type: String },                    // 22: 收货地区（省份）
  actualContractAmount: { type: Number, default: 0 },    // 23: 实际合同金额
  quoteStatus: { type: String },                         // 24: 报价情况

  // 分期付款（最多4期）
  paymentDate1: { type: Date }, settlementMethod1: { type: String }, paymentAmount1: { type: Number, default: 0 },
  paymentDate2: { type: Date }, settlementMethod2: { type: String }, paymentAmount2: { type: Number, default: 0 },
  paymentDate3: { type: Date }, settlementMethod3: { type: String }, paymentAmount3: { type: Number, default: 0 },
  paymentDate4: { type: Date }, settlementMethod4: { type: String }, paymentAmount4: { type: Number, default: 0 },

  // 余款 & 到款
  remainingAmount: { type: Number, default: 0 },         // 37: 余款金额
  actualReceivedAmount: { type: Number, default: 0 },    // 38: 实际到款金额
  warrantyDueDate: { type: Date },                       // 39: 质保金到期时间

  // 发票信息
  platform: { type: String },                            // 40: 渠道平台
  isInvoiced: { type: String },                          // 41: 是否开票
  invoiceDate: { type: Date },                           // 42: 开票日期
  invoiceCompany: { type: String },                      // 43: 发票公司抬头名称
  invoiceNo: { type: String },                           // 44: 发票号

  // 采购信息
  purchaseUnitPrice: { type: Number, default: 0 },       // 45: 进货单价
  purchaseTotalPrice: { type: Number, default: 0 },      // 46: 进货总价
  purchaseContractNo: { type: String },                  // 47: 采购合同编号
  installationFee: { type: Number, default: 0 },         // 48: 安装费

  // 备注
  remarks: { type: String },                             // 50: 备注说明

  // 平台费
  platformFeeRate: { type: Number, default: 0 },         // 59: 平台费率

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SalesContract', salesContractSchema);
