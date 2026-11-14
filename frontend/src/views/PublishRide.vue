<template>
  <div class="page-container">
    <!-- <h2 class="page-title">发布拼车</h2> -->
    <el-card class="publish-card">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" size="large">
        <el-form-item label="发布类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio value="demand">拼车需求（乘客发布）</el-radio>
            <el-radio value="supply" :disabled="!userStore.isDriver">拼车线路（司机发布）</el-radio>
          </el-radio-group>
          <div v-if="!userStore.isDriver" class="tip-text">提示：仅司机身份可发布拼车线路，可在个人中心切换身份</div>
        </el-form-item>
        <el-form-item label="出发地" prop="origin">
          <el-input v-model="form.origin" placeholder="请输入或在地图点选" />
          <div v-if="form.origin_latitude" class="selected-point">已定位：{{ form.origin }}（{{ form.origin_latitude.toFixed(5) }}, {{ form.origin_longitude.toFixed(5) }}）</div>
        </el-form-item>
        <el-form-item label="目的地" prop="destination">
          <el-input v-model="form.destination" placeholder="请输入或在地图点选" />
          <div v-if="form.destination_latitude" class="selected-point">已定位：{{ form.destination }}（{{ form.destination_latitude.toFixed(5) }}, {{ form.destination_longitude.toFixed(5) }}）</div>
        </el-form-item>
        <el-form-item label="地图选点">
          <el-radio-group v-model="pickTarget">
            <el-radio-button value="origin">选出发地</el-radio-button>
            <el-radio-button value="destination">选目的地</el-radio-button>
          </el-radio-group>
          <div class="map-selection-hint">当前选择：{{ pickTarget === 'origin' ? '出发地' : '目的地' }}。点击地图后会先识别真实地点，再填入上方输入框。</div>
          <AmapMap class="publish-map" :markers="selectedMarkers" :selectable="true" :searchable="true" :center="[110.021076, 18.397127]" :zoom="15" height="360px" @select="handleMapSelect" @error="handleMapError" />
        </el-form-item>
        <el-form-item label="常用地点">
          <div class="preset-places">
            <el-button v-for="place in presetPlaces" :key="place.id" size="small" @click="choosePreset(place)">{{ place.shortName }}</el-button>
          </div>
        </el-form-item>
        <el-form-item label="出发时间" prop="departure_time">
          <el-date-picker v-model="form.departure_time" type="datetime" placeholder="选择出发时间" format="YYYY-MM-DD HH:mm" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
        </el-form-item>
        <template v-if="form.type === 'supply'">
          <el-form-item label="座位数" prop="seats">
            <el-input-number v-model="form.seats" :min="1" :max="6" />
          </el-form-item>
          <el-form-item label="价格" prop="price">
            <el-input-number v-model="form.price" :min="0" :precision="2" placeholder="0表示面议" />
          </el-form-item>
        </template>
        <el-form-item label="备注说明">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="补充说明，如行李、偏好等" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">立即发布</el-button>
          <el-button @click="$router.push('/rides')">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { rideApi } from '../api'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import AmapMap from '../components/AmapMap.vue'
import { PRESET_PLACES } from '../data/places'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)
const pickTarget = ref('origin')
const presetPlaces = PRESET_PLACES
const selectedMarkers = computed(() => ['origin', 'destination'].flatMap((field) => form[`${field}_latitude`] ? [{ id: field, latitude: form[`${field}_latitude`], longitude: form[`${field}_longitude`], title: form[field] }] : []))

const form = reactive({
  type: 'demand',
  origin: '',
  destination: '',
  departure_time: '',
  seats: 4,
  price: 0,
  description: '',
  origin_latitude: null,
  origin_longitude: null,
  destination_latitude: null,
  destination_longitude: null
})

const rules = {
  type: [{ required: true, message: '请选择发布类型', trigger: 'change' }],
  origin: [{ required: true, message: '请输入出发地', trigger: 'blur' }],
  destination: [{ required: true, message: '请输入目的地', trigger: 'blur' }],
  departure_time: [{ required: true, message: '请选择出发时间', trigger: 'change' }],
  seats: [{ required: true, message: '请输入座位数', trigger: 'blur' }]
}

function handleMapSelect(place) {
  const target = pickTarget.value
  form[target] = place.name || place.address
  form[`${target}_latitude`] = Number(place.latitude)
  form[`${target}_longitude`] = Number(place.longitude)
  formRef.value?.clearValidate(target)
}

function handleMapError(error) {
  if (error?.message) ElMessage.warning(error.message)
}

function choosePreset(place) {
  handleMapSelect({ ...place, name: place.name })
  pickTarget.value = pickTarget.value === 'origin' ? 'destination' : pickTarget.value
}

async function handleSubmit() {
  await formRef.value.validate()
  loading.value = true
  try {
    const res = await rideApi.publish(form)
    if (res.code === 0) {
      ElMessage.success('发布成功')
      router.push('/rides')
    } else {
      ElMessage.error(res.msg)
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.publish-card {
  width: min(1100px, calc(100% - 32px));
  margin: 0 auto;
}
.publish-map {
  width: 860px;
  max-width: 100%;
  margin-right: auto;
  margin-left: auto;
  margin-top: 12px;
}
.selected-point {
  color: #087f6b;
  font-size: 12px;
  margin-top: 4px;
}
.map-selection-hint {
  margin-top: 8px;
  color: #65716d;
  font-size: 13px;
}
.preset-places {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tip-text {
  color: #e6a23c;
  font-size: 12px;
  margin-top: 4px;
}
@media (max-width: 600px) {
  .publish-card :deep(.el-form-item) {
    display: block;
  }
  .publish-card :deep(.el-form-item__label) {
    display: block;
    width: auto !important;
    padding: 0 0 6px;
    line-height: 1.4;
    text-align: left;
  }
  .publish-card :deep(.el-form-item__content) {
    margin-left: 0 !important;
  }
}
</style>
