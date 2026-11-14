# 拼车系统项目说明

## 1. 项目概述

本项目是一个基于 Web 的拼车平台，支持用户注册、登录、发布拼车信息、接单、订单管理、通知和评价等核心功能。系统分为前端和后端两部分，后端使用 Node.js + Express 搭建 API，前端使用 Vue 3 + Vite 构建页面，数据库使用 SQLite 进行持久化存储。

该项目适合用于校园拼车、同城出行、共享出行场景的原型开发与二次扩展。

---

## 2. 技术栈

### 后端
- Node.js
- Express
- SQLite（node:sqlite）
- JWT（身份认证）
- WebSocket（实时通知）
- CORS / Body Parser

### 前端
- Vue 3
- Vite
- Vue Router
- Pinia
- Element Plus
- Axios

### 运行环境
- Windows 本地启动脚本
- 可直接双击 `start.bat` 启动项目

---

## 3. 项目功能

### 3.1 用户管理
- 用户注册
- 用户登录
- 角色区分：乘客 / 司机
- JWT 鉴权
- 用户头像、手机号等信息存储

### 3.2 拼车发布与查询
- 发布拼车路线
- 乘客发布需求
- 司机发布线路
- 查看拼车列表
- 过滤/查看相关路线

### 3.3 订单管理
- 乘客加入/下单
- 司机接单
- 订单状态流转：
  - pending
  - confirmed
  - ongoing
  - completed
  - cancelled

### 3.4 通知系统
- 订单状态变化通知
- 未读消息计数
- 消息列表查询
- 标记已读

### 3.5 评价系统
- 订单完成后可评价
- 评分与评论保存
- 一条订单对应一条评价

### 3.6 实时消息
- 基于 WebSocket 实现实时推送
- 用户登录后可接收通知更新

---

## 4. 数据库结构

项目数据库使用 SQLite，初始化代码在 `backend/db/database.js`。当前创建的表如下：

### 4.1 users
用户表

字段示例：
- id
- username
- password
- phone
- role
- avatar
- created_at

### 4.2 rides
拼车/路线表

字段示例：
- id
- publisher_id
- type
- origin
- destination
- departure_time
- seats
- price
- status
- description
- current_passengers
- created_at
- origin_latitude
- origin_longitude
- destination_latitude
- destination_longitude

### 4.3 orders
订单表

字段示例：
- id
- ride_id
- user_id
- driver_id
- status
- created_at
- updated_at

### 4.4 notifications
通知表

字段示例：
- id
- user_id
- content
- type
- is_read
- related_id
- created_at

### 4.5 ratings
评价表

字段示例：
- id
- order_id
- ride_id
- passenger_id
- driver_id
- score
- comment
- created_at

---

## 5. 项目目录结构

```text
carpool-system7.0/
├── backend/
│   ├── db/
│   │   └── database.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── rides.js
│   │   ├── orders.js
│   │   ├── notifications.js
│   │   └── ratings.js
│   ├── realtime.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── data/
│   │   ├── router/
│   │   ├── stores/
│   │   ├── views/
│   │   ├── App.vue
│   │   └── main.js
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── runtime/
│   └── browser-profile-4.7/
├── README.md
├── PROJECT.md
├── start.bat
├── build-portable.ps1
├── package.json
└── WECHAT_MINIPROGRAM_PLAN.md
```

---

## 6. 启动方式

### 方式一：直接启动
在项目根目录双击运行：

```bash
start.bat
```

### 方式二：手动启动后端

```bash
cd backend
npm install
npm start
```

### 方式三：手动启动前端

```bash
cd frontend
npm install
npm run dev
```

启动成功后：
- 后端地址：`http://localhost:3000`
- 前端地址：`http://localhost:5173`

---

## 7. API 模块说明

### 认证模块
- `/api/auth/register`
- `/api/auth/login`

### 拼车模块
- `/api/rides`
- `/api/rides/:id`

### 订单模块
- `/api/orders`
- `/api/orders/:id`

### 通知模块
- `/api/notifications`
- `/api/notifications/:id/read`

### 评价模块
- `/api/ratings`

### 健康检查
- `/api/health`

---

## 8. 项目特点

- 架构简单，适合学习和二次开发
- 前后端分离清晰
- 使用 SQLite，部署成本低
- 支持本地启动和浏览器托管模式
- 包含通知、订单、评分等完整闭环功能

---

## 9. 适合的扩展方向

- 增加地图定位与路线规划
- 增加管理员后台
- 增加支付功能
- 增加车辆管理模块
- 增加消息推送到小程序端
- 引入更稳定的 MySQL/PostgreSQL 生产数据库

---

## 10. 总结

这个项目是一个较完整的拼车系统原型，覆盖了常见的用户、订单、通知和评价闭环功能，适合用于课程作业、Demo 演示、毕业设计、快速原型验证，以及二次开发的基础模板。
