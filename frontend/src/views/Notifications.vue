<template>
  <div class="page-container">
    <!-- <h2 class="page-title">消息通知</h2> -->
    <div class="action-bar">
      <el-button type="primary" plain @click="handleReadAll" :disabled="notifications.length === 0">全部已读</el-button>
    </div>
    <div v-loading="loading">
      <div v-if="notifications.length === 0 && !loading" class="empty-state">
        <el-icon size="60"><Bell /></el-icon>
        <p>暂无消息通知</p>
      </div>
      <div class="notification-list">
        <div v-for="n in notifications" :key="n.id" class="notification-item" :class="{ unread: !n.is_read }" @click="handleRead(n)">
          <div class="notify-icon-wrap">
            <el-icon size="20" :color="!n.is_read ? '#409eff' : '#c0c4cc'"><Bell /></el-icon>
          </div>
          <div class="notify-content">
            <div class="notify-text">{{ n.content }}</div>
            <div class="notify-time">{{ n.created_at }}</div>
          </div>
          <el-tag v-if="!n.is_read" type="danger" size="small" effect="dark" class="unread-tag">未读</el-tag>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { notificationApi } from '../api'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'

const notifications = ref([])
const loading = ref(false)
const userStore = useUserStore()
let stopRealtimeSubscription = null

async function loadNotifications() {
  loading.value = true
  try {
    const res = await notificationApi.list()
    if (res.code === 0) notifications.value = res.data
  } finally {
    loading.value = false
  }
}

async function handleRead(n) {
  if (n.is_read) return
  const res = await notificationApi.read(n.id)
  if (res.code === 0) {
    n.is_read = 1
  }
}

async function handleReadAll() {
  const res = await notificationApi.readAll()
  if (res.code === 0) {
    ElMessage.success('已全部标记为已读')
    loadNotifications()
  }
}

onMounted(() => {
  loadNotifications()
  stopRealtimeSubscription = userStore.subscribeRealtime((event) => {
    if (event.type === 'notification.created') loadNotifications()
  })
})
onUnmounted(() => stopRealtimeSubscription?.())
</script>

<style scoped>
.action-bar {
  margin-bottom: 16px;
}
.notification-list {
  max-width: 1000px;
}
.notification-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 22px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}
.notification-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.notification-item.unread {
  border-left-color: #409eff;
  background: #f0f7ff;
}
.notify-icon-wrap {
  flex-shrink: 0;
}
.notify-content {
  flex: 1;
}
.notify-text {
  color: #303133;
  font-size: 14px;
  margin-bottom: 4px;
}
.notify-time {
  color: #909399;
  font-size: 12px;
}
.unread-tag {
  flex-shrink: 0;
}
</style>