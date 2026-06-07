<template>
  <div class="page">
    <div class="filter-bar">
      <el-select v-model="month" placeholder="选择月份" style="width:160px" @change="loadData">
        <el-option v-for="m in months" :key="m" :label="m" :value="m" />
      </el-select>
      <el-select v-model="platform" placeholder="选择平台" style="width:120px;margin-left:12px" @change="loadData">
        <el-option label="全部" value="all" />
        <el-option label="天猫" value="tmall" />
        <el-option label="京东" value="jd" />
      </el-select>
    </div>

    <el-row :gutter="16" class="kpi-row">
      <el-col :span="8"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">退款金额</div><div class="kpi-value" style="color:#f56c6c">¥{{ fmt(summary.refundAmount) }}</div></div></el-card></el-col>
      <el-col :span="8"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">退款单数</div><div class="kpi-value">{{ summary.refundCount }}</div></div></el-card></el-col>
      <el-col :span="8"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">退款成本</div><div class="kpi-value">¥{{ fmt(summary.refundCost) }}</div></div></el-card></el-col>
    </el-row>

    <el-card class="mt16" shadow="hover">
      <template #header>退款明细</template>
      <el-table :data="details" stripe max-height="calc(100vh - 340px)">
        <el-table-column prop="platform" label="平台" width="70">
          <template #default="{ row }">{{ row.platform === 'tmall' ? '天猫' : '京东' }}</template>
        </el-table-column>
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="productName" label="商品名称" show-overflow-tooltip />
        <el-table-column prop="refundNo" label="退款单号" width="180" />
        <el-table-column label="退款金额" width="110">
          <template #default="{ row }">¥{{ fmt(row.refundAmount) }}</template>
        </el-table-column>
      </el-table>
      <div class="pagination" v-if="total > 10">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @current-change="loadDetail"
          @size-change="onSizeChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { refundApi } from '../api'
import { useMonths } from '../utils/composables'
const { months } = useMonths()

const month = ref('')
const platform = ref('all')
const summary = ref({})
const details = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

function fmt(v) { return (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

async function loadData() {
  page.value = 1
  await loadSummary()
  await loadDetail()
}

async function loadSummary() {
  const p = { month: month.value || undefined, platform: platform.value }
  summary.value = (await refundApi.getSummary(p)).data
}

async function loadDetail() {
  const p = { month: month.value || undefined, platform: platform.value, page: page.value, pageSize: pageSize.value }
  const res = (await refundApi.getDetail(p)).data
  details.value = res.data || []
  total.value = res.total ?? details.value.length
}

function onSizeChange() { page.value = 1; loadDetail() }

onMounted(loadData)
</script>

<style scoped>
.filter-bar { margin-bottom: 16px; }
.kpi-row { margin-bottom: 12px; }
.mt16 { margin-top: 12px; }
.pagination { margin-top: 12px; display: flex; justify-content: flex-end; }
.kpi-label { font-size: 13px; color: #909399; margin-bottom: 8px; }
.kpi-value { font-size: 24px; font-weight: bold; }
</style>
