<template>
  <div class="page">
    <div class="toolbar">
      <h3>商品列表</h3>
      <el-button type="primary" @click="showDialog('add')">新增商品</el-button>
    </div>

    <el-card shadow="hover">
      <el-table :data="products" stripe v-loading="loading">
        <el-table-column prop="productName" label="商品名称" show-overflow-tooltip />
        <el-table-column prop="sku" label="SKU" width="200" show-overflow-tooltip />
        <el-table-column prop="productId" label="商品ID" width="150" />
        <el-table-column prop="costPrice" label="成本价" width="110">
          <template #default="{ row }">¥{{ (row.costPrice || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="showDialog('edit', row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="deleteItem(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑 -->
    <el-dialog v-model="showAddDialog" :title="editMode === 'add' ? '新增商品' : '编辑商品'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="商品名称"><el-input v-model="form.productName" placeholder="商品名称" /></el-form-item>
        <el-form-item label="SKU"><el-input v-model="form.sku" placeholder="SKU" /></el-form-item>
        <el-form-item label="商品ID"><el-input v-model="form.productId" placeholder="商品ID" /></el-form-item>
        <el-form-item label="成本价"><el-input-number v-model="form.costPrice" :min="0" :precision="2" style="width:100%" /></el-form-item>
        <el-form-item label="分类"><el-input v-model="form.category" placeholder="分类" /></el-form-item>
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

const products = ref([])
const loading = ref(false)
const showAddDialog = ref(false)
const editMode = ref('add')
const editingId = ref(null)
const form = ref({ productName: '', sku: '', productId: '', costPrice: 0, category: '' })

async function loadData() {
  loading.value = true
  try {
    products.value = (await baseDataApi.getProducts()).data
  } catch (e) { console.error(e) }
  loading.value = false
}

function showDialog(mode, row) {
  editMode.value = mode
  if (mode === 'edit' && row) {
    editingId.value = row._id
    form.value = { productName: row.productName, sku: row.sku, productId: row.productId, costPrice: row.costPrice || 0, category: row.category || '' }
  } else {
    editingId.value = null
    form.value = { productName: '', sku: '', productId: '', costPrice: 0, category: '' }
  }
  showAddDialog.value = true
}

async function saveItem() {
  try {
    if (editMode.value === 'edit') {
      await baseDataApi.updateProduct(editingId.value, form.value)
      ElMessage.success('更新成功')
    } else {
      await baseDataApi.addProduct(form.value)
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
    await ElMessageBox.confirm(`确认删除商品 "${row.productName}"？`, '确认删除', { type: 'warning' })
    await baseDataApi.deleteProduct(row._id)
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
