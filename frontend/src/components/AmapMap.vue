<template>
  <div class="amap-shell">
    <div ref="mapRoot" class="amap-canvas"></div>
    <div v-if="!ready" class="amap-state"><el-icon size="28"><Location /></el-icon><span>{{ error || '地图加载中…' }}</span><el-button v-if="error" size="small" @click="loadMap">重试</el-button></div>
    <div v-if="searchable" class="amap-search">
      <el-input v-model="searchText" clearable placeholder="搜索海南地点" @keyup.enter="searchPlace"><template #append><el-button @click="searchPlace"><el-icon><Search /></el-icon></el-button></template></el-input>
      <div v-if="results.length" class="search-results"><button v-for="item in results" :key="item.id" type="button" @click="selectResult(item)"><strong>{{ item.name }}</strong><small>{{ item.address || item.district }}</small></button></div>
    </div>
    <div v-if="selectable" class="amap-tip">{{ resolving ? '正在识别地点…' : '点击地图，地点名会自动填入' }}</div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { PRESET_PLACES, isInHainan, localPlaceName } from '../data/places'
const props = defineProps({ markers: { type: Array, default: () => [] }, polylines: { type: Array, default: () => [] }, center: { type: Array, default: () => [110.021076, 18.397127] }, zoom: { type: Number, default: 8 }, selectable: Boolean, searchable: Boolean, fitView: Boolean, focusPoint: { type: Object, default: null }, focusRequest: { type: Number, default: 0 }, height: { type: String, default: '420px' } })
const emit = defineEmits(['select', 'ready', 'error', 'locate'])
const mapRoot = ref(null); const ready = ref(false); const error = ref(''); const searchText = ref(''); const results = ref([]); const resolving = ref(false)
let map = null; let placeSearch = null; let geocoder = null; let geolocation = null; let clickHandler = null; let resizeObserver = null; let resizeFrame = null; let mapObjects = []; let fittedOnce = false; let geocodeRequestId = 0
const selectedPoint = ref(null)
function loadScript() { if (window.AMap) return Promise.resolve(window.AMap); const key = import.meta.env.VITE_AMAP_KEY; if (!key) return Promise.reject(new Error('未配置 VITE_AMAP_KEY')); const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE; if (securityCode) window._AMapSecurityConfig = { securityJsCode: securityCode }; return new Promise((resolve, reject) => { const existing = document.querySelector('script[data-amap-sdk]'); if (existing) { existing.addEventListener('load', () => resolve(window.AMap), { once: true }); existing.addEventListener('error', () => reject(new Error('高德地图脚本加载失败')), { once: true }); return } const script = document.createElement('script'); script.dataset.amapSdk = 'true'; script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&plugin=AMap.Scale,AMap.ToolBar,AMap.Geocoder,AMap.PlaceSearch,AMap.Geolocation`; script.onload = () => resolve(window.AMap); script.onerror = () => reject(new Error('高德地图脚本加载失败，请检查 Key 和域名白名单')); document.head.appendChild(script) }) }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])) }
function truncateMapLabel(value, maxLength = 10) {
  const text = String(value || '')
  const characters = Array.from(text)
  return characters.length > maxLength ? `${characters.slice(0, maxLength).join('')}...` : text
}
function renderMarkers() {
  if (!map || !window.AMap) return
  if (mapObjects.length) map.remove(mapObjects)
  mapObjects = []
  const allMarkers = selectedPoint.value ? props.markers.concat(selectedPoint.value) : props.markers
  const seenPositions = new Set()
  allMarkers.forEach((item) => {
    const lng = Number(item.longitude ?? item.lng); const lat = Number(item.latitude ?? item.lat)
    const positionKey = `${lat.toFixed(6)},${lng.toFixed(6)}`
    if (!isInHainan(lat, lng) || seenPositions.has(positionKey)) return
    seenPositions.add(positionKey)
    const label = item.kind === 'bus-stop' ? `公交 · ${item.title || item.name || ''}` : (item.title || item.origin || '')
    const displayLabel = truncateMapLabel(label)
    const marker = new window.AMap.Marker({ position: new window.AMap.LngLat(lng, lat), title: displayLabel || '拼车点', anchor: 'bottom-center', zIndex: item.isTemporary ? 120 : 100 })
    marker.setLabel({ content: `<span class="amap-label">${escapeHtml(displayLabel)}</span>`, direction: 'top' })
    marker.on('click', () => emit('select', item)); mapObjects.push(marker)
  })
  props.polylines.forEach((line) => {
    const path = line.map((point) => [Number(point.longitude ?? point.lng), Number(point.latitude ?? point.lat)]).filter((point) => isInHainan(point[1], point[0]))
    if (path.length > 1) mapObjects.push(new window.AMap.Polyline({ path, strokeColor: '#087f6b', strokeWeight: 4, strokeOpacity: .8, showDir: true }))
  })
  map.add(mapObjects)
  if (props.fitView && mapObjects.length && !fittedOnce) {
    map.setFitView(mapObjects, false, [48, 48, 48, 48], 9)
    fittedOnce = true
  }
}
function observeMapSize() {
  resizeObserver?.disconnect()
  resizeObserver = new ResizeObserver(() => {
    if (!map) return
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => map?.resize?.())
  })
  resizeObserver.observe(mapRoot.value)
  window.addEventListener('resize', resizeMap)
}

function resizeMap() {
  if (!map) return
  cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(() => map?.resize?.())
}

async function loadMap() {
  ready.value = false
  error.value = ''
  try {
    const AMap = await loadScript()
    await nextTick()
    map?.destroy()
    map = new AMap.Map(mapRoot.value, {
      zoom: props.zoom,
      center: props.center,
      viewMode: '3D',
      pitch: 32,
      showLabel: true
    })
    map.addControl(new AMap.Scale())
    map.addControl(new AMap.ToolBar({ position: 'RB' }))
    geocoder = new AMap.Geocoder({ city: '全国', radius: 800 })
    geolocation = new AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 10000,
      zoomToAccuracy: false,
      showMarker: false,
      showCircle: false,
      panToLocation: false
    })
    if (props.selectable) {
      clickHandler = (event) => reverseGeocode(event.lnglat)
      map.on('click', clickHandler)
    }
    if (props.searchable) placeSearch = new AMap.PlaceSearch({ city: '海南省', citylimit: true, pageSize: 8 })
    observeMapSize()
    ready.value = true
    renderMarkers()
    focusMap()
    emit('ready', map)
  } catch (e) {
    error.value = e.message || '地图加载失败'
    emit('error', e)
  }
}

function locate() {
  if (!geolocation) return Promise.reject(new Error('地图定位组件尚未就绪'))
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition((status, result) => {
      if (status !== 'complete' || !result?.position) {
        reject(new Error(result?.message || '高德定位失败'))
        return
      }
      const located = {
        latitude: Number(result.position.lat),
        longitude: Number(result.position.lng),
        accuracy: Number(result.accuracy) || 0,
        locatedAt: Date.now(),
        coordinateSystem: 'gcj02'
      }
      emit('locate', located)
      resolve(located)
    })
  })
}
function focusMap() { if (!map || !props.focusPoint) return; const lng = Number(props.focusPoint.longitude); const lat = Number(props.focusPoint.latitude); if (isInHainan(lat, lng)) { map.setPitch(0); map.setZoomAndCenter(17, [lng, lat]) } }
function reverseGeocode(lnglat) {
  if (!isInHainan(lnglat.lat, lnglat.lng)) { emit('error', new Error('请选择海南岛范围内的地点')); return }
  const fallbackName = localPlaceName(lnglat.lat, lnglat.lng)
  const fallbackAddress = `${fallbackName}（${lnglat.lat.toFixed(5)}, ${lnglat.lng.toFixed(5)}）`
  const fallback = { id: 'temporary-selection', isTemporary: true, title: fallbackName, name: fallbackName, address: fallbackAddress, longitude: lnglat.lng, latitude: lnglat.lat }
  const requestId = ++geocodeRequestId
  resolving.value = true; selectedPoint.value = fallback; renderMarkers(); emit('select', fallback)
  geocoder.getAddress([lnglat.lng, lnglat.lat], (status, result) => {
    if (requestId !== geocodeRequestId) return
    resolving.value = false
    const regeocode = status === 'complete' ? result?.regeocode : null
    const poi = regeocode?.pois?.[0]
    const address = regeocode?.formattedAddress || ''
    const name = poi?.name || address || fallbackName
    const resolved = { ...fallback, isTemporary: false, title: name, name, address, longitude: lnglat.lng, latitude: lnglat.lat }
    selectedPoint.value = resolved; renderMarkers(); emit('select', resolved)
    if (!regeocode && import.meta.env.VITE_AMAP_SECURITY_CODE) emit('error', new Error('未识别到更精确的地点名，已填入附近区域，可在输入框中修改'))
  })
}
function searchPlace() { if (!placeSearch || !searchText.value.trim()) return; error.value = ''; const query = searchText.value.trim().toLowerCase(); placeSearch.search(searchText.value.trim(), (status, result) => { const remoteResults = status === 'complete' && result.poiList ? result.poiList.pois.filter((item) => item.location && isInHainan(item.location.lat, item.location.lng)) : []; const localResults = PRESET_PLACES.filter((item) => item.name.toLowerCase().includes(query) || item.shortName.toLowerCase().includes(query)).map((item) => ({ ...item, address: '海南省', location: { lng: item.longitude, lat: item.latitude } })); results.value = remoteResults.length ? remoteResults : localResults; if (!results.value.length) error.value = import.meta.env.VITE_AMAP_SECURITY_CODE ? '未找到海南范围内的地点' : '当前可搜索常用地点；精确搜索需配置高德安全密钥' }) }
function selectResult(item) { if (!item.location || !isInHainan(item.location.lat, item.location.lng)) { error.value = '请选择海南岛范围内的地点'; return } const selected = { id: 'temporary-selection', title: item.name, name: item.name, address: item.address || item.district || '', longitude: item.location.lng, latitude: item.location.lat }; selectedPoint.value = selected; map?.setZoomAndCenter(15, [item.location.lng, item.location.lat]); results.value = []; renderMarkers(); emit('select', selected) }
watch(() => [props.markers, props.polylines], renderMarkers, { deep: true })
watch(() => props.focusRequest, focusMap)
onMounted(loadMap)
onUnmounted(() => {
  if (map && clickHandler) map.off('click', clickHandler)
  resizeObserver?.disconnect()
  window.removeEventListener('resize', resizeMap)
  cancelAnimationFrame(resizeFrame)
  map?.destroy()
  map = null
})
defineExpose({ locate })
</script>

<style scoped>
.amap-shell { position: relative; min-height: v-bind(height); overflow: hidden; border-radius: 12px; background: linear-gradient(135deg, #dcefe9, #d4e9f2); }.amap-canvas { width: 100%; height: v-bind(height); }.amap-state { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: #65716d; background: rgba(245,247,244,.9); }.amap-search { position: absolute; top: 14px; left: 14px; width: min(360px, calc(100% - 28px)); z-index: 3; }.search-results { margin-top: 4px; overflow: hidden; border-radius: 8px; background: #fff; box-shadow: 0 8px 24px rgba(23,34,31,.14); }.search-results button { width: 100%; padding: 10px 14px; border: 0; border-bottom: 1px solid #eef1ef; text-align: left; background: #fff; cursor: pointer; }.search-results strong, .search-results small { display: block; }.search-results small { margin-top: 3px; color: #65716d; }.amap-tip { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); padding: 6px 12px; border-radius: 99px; color: #087f6b; background: rgba(255,255,255,.9); font-size: 12px; white-space: nowrap; }
</style>
