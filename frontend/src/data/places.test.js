import test from 'node:test'
import assert from 'node:assert/strict'
import { BUS_STOPS, PRESET_PLACES, distanceInKm, isInHainan, isNightBusTime, localPlaceName, wgs84ToGcj02 } from './places.js'

test('all preset places and bus stops remain inside Hainan', () => {
  for (const place of [...PRESET_PLACES, ...Object.values(BUS_STOPS)]) {
    assert.equal(isInHainan(place.latitude, place.longitude), true, place.name)
  }
})

test('campus and railway bus stops are geographically distinct and nearby', () => {
  const distance = distanceInKm(BUS_STOPS.campus, BUS_STOPS.railway)
  assert.ok(distance > 5)
  assert.ok(distance < 20)
})

test('preset markers use the same GCJ02 coordinates returned by AMap search', () => {
  const campus = PRESET_PLACES.find((place) => place.id === 'preset-lian')
  const railway = PRESET_PLACES.find((place) => place.id === 'preset-lingshui')
  assert.deepEqual([campus.longitude, campus.latitude], [110.021076, 18.397127])
  assert.deepEqual([railway.longitude, railway.latitude], [110.033396, 18.535868])
  assert.deepEqual([BUS_STOPS.campus.longitude, BUS_STOPS.campus.latitude], [110.023595, 18.394848])
  assert.deepEqual([BUS_STOPS.railway.longitude, BUS_STOPS.railway.latitude], [110.034518, 18.535843])
})

test('night bus window starts at 18:00 and ends at midnight', () => {
  assert.equal(isNightBusTime(new Date(2026, 8, 8, 17, 59)), false)
  assert.equal(isNightBusTime(new Date(2026, 8, 8, 18, 0)), true)
  assert.equal(isNightBusTime(new Date(2026, 8, 8, 23, 59)), true)
})

test('browser WGS84 coordinates convert to a nearby GCJ02 point', () => {
  const result = wgs84ToGcj02(18.42191, 110.04772)
  assert.ok(Math.abs(result.latitude - 18.42191) < 0.01)
  assert.ok(Math.abs(result.longitude - 110.04772) < 0.01)
  assert.notEqual(result.longitude, 110.04772)
})

test('a map click near the campus always has a readable fallback name', () => {
  assert.equal(localPlaceName(18.3908, 110.06518), '黎安大学城附近')
})
