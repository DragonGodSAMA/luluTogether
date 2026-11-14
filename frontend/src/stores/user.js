import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { authApi } from '../api'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const isDriver = computed(() => ['driver', 'both'].includes(user.value?.role))
  const isPassenger = computed(() => ['passenger', 'both'].includes(user.value?.role))
  const realtimeStatus = ref('disconnected')
  const realtimeListeners = new Set()
  let realtimeSocket = null
  let reconnectTimer = null
  let realtimeToken = ''
  let shouldReconnect = true

  function setAuth(tokenValue, userValue) {
    token.value = tokenValue
    user.value = userValue
    localStorage.setItem('token', tokenValue)
    localStorage.setItem('user', JSON.stringify(userValue))
  }

  function clearAuth() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  function connectRealtime() {
    if (!token.value || typeof WebSocket === 'undefined') return
    if (realtimeSocket && realtimeToken === token.value && [WebSocket.OPEN, WebSocket.CONNECTING].includes(realtimeSocket.readyState)) return
    if (realtimeSocket) {
      shouldReconnect = false
      realtimeSocket.close()
      realtimeSocket = null
      shouldReconnect = true
    }
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    realtimeStatus.value = 'connecting'
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws?token=${encodeURIComponent(token.value)}`)
    realtimeSocket = socket
    socket.onopen = () => {
      realtimeToken = token.value
      realtimeStatus.value = 'connected'
    }
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        realtimeListeners.forEach((listener) => listener(message))
      } catch {
        // Ignore malformed messages so one event cannot break the connection.
      }
    }
    socket.onclose = () => {
      if (realtimeSocket !== socket) return
      realtimeSocket = null
      realtimeStatus.value = 'disconnected'
      if (shouldReconnect && token.value) reconnectTimer = window.setTimeout(connectRealtime, 2000)
    }
    socket.onerror = () => socket.close()
  }

  function disconnectRealtime() {
    shouldReconnect = false
    if (reconnectTimer) window.clearTimeout(reconnectTimer)
    reconnectTimer = null
    realtimeSocket?.close()
    realtimeSocket = null
    realtimeToken = ''
    realtimeStatus.value = 'disconnected'
    shouldReconnect = true
  }

  function subscribeRealtime(listener) {
    realtimeListeners.add(listener)
    return () => realtimeListeners.delete(listener)
  }

  async function switchRole(role) {
    const res = await authApi.switchRole(role)
    if (res.code === 0) {
      setAuth(res.data.token, res.data.user)
    }
    return res
  }

  async function refreshUser() {
    const res = await authApi.getInfo()
    if (res.code === 0) {
      user.value = res.data
      localStorage.setItem('user', JSON.stringify(res.data))
    }
    return res
  }

  watch(token, (value) => {
    if (value) connectRealtime()
    else disconnectRealtime()
  }, { immediate: true })

  return { token, user, isLoggedIn, isDriver, isPassenger, realtimeStatus, setAuth, clearAuth, switchRole, refreshUser, subscribeRealtime }
})