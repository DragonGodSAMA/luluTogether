export const HAINAN_BOUNDS = Object.freeze({
  minLng: 108.62,
  maxLng: 111.05,
  minLat: 18.08,
  maxLat: 20.18
})

export const PRESET_PLACES = Object.freeze([
  { id: 'preset-lian', name: '海南自由贸易港陵水黎安国际教育创新试验区（滨海校区）', shortName: '黎安大学城', latitude: 18.397127, longitude: 110.021076 },
  { id: 'preset-lingshui', name: '陵水站', shortName: '陵水火车站', latitude: 18.535868, longitude: 110.033396 },
  { id: 'preset-meilan', name: '海口美兰国际机场', shortName: '美兰机场', latitude: 19.942495, longitude: 110.467385 },
  { id: 'preset-haikou-east', name: '海口东站', shortName: '海口东站', latitude: 19.983409, longitude: 110.342865 },
  { id: 'preset-haikou', name: '海口站', shortName: '海口站', latitude: 20.027324, longitude: 110.162116 },
  { id: 'preset-sanya', name: '三亚站', shortName: '三亚站', latitude: 18.296447, longitude: 109.492886 },
  { id: 'preset-phoenix', name: '三亚凤凰国际机场', shortName: '凤凰机场', latitude: 18.30341, longitude: 109.414038 }
])

export const BUS_STOPS = Object.freeze({
  campus: { id: 'bus-campus', name: '试验区公交站', latitude: 18.394848, longitude: 110.023595 },
  railway: { id: 'bus-railway', name: '陵水火车站公交站', latitude: 18.535843, longitude: 110.034518 }
})

export const BUS_MINI_PROGRAM_CODES = Object.freeze({
  daytime: 'CR18PcrA4ra9Gcn',
  night: 'Bqn3oQKCfNuqwIn'
})

export function isInHainan(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= HAINAN_BOUNDS.minLat && lat <= HAINAN_BOUNDS.maxLat
    && lng >= HAINAN_BOUNDS.minLng && lng <= HAINAN_BOUNDS.maxLng
}

export function distanceInKm(a, b) {
  const toRadians = (degrees) => degrees * Math.PI / 180
  const lat1 = toRadians(Number(a.latitude))
  const lat2 = toRadians(Number(b.latitude))
  const deltaLat = lat2 - lat1
  const deltaLng = toRadians(Number(b.longitude) - Number(a.longitude))
  const value = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

export function shouldUseLocation(current, candidate) {
  if (!current) return true
  const currentAccuracy = Math.max(Number(current.accuracy) || 0, 10)
  const candidateAccuracy = Math.max(Number(candidate.accuracy) || 0, 10)
  if (candidateAccuracy <= currentAccuracy) return true
  const movedMeters = distanceInKm(current, candidate) * 1000
  return movedMeters > Math.max(30, currentAccuracy + candidateAccuracy)
}

export function isNightBusTime(date = new Date()) {
  const minutes = date.getHours() * 60 + date.getMinutes()
  return minutes >= 18 * 60 && minutes < 24 * 60
}

export function getBusMiniProgramCode(date = new Date()) {
  return isNightBusTime(date) ? BUS_MINI_PROGRAM_CODES.night : BUS_MINI_PROGRAM_CODES.daytime
}

export function localPlaceName(latitude, longitude) {
  const point = { latitude: Number(latitude), longitude: Number(longitude) }
  const nearest = PRESET_PLACES
    .map((place) => ({ place, distance: distanceInKm(point, place) }))
    .sort((a, b) => a.distance - b.distance)[0]
  if (nearest?.distance <= 8) return `${nearest.place.shortName}附近`
  if (point.latitude >= 19.72) return '海口周边地图选点'
  if (point.latitude <= 18.42 && point.longitude <= 109.72) return '三亚周边地图选点'
  if (point.latitude >= 18.3 && point.latitude <= 18.75 && point.longitude >= 109.8) return '陵水周边地图选点'
  return '海南地图选点'
}

export function wgs84ToGcj02(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { latitude: lat, longitude: lng }
  if (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) return { latitude: lat, longitude: lng }
  const transformLat = (x, y) => {
    let value = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
    value += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3
    value += (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3
    return value + (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3
  }
  const transformLng = (x, y) => {
    let value = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
    value += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3
    value += (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3
    return value + (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3
  }
  const ellipsoidA = 6378245
  const eccentricitySquared = 0.006693421622965943
  let deltaLat = transformLat(lng - 105, lat - 35)
  let deltaLng = transformLng(lng - 105, lat - 35)
  const radLat = lat / 180 * Math.PI
  let magic = Math.sin(radLat)
  magic = 1 - eccentricitySquared * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  deltaLat = (deltaLat * 180) / ((ellipsoidA * (1 - eccentricitySquared)) / (magic * sqrtMagic) * Math.PI)
  deltaLng = (deltaLng * 180) / (ellipsoidA / sqrtMagic * Math.cos(radLat) * Math.PI)
  return { latitude: lat + deltaLat, longitude: lng + deltaLng }
}
