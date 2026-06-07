import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/login', component: () => import('../views/Login.vue') },
  { path: '/', redirect: '/sales' },
  { path: '/sales', component: () => import('../views/Sales.vue'), meta: { auth: true } },
  { path: '/billing', component: () => import('../views/Billing.vue'), meta: { auth: true } },
  { path: '/cost', component: () => import('../views/Cost.vue'), meta: { auth: true } },
  { path: '/refund', component: () => import('../views/Refund.vue'), meta: { auth: true } },
  { path: '/payment', component: () => import('../views/Payment.vue'), meta: { auth: true } },
  { path: '/expense', component: () => import('../views/Expense.vue'), meta: { auth: true } },
  { path: '/users', component: () => import('../views/UserManagement.vue'), meta: { auth: true, role: 'admin' } },
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
