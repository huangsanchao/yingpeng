<template>
  <div class="page">
    <div class="filter-bar">
      <el-select v-model="month" placeholder="选择月份" style="width:160px" @change="loadSummary">
        <el-option v-for="m in months" :key="m" :label="m" :value="m" />
      </el-select>
      <el-select v-model="platform" placeholder="选择平台" style="width:120px;margin-left:12px" @change="loadSummary">
        <el-option label="全部" value="all" />
        <el-option label="天猫" value="tmall" />
        <el-option label="京东" value="jd" />
      </el-select>
    </div>

    <el-row :gutter="16" class="kpi-row">
      <el-col :span="8"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">出库成本</div><div class="kpi-value">¥{{ fmt(summary.totalCost) }}</div></div></el-card></el-col>
      <el-col :span="8"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">刷单成本</div><div class="kpi-value">¥{{ fmt(summary.brushCost) }}</div></div></el-card></el-col>
      <el-col :span="8"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">实销成本</div><div class="kpi-value" style="color:#409eff">¥{{ fmt(summary.realCost) }}</div></div></el-card></el-col>
    </el-row>

    <el-card class="mt16" shadow="hover">
      <template #header>
        <span>商品成本表</span>
        <el-button type="primary" size="small" style="float:right" @click="showAddDialog = true">新增</el-button>
      </template>
      <el-table :data="costs" stripe max-height="calc(100vh - 340px)">
        <el-table-column prop="productId" label="商品ID" width="150" />
        <el-table-column prop="productName" label="商品名称" show-overflow-tooltip />
        <el-table-column prop="sku" label="SKU" width="200" />
        <el-table-column prop="costPrice" label="成本单价" width="110">
          <template #default="{ row }">¥{{ row.costPrice?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="170">
          <template #default="{ row }">{{ fmtTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button type="danger" size="small" link @click="deleteCost(row._id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showAddDialog" title="新增商品成本" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="商品ID"><el-input v-model="form.productId" /></el-form-item>
        <el-form-item label="商品名称"><el-input v-model="form.productName" /></el-form-item>
        <el-form-item label="SKU"><el-input v-model="form.sku" /></el-form-item>
        <el-form-item label="成本单价"><el-input-number v-model="form.costPrice" :min="0" :precision="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="addCost">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { costApi } from '../api'
import { useMonths } from '../utils/composables'
const { months } = useMonths()

const month = ref('')
const platform = ref('all')
const summary = ref({})
const costs = ref([])
const showAddDialog = ref(false)
const form = ref({ productId: '', productName: '', sku: '', costPrice: 0 })

function fmt(v) { return (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }
function fmtTime(t) { return t ? new Date(t).toLocaleString('zh-CN') : '-' }

async function loadSummary() {
  const p = { month: month.value || undefined, platform: platform.value }
  summary.value = (await costApi.getSummary(p)).data
}

async function loadCosts() {
  costs.value = (await costApi.getList()).data
}

async function addCost() {
  await costApi.addCost(form.value)
  ElMessage.success('添加成功')
  showAddDialog.value = false
  form.value = { productId: '', productName: '', sku: '', costPrice: 0 }
  loadCosts()
}

async function deleteCost(id) {
  await costApi.deleteCost(id)
  ElMessage.success('删除成功')
  loadCosts()
}

onMounted(() => { loadSummary(); loadCosts() })
</script>

<style scoped>
.filter-bar { margin-bottom: 16px; }
.kpi-row { margin-bottom: 12px; }
.mt16 { margin-top: 12px; }
.kpi-label { font-size: 13px; color: #909399; margin-bottom: 8px; }
.kpi-value { font-size: 24px; font-weight: bold; }
</style>
