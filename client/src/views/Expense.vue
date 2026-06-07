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

    <el-card shadow="hover">
      <template #header>费用汇总</template>
      <el-row :gutter="16">
        <el-col :span="6" v-for="c in summary.categories" :key="c.category">
          <div style="text-align:center;padding:16px;border:1px solid #ebeef5;border-radius:8px;margin-bottom:12px">
            <div style="font-size:13px;color:#909399">{{ c.category }}</div>
            <div style="font-size:22px;font-weight:bold;margin:8px 0">¥{{ fmt(c.amount) }}</div>
            <div style="font-size:12px;color:#c0c4cc">{{ c.count }} 笔</div>
          </div>
        </el-col>
      </el-row>
      <div style="text-align:right;font-size:18px;font-weight:bold;margin-top:12px">
        总费用: ¥{{ fmt(summary.total) }}
      </div>
    </el-card>

    <el-card class="mt16" shadow="hover">
      <template #header>费用明细</template>
      <el-table :data="details" stripe max-height="calc(100vh - 340px)">
        <el-table-column prop="platform" label="平台" width="70">
          <template #default="{ row }">{{ row.platform === 'tmall' ? '天猫' : '京东' }}</template>
        </el-table-column>
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="expenseItem" label="费用项" width="150" />
        <el-table-column prop="expenseCategory" label="费用大类" width="110" />
        <el-table-column label="金额" width="110">
          <template #default="{ row }">¥{{ Math.abs(row.amount).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="settlementTime" label="结算时间" width="170">
          <template #default="{ row }">{{ row.settlementTime ? new Date(row.settlementTime).toLocaleDateString() : '-' }}</template>
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
import { expenseApi } from '../api'
import { useMonths } from '../utils/composables'
const { months } = useMonths()

const month = ref('')
const platform = ref('all')
const summary = ref({ categories: [], total: 0 })
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
  summary.value = (await expenseApi.getSummary(p)).data
}

async function loadDetail() {
  const p = { month: month.value || undefined, platform: platform.value, page: page.value, pageSize: pageSize.value }
  const res = (await expenseApi.getDetail(p)).data
  details.value = res.data || []
  total.value = res.total ?? details.value.length
}

function onSizeChange() { page.value = 1; loadDetail() }

onMounted(loadData)
</script>

<style scoped>
.filter-bar { margin-bottom: 16px; }
.mt16 { margin-top: 12px; }
.pagination { margin-top: 12px; display: flex; justify-content: flex-end; }
</style>
