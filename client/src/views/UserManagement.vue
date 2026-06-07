<template>
  <div class="page">
    <div class="toolbar">
      <h3>用户管理</h3>
      <el-button type="primary" @click="showAddDialog = true">新增用户</el-button>
    </div>

    <el-card shadow="hover">
      <el-table :data="users" stripe v-loading="loading">
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="realName" label="姓名" width="150" />
        <el-table-column label="角色" width="120">
          <template #default="{ row }">{{ roleLabel(row.role) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="200">
          <template #default="{ row }">{{ row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN') : '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="260">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="editUser(row)">编辑</el-button>
            <el-button type="warning" link size="small" @click="resetPassword(row)">重置密码</el-button>
            <el-button type="danger" link size="small" @click="deleteUser(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑用户 -->
    <el-dialog v-model="showAddDialog" :title="editingUser ? '编辑用户' : '新增用户'" width="500px">
      <el-form :model="userForm" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="userForm.username" :disabled="!!editingUser" placeholder="用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="userForm.password" type="password" :placeholder="editingUser ? '留空不修改' : '密码'" show-password />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="userForm.realName" placeholder="姓名" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userForm.role" style="width:100%">
            <el-option label="管理员" value="admin" />
            <el-option label="财务" value="finance" />
            <el-option label="运营" value="ops" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>

    <!-- 密码重置确认 -->
    <el-dialog v-model="showResetDialog" title="重置密码" width="400px">
      <p>确认将用户 <strong>{{ resetTarget?.username }}</strong> 的密码重置为默认密码？</p>
      <p style="color:#f56c6c;font-size:13px;margin-top:8px">默认密码：{{ resetDefaultPwd }}</p>
      <template #footer>
        <el-button @click="showResetDialog = false">取消</el-button>
        <el-button type="warning" @click="confirmReset">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const users = ref([])
const loading = ref(false)
const showAddDialog = ref(false)
const editingUser = ref(null)
const userForm = ref({ username: '', password: '', realName: '', role: 'ops' })
const showResetDialog = ref(false)
const resetTarget = ref(null)
const resetDefaultPwd = '123456'

const roleLabels = { admin: '管理员', finance: '财务', ops: '运营' }
function roleLabel(r) { return roleLabels[r] || r }

async function loadUsers() {
  loading.value = true
  try {
    users.value = (await api.get('/users/list')).data
  } catch (e) { console.error(e) }
  loading.value = false
}

function editUser(row) {
  editingUser.value = row
  userForm.value = { username: row.username, password: '', realName: row.realName || '', role: row.role }
  showAddDialog.value = true
}

async function saveUser() {
  try {
    if (editingUser.value) {
      await api.put(`/users/${editingUser.value._id}`, userForm.value)
      ElMessage.success('更新成功')
    } else {
      await api.post('/users/create', userForm.value)
      ElMessage.success('创建成功')
    }
    showAddDialog.value = false
    editingUser.value = null
    userForm.value = { username: '', password: '', realName: '', role: 'ops' }
    loadUsers()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '操作失败')
  }
}

function resetPassword(row) {
  resetTarget.value = row
  showResetDialog.value = true
}

async function confirmReset() {
  try {
    await api.put(`/users/${resetTarget.value._id}`, { password: resetDefaultPwd })
    ElMessage.success('密码已重置')
    showResetDialog.value = false
    resetTarget.value = null
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '重置失败')
  }
}

async function deleteUser(row) {
  try {
    await ElMessageBox.confirm(`确认删除用户 "${row.username}"？`, '确认删除', { type: 'warning' })
    await api.delete(`/users/${row._id}`)
    ElMessage.success('删除成功')
    loadUsers()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.response?.data?.error || '删除失败')
  }
}

onMounted(loadUsers)
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { font-size: 16px; font-weight: 600; color: #303133; }
</style>
