<template>
  <div class="auth-container">
    <div class="auth-box">
      <div class="auth-header">
        <el-icon size="48" color="#409eff"><Van /></el-icon>
        <h1>路噜同途</h1>
        <p>绿色出行，共享便利</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="large">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" prefix-icon="User" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" prefix-icon="Lock" show-password @keyup.enter="handleLogin" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" class="submit-btn" @click="handleLogin">登 录</el-button>
        </el-form-item>
        <div class="auth-footer">
          还没有账号？<el-link type="primary" @click="$router.push('/register')">立即注册</el-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { authApi } from '../api'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)

const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function handleLogin() {
  await formRef.value.validate()
  loading.value = true
  try {
    const res = await authApi.login(form)
    if (res.code === 0) {
      userStore.setAuth(res.data.token, res.data.user)
      ElMessage.success('登录成功')
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
.auth-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.auth-box {
  width: min(460px, calc(100% - 32px));
  padding: 48px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.auth-header {
  text-align: center;
  margin-bottom: 32px;
}
.auth-header h1 {
  margin: 12px 0 4px;
  font-size: 28px;
  color: #303133;
}
.auth-header p {
  color: #909399;
  font-size: 14px;
}
.submit-btn {
  width: 100%;
}
.auth-footer {
  text-align: center;
  color: #606266;
  font-size: 14px;
}
@media (max-width: 600px) {
  .auth-box {
    padding: 32px 22px;
  }
  .auth-header {
    margin-bottom: 24px;
  }
  .auth-header h1 {
    font-size: 24px;
  }
}
</style>