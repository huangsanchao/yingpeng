<template>
  <div class="page">
    <div class="toolbar">
      <h3>销售员列表</h3>
      <el-button type="primary" @click="showDialog('add')">新增销售员</el-button>
    </div>

    <el-card shadow="hover">
      <el-table :data="salespeople" stripe v-loading="loading">
        <el-table-column prop="name" label="姓名" width="150" />
        <el-table-column prop="phone" label="电话" width="160" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '在职' : '离职' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="200">
          <template #default="{ row }">{{ row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN') : '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="showDialog('edit', row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="deleteItem(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑 -->
    <el-dialog v-model="showAddDialog" :title="editMode === 'add' ? '新增销售员' : '编辑销售员'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="姓名"><el-input v-model="form.name" placeholder="姓名" /></el-form-item>
        <el-form-item label="电话"><el-input v-model="form.phone" placeholder="电话号码" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width:100%">
            <el-option label="在职" value="active" />
            <el-option label="离职" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveItem">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { baseDataApi } from '../api'

const salespeople = ref([])
const loading = ref(false)
const showAddDialog = ref(false)
const editMode = ref('add')
const editingId = ref(null)
const form = ref({ name: '', phone: '', status: 'active' })

async function loadData() {
  loading.value = true
  try {
    salespeople.value = (await baseDataApi.getSalespeople()).data
  } catch (e) { console.error(e) }
  loading.value = false
}

function showDialog(mode, row) {
  editMode.value = mode
  if (mode === 'edit' && row) {
    editingId.value = row._id
    form.value = { name: row.name, phone: row.phone || '', status: row.status }
  } else {
    editingId.value = null
    form.value = { name: '', phone: '', status: 'active' }
  }
  showAddDialog.value = true
}

async function saveItem() {
  try {
    if (editMode.value === 'edit') {
      await baseDataApi.updateSalesperson(editingId.value, form.value)
      ElMessage.success('更新成功')
    } else {
      await baseDataApi.addSalesperson(form.value)
      ElMessage.success('添加成功')
    }
    showAddDialog.value = false
    loadData()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '操作失败')
  }
}

async function deleteItem(row) {
  try {
    await ElMessageBox.confirm(`确认删除销售员 "${row.name}"？`, '确认删除', { type: 'warning' })
    await baseDataApi.deleteSalesperson(row._id)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.response?.data?.error || '删除失败')
  }
}

onMounted(loadData)
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { font-size: 16px; font-weight: 600; color: #303133; }
</style>
