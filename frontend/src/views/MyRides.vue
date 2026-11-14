<template>
  <div class="page-container">
    <!-- <h2 class="page-title">我的发布</h2> -->
    <div v-loading="loading">
      <div v-if="rides.length === 0 && !loading" class="empty-state">
        <el-icon size="60"><Document /></el-icon>
        <p>暂未发布任何拼车信息</p>
        <el-button type="primary" @click="$router.push('/publish')">去发布</el-button>
      </div>
      <el-table v-else :data="rides" stripe>
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'supply' ? 'warning' : 'primary'" size="small">
              {{ row.type === 'supply' ? '司机线路' : '乘客需求' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="origin" label="出发地" />
        <el-table-column prop="destination" label="目的地" />
        <el-table-column prop="departure_time" label="出发时间" width="160" />
        <el-table-column label="座位/人数" width="100">
          <template #default="{ row }">
            <span v-if="row.type === 'supply'">{{ row.current_passengers }}/{{ row.seats }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="price" label="价格" width="80">
          <template #default="{ row }">{{ row.price > 0 ? '¥' + row.price : '面议' }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="发布时间" width="160" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'open' || row.status === 'full'" type="danger" size="small" @click="handleCancel(row)">取消</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { rideApi } from '../api'
import { useUserStore } from '../stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'

const rides = ref([])
const loading = ref(false)
const userStore = useUserStore()
let stopRealtimeSubscription = null

async function loadRides() {
  loading.value = true
  try {
    const res = await rideApi.myPublished()
    if (res.code === 0) rides.value = res.data
  } finally {
    loading.value = false
  }
}

async function handleCancel(ride) {
  await ElMessageBox.confirm('确定取消该拼车信息吗？相关订单也将被取消。', '提示', { type: 'warning' })
  const res = await rideApi.cancel(ride.id)
  if (res.code === 0) {
    ElMessage.success('已取消')
    loadRides()
  }
}

function statusText(status) {
  return { open: '开放中', full: '已满', closed: '已关闭', cancelled: '已取消' }[status] || status
}
function statusTagType(status) {
  return { open: 'success', full: 'warning', closed: 'info', cancelled: 'danger' }[status] || 'info'
}

onMounted(() => {
  loadRides()
  stopRealtimeSubscription = userStore.subscribeRealtime((event) => {
    if (event.type === 'ride.updated' || event.type === 'order.updated' || event.type === 'notification.created') loadRides()
  })
})
onUnmounted(() => stopRealtimeSubscription?.())
</script>