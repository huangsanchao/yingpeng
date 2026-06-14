import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/login', component: () => import('../views/Login.vue') },
  { path: '/', redirect: '/sales' },
  // 运营中心
  { path: '/sales', component: () => import('../views/Sales.vue'), meta: { auth: true } },
  { path: '/refund', component: () => import('../views/Refund.vue'), meta: { auth: true } },
  { path: '/customers', component: () => import('../views/Customers.vue'), meta: { auth: true } },
  // 财务管理
  { path: '/billing', component: () => import('../views/Billing.vue'), meta: { auth: true } },
  { path: '/payment', component: () => import('../views/Payment.vue'), meta: { auth: true } },
  { path: '/cost', component: () => import('../views/Cost.vue'), meta: { auth: true } },
  { path: '/expense', component: () => import('../views/Expense.vue'), meta: { auth: true } },
  // 基础资料
  { path: '/products', component: () => import('../views/Products.vue'), meta: { auth: true } },
  { path: '/platforms', component: () => import('../views/Platforms.vue'), meta: { auth: true } },
  { path: '/warehouses', component: () => import('../views/Warehouses.vue'), meta: { auth: true } },
  { path: '/salespeople', component: () => import('../views/Salespeople.vue'), meta: { auth: true } },
  // 系统管理
  { path: '/users', component: () => import('../views/UserManagement.vue'), meta: { auth: true, role: 'admin' } },
  { path: '/roles', component: () => import('../views/Roles.vue'), meta: { auth: true, role: 'admin' } },
  { path: '/system', component: () => import('../views/SystemLog.vue'), meta: { auth: true, role: 'admin' } }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, from, next) => {
  if (to.path === '/login') return next()
  const token = localStorage.getItem('token')
  if (!token) return next('/login')

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  if (to.meta.role === 'admin' && user.role !== 'admin') return next('/sales')
  next()
})

export default router
