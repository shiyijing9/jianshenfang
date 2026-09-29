import axios from 'axios'
import { loadOrders, saveOrders } from '../data/orders.js'

const transport = async (config) => {
  await new Promise((resolve) => setTimeout(resolve, 160))
  const url = config.url.replace(/^.*\/api/, '')
  const method = config.method.toLowerCase()
  const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data || {}
  let orders = loadOrders()
  let data

  if (url === '/orders' && method === 'get') {
    const params = config.params || {}
    let result = [...orders]
    if (params.statuses?.length)
      result = result.filter((order) => params.statuses.includes(order.status))
    if (params.orderNo) result = result.filter((order) => order.id === params.orderNo.trim())
    if (params.memberName)
      result = result.filter((order) => order.memberName.includes(params.memberName.trim()))
    result.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    const total = result.length
    const start = (params.page - 1) * params.pageSize
    data = { list: result.slice(start, start + params.pageSize), total }
  } else if (url === '/orders' && method === 'post') {
    const years = Number(body.years)
    const order = {
      ...body,
      id: `ORD-${Date.now()}`,
      amount: years * 1200,
      status: '待审核',
      createdAt: new Date().toISOString(),
    }
    orders = [order, ...orders]
    saveOrders(orders)
    data = order
  } else if (url === '/orders/renew' && method === 'post') {
    const eligible = new Set(body.ids)
    const updated = orders.map((order) => {
      if (!eligible.has(order.id)) return order
      const years = Number(body.years)
      const addedAmount = years * 1200 * (years >= 5 ? 0.8 : 1)
      return {
        ...order,
        years: order.years + years,
        amount: order.amount + addedAmount,
        status: '待审核',
      }
    })
    orders = updated
    saveOrders(orders)
    data = { success: true }
  } else if (url === '/orders/cancel' && method === 'post') {
    const ids = new Set(body.ids)
    orders = orders.map((order) => (ids.has(order.id) ? { ...order, status: '已取消' } : order))
    saveOrders(orders)
    data = { success: true }
  } else {
    return Promise.reject(
      new axios.AxiosError('请求资源不存在', 'ERR_NOT_FOUND', config, null, {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config,
        data: null,
      }),
    )
  }

  return { data, status: 200, statusText: 'OK', headers: {}, config, request: null }
}

export const http = axios.create({ baseURL: '/api', timeout: 5000, adapter: transport })
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('club_mock_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('club_mock_token')
      localStorage.removeItem('club_username')
      window.location.assign('/login')
    }
    return Promise.reject(error)
  },
)

export const orderApi = {
  list: (params) => http.get('/orders', { params }).then((response) => response.data),
  create: (order) => http.post('/orders', order).then((response) => response.data),
  renew: (ids, years) =>
    http.post('/orders/renew', { ids, years }).then((response) => response.data),
  cancel: (ids) => http.post('/orders/cancel', { ids }).then((response) => response.data),
}
