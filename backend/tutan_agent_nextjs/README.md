# TUTAN_AGENT Next.js Implementation

基于 Next.js 14 开发的 TUTAN_AGENT 全栈版本。

## 核心特性

- **全栈集成**: 使用 Next.js App Router 同时处理前端 UI 和后端 API。
- **Ref 系统 (TypeScript)**: 移植了 Python 版本的语义引用逻辑，提供强类型支持。
- **现代化 UI**: 基于 Tailwind CSS 和 Lucide 图标库构建。
- **强类型**: 完整的 TypeScript 定义，确保 GUI 操作的安全性。

## 快速开始

### 1. 安装依赖

```bash
cd backend/tutan_agent_nextjs
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000`。

## 目录结构

- `src/app/api/`: 后端 API 路由（设备管理、Agent 运行）。
- `src/lib/`: 核心逻辑（RefSystem, ADB 封装）。
- `src/components/`: 前端 React 组件。
- `src/app/`: 页面布局与主页。

## 开发计划

- [x] 设备列表 API
- [x] Ref 系统 TypeScript 实现
- [x] 基础设备管理 UI
- [ ] 集成 Socket.IO 实时画面流
- [ ] 接入 LLM 推理引擎
