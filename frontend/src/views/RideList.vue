<template>
  <div class="page-container">
    <!-- <h2 class="page-title">拼车大厅</h2> -->
    <el-card class="map-card" shadow="never">
      <div class="map-heading">
        <!-- <div><strong>海南拼车地图</strong><span>黎安大学城及机场、车站周边</span></div> -->
        <div class="map-heading-actions">
          <el-button size="small" :loading="locating" @click="startLocating(true)"><el-icon><Aim /></el-icon>{{ location ? '更新定位' : '开启附近公交' }}</el-button>
          <el-tag type="success" effect="plain">{{ rides.length }} 条线路</el-tag>
        </div>
      </div>
      <AmapMap ref="mainMapRef" :markers="allMarkers" :polylines="mapPolylines" :center="[110.021076, 18.397127]" :zoom="11" :fit-view="true" :focus-point="location" :focus-request="locationFocusRequest" height="510px" @select="selectMapRide" @ready="handleMapReady" />
      <div v-if="location" class="location-notice"><el-icon><Aim /></el-icon><span>已定位到你附近，当前地图约为 100 米观察尺度</span><el-tag size="small" effect="plain">{{ locationAccuracyText }}</el-tag></div>
      <div v-if="busMarkers.length" class="bus-notice"><el-icon><Van /></el-icon><span>已根据你的位置显示附近公交入口，点击地图上的公交标记即可查看实时到站。</span></div>
    </el-card>
    <button class="sos-floating-button" type="button" aria-label="打开紧急求助" @click="sosVisible = true">
      SOS
    </button>
    <div v-if="sosVisible" class="sos-overlay" @click.self="sosVisible = false">
      <section class="sos-card" role="dialog" aria-modal="true" aria-label="紧急求助">
        <div class="sos-card-bg"></div>
        <div class="sos-card-blob"></div>
        <div class="sos-card-diagonal-light"></div>
        <div class="sos-card-content">
          <button class="sos-close" type="button" aria-label="关闭紧急求助" @click="sosVisible = false">×</button>
          <div class="sos-number">110</div>
          <p class="sos-title">紧急求助</p>
          <button class="sos-action" type="button" @click="sosVisible = false">报警</button>
        </div>
      </section>
    </div>
    <section
      ref="rideSheetRef"
      class="ride-sheet"
      :class="{ 'is-expanded': sheetExpanded }"
      @touchstart.passive="handleSheetTouchStart"
      @touchmove="handleSheetTouchMove"
      @touchend="handleSheetTouchEnd"
    >
      <button class="sheet-handle" type="button" aria-label="展开或收起拼车列表" @click="sheetExpanded = !sheetExpanded">
        <span></span>
      </button>
      <div ref="filterBarRef" class="filter-bar">
      
      <el-radio-group v-model="filterType" @change="handleFilterChange">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="supply">司机线路</el-radio-button>
        <el-radio-button value="demand">乘客需求</el-radio-button>
      </el-radio-group>
      <el-input v-model="keyword" placeholder="搜索出发地/目的地" clearable style="width: 240px" @focus="scrollToRides" @clear="handleSearch" @keyup.enter="handleSearch">
        <template #append>
          <el-button @click="handleSearch"><el-icon><Search /></el-icon></el-button>
        </template>
      </el-input>
      </div>
      <div class="ride-results" v-loading="loading">
      <div v-if="rides.length === 0 && !loading" class="empty-state">
        <el-icon size="60"><Box /></el-icon>
        <p>暂无拼车信息</p>
      </div>
      <div ref="rideListRef" class="card-list">
        <el-card v-for="ride in rides" :key="ride.id" class="ride-card" @click="showDetail(ride)">
          <template #header>
            <div class="card-header">
              <el-tag :type="ride.type === 'supply' ? 'warning' : 'primary'" size="small">
                {{ ride.type === 'supply' ? '司机线路' : '乘客需求' }}
              </el-tag>
              <el-tag :type="statusTagType(ride.status)" size="small" effect="plain">{{ statusText(ride.status) }}</el-tag>
            </div>
          </template>
          <div class="route-line">
            <div class="route-point"><el-icon color="#67c23a"><Location /></el-icon>{{ ride.origin }}</div>
            <el-icon color="#909399"><Right /></el-icon>
            <div class="route-point"><el-icon color="#f56c6c"><LocationInformation /></el-icon>{{ ride.destination }}</div>
          </div>
          <div class="ride-info">
            <span><el-icon><Clock /></el-icon> {{ formatTime(ride.departure_time) }}</span>
            <span v-if="ride.type === 'supply'"><el-icon><User /></el-icon> {{ ride.current_passengers }}/{{ ride.seats }}人</span>
            <span v-if="ride.price > 0" class="price">¥{{ ride.price }}</span>
          </div>
          <div class="publisher">发布者：{{ ride.publisher_name }}</div>
        </el-card>
      </div>
      </div>
    </section>

    <el-dialog v-model="detailVisible" title="拼车详情" width="600px">
      <div v-if="currentRide" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="类型">{{ currentRide.type === 'supply' ? '司机线路' : '乘客需求' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ statusText(currentRide.status) }}</el-descriptions-item>
          <el-descriptions-item label="出发地">{{ currentRide.origin }}</el-descriptions-item>
          <el-descriptions-item label="目的地">{{ currentRide.destination }}</el-descriptions-item>
          <el-descriptions-item label="出发时间">{{ formatTime(currentRide.departure_time) }}</el-descriptions-item>
          <el-descriptions-item label="价格">{{ currentRide.price > 0 ? '¥' + currentRide.price : '面议' }}</el-descriptions-item>
          <el-descriptions-item v-if="currentRide.type === 'supply'" label="座位">{{ currentRide.current_passengers }}/{{ currentRide.seats }}</el-descriptions-item>
          <el-descriptions-item label="发布者">{{ currentRide.publisher_name }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ currentRide.publisher_phone }}</el-descriptions-item>
          <el-descriptions-item v-if="currentRide.type === 'supply'" label="司机评分">
            <div v-if="driverRating && driverRating.total_count > 0" class="rating-summary">
              <el-rate :model-value="driverRating.avg_score" disabled show-score score-template="{value}" text-color="#ff9900" />
              <span class="rating-count">{{ driverRating.total_count }}条评价</span>
            </div>
            <span v-else>暂无评分</span>
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentRide.description || '无' }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="currentRide.orders && currentRide.orders.length" class="orders-section">
          <h4>参与记录</h4>
          <el-table :data="currentRide.orders" size="small">
            <el-table-column prop="user_name" label="参与者" />
            <el-table-column prop="status" label="状态">
              <template #default="{ row }">
                <el-tag :type="orderStatusTagType(row.status)" size="small">{{ orderStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="时间" />
          </el-table>
        </div>
        <div v-if="currentRide.type === 'supply' && driverRating && driverRating.recent && driverRating.recent.length" class="orders-section">
          <h4>最近评价</h4>
          <div v-for="item in driverRating.recent" :key="item.id" class="rating-item">
            <div class="rating-item-header">
              <span class="rating-passenger">{{ item.passenger_name }}</span>
              <el-rate :model-value="item.score" disabled size="small" />
              <span class="rating-time">{{ item.created_at }}</span>
            </div>
            <p v-if="item.comment" class="rating-item-comment">{{ item.comment }}</p>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button v-if="canJoin" type="primary" @click="handleJoin">加入拼车</el-button>
        <el-button v-if="canAccept" type="warning" @click="handleAccept">接单</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="busGuideVisible" title="在微信中查看实时公交" width="460px">
      <div v-if="selectedBus" class="bus-guide">
        <div class="bus-guide-route"><div class="bus-guide-icon"><el-icon><Van /></el-icon></div><div><strong>{{ selectedBus.title }}</strong><span>{{ selectedBus.name }}</span></div></div>
        <p>这是微信小程序口令，不能作为普通网址在浏览器中打开。</p>
        <ol><li>点击下方“复制小程序口令”。</li><li>打开微信，将口令粘贴到任意聊天并发送。</li><li>点击生成的蓝色小程序链接查看实时到站。</li></ol>
        <div class="bus-mini-program-code">{{ busMiniProgramToken }}</div>
      </div>
      <template #footer><el-button @click="busGuideVisible = false">关闭</el-button><el-button type="primary" @click="copyBusMiniProgramCode"><el-icon><CopyDocument /></el-icon>复制小程序口令</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { nextTick, ref, computed, onMounted, onUnmounted } from 'vue'
import { rideApi, orderApi, ratingApi } from '../api'
import { useUserStore } from '../stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import AmapMap from '../components/AmapMap.vue'
import { BUS_STOPS, PRESET_PLACES, distanceInKm, getBusMiniProgramCode, isInHainan, shouldUseLocation, wgs84ToGcj02 } from '../data/places'

const userStore = useUserStore()
const rides = ref([])
const loading = ref(false)
const filterType = ref('')
const keyword = ref('')
const filterBarRef = ref(null)
const rideListRef = ref(null)
const rideSheetRef = ref(null)
const mainMapRef = ref(null)
const sheetExpanded = ref(false)
const sheetTouchStartY = ref(0)
const sheetTouchDelta = ref(0)
const sheetTouchSource = ref(null)
const sosVisible = ref(false)
const detailVisible = ref(false)
const currentRide = ref(null)
const driverRating = ref(null)
const busGuideVisible = ref(false)
const selectedBus = ref(null)
const presetMarkers = PRESET_PLACES.map((place) => ({ ...place, title: place.shortName }))
const mapMarkers = computed(() => presetMarkers.concat(rides.value.flatMap((ride) => {
  const points = []
  if (ride.origin_latitude && ride.origin_longitude) points.push({ id: `${ride.id}-o`, latitude: ride.origin_latitude, longitude: ride.origin_longitude, title: `起点：${ride.origin}` })
  if (ride.destination_latitude && ride.destination_longitude) points.push({ id: `${ride.id}-d`, latitude: ride.destination_latitude, longitude: ride.destination_longitude, title: `终点：${ride.destination}` })
  return points
})))
const mapPolylines = computed(() => rides.value.filter((ride) => ride.origin_latitude && ride.origin_longitude && ride.destination_latitude && ride.destination_longitude).map((ride) => ([{ latitude: ride.origin_latitude, longitude: ride.origin_longitude }, { latitude: ride.destination_latitude, longitude: ride.destination_longitude }])))
const location = ref(null)
const locating = ref(false)
const locationFocusRequest = ref(0)
let locationWatchId = null
let mapReady = false
let stopRealtimeSubscription = null
const currentLocationMarker = computed(() => location.value && isInHainan(location.value.latitude, location.value.longitude) ? [{ id: 'current-location', ...location.value, title: '我的位置', kind: 'current-location' }] : [])
const busMarkers = computed(() => {
  if (!location.value) return []
  const night = new Date().getHours() >= 18
  return Object.values(BUS_STOPS).filter((stop) => distanceInKm(location.value, stop) <= 5).map((stop) => ({ ...stop, kind: 'bus-stop', title: `${stop.name} · ${night ? '夜11路' : '9路'}实时公交`, wechatPath: getBusMiniProgramCode() }))
})
const allMarkers = computed(() => busMarkers.value.concat(currentLocationMarker.value, mapMarkers.value))
const locationAccuracyText = computed(() => { const accuracy = Number(location.value?.accuracy); return accuracy > 0 ? `精度约 ${Math.round(accuracy)} 米` : '设备未提供精度' })
const busMiniProgramToken = computed(() => selectedBus.value ? `#小程序://车来了/${selectedBus.value.wechatPath}` : '')

const canJoin = computed(() => {
  if (!currentRide.value) return false
  const r = currentRide.value
  return r.type === 'supply' && r.status === 'open' && r.publisher_id !== userStore.user?.id && r.current_passengers < r.seats
})

const canAccept = computed(() => {
  if (!currentRide.value) return false
  const r = currentRide.value
  return r.type === 'demand' && r.status === 'open' && r.publisher_id !== userStore.user?.id && userStore.isDriver
})

async function loadRides() {
  loading.value = true
  try {
    const res = await rideApi.list({ type: filterType.value || undefined, keyword: keyword.value || undefined })
    if (res.code === 0) rides.value = res.data
  } finally {
    loading.value = false
  }
}

function scrollToRides() {
  if (window.matchMedia('(max-width: 680px)').matches) {
    sheetExpanded.value = true
    nextTick(() => rideSheetRef.value?.scrollTo({ top: 0, behavior: 'smooth' }))
    return
  }
  nextTick(() => filterBarRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

function handleFilterChange() {
  loadRides()
  scrollToRides()
}

function handleSearch() {
  loadRides()
  scrollToRides()
}

function handleSheetTouchStart(event) {
  sheetTouchSource.value = event.target.closest('.sheet-handle') ? 'handle' : null
  if (!sheetTouchSource.value) return
  sheetTouchStartY.value = event.touches[0]?.clientY || 0
  sheetTouchDelta.value = 0
}

function handleSheetTouchMove(event) {
  if (!sheetTouchStartY.value || sheetTouchSource.value !== 'handle') return
  sheetTouchDelta.value = event.touches[0]?.clientY - sheetTouchStartY.value
  if (Math.abs(sheetTouchDelta.value) > 8) event.preventDefault()
}

function handleSheetTouchEnd() {
  if (sheetTouchSource.value !== 'handle') return
  if (sheetTouchDelta.value < -36) sheetExpanded.value = true
  if (sheetTouchDelta.value > 36) sheetExpanded.value = false
  sheetTouchStartY.value = 0
  sheetTouchDelta.value = 0
  sheetTouchSource.value = null
}

async function showDetail(ride) {
  const res = await rideApi.detail(ride.id)
  if (res.code === 0) {
    currentRide.value = res.data
    detailVisible.value = true
    driverRating.value = null
    if (res.data.type === 'supply' && res.data.publisher_id) {
      const ratingRes = await ratingApi.driverRating(res.data.publisher_id)
      if (ratingRes.code === 0) driverRating.value = ratingRes.data
    }
  }
}

function selectMapRide(marker) {
  if (marker.wechatPath) {
    selectedBus.value = marker
    busGuideVisible.value = true
    copyBusMiniProgramCode()
    return
  }
  const rideId = String(marker.id).split('-').slice(0, -1).join('-')
  const ride = rides.value.find((item) => String(item.id) === rideId)
  if (ride) showDetail(ride)
}

async function writeClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text)
  const textArea = document.createElement('textarea')
  textArea.value = text; textArea.style.position = 'fixed'; textArea.style.opacity = '0'; document.body.appendChild(textArea); textArea.select()
  const copied = document.execCommand('copy'); textArea.remove()
  if (!copied) throw new Error('浏览器未允许复制')
}

async function copyBusMiniProgramCode() {
  try { await writeClipboard(busMiniProgramToken.value); ElMessage.success('小程序口令已复制，请到微信中粘贴发送') } catch { ElMessage.warning('自动复制失败，请手动选中口令复制') }
}

function applyLocation(candidate, shouldRefocus = false) {
  if (shouldUseLocation(location.value, candidate)) location.value = candidate
  if (shouldRefocus) nextTick(() => { locationFocusRequest.value += 1 })
  locating.value = false
}

async function locateWithAmap(shouldRefocus) {
  if (!mapReady || !mainMapRef.value?.locate) return false
  try {
    applyLocation(await mainMapRef.value.locate(), shouldRefocus)
    return true
  } catch {
    return false
  }
}

async function handleMapReady() {
  mapReady = true
  if (!location.value) await startLocating(true)
}

async function startLocating(shouldRefocus = false) {
  locating.value = true
  if (await locateWithAmap(shouldRefocus)) return
  if (!navigator.geolocation) {
    locating.value = false
    ElMessage.warning('当前浏览器不支持定位')
    return
  }
  const updateLocation = (position, requestFocus = false) => {
    const candidate = { ...wgs84ToGcj02(position.coords.latitude, position.coords.longitude), accuracy: Number(position.coords.accuracy) || 0, locatedAt: position.timestamp }
    applyLocation(candidate, requestFocus)
  }
  const onError = (error) => { locating.value = false; ElMessage.warning(error.code === 1 ? '请允许浏览器获取位置，以显示附近公交' : '暂时无法获取位置，请稍后重试') }
  navigator.geolocation.getCurrentPosition((position) => updateLocation(position, shouldRefocus), onError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })
  if (locationWatchId === null) locationWatchId = navigator.geolocation.watchPosition((position) => updateLocation(position), onError, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 })
}

async function handleJoin() {
  await ElMessageBox.confirm('确定加入该拼车线路吗？', '提示', { type: 'info' })
  const res = await orderApi.join(currentRide.value.id)
  if (res.code === 0) {
    ElMessage.success(res.msg)
    detailVisible.value = false
    loadRides()
  }
}

async function handleAccept() {
  await ElMessageBox.confirm('确定接单该拼车需求吗？', '提示', { type: 'info' })
  const res = await orderApi.accept(currentRide.value.id)
  if (res.code === 0) {
    ElMessage.success(res.msg)
    detailVisible.value = false
    loadRides()
  }
}

function statusText(status) {
  return { open: '开放中', full: '已满', closed: '已关闭', cancelled: '已取消' }[status] || status
}
function statusTagType(status) {
  return { open: 'success', full: 'warning', closed: 'info', cancelled: 'danger' }[status] || 'info'
}
function orderStatusText(status) {
  return { pending: '待确认', confirmed: '已确认', ongoing: '进行中', completed: '已完成', cancelled: '已取消' }[status] || status
}
function orderStatusTagType(status) {
  return { pending: 'warning', confirmed: 'primary', ongoing: 'success', completed: 'info', cancelled: 'danger' }[status] || 'info'
}
function formatTime(t) {
  return dayjs(t).format('YYYY-MM-DD HH:mm')
}

function handleRealtimeEvent(event) {
  if (!['ride.updated', 'order.updated', 'rating.updated'].includes(event.type)) return
  loadRides()
  if (currentRide.value && event.data?.rideId === currentRide.value.id) showDetail(currentRide.value)
}

onMounted(() => {
  loadRides()
  stopRealtimeSubscription = userStore.subscribeRealtime(handleRealtimeEvent)
})
onUnmounted(() => {
  if (locationWatchId !== null) navigator.geolocation.clearWatch(locationWatchId)
  location.value = null
  stopRealtimeSubscription?.()
})
</script>

<style scoped>
.page-container { position: relative; }
.map-card { width: min(1100px, calc(100% - 32px)); margin: 0 auto 24px; border: 0; }
.map-card :deep(.el-card__body) { padding: 28px; }
.map-card :deep(.amap-shell) { width: 1044px; max-width: 100%; margin: 0 auto; }
.map-heading { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 18px; }
.map-heading strong { display: block; font-size: 18px; color: #17221f; }
.map-heading span { display: block; margin-top: 4px; color: #65716d; font-size: 13px; }
.map-heading-actions { display: flex; align-items: center; gap: 8px; }
.bus-notice, .location-notice { display: flex; align-items: center; gap: 8px; margin-top: 12px; color: #087f6b; font-size: 13px; }
.filter-bar,
.card-list {
  width: min(1100px, calc(100% - 32px));
  margin-right: auto;
  margin-left: auto;
}
.filter-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}
.card-list {
  scroll-margin-top: 20px;
}
.ride-map {
  width: 100%;
  margin-bottom: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
}
.ride-info {
  display: flex;
  gap: 16px;
  color: #606266;
  font-size: 14px;
  margin: 8px 0;
}
.ride-info span {
  display: flex;
  align-items: center;
  gap: 4px;
}
.price {
  color: #f56c6c;
  font-weight: 600;
}
.publisher {
  color: #909399;
  font-size: 13px;
}
.detail-content {
  padding: 0 20px;
}
.orders-section {
  margin-top: 20px;
}
.orders-section h4 {
  margin-bottom: 12px;
}
.rating-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.rating-count {
  color: #909399;
  font-size: 13px;
}
.rating-item {
  padding: 10px 0;
  border-bottom: 1px solid #ebeef5;
}
.rating-item:last-child {
  border-bottom: none;
}
.rating-item-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.rating-passenger {
  font-weight: 500;
  color: #303133;
}
.rating-time {
  margin-left: auto;
  color: #909399;
  font-size: 12px;
}
.rating-item-comment {
  margin: 6px 0 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}
.bus-guide { color: #303733; }
.bus-guide-route { display: flex; align-items: center; gap: 12px; }
.bus-guide-route strong, .bus-guide-route span { display: block; }
.bus-guide-route span { margin-top: 4px; color: #65716d; font-size: 13px; }
.bus-guide-icon { display: grid; width: 44px; height: 44px; flex: 0 0 44px; place-items: center; border-radius: 50%; color: #fff; background: #087f6b; font-size: 22px; }
.bus-guide p { margin: 18px 0 10px; color: #52605b; }
.bus-guide ol { margin: 0; padding-left: 22px; color: #52605b; line-height: 1.9; }
.bus-mini-program-code { margin-top: 16px; padding: 12px; overflow-wrap: anywhere; border: 1px solid #cfe1db; border-radius: 6px; color: #075f51; background: #f1f8f5; font-family: Consolas, monospace; user-select: all; }
.ride-sheet { position: relative; }
.sheet-handle { display: none; }
.sos-floating-button {
  display: none;
  position: absolute;
  right: 24px;
  bottom: 24px;
  z-index: 6;
  width: 58px;
  height: 58px;
  border: 2px solid #ff3b30;
  border-radius: 50%;
  color: #fff;
  background: #d71920;
  box-shadow: 0 6px 18px rgba(215, 25, 32, 0.4);
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
}
.sos-floating-button:hover { background: #b9141a; box-shadow: 0 8px 22px rgba(215, 25, 32, 0.52); }
.sos-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.3);
  backdrop-filter: blur(3px);
}
.sos-card {
  position: relative;
  width: 200px;
  height: 250px;
  overflow: hidden;
  border-radius: 14px;
  box-shadow: 20px 20px 60px #bebebe, -20px -20px 60px #ffffff;
}
.sos-card-bg {
  position: absolute;
  inset: 5px;
  z-index: 2;
  overflow: hidden;
  border-radius: 10px;
  outline: 2px solid #fff;
  background: rgba(255, 226, 234, 0.88);
  backdrop-filter: blur(24px);
}
.sos-card-blob {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: #ff1744;
  filter: blur(12px);
  animation: sos-blob-bounce 2.4s infinite ease;
}
.sos-card-diagonal-light {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  width: 220px;
  height: 76px;
  border-radius: 50%;
  background: #ff8fab;
  filter: blur(16px);
  opacity: 0.9;
  transform: translate(-50%, -50%) rotate(-35deg);
  animation: sos-diagonal-light 1.8s infinite ease-in-out;
}
.sos-card-content {
  position: relative;
  z-index: 3;
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.sos-close {
  position: absolute;
  top: 12px;
  right: 14px;
  border: 0;
  color: #7f1d1d;
  background: transparent;
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
}
.sos-number {
  color: #d71920;
  font-size: 58px;
  font-weight: 900;
  line-height: 1;
  text-shadow: 0 2px 10px rgba(215, 25, 32, 0.2);
}
.sos-title { margin: 4px 0 12px; color: #7f1d1d; font-size: 15px; font-weight: 700; }
.sos-action {
  position: relative;
  overflow: hidden;
  padding: 0.7em 2.7em;
  border: 2px solid #ef233c;
  border-radius: 0.6em;
  color: #ef233c;
  background: linear-gradient(to right, rgba(239, 35, 60, 0.1) 1%, transparent 40%, transparent 60%, rgba(239, 35, 60, 0.1) 100%);
  box-shadow: inset 0 0 10px rgba(239, 35, 60, 0.4), 0 0 9px 3px rgba(239, 35, 60, 0.1);
  cursor: pointer;
  font-size: 15px;
  line-height: 1.4em;
  transition: all 0.3s;
}
.sos-action::before {
  position: absolute;
  top: 0;
  left: -4em;
  width: 4em;
  height: 100%;
  content: '';
  background: linear-gradient(to right, transparent 1%, rgba(239, 35, 60, 0.2) 40%, rgba(239, 35, 60, 0.2) 60%, transparent 100%);
  transition: transform 0.4s ease-in-out;
}
.sos-action:hover { color: #b9141a; box-shadow: inset 0 0 10px rgba(239, 35, 60, 0.6), 0 0 9px 3px rgba(239, 35, 60, 0.2); }
.sos-action:hover::before { transform: translateX(15em); }
@keyframes sos-blob-bounce {
  0%, 100% { transform: translate(-100%, -100%) translate3d(0, 0, 0); }
  25% { transform: translate(-100%, -100%) translate3d(100%, 0, 0); }
  50% { transform: translate(-100%, -100%) translate3d(100%, 100%, 0); }
  75% { transform: translate(-100%, -100%) translate3d(0, 100%, 0); }
}
@keyframes sos-diagonal-light {
  0%, 100% { transform: translate(-80%, -80%) rotate(-35deg); }
  50% { transform: translate(0%, 20%) rotate(-35deg); }
}
@media (max-width: 680px) {
  .page-container {
    position: relative;
    height: calc(100vh - 64px);
    min-height: 0;
    overflow: hidden;
    padding: 0;
  }
  .map-card {
    position: absolute;
    inset: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    border-radius: 0;
    pointer-events: auto;
  }
  .map-card :deep(.el-card__body) { height: 100%; padding: 0; }
  .map-card :deep(.amap-shell),
  .map-card :deep(.amap-canvas) {
    width: 100%;
    height: 100% !important;
    min-height: 0;
    border-radius: 0;
  }
  .map-heading {
    position: absolute;
    top: 12px;
    left: 12px;
    right: 12px;
    z-index: 2;
    margin: 0;
    pointer-events: none;
  }
  .map-heading-actions { justify-content: flex-end; pointer-events: auto; }
  .map-heading-actions .el-tag { display: none; }
  .location-notice, .bus-notice { position: absolute; left: 12px; right: 88px; z-index: 2; margin: 0; padding: 5px 8px; border-radius: 8px; background: rgba(255, 255, 255, 0.9); box-shadow: 0 3px 12px rgba(16, 29, 45, 0.12); font-size: 11px; line-height: 1.35; }
  .location-notice { bottom: 196px; }
  .bus-notice { bottom: 149px; }
  .ride-sheet {
    position: absolute;
    inset: auto 0 0;
    z-index: 4;
    height: 142px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 18px 18px 0 0;
    background: rgba(255, 255, 255, 0.97);
    box-shadow: 0 -8px 26px rgba(16, 29, 45, 0.2);
    transform: translateY(0);
    transition: height 0.34s ease, border-radius 0.34s ease;
    touch-action: pan-y;
  }
  .ride-sheet.is-expanded { height: calc(100% - 8px); border-radius: 18px 18px 0 0; }
  .sheet-handle {
    display: grid;
    width: 100%;
    height: 30px;
    flex: 0 0 30px;
    place-items: center;
    border: 0;
    background: transparent;
    cursor: grab;
    touch-action: none;
  }
  .sheet-handle span { width: 42px; height: 4px; border-radius: 4px; background: #b4c0ca; }
  .filter-bar {
    width: 100%;
    flex: 0 0 48px;
    display: flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;
    margin: 0;
    padding: 0 12px 10px;
    box-sizing: border-box;
  }
  .filter-bar .el-radio-group { display: flex; flex: 1 1 auto; min-width: 0; overflow: hidden; white-space: nowrap; }
  .filter-bar :deep(.el-radio-button) { flex: 1 1 auto; min-width: 0; }
  .filter-bar :deep(.el-radio-button__inner) { width: 100%; overflow: hidden; padding: 8px 5px; text-overflow: ellipsis; white-space: nowrap; }
  .filter-bar :deep(.el-input) { width: 142px !important; flex: 0 0 142px; }
  .ride-results { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0 12px 20px; }
  .ride-results .card-list { width: 100%; margin: 0; grid-template-columns: 1fr; gap: 12px; }
  .ride-results .empty-state { padding: 28px 0; }
  .sos-floating-button { display: block; right: 16px; bottom: 162px; }
  .sos-action::before { animation: sos-action-shine 2.2s infinite ease-in-out; }
}
@keyframes sos-action-shine {
  0%, 45% { transform: translateX(0); }
  70%, 100% { transform: translateX(15em); }
}
</style>
