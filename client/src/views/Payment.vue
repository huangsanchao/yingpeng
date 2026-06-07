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
      <el-col :span="6"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">订单数</div><div class="kpi-value">{{ summary.orderCount }}</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">应回款</div><div class="kpi-value">¥{{ fmt(summary.shouldPay) }}</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">已回款</div><div class="kpi-value" style="color:#67c23a">¥{{ fmt(summary.actualPay) }}</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">回款率</div><div class="kpi-value" style="color:#409eff">{{ summary.payRate }}%</div></div></el-card></el-col>
    </el-row>

    <el-card class="mt16" shadow="hover" v-if="summary.diff > 0">
      <el-alert :title="`当前有 ¥${fmt(summary.diff)} 未回款`" type="warning" :closable="false" show-icon />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { paymentApi } from '../api'
import { useMonths } from '../utils/composables'
const { months } = useMonths()

const month = ref('')
const platform = ref('all')
const summary = ref({})

function fmt(v) { return (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

async function loadData() {
  const p = { month: month.value || undefined, platform: platform.value }
  summary.value = (await paymentApi.getSummary(p)).data
}

onMounted(loadData)
</script>

<style scoped>
.filter-bar { margin-bottom: 16px; }
.kpi-row { margin-bottom: 12px; }
.mt16 { margin-top: 12px; }
.kpi-label { font-size: 13px; color: #909399; margin-bottom: 8px; }
.kpi-value { font-size: 24px; font-weight: bold; }
</style>
