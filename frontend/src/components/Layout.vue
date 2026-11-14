<template>
  <div class="app-shell">
    <div class="starfield" aria-hidden="true"><div id="stars"></div><div id="stars2"></div><div id="stars3"></div></div>
    <main class="workspace-card">
      <aside class="side-nav">
        <div class="brand" @click="router.push('/rides')"><span class="animated-logo" aria-hidden="true"><span class="logo-truck"><span class="logo-cab"><span class="logo-window"></span></span><span class="logo-body"></span><span class="logo-wheel logo-wheel-left"></span><span class="logo-wheel logo-wheel-right"></span></span><span class="logo-road"></span></span><span class="brand-name">路噜同途</span></div>
        <el-dropdown class="mobile-user" @command="handleCommand">
          <span class="user-info"><el-avatar :size="32" class="user-avatar">{{ userStore.user?.username?.[0]?.toUpperCase() }}</el-avatar><span class="mobile-username">{{ userStore.user?.username }}</span></span>
          <template #dropdown><el-dropdown-menu><el-dropdown-item command="profile">个人中心</el-dropdown-item><el-dropdown-item command="logout" divided>退出登录</el-dropdown-item></el-dropdown-menu></template>
        </el-dropdown>
        <div class="mobile-current">
          <el-icon><component :is="currentMenuItem.icon" /></el-icon>
          <span>{{ currentMenuItem.title }}</span>
        </div>
        <div class="menu-toggle" :class="{ 'is-open': mobileMenuOpen }">
          <input id="menuToggleCheckbox" v-model="mobileMenuOpen" type="checkbox" aria-label="打开导航菜单">
          <label class="menu-toggle-label" for="menuToggleCheckbox" aria-label="打开导航菜单">
            <span class="menu-toggle-bar menu-toggle-bar--top"></span>
            <span class="menu-toggle-bar menu-toggle-bar--middle"></span>
            <span class="menu-toggle-bar menu-toggle-bar--bottom"></span>
          </label>
        </div>
        <el-menu :default-active="activeMenu" @select="handleMenuSelect" class="menu" :class="{ 'is-open': mobileMenuOpen }">
          <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path" :class="{ 'is-current-page': item.path === activeMenu }">
            <el-icon><component :is="item.icon" /></el-icon><span>{{ item.title }}</span>
          </el-menu-item>
        </el-menu>
      </aside>
      <section class="main-panel">
        <header class="header">
          <div class="header-title"><el-icon><component :is="currentMenuItem.icon" /></el-icon>{{ currentMenuItem.title }}</div>
          <div class="header-right">
            <el-badge :value="unreadCount" :hidden="unreadCount === 0"><el-icon size="20" class="notify-icon" @click="router.push('/notifications')"><Bell /></el-icon></el-badge>
            <el-dropdown @command="handleCommand"><span class="user-info"><el-avatar :size="32" class="user-avatar">{{ userStore.user?.username?.[0]?.toUpperCase() }}</el-avatar><span class="username">{{ userStore.user?.username }}</span><el-tag size="small" :type="roleTagType" class="role-tag">{{ roleText }}</el-tag></span><template #dropdown><el-dropdown-menu><el-dropdown-item command="profile">个人中心</el-dropdown-item><el-dropdown-item command="logout" divided>退出登录</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
          </div>
        </header>
        <el-main class="main">
          <router-view v-slot="{ Component, route }">
            <Transition name="page" mode="out-in">
              <component :is="Component" :key="route.fullPath" />
            </Transition>
          </router-view>
        </el-main>
      </section>
    </main>
    <button class="desktop-sos-button" type="button" aria-label="打开紧急求助" @click="desktopSosVisible = true">SOS</button>
    <div v-if="desktopSosVisible" class="desktop-sos-overlay" @click.self="desktopSosVisible = false">
      <section class="desktop-sos-card" role="dialog" aria-modal="true" aria-label="紧急求助">
        <div class="desktop-sos-card-bg"></div>
        <div class="desktop-sos-card-blob"></div>
        <div class="desktop-sos-card-diagonal-light"></div>
        <div class="desktop-sos-card-content">
          <button class="desktop-sos-close" type="button" aria-label="关闭紧急求助" @click="desktopSosVisible = false">×</button>
          <div class="desktop-sos-number">110</div>
          <p class="desktop-sos-title">紧急求助</p>
          <button class="desktop-sos-action" type="button" @click="desktopSosVisible = false">报警</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/user'
import { notificationApi } from '../api'
import { ElMessageBox } from 'element-plus'
import { ChatDotRound, Document, List, Plus, Tickets, User } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const unreadCount = ref(0)
const mobileMenuOpen = ref(false)
const desktopSosVisible = ref(false)
let timer = null
let stopRealtimeSubscription = null

const menuItems = [
  { path: 'rides', title: '拼车大厅', icon: List },
  { path: 'publish', title: '发布拼车', icon: Plus },
  { path: 'my-rides', title: '我的发布', icon: Document },
  { path: 'orders', title: '我的订单', icon: Tickets },
  { path: 'notifications', title: '消息通知', icon: ChatDotRound },
  { path: 'profile', title: '个人中心', icon: User }
]

const activeMenu = computed(() => route.path.split('/')[1] || 'rides')
const currentMenuItem = computed(() => menuItems.find((item) => item.path === activeMenu.value) || { title: route.meta.title || '', icon: List })

const roleText = computed(() => {
  const role = userStore.user?.role
  if (role === 'driver') return '司机'
  if (role === 'both') return '司机/乘客'
  return '乘客'
})

const roleTagType = computed(() => {
  const role = userStore.user?.role
  if (role === 'driver') return 'warning'
  if (role === 'both') return 'success'
  return 'info'
})

async function fetchUnreadCount() {
  if (!userStore.token) return
  try {
    const res = await notificationApi.unreadCount()
    if (res.code === 0) unreadCount.value = res.data.count
  } catch (e) {}
}

function handleMenuSelect(index) {
  mobileMenuOpen.value = false
  router.push(`/${index}`)
}

watch(() => route.path, () => { mobileMenuOpen.value = false })

async function handleCommand(command) {
  if (command === 'logout') {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
    userStore.clearAuth()
    router.push('/login')
  } else if (command === 'profile') {
    router.push('/profile')
  }
}

onMounted(() => {
  fetchUnreadCount()
  timer = setInterval(fetchUnreadCount, 15000)
  stopRealtimeSubscription = userStore.subscribeRealtime((event) => {
    if (event.type === 'notification.created' || event.type === 'order.updated') fetchUnreadCount()
  })
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  stopRealtimeSubscription?.()
})
</script>

<style scoped>
.app-shell { min-height: 100vh; display: grid; place-items: center; position: relative; isolation: isolate; padding: 4vh 0; box-sizing: border-box; }
.workspace-card { width: 94vw; max-width: 1600px; height: 90vh; display: flex; overflow: hidden; background: #f5f7fa; border-radius: 16px; box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38); position: relative; z-index: 1; }
.side-nav { position: absolute; inset: 0 auto 0 0; z-index: 20; width: 220px; overflow: hidden; background: #101d2d; clip-path: inset(0 152px 0 0); transition: clip-path 0.35s ease; box-shadow: inset 1px 0 0 #101d2d;}
.side-nav:hover { clip-path: inset(0); }
.brand { width: 200px; height: 80px; display: flex; align-items: center; gap: 10px; padding: 0 20px; box-sizing: border-box; color: #fff; cursor: pointer; font-size: 20px; font-weight: 600; white-space: nowrap; }
.animated-logo { position: relative; display: block; width: 42px; height: 32px; flex: 0 0 42px; overflow: hidden; }
.logo-truck { position: absolute; left: 3px; bottom: 7px; width: 35px; height: 17px; animation: logoBounce 1s ease-in-out infinite; }
.logo-body, .logo-cab { position: absolute; bottom: 3px; display: block; background: #fff; border: 1.5px solid #c9d8e8; }
.logo-body { left: 0; width: 25px; height: 13px; border-radius: 3px 1px 2px 2px; }
.logo-cab { right: 0; width: 13px; height: 15px; border-radius: 2px 4px 2px 1px; background: #f7fbff; }
.logo-window { position: absolute; top: 2px; right: 2px; width: 7px; height: 5px; border-radius: 1px 2px 1px 1px; background: #409eff; }
.logo-wheel { position: absolute; bottom: 0; width: 7px; height: 7px; border: 2px solid #fff; border-radius: 50%; background: #172b43; box-shadow: 0 0 0 1px #c9d8e8; animation: logoWheel 0.8s linear infinite; }
.logo-wheel-left { left: 5px; }
.logo-wheel-right { right: 4px; }
.logo-road { position: absolute; right: -8px; bottom: 4px; width: 54px; height: 2px; border-radius: 2px; background: repeating-linear-gradient(90deg, #409eff 0 8px, transparent 8px 14px); animation: logoRoad 0.7s linear infinite; }
@keyframes logoBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(2px); } }
@keyframes logoWheel { to { transform: rotate(360deg); } }
@keyframes logoRoad { to { transform: translateX(-14px); } }
.brand-name { opacity: 0; transition: opacity 0.2s ease 0.08s; }
.side-nav:hover .brand-name { opacity: 1; }
.header { display: flex; align-items: center; justify-content: space-between; min-height: 68px; padding: 0 28px; border-bottom: 1px solid #e8edf3; }
.header-title { color: #172b43; font-size: 20px; font-weight: 600; }
.header-right { display: flex; align-items: center; gap: 24px; }
.notify-icon { cursor: pointer; color: #606266; }
.user-info { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #606266; }
.user-avatar { background: #409eff; color: #fff; font-weight: 600; }
.username { font-size: 14px; }
.role-tag { margin-left: 4px; }
.menu { width: 220px; border-right: none; background: transparent; }
.menu :deep(.el-menu-item) { width: 200px; margin: 4px 10px; border-radius: 10px; color: #aab9c9; }
.menu :deep(.el-menu-item:hover), .menu :deep(.el-menu-item.is-active) { color: #fff; background: #27435f; }
.menu :deep(.el-menu-item span) { opacity: 0; transition: opacity 0.2s ease 0.08s; }
.side-nav:hover .menu :deep(.el-menu-item span) { opacity: 1; }
.menu :deep(.el-icon) { margin-right: 16px; }
.mobile-current, .menu-toggle, .mobile-user { display: none; }
.main-panel { width: 100%; min-width: 0; display: flex; flex-direction: column; padding-left: 68px; transition: padding-left 0.35s ease; }
.workspace-card:has(.side-nav:hover) .main-panel { padding-left: 220px; }
.main { flex: 1; min-height: 0; padding: 0; background: #f5f7fa; overflow-y: auto; }
.desktop-sos-button { position: fixed; right: 100px; bottom: 72px; z-index: 100; width: 58px; height: 58px; border: 2px solid #ff3b30; border-radius: 50%; color: #fff; background: #d71920; box-shadow: 0 6px 18px rgba(215, 25, 32, 0.4); cursor: pointer; font-size: 13px; font-weight: 800; letter-spacing: 0.04em; }
.desktop-sos-button:hover { background: #b9141a; box-shadow: 0 8px 22px rgba(215, 25, 32, 0.52); }
.desktop-sos-overlay { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 20px; background: rgba(15, 23, 42, 0.3); backdrop-filter: blur(3px); }
.desktop-sos-card { position: relative; width: 200px; height: 250px; overflow: hidden; border-radius: 14px; box-shadow: 20px 20px 60px #bebebe, -20px -20px 60px #fff; }
.desktop-sos-card-bg { position: absolute; inset: 5px; z-index: 2; overflow: hidden; border-radius: 10px; outline: 2px solid #fff; background: rgba(255, 226, 234, 0.88); backdrop-filter: blur(24px); }
.desktop-sos-card-blob { position: absolute; top: 50%; left: 50%; z-index: 1; width: 150px; height: 150px; border-radius: 50%; background: #ff1744; filter: blur(12px); animation: desktop-sos-blob 2.4s infinite ease; }
.desktop-sos-card-diagonal-light { position: absolute; top: 50%; left: 50%; z-index: 1; width: 220px; height: 76px; border-radius: 50%; background: #ff8fab; filter: blur(16px); opacity: .9; transform: translate(-50%, -50%) rotate(-35deg); animation: desktop-sos-diagonal 1.8s infinite ease-in-out; }
.desktop-sos-card-content { position: relative; z-index: 3; display: flex; height: 100%; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
.desktop-sos-close { position: absolute; top: 12px; right: 14px; border: 0; color: #7f1d1d; background: transparent; cursor: pointer; font-size: 24px; line-height: 1; }
.desktop-sos-number { color: #d71920; font-size: 58px; font-weight: 900; line-height: 1; text-shadow: 0 2px 10px rgba(215, 25, 32, .2); }
.desktop-sos-title { margin: 4px 0 12px; color: #7f1d1d; font-size: 15px; font-weight: 700; }
.desktop-sos-action { position: relative; overflow: hidden; padding: .7em 2.7em; border: 2px solid #ef233c; border-radius: .6em; color: #ef233c; background: linear-gradient(to right, rgba(239,35,60,.1) 1%, transparent 40%, transparent 60%, rgba(239,35,60,.1) 100%); box-shadow: inset 0 0 10px rgba(239,35,60,.4), 0 0 9px 3px rgba(239,35,60,.1); cursor: pointer; font-size: 15px; line-height: 1.4em; }
.desktop-sos-action::before { position: absolute; top: 0; left: -4em; width: 4em; height: 100%; content: ''; background: linear-gradient(to right, transparent 1%, rgba(239,35,60,.2) 40%, rgba(239,35,60,.2) 60%, transparent 100%); transition: transform .4s ease-in-out; }
.desktop-sos-action:hover { color: #b9141a; box-shadow: inset 0 0 10px rgba(239,35,60,.6), 0 0 9px 3px rgba(239,35,60,.2); }
.desktop-sos-action:hover::before { transform: translateX(15em); }
@keyframes desktop-sos-blob { 0%, 100% { transform: translate(-100%, -100%) translate3d(0, 0, 0); } 25% { transform: translate(-100%, -100%) translate3d(100%, 0, 0); } 50% { transform: translate(-100%, -100%) translate3d(100%, 100%, 0); } 75% { transform: translate(-100%, -100%) translate3d(0, 100%, 0); } }
@keyframes desktop-sos-diagonal { 0%, 100% { transform: translate(-80%, -80%) rotate(-35deg); } 50% { transform: translate(0%, 20%) rotate(-35deg); } }
@media (max-width: 900px) {
  .app-shell { padding: 24px 0; }
  .workspace-card { width: calc(100vw - 32px); height: calc(100vh - 48px); }
  .header { padding: 0 20px; }
}
@media (max-width: 700px) {
  .desktop-sos-button, .desktop-sos-overlay { display: none; }
  .app-shell { padding: 0; }
  .workspace-card { width: 100vw; min-height: 100vh; height: auto; border-radius: 0; }
  .side-nav, .side-nav:hover { position: absolute; inset: 0 0 auto; width: 100%; height: 64px; display: flex; align-items: center; overflow: visible; clip-path: none; background: #101d2d; box-shadow: 0 2px 10px rgba(16, 29, 45, 0.18); }
  .brand, .side-nav:hover .brand { width: auto; height: 64px; flex: 0 0 auto; padding: 0 16px; font-size: 18px; }
  .animated-logo { transform: scale(0.9); transform-origin: left center; }
  .brand-name, .side-nav:hover .brand-name { opacity: 1; }
  .mobile-user { display: block; order: 4; flex: 0 0 auto; margin-left: 8px; }
  .mobile-user .user-info { color: #dce7f1; }
  .mobile-username { max-width: 76px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
  .mobile-current { display: flex; order: 2; align-items: center; gap: 7px; min-width: 0; margin-left: auto; padding: 0 8px; color: #fff; font-size: 15px; font-weight: 600; }
  .mobile-current span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .menu-toggle { display: grid; order: 3; width: 42px; height: 42px; flex: 0 0 42px; margin-right: 0; place-items: center; border: 1px solid transparent; border-radius: 12px; background: transparent; }
  .menu-toggle input { display: none; }
  .menu-toggle-label { position: relative; display: block; width: 20px; height: 26px; cursor: pointer; }
  .menu-toggle-bar { position: absolute; left: 0; right: 0; height: 2px; border-radius: 1px; background: #fff; opacity: 1; transition: none 0.35s cubic-bezier(.5, -.35, .35, 1.5); }
  .menu-toggle-bar--top { bottom: 18px; transition-property: bottom, transform; transition-delay: 0.21s; }
  .menu-toggle-bar--middle { top: 12px; transition-property: opacity, transform; transition-delay: 0.105s; }
  .menu-toggle-bar--bottom { top: 18px; transition-property: top, transform; transition-delay: 0s; }
  .menu-toggle.is-open { border-color: #49627d; background: #27435f; }
  .menu-toggle.is-open .menu-toggle-bar--top { bottom: 12px; transform: rotate(-135deg); transition-delay: 0s; }
  .menu-toggle.is-open .menu-toggle-bar--middle { opacity: 0; transform: rotate(-135deg); transition-delay: 0.105s; }
  .menu-toggle.is-open .menu-toggle-bar--bottom { top: 12px; transform: rotate(-225deg); transition-delay: 0.21s; }
  .menu-toggle:active { transform: scale(0.94); }
  .menu { position: absolute; top: 64px; right: 10px; width: min(260px, calc(100vw - 20px)); max-height: 0; overflow: hidden; border: 1px solid #dce5ee; border-radius: 14px; background: #fff; box-shadow: 0 14px 32px rgba(16, 29, 45, 0.2); opacity: 0; transform: translateY(-8px) scale(0.98); transform-origin: top right; transition: max-height 0.28s ease, opacity 0.22s ease, transform 0.28s ease; }
  .menu.is-open { z-index: 21; max-height: 360px; opacity: 1; transform: translateY(0) scale(1); }
  .menu :deep(.el-menu-item), .side-nav:hover .menu :deep(.el-menu-item) { width: auto; height: 48px; margin: 6px; padding: 0 14px !important; border-radius: 10px; color: #52657a; }
  .menu :deep(.el-menu-item span), .side-nav:hover .menu :deep(.el-menu-item span) { opacity: 1; display: inline; }
  .menu :deep(.el-menu-item:hover) { color: #172b43; background: #edf4f8; }
  .menu :deep(.el-menu-item.is-active), .menu :deep(.el-menu-item.is-current-page) { display: none; }
  .menu :deep(.el-icon) { margin-right: 8px; }
  .main-panel, .workspace-card:has(.side-nav:hover) .main-panel { padding-top: 64px; padding-left: 0; }
  .header { display: none; }
}
@media (max-width: 480px) {
  .brand { gap: 0; padding: 0 12px; }
  .brand-name { display: none; }
  .animated-logo { transform: scale(0.84); transform-origin: left center; }
  .mobile-user { margin-left: 4px; }
  .mobile-username { max-width: 54px; }
  .mobile-current { margin-left: auto; padding: 0 6px; font-size: 14px; }
}
</style>

<style>
html, body, #app { width: 100%; min-height: 100%; margin: 0; overflow-x: hidden; }
.starfield { position: fixed; inset: 0; z-index: -1; overflow: hidden; background: radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%); }
#stars, #stars2, #stars3 { position: absolute; top: 0; left: 0; background: transparent; border-radius: 50%; }
#stars { width: 1px; height: 1px; box-shadow: 2vw 7vh #fff, 5vw 42vh #fff, 8vw 14vh #fff, 11vw 76vh #fff, 14vw 29vh #fff, 17vw 58vh #fff, 21vw 71vh #fff, 24vw 12vh #fff, 27vw 48vh #fff, 30vw 91vh #fff, 33vw 86vh #fff, 36vw 34vh #fff, 38vw 22vh #fff, 41vw 68vh #fff, 44vw 57vh #fff, 47vw 88vh #fff, 52vw 63vh #fff, 55vw 8vh #fff, 59vw 12vh #fff, 62vw 47vh #fff, 64vw 79vh #fff, 67vw 26vh #fff, 69vw 18vh #fff, 72vw 84vh #fff, 76vw 53vh #fff, 79vw 6vh #fff, 84vw 76vh #fff, 88vw 9vh #fff, 91vw 31vh #fff, 94vw 68vh #fff, 96vw 42vh #fff, 4vw 58vh #fff, 7vw 95vh #fff, 10vw 36vh #fff, 13vw 7vh #fff, 16vw 83vh #fff, 19vw 11vh #fff, 22vw 43vh #fff, 25vw 67vh #fff, 29vw 24vh #fff, 32vw 52vh #fff, 35vw 5vh #fff, 39vw 79vh #fff, 43vw 14vh #fff, 46vw 35vh #fff, 50vw 91vh #fff, 54vw 44vh #fff, 58vw 73vh #fff, 61vw 5vh #fff, 66vw 58vh #fff, 70vw 39vh #fff, 74vw 11vh #fff, 78vw 87vh #fff, 82vw 32vh #fff, 86vw 61vh #fff, 90vw 82vh #fff, 93vw 15vh #fff, 98vw 73vh #fff; animation: animStar 50s linear infinite; }
#stars2 { width: 2px; height: 2px; box-shadow: 3vw 22vh #fff, 5vw 32vh #fff, 9vw 81vh #fff, 12vw 63vh #fff, 18vw 58vh #fff, 23vw 4vh #fff, 28vw 9vh #fff, 31vw 73vh #fff, 35vw 78vh #fff, 39vw 41vh #fff, 44vw 48vh #fff, 48vw 95vh #fff, 51vw 17vh #fff, 56vw 61vh #fff, 61vw 82vh #fff, 65vw 35vh #fff, 68vw 44vh #fff, 73vw 25vh #fff, 77vw 71vh #fff, 81vw 93vh #fff, 86vw 52vh #fff, 91vw 67vh #fff, 95vw 18vh #fff, 1vw 54vh #fff, 15vw 47vh #fff, 20vw 90vh #fff, 26vw 33vh #fff, 34vw 12vh #fff, 42vw 86vh #fff, 49vw 29vh #fff, 57vw 8vh #fff, 63vw 66vh #fff, 72vw 96vh #fff, 80vw 16vh #fff, 88vw 40vh #fff, 97vw 58vh #fff; animation: animStar 100s linear infinite; }
#stars3 { width: 3px; height: 3px; box-shadow: 4vw 67vh #fff, 7vw 84vh #fff, 12vw 44vh #fff, 19vw 25vh #fff, 24vw 16vh #fff, 29vw 62vh #fff, 33vw 18vh #fff, 37vw 95vh #fff, 42vw 73vh #fff, 49vw 39vh #fff, 57vw 36vh #fff, 63vw 7vh #fff, 67vw 91vh #fff, 71vw 49vh #fff, 74vw 61vh #fff, 82vw 12vh #fff, 87vw 87vh #fff, 91vw 33vh #fff, 94vw 58vh #fff, 9vw 6vh #fff, 27vw 82vh #fff, 45vw 21vh #fff, 55vw 89vh #fff, 69vw 69vh #fff, 79vw 42vh #fff, 96vw 24vh #fff; animation: animStar 150s linear infinite; }
#stars::after, #stars2::after, #stars3::after { content: ''; position: absolute; top: 100vh; left: 0; width: inherit; height: inherit; background: transparent; box-shadow: inherit; }
@keyframes animStar { from { transform: translateY(0); } to { transform: translateY(-100vh); } }
@media (max-width: 700px) {
  .starfield { display: none; }
  .app-shell { width: 100%; }
  .workspace-card { width: 100%; }
}
</style>