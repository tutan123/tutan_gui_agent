# TUTAN_AGENT Backend

TUTAN_AGENT 后端服务，基于 FastAPI 和 Socket.IO 构建。

## 核心特性

- **增强型 ADB 管理**: 自动搜索 ADB 路径，支持设备缓存和后台状态监控。
- **实时通信**: 使用 Socket.IO 推送 Agent 状态和 Scrcpy 视频流。
- **分布式架构**: 借鉴 OpenClaw 设计，支持多节点接入。

## 快速开始

### 1. 安装依赖

推荐使用 `uv` 管理环境：

```bash
uv sync
```

或者使用 `pip`:

```bash
pip install -e .
```

### 2. 启动服务

```bash
python tutan_agent/server.py
```

服务默认运行在 `http://localhost:18888`。

## 目录结构

- `tutan_agent/adb/`: ADB 连接与控制逻辑。
- `tutan_agent/api/`: RESTful API 路由。
- `tutan_agent/agents/`: Agent 核心逻辑（任务规划、Ref 系统）。
- `tutan_agent/core/`: 核心配置与工具函数。
