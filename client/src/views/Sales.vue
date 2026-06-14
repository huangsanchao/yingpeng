<template>
  <div class="page">
    <div class="toolbar">
      <div class="filter-bar">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width:260px"
          @change="loadData"
          value-format="YYYY-MM-DD"
        />
        <el-select v-model="salesperson" placeholder="销售员" style="width:110px;margin-left:10px" @change="loadData" clearable>
          <el-option label="全部" value="" />
          <el-option v-for="s in salespeopleList" :key="s.name" :label="s.name" :value="s.name" />
        </el-select>
        <el-select v-model="platform" placeholder="平台" style="width:110px;margin-left:10px" @change="loadData">
          <el-option label="全部" value="all" />
          <el-option v-for="p in platformsList" :key="p.name" :label="p.name" :value="p.name" />
        </el-select>
        <el-input v-model="contractNo" placeholder="搜索合同编号" style="width:200px;margin-left:10px" clearable @keyup.enter="loadData" @clear="loadData" />
      </div>
      <div class="btn-bar">
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon style="margin-right:4px"><Plus /></el-icon>
          新增合同
        </el-button>
        <el-button type="warning" @click="showOrderDialog = true">
          <el-icon style="margin-right:4px"><Upload /></el-icon>
          导入订单
        </el-button>
        <el-button type="success" @click="handleExport">
          <el-icon style="margin-right:4px"><Download /></el-icon>
          导出Excel
        </el-button>
      </div>
    </div>

    <el-row :gutter="16" class="kpi-row">
      <el-col :span="6"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">合同总数</div><div class="kpi-value">{{ total }}</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">总金额</div><div class="kpi-value" style="color:#67c23a">¥{{ fmt(totalAmount) }}</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">实际金额</div><div class="kpi-value" style="color:#409eff">¥{{ fmt(actualAmount) }}</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">进货总价</div><div class="kpi-value" style="color:#e6a23c">¥{{ fmt(purchaseAmount) }}</div></div></el-card></el-col>
    </el-row>

    <el-card class="mt16" shadow="hover">
      <template #header>销售合同列表</template>
      <el-table :data="contracts" stripe v-loading="loading" max-height="calc(100vh - 360px)">
        <el-table-column prop="anfeiContractNo" label="安菲合同编号" width="140" show-overflow-tooltip />
        <el-table-column prop="salesperson" label="销售员" width="90" />
        <el-table-column prop="contractNo" label="合同编号" width="200" show-overflow-tooltip />
        <el-table-column prop="customerName" label="客户名称" width="180" show-overflow-tooltip />
        <el-table-column prop="productName" label="产品名称" show-overflow-tooltip />
        <el-table-column prop="quantity" label="数量" width="70" />
        <el-table-column label="单价" width="90">
          <template #default="{ row }">¥{{ fmt(row.unitPrice) }}</template>
        </el-table-column>
        <el-table-column label="总金额" width="100">
          <template #default="{ row }">¥{{ fmt(row.totalAmount) }}</template>
        </el-table-column>
        <el-table-column label="实际金额" width="100">
          <template #default="{ row }">¥{{ fmt(row.actualContractAmount) }}</template>
        </el-table-column>
        <el-table-column label="日期" width="110">
          <template #default="{ row }">{{ row.orderDate ? formatDate(row.orderDate) : '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="showDetail(row)">详情</el-button>
            <el-button type="danger" link size="small" @click="deleteContract(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @current-change="loadContracts"
          @size-change="onSizeChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑合同 -->
    <el-dialog v-model="showAddDialog" title="新增销售合同" width="700px">
      <el-form :model="form" label-width="110px">
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="安菲合同编号"><el-input v-model="form.anfeiContractNo" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="合同编号"><el-input v-model="form.contractNo" required /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="销售员"><el-input v-model="form.salesperson" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="下单渠道"><el-input v-model="form.orderChannel" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="客户名称"><el-input v-model="form.customerName" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="产品名称"><el-input v-model="form.productName" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8"><el-form-item label="数量"><el-input-number v-model="form.quantity" :min="0" style="width:100%" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="单价"><el-input-number v-model="form.unitPrice" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="总金额"><el-input-number v-model="form.totalAmount" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="日期"><el-date-picker v-model="form.orderDate" type="date" style="width:100%" value-format="YYYY-MM-DD" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="合同总金额"><el-input-number v-model="form.contractTotalAmount" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="实际合同金额"><el-input-number v-model="form.actualContractAmount" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="反款或佣金"><el-input v-model="form.rebateOrCommission" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="结算方式"><el-input v-model="form.settlementMethod" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="是否开票">
            <el-select v-model="form.isInvoiced" style="width:100%">
              <el-option label="是" value="是" />
              <el-option label="否" value="否" />
            </el-select>
          </el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8"><el-form-item label="进货单价"><el-input-number v-model="form.purchaseUnitPrice" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="进货总价"><el-input-number v-model="form.purchaseTotalPrice" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="质保金到期"><el-date-picker v-model="form.warrantyDueDate" type="date" style="width:100%" value-format="YYYY-MM-DD" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="开票日期"><el-date-picker v-model="form.invoiceDate" type="date" style="width:100%" value-format="YYYY-MM-DD" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="发票号"><el-input v-model="form.invoiceNo" /></el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveContract">保存</el-button>
      </template>
    </el-dialog>

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

    <!-- 合同详情 -->
    <el-dialog v-model="showDetailDialog" title="合同详情" width="900px">
      <el-descriptions :column="2" border label-class-name="detail-label" v-if="detailRow">
        <el-descriptions-item label="安菲合同编号">{{ detailRow.anfeiContractNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="合同编号">{{ detailRow.contractNo }}</el-descriptions-item>
        <el-descriptions-item label="销售员">{{ detailRow.salesperson || '-' }}</el-descriptions-item>
        <el-descriptions-item label="下单渠道">{{ detailRow.orderChannel || '-' }}</el-descriptions-item>
        <el-descriptions-item label="客户名称">{{ detailRow.customerName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="产品名称">{{ detailRow.productName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="数量">{{ detailRow.quantity || 0 }}</el-descriptions-item>
        <el-descriptions-item label="单价">¥{{ fmt(detailRow.unitPrice) }}</el-descriptions-item>
        <el-descriptions-item label="总金额">¥{{ fmt(detailRow.totalAmount) }}</el-descriptions-item>
        <el-descriptions-item label="日期">{{ detailRow.orderDate ? formatDate(detailRow.orderDate) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="合同总金额">¥{{ fmt(detailRow.contractTotalAmount) }}</el-descriptions-item>
        <el-descriptions-item label="反款或佣金">{{ detailRow.rebateOrCommission || '-' }}</el-descriptions-item>
        <el-descriptions-item label="实际金额">¥{{ fmt(detailRow.actualContractAmount) }}</el-descriptions-item>
        <el-descriptions-item label="结算方式">{{ detailRow.settlementMethod || '-' }}</el-descriptions-item>
        <el-descriptions-item label="进货单价">¥{{ fmt(detailRow.purchaseUnitPrice) }}</el-descriptions-item>
        <el-descriptions-item label="进货总价">¥{{ fmt(detailRow.purchaseTotalPrice) }}</el-descriptions-item>
        <el-descriptions-item label="质保金到期">{{ detailRow.warrantyDueDate ? formatDate(detailRow.warrantyDueDate) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="是否开票">{{ detailRow.isInvoiced || '-' }}</el-descriptions-item>
        <el-descriptions-item label="开票日期">{{ detailRow.invoiceDate ? formatDate(detailRow.invoiceDate) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="发票号">{{ detailRow.invoiceNo || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus, Download, Upload, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { contractsApi, baseDataApi } from '../api'

const dateRange = ref([])
const salesperson = ref('')
const platform = ref('all')
const contractNo = ref('')
const contracts = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const showAddDialog = ref(false)
const showOrderDialog = ref(false)
const showDetailDialog = ref(false)
const detailRow = ref(null)
const salespeopleList = ref([])
const platformsList = ref([])

const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})

const form = ref({
  anfeiContractNo: '', salesperson: '', orderChannel: '', contractNo: '',
  customerName: '', productName: '', quantity: 0, unitPrice: 0, totalAmount: 0,
  orderDate: '', contractTotalAmount: 0, rebateOrCommission: '', actualContractAmount: 0,
  settlementMethod: '', purchaseUnitPrice: 0, purchaseTotalPrice: 0,
  warrantyDueDate: '', isInvoiced: '', invoiceDate: '', invoiceNo: ''
})

function fmt(v) { return (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-' }

const totalAmount = computed(() => contracts.value.reduce((s, c) => s + (c.totalAmount || 0), 0))
const actualAmount = computed(() => contracts.value.reduce((s, c) => s + (c.actualContractAmount || 0), 0))
const purchaseAmount = computed(() => contracts.value.reduce((s, c) => s + (c.purchaseTotalPrice || 0), 0))

async function loadBaseData() {
  try {
    salespeopleList.value = (await baseDataApi.getSalespeople()).data
    platformsList.value = (await baseDataApi.getPlatforms()).data
  } catch (e) { console.error(e) }
}

async function loadData() {
  page.value = 1
  await loadContracts()
}

async function loadContracts() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    if (salesperson.value) params.salesperson = salesperson.value
    if (platform.value !== 'all') params.platform = platform.value
    if (contractNo.value) params.contractNo = contractNo.value
    const res = (await contractsApi.getList(params)).data
    contracts.value = res.data || []
    total.value = res.total || 0
  } catch (e) { console.error(e) }
  loading.value = false
}

function onSizeChange() { page.value = 1; loadContracts() }

function beforeOrderUpload() { return true }

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

async function saveContract() {
  try {
    await contractsApi.add(form.value)
    ElMessage.success('添加成功')
    showAddDialog.value = false
    form.value = {
      anfeiContractNo: '', salesperson: '', orderChannel: '', contractNo: '',
      customerName: '', productName: '', quantity: 0, unitPrice: 0, totalAmount: 0,
      orderDate: '', contractTotalAmount: 0, rebateOrCommission: '', actualContractAmount: 0,
      settlementMethod: '', purchaseUnitPrice: 0, purchaseTotalPrice: 0,
      warrantyDueDate: '', isInvoiced: '', invoiceDate: '', invoiceNo: ''
    }
    loadData()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '操作失败')
  }
}

async function deleteContract(row) {
  try {
    await ElMessageBox.confirm(`确认删除合同 ${row.contractNo}？`, '删除确认', { type: 'warning' })
  } catch (e) { return }
  try {
    await contractsApi.delete(row._id)
    ElMessage.success('删除成功')
    page.value = 1
    loadData()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '删除失败')
  }
}

function showDetail(row) { detailRow.value = row; showDetailDialog.value = true }

async function handleExport() {
  if (!dateRange.value || dateRange.value.length !== 2) {
    ElMessage.warning('请先选择日期范围')
    return
  }
  try {
    const res = await contractsApi.exportExcel({ startDate: dateRange.value[0], endDate: dateRange.value[1] })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `销售合同_${dateRange.value[0]}_${dateRange.value[1]}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '导出失败')
  }
}

onMounted(() => { loadBaseData(); loadData() })
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
