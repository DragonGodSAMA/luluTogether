import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import './assets/style.css'

// Keep the local server tied to real browser pages. When the last page closes,
// start.bat can exit instead of leaving a background Node.js process behind.
const runtimeSessionId = globalThis.crypto?.randomUUID?.()
  || `${Date.now()}-${Math.random().toString(36).slice(2)}`
let runtimeHeartbeat = null

async function touchRuntimeSession() {
  try {
    await fetch('/api/runtime/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: runtimeSessionId }),
      keepalive: true
    })
  } catch {
    // The UI already reports API failures; a heartbeat must not interrupt use.
  }
}

function closeRuntimeSession() {
  const data = new Blob(
    [JSON.stringify({ sessionId: runtimeSessionId })],
    { type: 'application/json' }
  )
  navigator.sendBeacon('/api/runtime/session/close', data)
}

touchRuntimeSession()
runtimeHeartbeat = window.setInterval(touchRuntimeSession, 5000)
window.addEventListener('pagehide', () => {
  window.clearInterval(runtimeHeartbeat)
  closeRuntimeSession()
}, { once: true })

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')
