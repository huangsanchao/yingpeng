import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !err.config.url?.includes('/auth/login')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

export const salesApi = {
  getSummary(params) { return api.get('/sales/summary', { params }) },
  getDetail(params) { return api.get('/sales/detail', { params }) }
}

export const costApi = {
  getSummary(params) { return api.get('/cost/summary', { params }) },
  getList() { return api.get('/cost/list') },
  addCost(data) { return api.post('/cost/cost', data) },
  deleteCost(id) { return api.delete(`/cost/cost/${id}`) },
  batchCost(items) { return api.post('/cost/cost/batch', { items }) }
}

export const refundApi = {
  getSummary(params) { return api.get('/refund/summary', { params }) },
  getDetail(params) { return api.get('/refund/detail', { params }) }
}

export const paymentApi = {
  getSummary(params) { return api.get('/payment/summary', { params }) }
}

export const expenseApi = {
  getSummary(params) { return api.get('/expense/summary', { params }) },
  getDetail(params) { return api.get('/expense/detail', { params }) }
}

// 销售合同 API
export const contractsApi = {
  getList(params) { return api.get('/contracts/list', { params }) },
  add(data) { return api.post('/contracts', data) },
  update(id, data) { return api.put(`/contracts/${id}`, data) },
  delete(id) { return api.delete(`/contracts/${id}`) },
  batchDelete(ids) { return api.delete('/contracts/batch', { data: { ids } }) },
  exportExcel(params) { return api.get('/contracts/export', { params, responseType: 'blob' }) }
}

// 基础资料 API
export const baseDataApi = {
  // 商品
  getProducts() { return api.get('/base/products') },
  addProduct(data) { return api.post('/base/products', data) },
  updateProduct(id, data) { return api.put(`/base/products/${id}`, data) },
  deleteProduct(id) { return api.delete(`/base/products/${id}`) },
  // 平台
  getPlatforms() { return api.get('/base/platforms') },
  addPlatform(data) { return api.post('/base/platforms', data) },
  updatePlatform(id, data) { return api.put(`/base/platforms/${id}`, data) },
  deletePlatform(id) { return api.delete(`/base/platforms/${id}`) },
  // 仓库
  getWarehouses() { return api.get('/base/warehouses') },
  addWarehouse(data) { return api.post('/base/warehouses', data) },
  updateWarehouse(id, data) { return api.put(`/base/warehouses/${id}`, data) },
  deleteWarehouse(id) { return api.delete(`/base/warehouses/${id}`) },
  // 销售员
  getSalespeople() { return api.get('/base/salespeople') },
  addSalesperson(data) { return api.post('/base/salespeople', data) },
  updateSalesperson(id, data) { return api.put(`/base/salespeople/${id}`, data) },
  deleteSalesperson(id) { return api.delete(`/base/salespeople/${id}`) }
}
