<template>
  <div class="auth-container">
    <div class="auth-box">
      <div class="auth-header">
        <el-icon size="48" color="#409eff"><Van /></el-icon>
        <h1>注册账号</h1>
        <p>加入路噜同途，开启便捷出行</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="large">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" prefix-icon="User" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" prefix-icon="Phone" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="至少6位密码" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item label="注册身份" prop="role">
          <el-radio-group v-model="form.role">
            <el-radio value="passenger">乘客</el-radio>
            <el-radio value="driver">司机</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="form.agreed">
            我已阅读并同意
            <el-link type="primary" :underline="false" @click.prevent="agreementVisible = true">《路噜同途打车服务免责条款》</el-link>
          </el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" :disabled="!form.agreed" class="submit-btn" @click="handleRegister">注 册</el-button>
        </el-form-item>
        <div class="auth-footer">
          已有账号？<el-link type="primary" @click="$router.push('/login')">返回登录</el-link>
        </div>
      </el-form>
      <el-dialog v-model="agreementVisible" title="路噜同途打车服务免责条款" width="600px" append-to-body>
        <div class="agreement-content">
          <!-- ===== 免责条款内容插入点 ===== -->
          <!-- 请在此处粘贴"路噜同途打车服务免责条款"的完整文本内容 -->
          <!-- 支持多段文字，可使用 <p> 标签分隔段落，例如： -->
          <!-- <p>第一段条款内容...</p> -->
          <!-- <p>第二段条款内容...</p> -->

          <h3>路噜同途打车服务免责条款</h3>
          <p>一、服务性质与适用范围</p>
          <p>本平台为网络预约出行信息服务平台，仅为注册乘客与注册司机提供出行信息撮合、技术支持与订单匹配服务，不直接提供客运运输服务，客运服务由符合准入条件的注册司机独立提供。</p>
          <p>本平台服务范围限定为海南省陵水黎族自治县黎安大学城核心区域及周边约定服务范围，以及平台官方公示的特定交通枢纽点位。超出上述服务范围发起的行程请求、用户私下协商延伸的行程、线下脱离平台的交易，本平台不对其行程履约能力、出行安全性及相关后果承担任何担保、赔偿或连带责任。</p>

          <p>二、账号注册与管理规则</p>
          <p>乘客与司机均可通过本平台注册账号，注册用户需提供真实、合法、有效的身份信息及相关资料，对账号下的所有行为承担全部责任。</p>
          <p>司机用户注册除满足通用注册要求外，还须符合本平台《司机安全准入守则》规定的全部条件（包括但不限于身份资质、车辆合规、驾驶记录、无不良记录等），并经平台审核通过后方可接单服务。若司机存在违反安全守则、提供虚假资质材料、服务过程中严重违规等情形，平台有权视情节采取限制接单、暂停服务、永久注销账号等措施，且无需向司机承担任何违约赔偿或补偿责任。</p>
          <p>严禁所有用户实施恶意刷单、虚构行程、虚假预约、套取平台补贴或优惠、串通作弊等扰乱平台运营秩序的行为。一经核实，平台有权采取扣除违规所得、冻结账号权益、封禁账号、注销账号等处罚；因上述行为给平台或第三方造成经济损失、名誉损失的，违规用户应承担全部赔偿责任。</p>

          <p>三、安全功能提示与责任限定</p>
          <p>本平台内置一键报警功能，作为紧急情况下的安全辅助工具，可协助用户快速触发求助流程、同步行程信息至紧急联系人。但该功能的正常使用依赖于用户终端设备状态、移动网络信号、地理位置定位精度等客观条件，平台不对该功能的可用性、及时性、有效性作出任何明示或默示的担保。</p>
          <p>平台已尽到司机准入审核、安全规则提示等合理义务，但不对客运服务过程中乘客与司机的人身安全、财产安全作出绝对承诺与完全担保。行程中发生的人身损害、财产纠纷、违约行为，由直接责任方依法承担责任；平台仅在自身存在过错的范围内，依照法律规定承担相应责任。</p>
          <p>用户应自行增强安全防范意识，乘车前核验车辆与司机信息，遵守乘车安全规范；司机应合规驾驶、保障车辆安全，履行承运人安全义务。因用户自身过错、主动冒险行为导致的损害，平台不承担责任。</p>

          <p>四、其他免责事项</p>
          <p>因不可抗力（包括但不限于自然灾害、政府管制、公共卫生事件、网络故障、电力中断等）导致平台服务中断、订单无法完成或信息延迟的，平台不承担违约责任，但将尽力协助减少影响。</p>
          <p>因第三方原因（如道路拥堵、交通管制、第三方系统故障等）导致行程延误、取消或产生损失的，平台不承担赔偿责任。</p>
          <p>平台不对用户发布的信息内容的真实性、准确性承担担保责任，因用户提供虚假信息、错误信息导致的任何纠纷与损失，由用户自行承担。用户擅自将账号转借、出租、售卖给他人使用，由此产生的一切风险与责任由注册用户自行承担，平台不承担任何责任。</p>

          <p>五、附则</p>
          <p>用户注册、登录并使用本平台服务，即视为已充分阅读、理解并同意本免责条款的全部内容。</p>
          <p>本平台有权根据运营需要修订本条款，修订后的条款将在平台内公示，公示期满后自动生效。</p>
          <p>本条款未尽事宜，按照国家相关法律法规及平台《用户服务协议》执行。</p>

          <!-- ===== 免责条款内容插入点结束 ===== -->

        </div>
        <template #footer>
          <el-button @click="agreementVisible = false">关闭</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '../api'
import { ElMessage } from 'element-plus'

const router = useRouter()
const formRef = ref()
const loading = ref(false)

const form = reactive({ username: '', phone: '', password: '', role: 'passenger', agreed: false })
const agreementVisible = ref(false)
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  role: [{ required: true, message: '请选择身份', trigger: 'change' }]
}

async function handleRegister() {
  if (!form.agreed) {
    ElMessage.warning('请先阅读并同意《路噜同途打车服务免责条款》')
    return
  }
  await formRef.value.validate()
  loading.value = true
  try {
    const res = await authApi.register(form)
    if (res.code === 0) {
      ElMessage.success('注册成功，请登录')
      router.push('/login')
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
.agreement-content {
  max-height: 60vh;
  overflow-y: auto;
  line-height: 1.8;
  color: #606266;
  font-size: 14px;
  white-space: pre-wrap;
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