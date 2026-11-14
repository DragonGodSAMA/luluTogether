import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue') },
  { path: '/register', name: 'Register', component: () => import('../views/Register.vue') },
  {
    path: '/',
    component: () => import('../components/Layout.vue'),
    redirect: '/rides',
    children: [
      { path: 'rides', name: 'RideList', component: () => import('../views/RideList.vue'), meta: { title: '拼车大厅' } },
      { path: 'publish', name: 'PublishRide', component: () => import('../views/PublishRide.vue'), meta: { title: '发布拼车' } },
      { path: 'my-rides', name: 'MyRides', component: () => import('../views/MyRides.vue'), meta: { title: '我的发布' } },
      { path: 'orders', name: 'MyOrders', component: () => import('../views/MyOrders.vue'), meta: { title: '我的订单' } },
      { path: 'notifications', name: 'Notifications', component: () => import('../views/Notifications.vue'), meta: { title: '消息通知' } },
      { path: 'profile', name: 'Profile', component: () => import('../views/Profile.vue'), meta: { title: '个人中心' } }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  if (to.name === 'Login' || to.name === 'Register') {
    next()
  } else if (!userStore.token) {
    next({ name: 'Login' })
  } else {
    next()
  }
})

export default router