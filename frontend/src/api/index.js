import axios from 'axios'
import { ElMessage } from 'element-plus'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

request.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      ElMessage.error('登录已过期，请重新登录')
      setTimeout(() => window.location.href = '/login', 1000)
    } else {
      ElMessage.error(error.response?.data?.msg || '网络错误')
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  register: (data) => request.post('/auth/register', data),
  login: (data) => request.post('/auth/login', data),
  getInfo: () => request.get('/auth/info'),
  switchRole: (role) => request.put('/auth/role', { role })
}

export const rideApi = {
  publish: (data) => request.post('/rides', data),
  list: (params) => request.get('/rides', { params }),
  detail: (id) => request.get(`/rides/${id}`),
  cancel: (id) => request.put(`/rides/${id}/cancel`),
  myPublished: () => request.get('/rides/my/published')
}

export const orderApi = {
  join: (rideId) => request.post('/orders/join', { ride_id: rideId }),
  accept: (rideId) => request.post('/orders/accept', { ride_id: rideId }),
  confirm: (id) => request.put(`/orders/${id}/confirm`),
  start: (id) => request.put(`/orders/${id}/start`),
  complete: (id) => request.put(`/orders/${id}/complete`),
  cancel: (id) => request.put(`/orders/${id}/cancel`),
  myOrders: (params) => request.get('/orders/my', { params })
}

export const notificationApi = {
  list: (params) => request.get('/notifications', { params }),
  unreadCount: () => request.get('/notifications/unread/count'),
  read: (id) => request.put(`/notifications/${id}/read`),
  readAll: () => request.put('/notifications/read/all')
}

export const ratingApi = {
  submit: (data) => request.post('/ratings', data),
  driverRating: (driverId) => request.get(`/ratings/driver/${driverId}`),
  orderRating: (orderId) => request.get(`/ratings/order/${orderId}`)
}

export default request