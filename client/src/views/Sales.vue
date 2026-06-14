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
        <el-select v-model="matchStatus" placeholder="到账状态" style="width:110px;margin-left:10px" @change="loadData">
          <el-option label="全部" value="all" />
          <el-option label="已到账" value="settled" />
          <el-option label="未到账" value="pending" />
        </el-select>
        <el-input v-model="orderNo" placeholder="搜索订单号" style="width:200px;margin-left:10px" clearable @keyup.enter="loadData" @clear="loadData" />
      </div>
      <div class="btn-bar">
        <el-button type="success" @click="showOrderDialog = true">
          <el-icon style="margin-right:4px"><Upload /></el-icon>
          导入订单
        </el-button>
      </div>
    </div>

    <el-row :gutter="16" class="kpi-row">
      <el-col :span="8"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">订单总数</div><div class="kpi-value">{{ stats.total }}</div></div></el-card></el-col>
      <el-col :span="8"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">已到账</div><div class="kpi-value" style="color:#67c23a">{{ stats.settled }}</div></div></el-card></el-col>
      <el-col :span="8"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">未到账</div><div class="kpi-value" style="color:#e6a23c">{{ stats.pending }}</div></div></el-card></el-col>
    </el-row>

    <el-card class="mt16" shadow="hover">
      <template #header>订单列表</template>
      <el-table :data="orders" stripe v-loading="loading" max-height="calc(100vh - 320px)">
        <el-table-column prop="platform" label="平台" width="70">
          <template #default="{ row }">{{ row.platform === 'tmall' ? '天猫' : '京东' }}</template>
        </el-table-column>
        <el-table-column prop="orderNo" label="订单号" width="200" />
        <el-table-column prop="productName" label="商品名称" show-overflow-tooltip />
        <el-table-column prop="quantity" label="数量" width="70" />
        <el-table-column label="买家实付" width="110">
          <template #default="{ row }">¥{{ fmt(row.actualPayment) }}</template>
        </el-table-column>
        <el-table-column label="到账状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.matchStatus === 'settled' ? 'success' : 'warning'" size="small">
              {{ row.matchStatus === 'settled' ? '已到账' : '未到账' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="打款时间" width="160">
          <template #default="{ row }">
            <span v-if="row.matchStatus === 'settled' && row.paymentTime">
              {{ new Date(row.paymentTime).toLocaleString('zh-CN') }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="物流单号" width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.logisticsNo || '-' }}</template>
        </el-table-column>
        <el-table-column label="订单状态" width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.orderStatus || '-' }}</template>
        </el-table-column>
        <el-table-column label="下单时间" width="160">
          <template #default="{ row }">{{ row.orderTime ? new Date(row.orderTime).toLocaleString('zh-CN') : '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="showDetail(row)">详情</el-button>
            <el-button type="danger" link size="small" @click="deleteOrder(row)">删除</el-button>
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
          @current-change="loadOrders"
          @size-change="onSizeChange"
        />
      </div>
    </el-card>

    <!-- 订单导入对话框 -->
    <el-dialog v-model="showOrderDialog" title="导入订单" width="600px">
      <el-upload
        drag
        action="/api/import/upload-order"
        :headers="uploadHeaders"
        :before-upload="beforeOrderUpload"
        :on-success="onOrderSuccess"
        :on-error="onUploadError"
        accept=".xls,.xlsx"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">拖拽订单文件到此处，或 <em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">支持 XLSX 格式的订单导出文件</div>
        </template>
      </el-upload>
    </el-dialog>

    <!-- 订单详情弹框 -->
    <el-dialog v-model="showDetailDialog" title="订单详情" width="900px">
      <el-descriptions :column="2" border label-class-name="detail-label" v-if="detailRow">
        <el-descriptions-item label="订单号">{{ detailRow.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="商品名称">{{ detailRow.productName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="总金额">¥{{ fmt(detailRow.totalAmount) }}</el-descriptions-item>
        <el-descriptions-item label="买家实付">¥{{ fmt(detailRow.actualPayment) }}</el-descriptions-item>
        <el-descriptions-item label="卖家服务费">¥{{ fmt(detailRow.sellerServiceFee || 0) }}</el-descriptions-item>
        <el-descriptions-item label="到账状态">
          <el-tag :type="detailRow.matchStatus === 'settled' ? 'success' : 'warning'" size="small">
            {{ detailRow.matchStatus === 'settled' ? '已到账' : '未到账' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="打款时间">
          <span v-if="detailRow.matchStatus === 'settled' && detailRow.paymentTime">
            {{ new Date(detailRow.paymentTime).toLocaleString('zh-CN') }}
          </span>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="订单状态">{{ detailRow.orderStatus || '-' }}</el-descriptions-item>
        <el-descriptions-item label="店铺名称">{{ detailRow.shopName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="物流单号">{{ detailRow.logisticsNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="物流公司">{{ detailRow.logisticsCompany || '-' }}</el-descriptions-item>
        <el-descriptions-item label="支付方式">{{ detailRow.paymentMethod || '-' }}</el-descriptions-item>
        <el-descriptions-item label="支付流水号">{{ detailRow.paymentFlowNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="下单时间">{{ detailRow.orderTime ? new Date(detailRow.orderTime).toLocaleString('zh-CN') : '-' }}</el-descriptions-item>
        <el-descriptions-item label="发货时间">{{ detailRow.shipTime ? new Date(detailRow.shipTime).toLocaleString('zh-CN') : '-' }}</el-descriptions-item>
        <el-descriptions-item label="确认收货">{{ detailRow.confirmTime ? new Date(detailRow.confirmTime).toLocaleString('zh-CN') : '-' }}</el-descriptions-item>
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
const matchStatus = ref('all')
const orderNo = ref('')
const orders = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const stats = ref({ total: 0, settled: 0, pending: 0 })
const showOrderDialog = ref(false)
const showDetailDialog = ref(false)
const detailRow = ref(null)

function fmt(v) { return (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

async function loadData() {
  page.value = 1
  await loadStats()
  await loadOrders()
}

async function loadStats() {
  try {
    const params = {}
    if (platform.value !== 'all') params.platform = platform.value
    stats.value = (await api.get('/import/settlement-stats', { params })).data
  } catch (e) { console.error(e) }
}

async function loadOrders() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (platform.value !== 'all') params.platform = platform.value
    if (matchStatus.value !== 'all') params.status = matchStatus.value
    if (orderNo.value) params.orderNo = orderNo.value
    const res = (await api.get('/import/settlement-detail', { params })).data
    orders.value = res.data || []
    total.value = res.total || 0
  } catch (e) { console.error(e) }
  loading.value = false
}

function onSizeChange() { page.value = 1; loadOrders() }

function beforeOrderUpload() { return true }

function showDetail(row) { detailRow.value = row; showDetailDialog.value = true }

async function deleteOrder(row) {
  try {
    await ElMessageBox.confirm(`确认删除订单 ${row.orderNo}？${row.matchStatus === 'settled' ? '删除后将同时移除对应的账单记录。' : ''}`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch (e) {
    return // 用户取消
  }

  try {
    const res = await api.delete(`/import/settlement/${row._id}`)
    if (res.data.success) {
      ElMessage.success('删除成功')
      page.value = 1
      await loadOrders()
      await loadStats()
    } else {
      ElMessage.error(res.data.error || '删除失败')
    }
  } catch (e) {
    const msg = e.response?.data?.error || e.message || '删除失败'
    ElMessage.error(msg)
  }
}

function onOrderSuccess(res) {
  if (res.success) {
    ElMessage.success(`导入 ${res.total} 条订单，到账 ${res.stats.settled} / 未到账 ${res.stats.pending}`)
    showOrderDialog.value = false
    loadData()
  } else {
    ElMessage.error(res.error || '导入失败')
  }
}

function onUploadError() {
  ElMessage.error('上传失败，请检查网络连接')
}

onMounted(loadData)
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.filter-bar { display: flex; align-items: center; }
.btn-bar { display: flex; gap: 10px; }
.kpi-row { margin-bottom: 12px; }
.mt16 { margin-top: 12px; }
.pagination { margin-top: 12px; display: flex; justify-content: flex-end; }
.kpi-label { font-size: 13px; color: #909399; margin-bottom: 8px; }
.kpi-value { font-size: 24px; font-weight: bold; }
:deep(.detail-label) { width: 120px; text-align: right; }
</style>
