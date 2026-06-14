<template>
  <div class="page">
    <div class="toolbar">
      <div class="filter-bar">
        <el-select v-model="month" placeholder="选择月份" style="width:150px" @change="loadData">
          <el-option v-for="m in months" :key="m" :label="m" :value="m" />
        </el-select>
        <el-select v-model="platform" placeholder="选择平台" style="width:110px;margin-left:10px" @change="loadData">
          <el-option label="全部" value="all" />
          <el-option label="天猫" value="tmall" />
          <el-option label="京东" value="jd" />
        </el-select>
        <el-input v-model="orderNo" placeholder="搜索订单号" style="width:200px;margin-left:10px" clearable @keyup.enter="loadData" @clear="loadData" />
      </div>
      <el-button type="primary" @click="showBillingDialog = true">
        <el-icon style="margin-right:4px"><Upload /></el-icon>
        导入账单
      </el-button>
    </div>

    <el-row :gutter="16" class="kpi-row">
      <el-col :span="8"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">账单笔数</div><div class="kpi-value">{{ total }}</div></div></el-card></el-col>
      <el-col :span="8"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">收入金额</div><div class="kpi-value" style="color:#67c23a">¥{{ fmt(incomeAmount) }}</div></div></el-card></el-col>
      <el-col :span="8"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">支出金额</div><div class="kpi-value" style="color:#f56c6c">¥{{ fmt(expenseAmount) }}</div></div></el-card></el-col>
    </el-row>

    <el-card class="mt16" shadow="hover">
      <template #header>账单列表</template>
      <el-table :data="billings" stripe v-loading="loading" max-height="calc(100vh - 320px)">
        <el-table-column prop="platform" label="平台" width="70">
          <template #default="{ row }">{{ row.platform === 'tmall' ? '天猫' : '京东' }}</template>
        </el-table-column>
        <el-table-column prop="orderNo" label="订单号" width="200" />
        <el-table-column prop="productName" label="商品名称" show-overflow-tooltip />
        <el-table-column label="金额" width="110">
          <template #default="{ row }">¥{{ fmt(row.actualAmount) }}</template>
        </el-table-column>
        <el-table-column prop="businessCategory" label="业务类型" width="110" />
        <el-table-column prop="paymentChannel" label="收付渠道" width="140" />
        <el-table-column label="账期" width="100">
          <template #default="{ row }">{{ row.monthPeriod || '-' }}</template>
        </el-table-column>
        <el-table-column label="打款时间" width="160">
          <template #default="{ row }">{{ row.paymentTime ? new Date(row.paymentTime).toLocaleString('zh-CN') : '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="showDetail(row)">详情</el-button>
            <el-button type="danger" link size="small" @click="deleteBilling(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @current-change="loadBillings"
          @size-change="onSizeChange"
        />
      </div>
    </el-card>

    <!-- 账单导入对话框 -->
    <el-dialog v-model="showBillingDialog" title="导入账单" width="600px">
      <el-upload
        drag
        :action="billingUploadUrl"
        :data="billingUploadData"
        :headers="uploadHeaders"
        :before-upload="beforeBillingUpload"
        :on-success="onBillingSuccess"
        :on-error="onUploadError"
        accept=".csv,.xls,.xlsx"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">拖拽账单文件到此处，或 <em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">支持天猫/京东导出的 CSV、XLSX 账单文件</div>
        </template>
      </el-upload>
    </el-dialog>

    <!-- 账单详情弹框 -->
    <el-dialog v-model="showDetailDialog" title="账单详情" width="900px">
      <el-descriptions :column="2" border label-class-name="detail-label" v-if="detailRow">
        <el-descriptions-item label="平台">{{ detailRow.platform === 'tmall' ? '天猫' : '京东' }}</el-descriptions-item>
        <el-descriptions-item label="订单号">{{ detailRow.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="子订单号">{{ detailRow.subOrderNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="商户订单号">{{ detailRow.merchantOrderNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="商品名称">{{ detailRow.productName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="商品ID">{{ detailRow.productId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="SKU">{{ detailRow.sku || '-' }}</el-descriptions-item>
        <el-descriptions-item label="数量">{{ detailRow.quantity || 0 }}</el-descriptions-item>
        <el-descriptions-item label="单价">¥{{ fmt(detailRow.unitPrice) }}</el-descriptions-item>
        <el-descriptions-item label="实际金额">¥{{ fmt(detailRow.actualAmount) }}</el-descriptions-item>
        <el-descriptions-item label="业务类型">{{ detailRow.businessCategory || '-' }}</el-descriptions-item>
        <el-descriptions-item label="子类别">{{ detailRow.subCategory || '-' }}</el-descriptions-item>
        <el-descriptions-item label="收/付渠道">{{ detailRow.paymentChannel || '-' }}</el-descriptions-item>
        <el-descriptions-item label="业务流水号">{{ detailRow.paymentFlowNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="退款单号">{{ detailRow.refundNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="退款金额">¥{{ fmt(detailRow.refundAmount) }}</el-descriptions-item>
        <el-descriptions-item label="账期">{{ detailRow.monthPeriod || '-' }}</el-descriptions-item>
        <el-descriptions-item label="下单时间">{{ detailRow.orderTime ? new Date(detailRow.orderTime).toLocaleString('zh-CN') : '-' }}</el-descriptions-item>
        <el-descriptions-item label="确认收货">{{ detailRow.confirmTime ? new Date(detailRow.confirmTime).toLocaleString('zh-CN') : '-' }}</el-descriptions-item>
        <el-descriptions-item label="打款时间">{{ detailRow.paymentTime ? new Date(detailRow.paymentTime).toLocaleString('zh-CN') : '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Upload, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'
import { useMonths } from '../utils/composables'
const { months } = useMonths()

const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})

const month = ref('')
const platform = ref('all')
const orderNo = ref('')
const billings = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const showBillingDialog = ref(false)
const showDetailDialog = ref(false)
const detailRow = ref(null)

const billingUploadUrl = '/api/import/upload'
const billingUploadData = ref({ fileType: 'tmall' })

const incomeAmount = computed(() => billings.value.filter(b => b.actualAmount > 0).reduce((s, b) => s + (b.actualAmount || 0), 0))
const expenseAmount = computed(() => Math.abs(billings.value.filter(b => b.actualAmount < 0).reduce((s, b) => s + (b.actualAmount || 0), 0)))

function fmt(v) { return (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

async function loadData() {
  page.value = 1
  await loadBillings()
}

async function loadBillings() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (month.value) params.month = month.value
    if (platform.value !== 'all') params.platform = platform.value
    if (orderNo.value) params.orderNo = orderNo.value
    const res = (await api.get('/billing/list', { params })).data
    billings.value = res.data || []
    total.value = res.total || 0
  } catch (e) { console.error(e) }
  loading.value = false
}

function onSizeChange() { page.value = 1; loadBillings() }

function beforeBillingUpload(file) {
  if (file.name.includes('到账明细')) billingUploadData.value.fileType = 'alipay'
  else if (file.name.includes('天猫')) billingUploadData.value.fileType = 'tmall'
  else if (file.name.includes('京东')) billingUploadData.value.fileType = 'jd'
  else billingUploadData.value.fileType = 'tmall'
  return true
}

function onBillingSuccess(res) {
  if (res.success) {
    ElMessage.success(`导入 ${res.total} 条账单`)
    showBillingDialog.value = false
    loadData()
  } else {
    ElMessage.error(res.error || '导入失败')
  }
}

function onUploadError() {
  ElMessage.error('上传失败，请检查网络连接')
}

function showDetail(row) { detailRow.value = row; showDetailDialog.value = true }

async function deleteBilling(row) {
  try {
    await ElMessageBox.confirm(`确认删除账单 ${row.orderNo}？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch (e) {
    return // 用户取消
  }

  try {
    const res = await api.delete(`/billing/${row._id}`)
    if (res.data.success) {
      ElMessage.success('删除成功')
      page.value = 1
      await loadBillings()
    } else {
      ElMessage.error(res.data.error || '删除失败')
    }
  } catch (e) {
    const msg = e.response?.data?.error || e.message || '删除失败'
    ElMessage.error(msg)
  }
}

onMounted(loadData)
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.filter-bar { display: flex; align-items: center; }
.kpi-row { margin-bottom: 12px; }
.mt16 { margin-top: 12px; }
.pagination { margin-top: 12px; display: flex; justify-content: flex-end; }
.kpi-label { font-size: 13px; color: #909399; margin-bottom: 8px; }
.kpi-value { font-size: 24px; font-weight: bold; }
:deep(.detail-label) { width: 120px; text-align: right; }
</style>
