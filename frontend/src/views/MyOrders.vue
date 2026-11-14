<template>
  <div class="page-container">
    <!-- <h2 class="page-title">我的订单</h2> -->
    <div class="filter-bar">
      <el-radio-group v-model="roleFilter" @change="loadOrders">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="passenger">作为乘客</el-radio-button>
        <el-radio-button value="driver">作为司机</el-radio-button>
      </el-radio-group>
      <el-select v-model="statusFilter" placeholder="订单状态" clearable style="width: 140px" @change="loadOrders">
        <el-option label="待确认" value="pending" />
        <el-option label="已确认" value="confirmed" />
        <el-option label="进行中" value="ongoing" />
        <el-option label="已完成" value="completed" />
        <el-option label="已取消" value="cancelled" />
      </el-select>
    </div>
    <div v-loading="loading">
      <div v-if="orders.length === 0 && !loading" class="empty-state">
        <el-icon size="60"><Tickets /></el-icon>
        <p>暂无订单</p>
      </div>
      <el-table v-else :data="orders" stripe>
        <el-table-column label="路线" min-width="180">
          <template #default="{ row }">
            <div class="route-cell">
              <el-icon color="#67c23a"><Location /></el-icon>{{ row.origin }}
              <el-icon color="#909399"><Right /></el-icon>
              <el-icon color="#f56c6c"><LocationInformation /></el-icon>{{ row.destination }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="departure_time" label="出发时间" width="160" />
        <el-table-column label="身份" width="90">
          <template #default="{ row }">
            <el-tag :type="row.user_id === userId ? 'primary' : 'warning'" size="small">
              {{ row.user_id === userId ? '乘客' : '司机' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="对方" width="120">
          <template #default="{ row }">
            {{ row.user_id === userId ? row.driver_name : row.user_name }}
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
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" type="primary" size="small" @click="handleAction(row, 'confirm')">确认</el-button>
            <el-button v-if="row.status === 'confirmed'" type="success" size="small" @click="handleAction(row, 'start')">开始</el-button>
            <el-button v-if="row.status === 'ongoing'" type="success" size="small" @click="handleAction(row, 'complete')">完成</el-button>
            <el-button v-if="!['completed', 'cancelled'].includes(row.status)" type="danger" size="small" @click="handleAction(row, 'cancel')">取消</el-button>
            <el-button v-if="row.status === 'completed' && row.user_id === userId" type="warning" size="small" @click="openRatingDialog(row)">评价</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="ratingVisible" :title="ratingDetail ? '查看评价' : '评价司机'" width="480px">
      <div v-if="ratingDetail">
        <p class="rating-target">司机：{{ ratingTargetName }}</p>
        <div class="rating-score-row">
          <span>评分：</span>
          <el-rate :model-value="ratingDetail.score" disabled show-text :texts="['很差','较差','一般','较好','很好']" />
        </div>
        <p class="rating-comment">评价内容：{{ ratingDetail.comment || '未填写' }}</p>
      </div>
      <div v-else>
        <p class="rating-target">司机：{{ ratingTargetName }}</p>
        <div class="rating-score-row">
          <span>评分：</span>
          <el-rate v-model="ratingForm.score" show-text :texts="['很差','较差','一般','较好','很好']" />
        </div>
        <el-input v-model="ratingForm.comment" type="textarea" :rows="3" placeholder="说点什么吧（选填）" style="margin-top: 12px" />
      </div>
      <template #footer>
        <el-button @click="ratingVisible = false">关闭</el-button>
        <el-button v-if="!ratingDetail" type="primary" :loading="ratingSubmitting" @click="submitRating">提交评价</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { orderApi, ratingApi } from '../api'
import { useUserStore } from '../stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'

const userStore = useUserStore()
const userId = computed(() => userStore.user?.id)
const orders = ref([])
const loading = ref(false)
const roleFilter = ref('')
const statusFilter = ref('')
const ratingVisible = ref(false)
const ratingDetail = ref(null)
const ratingSubmitting = ref(false)
const ratingTargetName = ref('')
const ratingForm = ref({ order_id: null, score: 5, comment: '' })
let stopRealtimeSubscription = null

const actionMap = {
  confirm: { api: orderApi.confirm, text: '确认' },
  start: { api: orderApi.start, text: '开始行程' },
  complete: { api: orderApi.complete, text: '完成行程' },
  cancel: { api: orderApi.cancel, text: '取消订单' }
}

async function loadOrders() {
  loading.value = true
  try {
    const res = await orderApi.myOrders({ role: roleFilter.value || undefined, status: statusFilter.value || undefined })
    if (res.code === 0) orders.value = res.data
  } finally {
    loading.value = false
  }
}

async function handleAction(row, action) {
  const cfg = actionMap[action]
  await ElMessageBox.confirm(`确定${cfg.text}吗？`, '提示', { type: 'info' })
  const res = await cfg.api(row.id)
  if (res.code === 0) {
    ElMessage.success(res.msg)
    loadOrders()
  }
}

async function openRatingDialog(row) {
  ratingTargetName.value = row.driver_name || '司机'
  ratingForm.value = { order_id: row.id, score: 5, comment: '' }
  ratingDetail.value = null
  ratingVisible.value = true
  const res = await ratingApi.orderRating(row.id)
  if (res.code === 0 && res.data) {
    ratingDetail.value = res.data
  }
}

async function submitRating() {
  if (!ratingForm.value.score) {
    ElMessage.warning('请选择评分')
    return
  }
  ratingSubmitting.value = true
  try {
    const res = await ratingApi.submit(ratingForm.value)
    if (res.code === 0) {
      ElMessage.success('评价成功')
      ratingDetail.value = res.data
    }
  } finally {
    ratingSubmitting.value = false
  }
}

function statusText(status) {
  return { pending: '待确认', confirmed: '已确认', ongoing: '进行中', completed: '已完成', cancelled: '已取消' }[status] || status
}
function statusTagType(status) {
  return { pending: 'warning', confirmed: 'primary', ongoing: 'success', completed: 'info', cancelled: 'danger' }[status] || 'info'
}

onMounted(() => {
  loadOrders()
  stopRealtimeSubscription = userStore.subscribeRealtime((event) => {
    if (event.type === 'order.updated' || event.type === 'ride.updated' || event.type === 'notification.created') loadOrders()
  })
})
onUnmounted(() => stopRealtimeSubscription?.())
</script>

<style scoped>
.filter-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}
.route-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}
.rating-target {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 16px;
}
.rating-score-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.rating-comment {
  margin-top: 16px;
  color: #606266;
  line-height: 1.6;
}
@media (max-width: 600px) {
  .filter-bar {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }
  .filter-bar :deep(.el-select) {
    width: 100% !important;
  }
}
</style>