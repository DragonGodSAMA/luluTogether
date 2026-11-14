# 路噜同途 (luluTogether)

BS模式的拼车系统路噜同途，用户可发布/加入拼车，司机可接单或发布拼车线路。

## 技术栈

- **后端**：Node.js + Express + SQLite (better-sqlite3) + JWT
- **前端**：Vue 3 + Element Plus + Pinia + Vue Router + Vite

## 功能模块

1. **用户注册登录**：支持乘客/司机注册，JWT鉴权，身份切换
2. **发布拼车信息**：乘客发布拼车需求，司机发布拼车线路
3. **加入/接单拼车**：乘客加入司机线路，司机接单乘客需求
4. **订单管理**：确认、开始、完成、取消订单，完整状态流转
5. **消息通知**：订单状态变更实时通知，未读消息计数

## 快速启动

日常使用直接双击根目录的 `start.bat`。它会使用随项目附带的 Node.js，启动一个独立应用窗口；关闭该窗口后，本地服务会自动退出。浏览器异常退出时，页面心跳超时后也会自动清理本项目的服务。

### 1. 启动后端

```bash
cd backend
npm install
npm start
```

后端服务运行在 http://localhost:3000

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端服务运行在 http://localhost:5173

### 3. 访问系统

浏览器打开 http://localhost:5173 ，注册账号后即可使用。

## 订单状态流转

```
pending (待确认) → confirmed (已确认) → ongoing (进行中) → completed (已完成)
      ↓                  ↓                  ↓
  cancelled           cancelled          cancelled
```

## 项目结构

```
carpool-system/
├── backend/              # 后端服务
│   ├── server.js         # 入口
│   ├── db/database.js    # 数据库初始化
│   ├── middleware/auth.js # JWT中间件
│   └── routes/           # 路由(auth/rides/orders/notifications)
└── frontend/             # 前端应用
    └── src/
        ├── views/        # 页面视图
        ├── components/   # 布局组件
        ├── stores/       # Pinia状态
        ├── api/          # API封装
        └── router/       # 路由配置
```
