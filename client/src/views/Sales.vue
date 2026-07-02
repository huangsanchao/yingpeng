<template>
  <div class="page">
    <!-- 筛选栏 -->
    <div class="toolbar">
      <div class="filter-bar">
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
          start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD"
          style="width:240px" />
        <el-input v-model="contractNo" placeholder="合同编号" style="width:180px;margin-left:10px" clearable />
        <el-select v-model="salesperson" clearable filterable placeholder="销售员" style="width:130px;margin-left:10px">
          <el-option v-for="s in salespeopleList" :key="s.name" :label="s.name" :value="s.name" />
        </el-select>
        <el-select v-model="platform" clearable filterable placeholder="渠道平台" style="width:130px;margin-left:10px">
          <el-option label="全部" value="" />
          <el-option v-for="p in platformsList" :key="p.name" :label="p.name" :value="p.name" />
        </el-select>
        <el-select v-model="matchStatus" placeholder="到账状态" style="width:120px;margin-left:10px" clearable>
          <el-option label="已到账" value="settled" />
          <el-option label="未到账" value="pending" />
        </el-select>
        <el-button type="primary" style="margin-left:10px" @click="loadData">搜索</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </div>
      <div class="btn-bar">
        <el-button type="primary" @click="openAdd">
          <el-icon style="margin-right:4px"><Plus /></el-icon>新增合同
        </el-button>
        <el-button type="warning" @click="showImport = true">
          <el-icon style="margin-right:4px"><Upload /></el-icon>导入Excel
        </el-button>
        <el-button type="danger" :disabled="!selectedIds.length" @click="batchDelete">
          <el-icon style="margin-right:4px"><Delete /></el-icon>批量删除({{ selectedIds.length }})
        </el-button>
        <el-button type="success" @click="doExport">
          <el-icon style="margin-right:4px"><Download /></el-icon>导出Excel
        </el-button>
      </div>
    </div>

    <!-- 到账统计 KPI -->
    <el-row :gutter="16" class="kpi-row">
      <el-col :span="8"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">已到账</div><div class="kpi-value" style="color:#67c23a">{{ stats.settled }} 笔 / ¥{{ fmt(stats.settledAmount) }}</div></div></el-card></el-col>
      <el-col :span="8"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">未到账</div><div class="kpi-value" style="color:#f56c6c">{{ stats.pending }} 笔</div></div></el-card></el-col>
      <el-col :span="8"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">合计</div><div class="kpi-value" style="color:#409eff">{{ stats.total }} 笔</div></div></el-card></el-col>
    </el-row>

    <!-- 合同表格 -->
    <el-card shadow="hover" class="table-card">
      <el-table :data="contracts" stripe v-loading="loading" @selection-change="onSelect" height="calc(100vh - 300px)">
        <el-table-column type="selection" width="45" fixed="left" />
        <el-table-column label="到账" width="70" fixed="left">
          <template #default="{ row }">
            <el-tag :type="row.matchStatus==='settled'?'success':'danger'" size="small">{{ row.matchStatus==='settled'?'已到':'未到' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="salesperson" label="销售人员" width="100" />
        <el-table-column label="合同编号" width="280" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.contractNo }}</span>
            <el-icon style="margin-left:6px;cursor:pointer;color:#409eff" @click="copyText(row.contractNo)"><CopyDocument /></el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="customerName" label="客户名称" width="150" show-overflow-tooltip />
        <el-table-column prop="channel" label="成交渠道" width="100" />
        <el-table-column prop="brand" label="品牌" width="80" />
        <el-table-column prop="productCategory1" label="一级类目" width="110" show-overflow-tooltip />
        <el-table-column prop="productCategory2" label="二级类目" width="110" show-overflow-tooltip />
        <el-table-column prop="productModel" label="产品型号" width="150" show-overflow-tooltip />
        <el-table-column prop="specification" label="规格" width="100" />
        <el-table-column prop="quantity" label="数量" width="60" align="right" />
        <el-table-column label="单价" width="90" align="right"><template #default="{ row }">{{ money(row.unitPrice) }}</template></el-table-column>
        <el-table-column label="总金额" width="100" align="right"><template #default="{ row }">{{ money(row.totalAmount) }}</template></el-table-column>
        <el-table-column label="日期" width="110"><template #default="{ row }">{{ d(row.orderDate) }}</template></el-table-column>
        <el-table-column label="合同总金额" width="110" align="right"><template #default="{ row }">{{ money(row.contractTotalAmount) }}</template></el-table-column>
        <el-table-column prop="rebateOrCommission" label="返款/佣金" width="100" show-overflow-tooltip />
        <el-table-column prop="deliveryProvince" label="收货省份" width="90" />
        <el-table-column label="实际金额" width="100" align="right"><template #default="{ row }">{{ money(row.actualContractAmount) }}</template></el-table-column>
        <el-table-column prop="quoteStatus" label="报价情况" width="90" />
        <el-table-column label="付款1" width="95"><template #default="{ row }">{{ d(row.paymentDate1) }}</template></el-table-column>
        <el-table-column prop="settlementMethod1" label="结算1" width="90" />
        <el-table-column label="金额1" width="85" align="right"><template #default="{ row }">{{ money(row.paymentAmount1) }}</template></el-table-column>
        <el-table-column label="付款2" width="95"><template #default="{ row }">{{ d(row.paymentDate2) }}</template></el-table-column>
        <el-table-column prop="settlementMethod2" label="结算2" width="90" />
        <el-table-column label="金额2" width="85" align="right"><template #default="{ row }">{{ money(row.paymentAmount2) }}</template></el-table-column>
        <el-table-column label="付款3" width="95"><template #default="{ row }">{{ d(row.paymentDate3) }}</template></el-table-column>
        <el-table-column prop="settlementMethod3" label="结算3" width="90" />
        <el-table-column label="金额3" width="85" align="right"><template #default="{ row }">{{ money(row.paymentAmount3) }}</template></el-table-column>
        <el-table-column label="付款4" width="95"><template #default="{ row }">{{ d(row.paymentDate4) }}</template></el-table-column>
        <el-table-column prop="settlementMethod4" label="结算4" width="90" />
        <el-table-column label="金额4" width="85" align="right"><template #default="{ row }">{{ money(row.paymentAmount4) }}</template></el-table-column>
        <el-table-column label="余款" width="85" align="right"><template #default="{ row }">{{ money((row.contractTotalAmount||0)-(row.actualReceivedAmount||0)) }}</template></el-table-column>
        <el-table-column label="实际到款" width="95" align="right"><template #default="{ row }">{{ money(row.actualReceivedAmount) }}</template></el-table-column>
        <el-table-column label="质保金到期" width="105"><template #default="{ row }">{{ d(row.warrantyDueDate) }}</template></el-table-column>
        <el-table-column prop="platform" label="渠道平台" width="90" />
        <el-table-column prop="isInvoiced" label="是否开票" width="85" />
        <el-table-column label="开票日期" width="105"><template #default="{ row }">{{ d(row.invoiceDate) }}</template></el-table-column>
        <el-table-column prop="invoiceCompany" label="发票抬头" width="140" show-overflow-tooltip />
        <el-table-column prop="invoiceNo" label="发票号" width="120" />
        <el-table-column label="进货单价" width="85" align="right"><template #default="{ row }">{{ money(row.purchaseUnitPrice) }}</template></el-table-column>
        <el-table-column label="进货总价" width="95" align="right"><template #default="{ row }">{{ money(row.purchaseTotalPrice) }}</template></el-table-column>
        <el-table-column prop="purchaseContractNo" label="采购合同编号" width="130" show-overflow-tooltip />
        <el-table-column label="安装费" width="85" align="right"><template #default="{ row }">{{ money(row.installationFee) }}</template></el-table-column>
        <el-table-column label="差异" width="85" align="right"><template #default="{ row }">{{ money((row.totalAmount||0)-(row.purchaseTotalPrice||0)-(row.installationFee||0)) }}</template></el-table-column>
        <el-table-column prop="remarks" label="备注" width="140" show-overflow-tooltip />
        <el-table-column label="单价区间" width="95"><template #default="{ row }">{{ priceRange(row.unitPrice) }}</template></el-table-column>
        <el-table-column label="年月" width="95"><template #default="{ row }">{{ ym(row.orderDate) }}</template></el-table-column>
        <el-table-column label="季度" width="65"><template #default="{ row }">{{ qt(row.orderDate) }}</template></el-table-column>
        <el-table-column label="毛利" width="85" align="right"><template #default="{ row }">{{ money((row.totalAmount||0)-(row.purchaseTotalPrice||0)-(row.installationFee||0)) }}</template></el-table-column>
        <el-table-column label="毛利率" width="75"><template #default="{ row }">{{ row.totalAmount ? Math.round(((row.totalAmount-row.purchaseTotalPrice-row.installationFee)/row.totalAmount)*100)+'%' : '-' }}</template></el-table-column>
        <el-table-column label="平台费率%" width="85" align="right"><template #default="{ row }">{{ (row.platformFeeRate||0).toFixed(1) }}</template></el-table-column>
        <el-table-column label="平台费" width="85" align="right"><template #default="{ row }">{{ money((row.totalAmount||0)*(row.platformFeeRate||0)/100) }}</template></el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openDetail(row)">详情</el-button>
            <el-button type="warning" link size="small" @click="openEdit(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="delOne(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize"
          :page-sizes="[10,20,50,100]" :total="total"
          layout="total, sizes, prev, pager, next"
          @current-change="loadList" @size-change="loadList" />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="showForm" :title="formMode==='add'?'新增销售合同':'编辑销售合同'" width="1050px" :close-on-click-modal="false" destroy-on-close>
      <el-form :model="form" label-width="120px" ref="formRef">
        <el-divider content-position="left">基本信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="8"><el-form-item label="合同编号" required><el-input v-model="form.contractNo" placeholder="合同编号" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="销售人员">
            <el-select v-model="form.salesperson" filterable clearable placeholder="选择" style="width:100%">
              <el-option v-for="s in salespeopleList" :key="s.name" :label="s.name" :value="s.name" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="8"><el-form-item label="成交渠道">
            <el-select v-model="form.channel" filterable clearable placeholder="选择" style="width:100%">
              <el-option v-for="p in platformsList" :key="p.name" :label="p.name" :value="p.name" />
            </el-select>
          </el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8"><el-form-item label="客户名称"><el-input v-model="form.customerName" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="品牌"><el-input v-model="form.brand" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="收货省份"><el-input v-model="form.deliveryProvince" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8"><el-form-item label="一级类目"><el-input v-model="form.productCategory1" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="二级类目"><el-input v-model="form.productCategory2" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="产品型号">
            <el-select v-model="form.productModel" filterable clearable placeholder="选择" style="width:100%">
              <el-option v-for="p in productsList" :key="p.productModel||p.sku||p.productName" :label="p.productModel||p.sku||p.productName" :value="p.productModel||p.sku||p.productName" />
            </el-select>
          </el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8"><el-form-item label="规格"><el-input v-model="form.specification" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="报价情况"><el-input v-model="form.quoteStatus" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="特殊要求"><el-input v-model="form.specialRequirements" /></el-form-item></el-col>
        </el-row>

        <el-divider content-position="left">金额</el-divider>
        <el-row :gutter="20">
          <el-col :span="6"><el-form-item label="数量"><el-input-number v-model="form.quantity" :min="0" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="单价"><el-input-number v-model="form.unitPrice" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="总金额"><el-input-number v-model="form.totalAmount" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="日期"><el-date-picker v-model="form.orderDate" type="date" style="width:100%" value-format="YYYY-MM-DD" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8"><el-form-item label="合同总金额"><el-input-number v-model="form.contractTotalAmount" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="实际金额"><el-input-number v-model="form.actualContractAmount" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="返款/佣金"><el-input v-model="form.rebateOrCommission" /></el-form-item></el-col>
        </el-row>

        <el-divider content-position="left">分期付款</el-divider>
        <el-row :gutter="16">
          <el-col :span="6"><el-form-item label="付款日期1"><el-date-picker v-model="form.paymentDate1" type="date" style="width:100%" value-format="YYYY-MM-DD" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="结算1"><el-input v-model="form.settlementMethod1" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="金额1"><el-input-number v-model="form.paymentAmount1" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="到款金额"><el-input-number v-model="form.actualReceivedAmount" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="6"><el-form-item label="付款日期2"><el-date-picker v-model="form.paymentDate2" type="date" style="width:100%" value-format="YYYY-MM-DD" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="结算2"><el-input v-model="form.settlementMethod2" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="金额2"><el-input-number v-model="form.paymentAmount2" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="6"><el-form-item label="付款日期3"><el-date-picker v-model="form.paymentDate3" type="date" style="width:100%" value-format="YYYY-MM-DD" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="结算3"><el-input v-model="form.settlementMethod3" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="金额3"><el-input-number v-model="form.paymentAmount3" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="6"><el-form-item label="付款日期4"><el-date-picker v-model="form.paymentDate4" type="date" style="width:100%" value-format="YYYY-MM-DD" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="结算4"><el-input v-model="form.settlementMethod4" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="金额4"><el-input-number v-model="form.paymentAmount4" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="质保金到期"><el-date-picker v-model="form.warrantyDueDate" type="date" style="width:100%" value-format="YYYY-MM-DD" /></el-form-item></el-col>
        </el-row>

        <el-divider content-position="left">发票 & 采购</el-divider>
        <el-row :gutter="20">
          <el-col :span="6"><el-form-item label="渠道平台">
            <el-select v-model="form.platform" filterable clearable placeholder="选择" style="width:100%">
              <el-option v-for="p in platformsList" :key="p.name" :label="p.name" :value="p.name" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="6"><el-form-item label="是否开票">
            <el-select v-model="form.isInvoiced" style="width:100%"><el-option label="是" value="是" /><el-option label="否" value="否" /></el-select>
          </el-form-item></el-col>
          <el-col :span="6"><el-form-item label="开票日期"><el-date-picker v-model="form.invoiceDate" type="date" style="width:100%" value-format="YYYY-MM-DD" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="发票号"><el-input v-model="form.invoiceNo" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="发票抬头"><el-input v-model="form.invoiceCompany" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="采购合同编号"><el-input v-model="form.purchaseContractNo" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="6"><el-form-item label="进货单价"><el-input-number v-model="form.purchaseUnitPrice" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="进货总价"><el-input-number v-model="form.purchaseTotalPrice" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="安装费"><el-input-number v-model="form.installationFee" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="平台费率%"><el-input-number v-model="form.platformFeeRate" :min="0" :precision="1" style="width:100%" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24"><el-form-item label="备注"><el-input v-model="form.remarks" type="textarea" :rows="2" /></el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="showForm=false">取消</el-button>
        <el-button type="primary" @click="saveForm" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog v-model="showDetail" title="合同详情" width="950px">
      <el-descriptions :column="3" border v-if="detail">
        <el-descriptions-item label="到账状态">
          <el-tag :type="detail.matchStatus==='settled'?'success':'danger'">{{ detail.matchStatus==='settled'?'已到账':'未到账' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="合同编号">{{ detail.contractNo }}</el-descriptions-item>
        <el-descriptions-item label="销售人员">{{ detail.salesperson||'-' }}</el-descriptions-item>
        <el-descriptions-item label="成交渠道">{{ detail.channel||'-' }}</el-descriptions-item>
        <el-descriptions-item label="客户名称">{{ detail.customerName||'-' }}</el-descriptions-item>
        <el-descriptions-item label="品牌">{{ detail.brand||'-' }}</el-descriptions-item>
        <el-descriptions-item label="收货省份">{{ detail.deliveryProvince||'-' }}</el-descriptions-item>
        <el-descriptions-item label="一级类目">{{ detail.productCategory1||'-' }}</el-descriptions-item>
        <el-descriptions-item label="二级类目">{{ detail.productCategory2||'-' }}</el-descriptions-item>
        <el-descriptions-item label="产品型号">{{ detail.productModel||'-' }}</el-descriptions-item>
        <el-descriptions-item label="规格">{{ detail.specification||'-' }}</el-descriptions-item>
        <el-descriptions-item label="特殊要求">{{ detail.specialRequirements||'-' }}</el-descriptions-item>
        <el-descriptions-item label="报价情况">{{ detail.quoteStatus||'-' }}</el-descriptions-item>
        <el-descriptions-item label="数量">{{ detail.quantity||0 }}</el-descriptions-item>
        <el-descriptions-item label="单价">{{ money(detail.unitPrice) }}</el-descriptions-item>
        <el-descriptions-item label="总金额">{{ money(detail.totalAmount) }}</el-descriptions-item>
        <el-descriptions-item label="日期">{{ d(detail.orderDate) }}</el-descriptions-item>
        <el-descriptions-item label="合同总金额">{{ money(detail.contractTotalAmount) }}</el-descriptions-item>
        <el-descriptions-item label="实际金额">{{ money(detail.actualContractAmount) }}</el-descriptions-item>
        <el-descriptions-item label="返款/佣金">{{ detail.rebateOrCommission||'-' }}</el-descriptions-item>
        <el-descriptions-item label="付款1">{{ d(detail.paymentDate1) }} / {{ detail.settlementMethod1||'-' }} / {{ money(detail.paymentAmount1) }}</el-descriptions-item>
        <el-descriptions-item label="付款2">{{ d(detail.paymentDate2) }} / {{ detail.settlementMethod2||'-' }} / {{ money(detail.paymentAmount2) }}</el-descriptions-item>
        <el-descriptions-item label="付款3">{{ d(detail.paymentDate3) }} / {{ detail.settlementMethod3||'-' }} / {{ money(detail.paymentAmount3) }}</el-descriptions-item>
        <el-descriptions-item label="付款4">{{ d(detail.paymentDate4) }} / {{ detail.settlementMethod4||'-' }} / {{ money(detail.paymentAmount4) }}</el-descriptions-item>
        <el-descriptions-item label="余款">{{ money((detail.contractTotalAmount||0)-(detail.actualReceivedAmount||0)) }}</el-descriptions-item>
        <el-descriptions-item label="实际到款">{{ money(detail.actualReceivedAmount) }}</el-descriptions-item>
        <el-descriptions-item label="质保金到期">{{ d(detail.warrantyDueDate) }}</el-descriptions-item>
        <el-descriptions-item label="渠道平台">{{ detail.platform||'-' }}</el-descriptions-item>
        <el-descriptions-item label="是否开票">{{ detail.isInvoiced||'-' }}</el-descriptions-item>
        <el-descriptions-item label="开票日期">{{ d(detail.invoiceDate) }}</el-descriptions-item>
        <el-descriptions-item label="发票抬头" :span="2">{{ detail.invoiceCompany||'-' }}</el-descriptions-item>
        <el-descriptions-item label="发票号">{{ detail.invoiceNo||'-' }}</el-descriptions-item>
        <el-descriptions-item label="进货单价">{{ money(detail.purchaseUnitPrice) }}</el-descriptions-item>
        <el-descriptions-item label="进货总价">{{ money(detail.purchaseTotalPrice) }}</el-descriptions-item>
        <el-descriptions-item label="采购合同编号">{{ detail.purchaseContractNo||'-' }}</el-descriptions-item>
        <el-descriptions-item label="安装费">{{ money(detail.installationFee) }}</el-descriptions-item>
        <el-descriptions-item label="差异">{{ money((detail.totalAmount||0)-(detail.purchaseTotalPrice||0)-(detail.installationFee||0)) }}</el-descriptions-item>
        <el-descriptions-item label="平台费率%">{{ (detail.platformFeeRate||0).toFixed(1) }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="3">{{ detail.remarks||'-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 导入弹窗 -->
    <el-dialog v-model="showImport" title="导入销售合同Excel" width="500px">
      <el-upload drag action="/api/contracts/import" :headers="headers" :before-upload="()=>true" :on-success="onImportOk" :on-error="onImportErr" accept=".xlsx,.xls">
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">拖拽 Excel 文件到此处，或 <em>点击上传</em></div>
        <template #tip><div class="el-upload__tip">支持"销售合同数据统计表"格式的 .xlsx 文件</div></template>
      </el-upload>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus, Download, Upload, UploadFilled, Delete, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { contractsApi, baseDataApi } from '../api'
import api from '../api'

// 状态
const dateRange = ref([]), salesperson = ref(''), platform = ref(''), contractNo = ref(''), matchStatus = ref('')
const contracts = ref([]), total = ref(0), page = ref(1), pageSize = ref(20)
const loading = ref(false), saving = ref(false)
const showForm = ref(false), showDetail = ref(false), showImport = ref(false)
const formMode = ref('add'), editingId = ref(null), selectedIds = ref([]), detail = ref(null)
const salespeopleList = ref([]), platformsList = ref([]), productsList = ref([])
const stats = ref({ settled: 0, pending: 0, total: 0, settledAmount: 0 })

const headers = computed(() => {
  const t = localStorage.getItem('token')
  return t ? { Authorization: `Bearer ${t}` } : {}
})

const blank = {
  contractNo:'', salesperson:'', channel:'', customerName:'', brand:'',
  productCategory1:'', productCategory2:'', productModel:'', specification:'',
  specialRequirements:'', quantity:0, unitPrice:0, totalAmount:0, orderDate:'',
  contractTotalAmount:0, rebateOrCommission:'', deliveryProvince:'', actualContractAmount:0,
  quoteStatus:'',
  paymentDate1:'', settlementMethod1:'', paymentAmount1:0,
  paymentDate2:'', settlementMethod2:'', paymentAmount2:0,
  paymentDate3:'', settlementMethod3:'', paymentAmount3:0,
  paymentDate4:'', settlementMethod4:'', paymentAmount4:0,
  actualReceivedAmount:0, warrantyDueDate:'',
  platform:'', isInvoiced:'', invoiceDate:'', invoiceCompany:'', invoiceNo:'',
  purchaseUnitPrice:0, purchaseTotalPrice:0, purchaseContractNo:'',
  installationFee:0, platformFeeRate:0, remarks:''
}
const form = ref({...blank})

// 工具函数
function fmt(v) { return (v||0).toLocaleString('zh-CN',{minimumFractionDigits:2}) }
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => ElMessage.success('已复制')).catch(() => ElMessage.error('复制失败'))
}
function money(v) { return fmt(v) }
function d(v) { return v ? new Date(v).toLocaleDateString('zh-CN') : '-' }
function priceRange(p) {
  if(!p||p===0) return ''; if(p<100) return '100元以下'; if(p<500) return '100~500元';
  if(p<1000) return '500~1000元'; if(p<5000) return '1000~5000元'; return '5000元以上'
}
function ym(v) { if(!v)return ''; const t=new Date(v); return `${String(t.getFullYear()).slice(2)}年${String(t.getMonth()+1).padStart(2,'0')}月` }
function qt(v) { if(!v)return ''; const m=new Date(v).getMonth(); return m<3?'Q1':m<6?'Q2':m<9?'Q3':'Q4' }

// 数据加载
async function loadBase() {
  try {
    const [sp, pf, pr] = await Promise.all([
      baseDataApi.getSalespeople(),
      baseDataApi.getPlatforms(),
      baseDataApi.getProducts()
    ])
    salespeopleList.value = sp.data?.data || sp.data || []
    platformsList.value = pf.data?.data || pf.data || []
    productsList.value = pr.data?.data || pr.data || []
  } catch(e) { console.error(e) }
}
async function loadData() { page.value=1; loadList(); loadStats() }

function resetSearch() {
  dateRange.value=[]; contractNo.value=''; salesperson.value=''; platform.value=''; matchStatus.value=''
  loadData()
}
async function loadList() {
  loading.value = true
  try {
    const p = { page:page.value, pageSize:pageSize.value }
    if(dateRange.value?.length===2) { p.startDate=dateRange.value[0]; p.endDate=dateRange.value[1] }
    if(salesperson.value) p.salesperson = salesperson.value
    if(platform.value) p.platform = platform.value
    if(contractNo.value) p.contractNo = contractNo.value
    if(matchStatus.value) p.matchStatus = matchStatus.value
    const r = (await contractsApi.getList(p)).data
    contracts.value = r.data||[]; total.value = r.total||0
  } catch(e) { console.error(e) }
  loading.value = false
}

// 选择
async function loadStats() {
  try {
    const r = (await api.get('/contracts/settlement-stats')).data
    stats.value = r
  } catch(e) { console.error(e) }
}

function onSelect(rows) { selectedIds.value = rows.map(r=>r._id) }

// 新增
function openAdd() {
  formMode.value='add'; editingId.value=null; form.value={...blank}; showForm.value=true
}

// 编辑
function openEdit(row) {
  formMode.value = 'edit'
  editingId.value = row._id
  Object.assign(form.value, blank, row)
  const dateKeys = ['orderDate','paymentDate1','paymentDate2','paymentDate3','paymentDate4','warrantyDueDate','invoiceDate']
  dateKeys.forEach(function(k) {
    if (form.value[k]) form.value[k] = new Date(form.value[k]).toISOString().slice(0, 10)
  })
  showForm.value = true
}

// 保存
async function saveForm() {
  if(!form.value.contractNo) return ElMessage.error('合同编号不能为空')
  saving.value = true
  try {
    if(formMode.value==='edit') {
      await contractsApi.update(editingId.value, form.value)
      ElMessage.success('更新成功')
    } else {
      await contractsApi.add(form.value)
      ElMessage.success('添加成功')
    }
    showForm.value = false
    loadData()
  } catch(e) {
    ElMessage.error(e.response?.data?.error || '操作失败')
  }
  saving.value = false
}

// 详情
function openDetail(row) { detail.value = row; showDetail.value = true }

// 删除单个
async function delOne(row) {
  try {
    await ElMessageBox.confirm(`确认删除合同 ${row.contractNo}？`, '删除确认', { type:'warning' })
    await contractsApi.delete(row._id)
    ElMessage.success('已删除'); loadData()
  } catch(e) { if(e!=='cancel') ElMessage.error(e.response?.data?.error||'删除失败') }
}

// 批量删除
async function batchDelete() {
  if(!selectedIds.value.length) return
  try {
    await ElMessageBox.confirm(`确认删除 ${selectedIds.value.length} 条记录？`, '批量删除', { type:'warning' })
    await contractsApi.batchDelete(selectedIds.value)
    ElMessage.success(`已删除 ${selectedIds.value.length} 条`); selectedIds.value=[]; loadData()
  } catch(e) { if(e!=='cancel') ElMessage.error('删除失败') }
}

// 导出
function doExport() {
  if(!dateRange.value||dateRange.value.length!==2) return ElMessage.warning('请先选择日期范围')
  const [s,e] = dateRange.value
  const token = localStorage.getItem('token')
  fetch(`/api/contracts/export?startDate=${s}&endDate=${e}`, { headers:{ Authorization:`Bearer ${token}` } })
    .then(r => { if(!r.ok) return r.json().then(d=>{ throw new Error(d.error||'导出失败') }); return r.blob() })
    .then(blob => {
      const u=URL.createObjectURL(blob), a=document.createElement('a')
      a.href=u; a.download=`销售合同_${s}_${e}.xlsx`; a.click(); URL.revokeObjectURL(u)
      ElMessage.success('导出成功')
    })
    .catch(err => ElMessage.error(err.message))
}

// 导入
function onImportOk(res) {
  if (res.success) {
    let msg = `共 ${res.total} 条，新增 ${res.inserted} 条，更新 ${res.updated} 条`
    if (res.skipped) msg += `，跳过 ${res.skipped} 条`
    ElMessage.success(msg)
    showImport.value = false
    loadData()
  } else {
    ElMessage.error(res.error || '导入失败')
  }
}
function onImportErr() { ElMessage.error('上传失败') }

onMounted(() => { loadBase(); loadData(); loadStats() })
</script>

<style scoped>
.toolbar { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; flex-wrap:wrap; gap:10px }
.filter-bar { display:flex; align-items:center; flex-wrap:wrap }
.btn-bar { display:flex; gap:8px; flex-wrap:wrap }
.kpi-row { margin-bottom:16px }
.kpi { text-align:center }
.kpi-label { font-size:13px; color:#909399 }
.kpi-value { font-size:24px; font-weight:700; margin-top:4px }
.pagination { margin-top:12px; display:flex; justify-content:flex-end }
.table-card :deep(.el-card__body) { padding:12px }
</style>
