<template>
  <div class="page">
    <div class="toolbar">
      <h3>仓库列表</h3>
      <el-button type="primary" @click="showDialog('add')">新增仓库</el-button>
    </div>

    <el-card shadow="hover">
      <el-table :data="warehouses" stripe v-loading="loading">
        <el-table-column prop="name" label="仓库名称" width="180" />
        <el-table-column prop="code" label="编码" width="120" />
        <el-table-column prop="address" label="地址" show-overflow-tooltip />
        <el-table-column prop="contact" label="联系人" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
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
    <el-dialog v-model="showAddDialog" :title="editMode === 'add' ? '新增仓库' : '编辑仓库'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="仓库名称"><el-input v-model="form.name" placeholder="如：上海仓库" /></el-form-item>
        <el-form-item label="编码"><el-input v-model="form.code" placeholder="如：sh" /></el-form-item>
        <el-form-item label="地址"><el-input v-model="form.address" placeholder="仓库地址" /></el-form-item>
        <el-form-item label="联系人"><el-input v-model="form.contact" placeholder="联系人" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width:100%">
            <el-option label="启用" value="active" />
            <el-option label="停用" value="inactive" />
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

const warehouses = ref([])
const loading = ref(false)
const showAddDialog = ref(false)
const editMode = ref('add')
const editingId = ref(null)
const form = ref({ name: '', code: '', address: '', contact: '', status: 'active' })

async function loadData() {
  loading.value = true
  try {
    const res = await baseDataApi.getWarehouses()
    warehouses.value = res.data?.data || res.data || []
  } catch (e) { console.error(e) }
  loading.value = false
}

function showDialog(mode, row) {
  editMode.value = mode
  if (mode === 'edit' && row) {
    editingId.value = row._id
    form.value = { name: row.name, code: row.code, address: row.address || '', contact: row.contact || '', status: row.status }
  } else {
    editingId.value = null
    form.value = { name: '', code: '', address: '', contact: '', status: 'active' }
  }
  showAddDialog.value = true
}

async function saveItem() {
  try {
    if (editMode.value === 'edit') {
      await baseDataApi.updateWarehouse(editingId.value, form.value)
      ElMessage.success('更新成功')
    } else {
      await baseDataApi.addWarehouse(form.value)
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
    await ElMessageBox.confirm(`确认删除仓库 "${row.name}"？`, '确认删除', { type: 'warning' })
    await baseDataApi.deleteWarehouse(row._id)
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
