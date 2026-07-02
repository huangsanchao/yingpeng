const mongoose = require('mongoose');

const platformOrderSchema = new mongoose.Schema({
  platform: { type: String, default: 'tmall', index: true },     // 平台（默认天猫）
  accountPeriod: { type: String },                                // 账期
  billCategory: { type: String },                                 // 账单大类
  businessCategory: { type: String },                             // 业务大类
  subCategory: { type: String },                                  // 业务小类
  orderNo: { type: String, index: true },                         // 订单号
  subOrderNo: { type: String },                                   // 子订单号
  merchantOrderNo: { type: String },                              // 商户订单号
  productId: { type: String },                                    // 商品ID
  sku: { type: String },                                          // sku
  productName: { type: String },                                  // 商品名称
  quantity: { type: Number, default: 0 },                         // 数量
  unitPrice: { type: Number, default: 0 },                        // 单价（元）
  actualAmount: { type: Number, default: 0 },                     // 订单实际金额（元）
  refundNo: { type: String },                                     // 退款单号
  refundAmount: { type: Number, default: 0 },                     // 退款金额（元）
  paymentChannel: { type: String },                               // 收/付渠道
  paymentFlowNo: { type: String },                                // 业务流水号
  paymentTime: { type: Date },                                    // 打款时间
  paymentUpdateTime: { type: Date },                              // 打款更新时间
  orderTime: { type: Date },                                      // 下单时间
  confirmTime: { type: Date },                                    // 确认收货时间
  remarks: { type: String },                                      // 备注
  monthPeriod: { type: String, index: true },                     // 月份（用于筛选）
  isBrushOrder: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PlatformOrder', platformOrderSchema);
