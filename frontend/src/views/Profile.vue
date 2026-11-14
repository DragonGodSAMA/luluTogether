<template>
  <div class="page-container">
    <!-- <h2 class="page-title">个人中心</h2> -->
    <div class="profile-layout">
      <el-card class="profile-card">
        <div class="avatar-section">
          <el-avatar :size="80" class="big-avatar">{{ userStore.user?.username?.[0]?.toUpperCase() }}</el-avatar>
          <h3>{{ userStore.user?.username }}</h3>
          <el-tag :type="roleTagType">{{ roleText }}</el-tag>
        </div>
        <el-descriptions :column="1" border class="info-desc">
          <el-descriptions-item label="用户名">{{ userStore.user?.username }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ userStore.user?.phone }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ userStore.user?.created_at }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card class="role-card">
        <template #header>
          <span class="card-title">身份切换</span>
        </template>
        <p class="role-tip">切换身份后，您可以获得不同的功能权限：</p>
        <div class="role-options">
          <div class="role-option" :class="{ active: userStore.user?.role === 'passenger' }" @click="handleSwitchRole('passenger')">
            <el-icon size="32" color="#409eff"><User /></el-icon>
            <h4>乘客</h4>
            <p>发布需求、加入线路</p>
          </div>
          <div class="role-option" :class="{ active: userStore.user?.role === 'driver' }" @click="handleSwitchRole('driver')">
            <el-icon size="32" color="#e6a23c"><Van /></el-icon>
            <h4>司机</h4>
            <p>发布线路、接单需求</p>
          </div>
          <div class="role-option" :class="{ active: userStore.user?.role === 'both' }" @click="handleSwitchRole('both')">
            <el-icon size="32" color="#67c23a"><UserFilled /></el-icon>
            <h4>双重身份</h4>
            <p>同时具备乘客和司机权限</p>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()

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

async function handleSwitchRole(role) {
  if (role === userStore.user?.role) return
  const res = await userStore.switchRole(role)
  if (res.code === 0) {
    ElMessage.success('身份切换成功')
  } else {
    ElMessage.error(res.msg)
  }
}
</script>

<style scoped>
.profile-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  max-width: 900px;
}
.avatar-section {
  text-align: center;
  margin-bottom: 20px;
}
.big-avatar {
  background: linear-gradient(135deg, #409eff, #36a3ff);
  color: #fff;
  font-size: 32px;
  font-weight: 600;
  margin-bottom: 12px;
}
.avatar-section h3 {
  margin: 8px 0;
}
.card-title {
  font-weight: 600;
}
.role-tip {
  color: #909399;
  font-size: 13px;
  margin-bottom: 16px;
}
.role-options {
  display: flex;
  gap: 12px;
}
.role-option {
  flex: 1;
  text-align: center;
  padding: 20px 12px;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}
.role-option:hover {
  border-color: #409eff;
}
.role-option.active {
  border-color: #409eff;
  background: #f0f7ff;
}
.role-option h4 {
  margin: 8px 0 4px;
  color: #303133;
}
.role-option p {
  color: #909399;
  font-size: 12px;
}
@media (max-width: 700px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
  .role-options {
    flex-direction: column;
  }
}
</style>