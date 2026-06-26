<template>
  <div class="page">
    <div class="toolbar">
      <div class="filter-bar">
        <el-input v-model="username" placeholder="搜索用户" style="width:150px" clearable @keyup.enter="loadLogs" @clear="loadLogs" />
        <el-select v-model="action" placeholder="操作类型" style="width:130px;margin-left:10px" clearable @change="loadLogs">
          <el-option label="登录" value="login" />
          <el-option label="导入" value="import" />
          <el-option label="删除" value="delete" />
          <el-option label="备份" value="backup" />
          <el-option label="恢复" value="restore" />
        </el-select>
      </div>
      <el-button type="primary" @click="handleBackup" v-if="isAdmin">执行备份</el-button>
    </div>

    <el-card shadow="hover">
      <template #header>操作日志</template>
      <el-table :data="logs" stripe v-loading="loading" max-height="calc(100vh - 320px)">
        <el-table-column prop="username" label="操作人" width="120" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">{{ actionLabel(row.action) }}</template>
        </el-table-column>
        <el-table-column prop="resource" label="资源" width="100" />
        <el-table-column prop="detail" label="详情" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP" width="150" />
        <el-table-column label="时间" width="200">
          <template #default="{ row }">{{ row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN') : '-' }}</template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]" :total="total"
          layout="total, sizes, prev, pager, next"
          @current-change="loadLogs" @size-change="onSizeChange" />
      </div>
    </el-card>

    <el-card shadow="hover" class="mt16" v-if="isAdmin">
      <template #header>数据备份管理</template>
      <el-table :data="backups" stripe v-loading="backupLoading" max-height="300">
        <el-table-column prop="name" label="备份名称" show-overflow-tooltip />
        <el-table-column label="备份时间" width="200">
          <template #default="{ row }">{{ new Date(row.time).toLocaleString('zh-CN') }}</template>
        </el-table-column>
        <el-table-column prop="size" label="大小" width="100" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="warning" link size="small" @click="handleRestore(row)">恢复</el-button>
            <el-button type="danger" link size="small" @click="handleDeleteBackup(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!backupLoading && !backups.length" description="暂无备份" :image-size="60" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const logs = ref([])
const backups = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const backupLoading = ref(false)
const username = ref('')
const action = ref('')

const user = computed(() => {
  try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
})
const isAdmin = computed(() => user.value.role === 'admin')

const actionLabels = { login: '登录', import: '导入', delete: '删除', backup: '备份', restore: '恢复' }
function actionLabel(a) { return actionLabels[a] || a }

async function loadLogs() {
  loading.value = true
  page.value = 1
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (username.value) params.username = username.value
    if (action.value) params.action = action.value
    const res = (await api.get('/system/logs', { params })).data
    logs.value = res.data || []
    total.value = res.total || 0
  } catch (e) { console.error(e) }
  loading.value = false
}

function onSizeChange() { page.value = 1; loadLogs() }

async function handleBackup() {
  backupLoading.value = true
  try {
    await api.post('/system/backup')
    ElMessage.success('备份成功')
    loadBackups()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '备份失败')
  } finally {
    backupLoading.value = false
  }
}

async function loadBackups() {
  try {
    backups.value = (await api.get('/system/backups')).data || []
  } catch (e) { console.error(e) }
}

async function handleRestore(row) {
  try {
    await ElMessageBox.confirm(
      `确认从 "${row.name}" 恢复？当前数据将被覆盖！`,
      '恢复确认',
      { type: 'warning', confirmButtonText: '确认恢复', cancelButtonText: '取消' }
    )
    backupLoading.value = true
    await api.post('/system/restore', { backupName: row.name })
    ElMessage.success('恢复成功，页面将自动刷新')
    loadBackups()
    setTimeout(() => window.location.reload(), 1500)
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.response?.data?.error || '恢复失败')
  } finally {
    backupLoading.value = false
  }
}

async function handleDeleteBackup(row) {
  try {
    await ElMessageBox.confirm(`确认删除备份 "${row.name}"？`, '删除确认', { type: 'warning' })
    await api.delete(`/system/backup/${row.name}`)
    ElMessage.success('已删除')
    loadBackups()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.response?.data?.error || '删除失败')
  }
}

onMounted(() => { loadLogs(); loadBackups() })
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.filter-bar { display: flex; align-items: center; }
.pagination { margin-top: 12px; display: flex; justify-content: flex-end; }
.mt16 { margin-top: 16px; }
</style>
