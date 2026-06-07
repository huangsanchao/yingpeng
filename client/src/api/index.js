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
