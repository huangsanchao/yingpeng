<template>
  <!-- 登录页独立全屏显示 -->
  <router-view v-if="isLoginPage" />

  <!-- 其他页面使用侧边栏布局 -->
  <el-container v-else class="app-container">
    <el-aside width="200px" class="sidebar">
      <div class="logo">
        <h2>运营分析平台</h2>
      </div>
      <el-menu :default-active="activeMenu" router class="nav-menu">

        <!-- 运营中心 -->
        <el-sub-menu index="operations">
          <template #title><el-icon><Shop /></el-icon><span>运营中心</span></template>
          <el-menu-item index="/sales">订单列表</el-menu-item>
          <el-menu-item index="/refund">售后退款</el-menu-item>
          <el-menu-item index="/customers">客户管理</el-menu-item>
        </el-sub-menu>

        <!-- 财务管理 -->
        <el-sub-menu index="finance">
          <template #title><el-icon><Money /></el-icon><span>财务管理</span></template>
          <el-menu-item index="/billing">账单列表</el-menu-item>
          <el-menu-item index="/payment">回款管理</el-menu-item>
          <el-menu-item index="/cost">成本核算</el-menu-item>
          <el-menu-item index="/expense">费用分析</el-menu-item>
        </el-sub-menu>

        <!-- 基础资料 -->
        <el-sub-menu index="base">
          <template #title><el-icon><Files /></el-icon><span>基础资料</span></template>
          <el-menu-item index="/products">商品列表</el-menu-item>
          <el-menu-item index="/platforms">平台列表</el-menu-item>
          <el-menu-item index="/warehouses">仓库列表</el-menu-item>
          <el-menu-item index="/salespeople">销售员列表</el-menu-item>
        </el-sub-menu>

        <!-- 系统管理 -->
        <el-sub-menu index="system" v-if="isAdmin">
          <template #title><el-icon><Setting /></el-icon><span>系统管理</span></template>
          <el-menu-item index="/users">用户管理</el-menu-item>
          <el-menu-item index="/roles">角色权限</el-menu-item>
          <el-menu-item index="/system">操作日志</el-menu-item>
        </el-sub-menu>

      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="page-header">
        <h3>{{ pageTitle }}</h3>
        <div class="header-right">
          <el-dropdown trigger="hover">
            <span class="user-info">{{ user.realName || user.username }}（{{ roleLabel }}）<el-icon style="margin-left:4px"><ArrowDown /></el-icon></span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="showPwdDialog = true">修改密码</el-dropdown-item>
                <el-dropdown-item @click="handleLogout" divided style="color:#f56c6c">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main-content">
        <router-view :key="$route.fullPath" />
      </el-main>
    </el-container>
  </el-container>

  <!-- 修改密码弹框 -->
  <el-dialog v-model="showPwdDialog" title="修改密码" width="400px">
    <el-form :model="pwdForm" label-width="80px">
      <el-form-item label="旧密码">
        <el-input v-model="pwdForm.oldPassword" type="password" placeholder="请输入旧密码" show-password />
      </el-form-item>
      <el-form-item label="新密码">
        <el-input v-model="pwdForm.newPassword" type="password" placeholder="请输入新密码" show-password />
      </el-form-item>
      <el-form-item label="确认密码">
        <el-input v-model="pwdForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="showPwdDialog = false">取消</el-button>
      <el-button type="primary" @click="handleChangePwd" :loading="pwdLoading">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Shop, Money, Files, Setting, ArrowDown } from '@element-plus/icons-vue'
import api from './api'

const route = useRoute()
const router = useRouter()
const activeMenu = computed(() => route.path)

const isLoginPage = computed(() => route.path === '/login')

const user = computed(() => {
  try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
})
const isAdmin = computed(() => user.value.role === 'admin')
const roleLabels = { admin: '管理员', finance: '财务', ops: '运营' }
const roleLabel = computed(() => roleLabels[user.value.role] || '')

const titleMap = {
  '/sales': '订单列表',
  '/billing': '账单列表',
  '/cost': '成本核算',
  '/refund': '售后退款',
  '/payment': '回款管理',
  '/expense': '费用分析',
  '/customers': '客户管理',
  '/products': '商品列表',
  '/platforms': '平台列表',
  '/warehouses': '仓库列表',
  '/salespeople': '销售员列表',
  '/users': '用户管理',
  '/roles': '角色权限',
  '/system': '操作日志'
}
const pageTitle = computed(() => titleMap[route.path] || '运营分析平台')

const showPwdDialog = ref(false)
const pwdLoading = ref(false)
const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })

async function handleChangePwd() {
  if (!pwdForm.value.oldPassword || !pwdForm.value.newPassword || !pwdForm.value.confirmPassword) {
    return ElMessage.warning('请填写完整')
  }
  if (pwdForm.value.newPassword !== pwdForm.value.confirmPassword) {
    return ElMessage.warning('两次密码输入不一致')
  }
  pwdLoading.value = true
  try {
    await api.put(`/users/${user.value.id}`, { password: pwdForm.value.newPassword }, {
      headers: { 'X-Old-Password': pwdForm.value.oldPassword }
    })
    ElMessage.success('密码修改成功')
    showPwdDialog.value = false
    pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '修改失败')
  } finally {
    pwdLoading.value = false
  }
}

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app { height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f2f5; }
.app-container { height: 100vh; }
.sidebar { background: #1d1e2c; overflow-y: auto; }
.logo { padding: 20px; text-align: center; border-bottom: 1px solid #2d2e3c; }
.logo h2 { color: #fff; font-size: 18px; font-weight: 600; }

.nav-menu { border-right: none; background: #1d1e2c !important; }

/* 子菜单标题 */
.nav-menu :deep(.el-sub-menu__title) {
  color: #6464c9 !important;
  font-size: 14px;
  height: 44px;
  line-height: 44px;
  padding-left: 16px !important;
}
.nav-menu :deep(.el-sub-menu__title:hover) {
  background: rgba(255, 255, 255, 0.05) !important;
  color: #6464c9 !important;
}
/* 覆盖 Element Plus 默认样式 */
.nav-menu { border-right: none; background: #1d1e2c; }
.nav-menu .el-menu { background: transparent; }
.nav-menu .el-menu-item { background: transparent; color: #a0a0b0; }
.nav-menu .el-sub-menu__title { background: transparent; color: #c0c0d0; }
.nav-menu .el-sub-menu .el-menu { background: #252637; }
.nav-menu .el-sub-menu .el-menu .el-menu-item { background: #252637; color: #a0a0b8; }

/* hover */
.nav-menu .el-menu-item:hover,
.nav-menu .el-sub-menu__title:hover { background: rgba(255,255,255,.05); color: #fff; }
.nav-menu .el-sub-menu .el-menu .el-menu-item:hover { background: #2d2e40; color: #fff; }

/* active — 用更具体的选择器确保覆盖子菜单项 */
.nav-menu .el-menu-item.is-active { background: rgba(255,255,255,.05); color: #fff; }
.nav-menu .el-sub-menu .el-menu .el-menu-item.is-active { background: rgba(255,255,255,.05); color: #fff; }

/* 子菜单内容容器 */
.nav-menu :deep(.el-sub-menu .el-menu) {
  background: #252637 !important;
}

/* 子菜单内容项 — 用 !important 覆盖 Element Plus 默认白色背景 */
.nav-menu :deep(.el-sub-menu .el-menu .el-menu-item) {
  background: #252637 !important;
  color: #a0a0b8 !important;
  height: 40px !important;
  line-height: 40px !important;
  padding-left: 40px !important;
  font-size: 13px;
}
.nav-menu :deep(.el-sub-menu .el-menu .el-menu-item:hover) {
  background: #2d2e40 !important;
  color: #6464c9 !important;
}
.nav-menu :deep(.el-sub-menu .el-menu .el-menu-item.is-active) {
  background: #409eff !important;
  color: #6464c9 !important;
}

.nav-menu .el-icon { margin-right: 8px; }

.page-header {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,.04);
}
.page-header h3 { font-size: 16px; font-weight: 600; color: #303133; }
.header-right { display: flex; align-items: center; gap: 12px; }
.user-info { font-size: 13px; color: #606266; cursor: pointer; }
.user-info:hover { color: #409eff; }
.main-content { background: #f0f2f5; padding: 16px 24px; overflow-y: auto; }
.main-content::-webkit-scrollbar { width: 6px; }
.main-content::-webkit-scrollbar-thumb { background: #c0c4cc; border-radius: 3px; }
.main-content::-webkit-scrollbar-track { background: transparent; }
</style>
