# AI Canvas Flow 技术文档与面试题

---

## 一、项目概述

**AI Canvas Flow** 是一个 AI 视频工作流编排平台，用户通过可视化画布拖拽节点、连接数据流，编排 AI 推理任务（文生图、图生视频、TTS 等），并结合时间轴进行音视频预览与导出。

### 核心能力

| 能力 | 说明 |
|------|------|
| 可视化工作流编辑 | 基于 React Flow 的画布，支持拖拽节点、连线、属性编辑 |
| AI 多模态推理 | 文生图、图生图、图生视频、文生视频、TTS、AI 字幕 |
| 实时协作 | Socket.IO 多人协同编辑，含节点锁机制 |
| 时间轴编排 | 视频/音频/字幕轨，片段拖拽、调整时长、播放预览 |
| 自动保存与快照 | 双防抖（2s 操作 + 30s 定时）+ 5 快照上限 |
| 撤销/重做 | 100 步历史栈，支持分支与操作合并 |
| 异步任务引擎 | Celery + RabbitMQ 处理长时间 AI 推理任务 |

---

## 二、技术栈

### 后端

| 组件 | 技术 | 说明 |
|------|------|------|
| Web 框架 | FastAPI | 异步 ASGI，自动 OpenAPI 文档 |
| 数据库 | PostgreSQL 16 + SQLAlchemy 2.0 (async) | 异步引擎 + 会话工厂 |
| 缓存 | Redis 7 | Session / Celery 结果后端 |
| 消息队列 | RabbitMQ 3 | Celery Broker |
| 对象存储 | MinIO | 媒体文件、项目封面、AI 产出 |
| 异步任务 | Celery 5 | AI 推理、渲染任务后台执行 |
| 实时通信 | python-socketio (ASGI) | 与 FastAPI 共端口 |
| 认证 | JWT (python-jose) | Access Token 30 分钟过期 |
| 配置管理 | Pydantic Settings | .env 环境变量 |

### 前端

| 组件 | 技术 | 说明 |
|------|------|------|
| 框架 | React 18 + TypeScript | SPA |
| 构建 | Vite 6 | HMR、代理、Mock 模式 |
| 状态管理 | Zustand 5 | 多 store 职责分离 |
| 画布 | @xyflow/react 12 | React Flow 可视化节点编辑 |
| 样式 | Tailwind CSS 3 | 原子化 CSS |
| 实时通信 | socket.io-client 4 | WebSocket 协作 |
| 视频播放 | video.js 8 | VideoPreview 面板 |
| 视频导出 | @ffmpeg/ffmpeg | 前端 FFmpeg 字幕烧录 |
| 拖拽 | @dnd-kit | 时间轴片段拖拽 |
| 通知 | sonner | Toast 提示 |
| 测试 | Vitest | 单元测试 |

---

## 三、系统架构

### 3.1 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (Vite+React)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Canvas   │ │ Timeline │ │Property  │ │VideoPreview│  │
│  │ (React   │ │ (dnd-kit)│ │Panel     │ │ (video.js) │  │
│  │  Flow)   │ │          │ │          │ │            │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬─────┘  │
│       │             │            │               │        │
│  ┌────▼─────────────▼────────────▼───────────────▼─────┐  │
│  │              Zustand Stores                          │  │
│  │  canvasStore | timelineStore | collabStore | ...    │  │
│  └──────────────────┬──────────────────────────────────┘  │
│                     │ REST API + Socket.IO                 │
└─────────────────────┼────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────┐
│                   Backend (FastAPI)                       │
│  ┌────────────┐ ┌──────────────┐ ┌───────────────────┐  │
│  │ REST API   │ │ Socket.IO    │ │ Celery Worker     │  │
│  │ (Router)   │ │ (Collab)     │ │ (AI Tasks)        │  │
│  └─────┬──────┘ └──────┬───────┘ └──────┬────────────┘  │
│        │               │                │                 │
│  ┌─────▼───────────────▼────────────────▼─────────────┐  │
│  │            SQLAlchemy 2.0 (AsyncSession)            │  │
│  └──────────────────────┬─────────────────────────────┘  │
└─────────────────────────┼────────────────────────────────┘
                          │
    ┌─────────┬───────────┼──────────┬──────────────┐
    ▼         ▼           ▼          ▼              ▼
 PostgreSQL  Redis    RabbitMQ    MinIO        AI APIs
  (数据)    (缓存)   (消息队列)  (对象存储)  (火山引擎等)
```

### 3.2 后端架构

#### 目录结构

```
backend/
├── app/
│   ├── main.py              # FastAPI 入口 + 生命周期 + Socket.IO 挂载
│   ├── config.py            # Pydantic Settings 配置
│   ├── database.py          # SQLAlchemy 异步引擎 + 会话工厂
│   ├── api/                 # REST API 路由
│   │   ├── router.py        # 路由汇总 /api/v1
│   │   ├── auth.py          # 认证（登录/注册/刷新）
│   │   ├── projects.py      # 项目 CRUD
│   │   ├── workflows.py     # 工作流节点/边管理
│   │   ├── render.py        # 渲染任务创建/查询/取消
│   │   ├── media.py         # 媒体资产上传/下载
│   │   ├── ai.py            # AI 模型管理/工作流生成
│   │   ├── collaboration.py # 协作者管理
│   │   ├── snapshots.py     # 项目快照
│   │   ├── invitations.py   # 邀请链接
│   │   └── templates.py     # 项目模板
│   ├── models/              # SQLAlchemy ORM 模型
│   │   ├── user.py
│   │   ├── project.py
│   │   ├── project_collaborator.py
│   │   ├── workflow_node.py
│   │   ├── workflow_edge.py
│   │   ├── render_task.py
│   │   ├── media_asset.py
│   │   ├── ai_provider.py
│   │   ├── ai_model.py
│   │   └── snapshot.py
│   ├── services/            # 业务逻辑层
│   │   ├── ai_service.py    # AI 调用封装（LLM/文生图/图生视频/TTS）
│   │   └── media_service.py # MinIO 上传/下载
│   ├── tasks/               # Celery 异步任务
│   │   ├── celery_app.py    # Celery 实例配置
│   │   └── render_tasks.py  # 渲染/AI 任务执行
│   └── ws/
│       └── collaboration.py # Socket.IO 协作 + 节点锁
```

#### 核心设计模式

1. **异步全栈**：FastAPI + asyncpg + SQLAlchemy async，所有 I/O 操作异步化
2. **会话工厂模式**：`async_session_factory = async_sessionmaker(engine)`，每个请求/任务创建独立 session
3. **Celery 独立事件循环**：Worker 拥有自己的 async engine + session factory，避免与 FastAPI 事件循环冲突
4. **AI 服务动态路由**：根据数据库 `ai_providers`/`ai_models` 表动态调用不同平台 API

### 3.3 前端架构

#### 目录结构

```
frontend/src/
├── main.tsx                # React 入口
├── App.tsx                 # 路由配置
├── pages/                  # 页面组件（React.lazy 懒加载）
│   ├── Home.tsx            # 首页/项目列表
│   ├── Editor.tsx          # 编辑器主页面
│   ├── Login.tsx           # 登录
│   ├── Settings.tsx        # 设置（个人信息/AI配置/存储）
│   ├── MediaLibrary.tsx    # 媒体库
│   ├── RenderCenter.tsx    # 渲染中心
│   └── Templates.tsx       # 模板
├── components/
│   ├── canvas/             # 画布组件
│   │   ├── Canvas.tsx      # React Flow 画布
│   │   ├── CanvasNode.tsx  # 自定义节点
│   │   └── canvas.ts       # NODE_TEMPLATES 节点模板
│   ├── timeline/           # 时间轴组件
│   ├── panels/             # 属性面板
│   ├── preview/            # VideoPreview
│   └── layout/             # 布局组件
├── stores/                 # Zustand 状态管理
│   ├── canvasStore.ts      # 画布状态（节点/边/选中）
│   ├── historyStore.ts     # 撤销/重做（分支树 + 操作合并）
│   ├── autoSaveStore.ts    # 自动保存（双防抖 + 快照）
│   ├── timelineStore.ts    # 时间轴状态
│   ├── collabStore.ts      # 协作状态
│   ├── projectStore.ts     # 项目管理
│   ├── authStore.ts        # 认证状态
│   └── clipboardStore.ts   # 剪贴板
├── utils/
│   ├── apiClient.ts        # API 客户端
│   ├── workflowExecutor.ts # 工作流编排引擎
│   ├── errorMessages.ts    # 统一错误消息
│   └── canvasTransform.ts  # 数据转换
├── types/                  # TypeScript 类型
└── mock/                   # Mock 数据
```

---

## 四、核心模块深度解析

### 4.1 工作流编排引擎

**单节点执行流程**：

```
executeNode(nodeId)
  ├─ collectUpstreamArtifacts() → 收集上游输出/虚拟 artifact
  ├─ 判断 AI 类型 → 获取 model_id + prompt
  ├─ ai_subtitle → 直接调 API，不走 Celery
  ├─ 其他 → renderApi.create() → 创建 Celery 任务
  │         └─ renderApi.poll() → 2s 轮询，更新进度
  └─ 成功 → setNodeOutput() + 自动加入时间轴
```

**全工作流编排**：

```
executeWorkflow()
  ├─ topologicalSort() → 按层分组（Kahn 算法）
  ├─ 按层并行执行（Promise.allSettled）
  │   └─ 任一失败 → 停止后续层
  └─ 支持 cancelWorkflowExecution() 取消
```

**断点续执行**：`resumeWorkflow()` 跳过已完成节点，只执行 idle/pending/failed 节点。

### 4.2 撤销/重做系统

- **数据结构**：`HistoryTree`，包含 `branches`（分支数组）+ `activeBranchId` + `pointer`
- **最大深度**：100 步
- **操作合并**：500ms 合并窗口，同类操作（如连续 move_node）合并为单条记录
- **逆向/正向执行**：`applyReverse()` / `applyForward()` 直接操作 canvasStore/timelineStore
- **录制控制**：`pauseRecording()` / `resumeRecording()`，防止恢复操作被误记录
- **跳跃跳转**：`jumpToAction()` 支持跳到历史树中任意位置

### 4.3 自动保存机制

- **双防抖策略**：操作后 2s 防抖 + 30s 定时扫描
- **快照上限**：5 个 auto 快照，超出自动删除最旧的
- **画布封面**：保存时用 `html-to-image` 截图上传到 `/api/v1/projects/{id}/cover`
- **恢复检测**：`checkRecovery()` 比较快照时间与项目更新时间，判断是否弹出恢复对话框
- **保存锁**：`isSaving` 标志防止并发保存

### 4.4 实时协作与节点锁

**Socket.IO 事件**：

| 事件 | 方向 | 说明 |
|------|------|------|
| `join_project` | C→S | 加入房间，返回在线用户 + 活跃锁 |
| `leave_project` | C→S | 离开房间 |
| `node_update` | C→S→C | 节点变更广播（add/update/delete） |
| `edge_update` | C→S→C | 边变更广播 |
| `cursor_move` | C→S→C | 远端光标 |
| `acquire_lock` | C→S | 申请节点锁 |
| `renew_lock` | C→S | 续租锁 |
| `release_lock` | C→S | 释放锁 |
| `force_release` | C→S | 强制解锁（仅 owner） |
| `lock_changed` | S→C | 锁变更通知（包括释放） |

**节点锁机制**：

- **租约模型**：TTL=5s，续租间隔=2s，过期自动释放
- **后台清理协程**：1s 扫描一次过期锁，广播 `lock_changed(lock=null)`
- **权限控制**：viewer 不可获锁；owner 可 force_release 任意锁
- **断线清理**：disconnect 时移除该 sid 所有锁
- **删除优先于锁**：节点删除时 pop 锁并广播释放
- **前端降级**：acquireLock 3s 超时，失败退化为无锁模式

### 4.5 AI 服务集成

**支持的 AI 类型**：

| 类型 | 函数 | API 格式 |
|------|------|----------|
| LLM | `call_llm` | OpenAI Chat Completions 兼容 |
| 文生图 | `call_image_gen` | OpenAI Images API 兼容 |
| 图生图 | `call_img2img` | OpenAI Images API + image 参数 |
| 图生视频 | `call_video_gen` | Ark 异步内容生成 API |
| TTS | `call_audio_gen` | Ark 异步内容生成 API |

**关键设计**：

1. **动态配置**：AI Provider/Model 存储在数据库，支持用户自定义配置
2. **MinIO 持久化**：AI 产出先下载到 MinIO，返回内部 URL `/api/v1/media/{id}/download`
3. **内部图片转 base64**：图生图时，内部 MinIO 路径下载转 base64 再传给 API（外部 API 无法访问内部路径）
4. **异步任务轮询**：视频/音频生成使用 Ark 异步 API，`_poll_ark_task()` 轮询状态（5s 间隔，5min 超时）
5. **AI 工作流生成**：用户描述 → LLM 生成节点 JSON → 校验白名单 → 拓扑布局 → 预填参数

### 4.6 Celery 任务系统

**核心问题与解决方案**：

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `Future attached to a different loop` | asyncpg 连接绑定到创建时的事件循环 | Worker 创建独立的 engine + session factory + event loop |
| RabbitMQ 4.x 兼容性 | transient 队列被弃用 | `task_default_durable=True` + 禁用 gossip/mingle |
| 任务发现失败 | `autodiscover_tasks` 不可靠 | `tasks/__init__.py` 显式导入 |
| 事件循环阻塞 | `time.sleep()` 阻塞异步任务 | 使用 `await asyncio.sleep()` |
| 任务撤销 | `remote control` 不稳定 | `AsyncResult.revoke(terminate=True)` |

### 4.7 数据库模型关系

```
User ──┬──< Project (owner)
       │         ├──< WorkflowNode
       │         ├──< WorkflowEdge
       │         ├──< RenderTask
       │         ├──< MediaAsset
       │         ├──< Snapshot
       │         ├──< ProjectCollaborator
       │         └──< Invitation
       ├──< AiProvider ──< AiModel
       └──< MediaAsset (owner)
```

---

## 五、面试题与答案

### 第一部分：架构设计

#### Q1：为什么选择 FastAPI 而不是 Django 或 Flask？

**答**：
1. **原生异步支持**：FastAPI 基于 Starlette ASGI，原生支持 async/await，与 asyncpg（PostgreSQL 异步驱动）完美配合，整个请求链路无阻塞
2. **自动 API 文档**：OpenAPI/Swagger 自动生成，前后端协作效率高
3. **类型安全**：Pydantic 模型校验 + TypeScript 前端，全栈类型安全
4. **轻量灵活**：相比 Django 的"大而全"，FastAPI 更适合微服务/API 优先的架构；相比 Flask，性能更优（基于 ASGI 而非 WSGI）

#### Q2：为什么前端选择 Zustand 而不是 Redux？

**答**：
1. **极简 API**：不需要 reducer/action/types 样板代码，`create()` 即可
2. **细粒度 Store**：每个关注点独立 Store（canvasStore、timelineStore 等），避免单一巨大 state tree
3. **无 Provider 包裹**：不需要 `<Provider>` 组件，任何组件直接 `useStore()`
4. **跨 Store 通信**：通过 `useXxxStore.getState()` 在 Store 间直接调用，无需中间件
5. **包体积**：Zustand ~1KB vs Redux ~7KB

#### Q3：工作流编排引擎中，为什么选择前端拓扑排序 + 分层并行执行，而不是后端编排？

**答**：
1. **实时反馈**：前端执行时可直接更新节点状态（pending → running → completed），用户体验流畅
2. **进度可视化**：轮询任务进度后立即更新画布上节点的进度条
3. **自动时间轴联动**：节点执行成功后，前端自动将产出加入时间轴并更新 VideoPreview
4. **协作广播**：每个节点状态变更通过 Socket.IO 广播给其他协作者
5. **后端保持无状态**：后端只负责单任务执行（Celery），不维护工作流状态，简化部署和扩展

#### Q4：解释 Celery Worker 为什么需要独立的数据库连接，不能复用 FastAPI 的 `async_session_factory`？

**答**：
核心原因是 **asyncpg 的连接池绑定到创建时的事件循环**。

- FastAPI 运行在 uvicorn 的事件循环中，`async_session_factory` 创建的连接池属于该循环
- Celery Worker 运行在独立进程中，如果 `asyncio.new_event_loop()` 创建新循环来运行异步任务，从旧连接池获取的连接会抛出 `Future attached to a different loop` 错误
- 解决方案：Worker 启动时创建自己的 `async_engine` + `async_session_factory` + `asyncio event loop`，所有异步数据库操作使用这些独立资源，并在同一循环中复用

#### Q5：系统如何处理 AI 推理的长时间任务？从前端发起请求到获得结果，完整链路是什么？

**答**：
完整链路：

1. **前端** `executeNode()` → `renderApi.create()` 发 POST 到 `/api/v1/render`
2. **后端** 创建 `RenderTask` 记录（status=pending）→ `execute_render_task.delay()` 发送 Celery 任务
3. **Celery Worker** 收到任务 → 更新 status=running → 根据 task_type 路由：
   - `ai_*` 前缀 → 调用 `ai_service.call_*()` 系列（LLM/文生图/图生视频等）
   - 其他 → 模拟渲染
4. **AI API 调用** → 等待结果 → 下载到 MinIO → 更新 `result_url` + status=completed
5. **前端** `renderApi.poll()` 每 2s 轮询 GET `/api/v1/render/{id}` → 更新节点进度条
6. **轮询结束** → 前端 `setNodeOutput()` + 自动添加到时间轴 + 更新 VideoPreview

### 第二部分：协作系统

#### Q6：节点锁的租约模型是如何设计的？为什么不用 OT/CRDT？

**答**：
**租约模型设计**：
- TTL=5s，客户端每 2s 续租，后端 1s 扫描过期锁
- 锁状态存在后端内存字典 `_node_locks`，key=(project_id, node_id)
- 4 个操作：acquire/renew/release/force_release，变更通过 `lock_changed` 广播

**不用 OT/CRDT 的原因**：
1. **场景不适合**：AI Canvas Flow 是设计工具，用户操作以拖拽/编辑属性为主，不是纯文本协作
2. **复杂度太高**：OT 需要 transformation 函数，CRDT 需要处理向量时钟/冲突合并，开发成本极高
3. **单实例部署**：当前锁状态在内存中维护，单实例足够（协作用户数 ≤10/项目）
4. **用户感知友好**：锁机制让用户直观知道"谁在编辑什么"，避免静默冲突

#### Q7：当用户 A 正在编辑节点，用户 B 尝试编辑同一节点时，系统如何处理？

**答**：
1. 用户 A `onNodeDragStart` / `PropertyPanel focus` → `acquireLock(nodeId)`
2. 后端检查该节点无活跃锁 → 创建锁 → 广播 `lock_changed`
3. 用户 B 尝试编辑 → `acquireLock(nodeId)` → 后端返回 `{ok: false, reason: "locked_by_other", holder: ...}`
4. 前端显示节点锁定状态（橙色边框 + 🔒 角标）
5. 用户 A 停止操作 3s 后延迟释放锁 → 广播 `lock_changed(lock=null)`
6. 如果用户 A 断线 → disconnect 事件清理其所有锁 → 广播释放
7. 如果用户 A 锁超时 → 后端清理协程自动释放

#### Q8：协作广播如何避免回环（自己发出的更新又通过 Socket.IO 回来）？

**答**：
两种机制结合：
1. **服务端 `skip_sid`**：`sio.emit(event, data, room=room, skip_sid=sid)` 跳过发送者
2. **前端 `applyRemoteNodeUpdate`**：远端变更应用时不调用 `emitNodeChange`，只更新本地状态，确保不二次广播
3. **去重保护**：`applyRemoteNodeUpdate` 中 add 操作先检查 `state.nodes.some(n => n.id === node_id)` 避免重复添加

### 第三部分：状态管理

#### Q9：canvasStore 如何与 historyStore、autoSaveStore、collabStore 协同工作？

**答**：
```
用户操作 → canvasStore 更新状态
  ├─ 调用 useHistoryStore.pushAction() → 记录历史
  ├─ 调用 emitNodeChange() → collabStore 广播给远端
  └─ 调用 useAutoSaveStore.markDirty() → 触发防抖保存
```

- **historyStore**：通过 `pushBatchSetNodes` 等记录操作，undo/redo 时直接调用 `canvasStore.setNodes()` （不触发广播）
- **autoSaveStore**：`markDirty()` 启动 2s 防抖定时器，到期后 `saveNow()` 创建快照 + 上传封面
- **collabStore**：`emitNodeUpdate()` 通过 Socket.IO 发送变更，远端通过 `applyRemoteNodeUpdate()` 应用

关键：**远端变更走 `applyRemoteNodeUpdate`，不调 `emitNodeChange`**，避免回环。

#### Q10：historyStore 的操作合并机制是如何实现的？为什么需要合并？

**答**：
**为什么需要**：拖拽节点时每帧产生一个 `move_node` 事件，如果每个都入栈，100 步历史 2 秒就满了。

**实现**：
1. 操作入栈时不立即提交，先设为 `pendingMerge`
2. 500ms 合并窗口内，如果新操作与 pendingMerge 同类型，合并 payload（保留最早的 `from` 位置）
3. 窗口结束，将 pendingMerge 正式入栈
4. 超过 100 步上限时，从尾部删除最旧操作

#### Q11：自动保存的双防抖策略是什么？为什么需要两层？

**答**：
- **操作防抖（2s）**：`markDirty()` 后 2s 无新操作则保存，避免频繁保存（如快速拖拽节点）
- **定时扫描（30s）**：`setInterval` 每 30s 检查 `isDirty`，有脏数据则保存，防止长时间操作但未触发防抖的情况

两层配合：操作防抖保证响应速度，定时扫描保证兜底。

### 第四部分：AI 服务

#### Q12：AI 服务如何实现多平台动态路由？用户如何添加新的 AI 服务商？

**答**：
1. **数据库驱动**：`ai_providers` 表存储服务商配置（name、base_url、api_key），`ai_models` 表存储模型（model_id、model_type、display_name）
2. **动态调用**：`ai_service.py` 根据 `model_id` 查询 Provider + Model，用 Provider 的 `base_url` 和 `api_key` 构建请求
3. **用户添加**：前端设置页 → AI 配置 → 添加 Provider（名称+API Key+Base URL）→ 添加 Model（选择 Provider + 填写模型 ID + 选择类型）

无需改代码，只需在 UI 配置即可接入新平台。

#### Q13：为什么图生图需要将内部 MinIO 图片转为 base64？直接传 URL 不行吗？

**答**：
不行。因为：
1. AI API（如火山引擎）是外部服务，无法访问内部 MinIO 路径（如 `/api/v1/media/{id}/download`）
2. 即使 MinIO 有公网访问，AI API 也不一定支持自定义鉴权头
3. 转为 base64（`data:image/png;base64,...`）后，图片数据直接嵌入请求体，无需外部访问

`_resolve_image_url()` 函数负责：内部路径 → 下载 → base64 编码；外部 URL → 原样返回。

#### Q14：AI 工作流生成（自然语言 → 工作流）的完整流程是什么？

**答**：
1. 用户输入描述（如"生成一张猫的图片并转为视频"）
2. 后端 `generate_workflow()` 调用 LLM，system prompt 约束输出格式和合法节点类型
3. LLM 返回 JSON `{"nodes": [...], "edges": [...]}`
4. `_parse_llm_json()` 解析 JSON（容忍 markdown 代码块包裹）
5. 校验节点 subtype 白名单（`NODE_WHITELIST`），过滤非法节点
6. 为合法节点生成新 ID（`node-{ts}-{rand6}`），过滤无效边
7. `_compute_layout()` Kahn 拓扑排序分层 → 计算节点位置
8. 预填参数：text_input 的 text = description，AI 节点的 prompt + 自动查找默认 model_id
9. 返回完整的 NodeCreateRequest/EdgeCreateRequest

### 第五部分：前端深度

#### Q15：React Flow 画布中，自定义节点（CanvasNode）如何与 Zustand store 联动？

**答**：
1. **节点模板**：`canvas.ts` 定义 `NODE_TEMPLATES`，包含 18 种节点（5 类：input/ai_inference/processing/control/output），每种有 `subtype`、`label`、`defaultParams`
2. **数据流**：`CanvasNode` 组件从 `node.data` 读取状态，通过 `useCanvasStore` 的 `updateNodeData`/`setNodeStatus` 更新
3. **协作广播**：`canvasStore` 内部封装 `emitNodeChange()`，每次更新自动广播
4. **锁状态渲染**：CanvasNode 读取 `data._locked`，显示橙色边框 + 🔒 角标

#### Q16：时间轴如何与画布节点双向绑定？删除节点时时间轴怎么处理？

**答**：
- **绑定**：每个 `Clip` 对象包含 `nodeId` 字段，关联到画布节点
- **删除节点**：`canvasStore.removeNode()` 中遍历 timelineData.tracks，过滤掉 `c.nodeId === id` 的片段，调用 `loadTimeline()` 更新
- **双击片段**：通过 `setSelectedNode(clip.nodeId)` 选中画布对应节点
- **执行节点**：成功后 `workflowExecutor` 自动将产出添加到对应类型轨道

#### Q17：前端如何实现视频导出时的字幕烧录？

**答**：
1. ExportModal 检测字幕轨是否有片段 → 显示"烧录字幕"开关（默认开启）
2. 开启时，生成临时 SRT 文件（从 Clip 的 start/end/subtitleText 构建）
3. 使用 FFmpeg（`@ffmpeg/ffmpeg`）前端执行：`-vf subtitles=xxx.srt:force_style='FontSize=24,...'`
4. 输出烧录字幕后的 MP4 文件

### 第六部分：工程实践

#### Q18：项目如何处理 Mock 模式与真实 API 的切换？

**答**：
- **Vite 模式**：`npm run dev` 正常模式；`npm run dev:mock` 使用 `--mode mock`
- **环境文件**：`.env` vs `.env.mock`，不同 API 基础路径
- **代码隔离**：Mock 数据统一在 `src/mock/` 目录，通过 Vite 的 `import.meta.env.MODE` 判断
- **代理配置**：`vite.config.ts` 中 `/api` 和 `/socket.io` 代理到后端

#### Q19：Celery Worker 启动时为什么需要 `--without-mingle --without-gossip --without-heartbeat` 标志？

**答**：
这是 RabbitMQ 4.x 的兼容性问题：
- **mingle**：Worker 启动时与其他 Worker 同步状态，使用 transient 队列
- **gossip**：Worker 间广播事件（worker-heartbeat、worker-elect 等），使用 transient 队列
- **heartbeat**：Worker 间心跳检测，使用 transient 队列

RabbitMQ 4.x 弃用了非持久化非独占队列，这些 transient 队列会报错。禁用这些功能后，Worker 仍可正常执行任务，只是失去了集群感知能力（单实例部署下无影响）。

#### Q20：项目中有哪些关键的性能优化实践？

**答**：
1. **路由级代码分割**：非框架页面使用 `React.lazy()` 懒加载
2. **节点操作合并**：500ms 合并窗口减少历史栈膨胀
3. **双防抖自动保存**：2s 操作防抖 + 30s 定时扫描，减少不必要的网络请求
4. **Celery Worker 事件循环复用**：不每任务创建新循环，避免 asyncpg 连接池泄漏
5. **任务轮询优化**：长任务（视频生成）轮询超时从 4min 增至 10min
6. **图片 size 参数规范化**：无效 size 回退到 `2k`，避免 API 请求失败
7. **前端 rAF delta 限幅**：0.05s 上限，防止 MCP/后台标签页导致的速度异常
8. **系统字体栈**：使用 `-apple-system, PingFang SC` 等，避免 Google Fonts 加载阻塞

#### Q21：前端 API 错误处理有什么规范？为什么禁止直接显示 `err.message`？

**答**：
**规范**：所有用户可见错误必须通过 `getErrorMessage(err, scene?)` 获取消息。

**原因**：
1. **安全**：后端异常可能暴露内部信息（堆栈、SQL、API Key 片段），直接显示有泄露风险
2. **友好**：`getErrorMessage` 将 HTTP 状态码/技术错误转为用户友好的中文提示
3. **场景化**：`scene` 参数允许同一错误在不同场景下显示不同提示（如"节点执行失败"vs"自动保存失败"）
4. **一致性**：统一错误消息格式，避免各处错误提示风格不一

#### Q22：解释 `setPointerCapture` 在 MCP 环境下的问题及解决方案。

**答**：
**问题**：MCP（Model Context Protocol）模拟的鼠标事件 `isTrusted=false`，调用 `setPointerCapture()` 会抛 `NotFoundError`，导致拖拽中断。

**解决方案**：在调用 `setPointerCapture` 的地方加 `try-catch`，捕获异常后降级处理（不设置指针捕获，拖拽功能仍可用但可能不如原生事件流畅）。

这是非原生环境下的通用兼容策略：MCP/Puppeteer 自动化测试环境的鼠标事件与用户真实操作不同，需要防御性编程。

---

## 六、数据库设计

### 核心表结构

| 表名 | 主要字段 | 说明 |
|------|----------|------|
| `users` | id, username, email, hashed_password | 用户 |
| `projects` | id, name, description, cover_url, owner_id, is_template | 项目 |
| `workflow_nodes` | id, project_id, node_type, label, position_x/y, config(JSON) | 工作流节点 |
| `workflow_edges` | id, project_id, source_node_id, target_node_id | 工作流边 |
| `render_tasks` | id, project_id, owner_id, task_type, status, progress, result_url, celery_task_id, node_id | 渲染任务 |
| `media_assets` | id, owner_id, project_id, file_name, file_type, storage_key, file_size | 媒体资产 |
| `ai_providers` | id, user_id, name, platform, base_url, api_key, is_active | AI 服务商 |
| `ai_models` | id, provider_id, model_id, model_type, display_name, is_active | AI 模型 |
| `snapshots` | id, project_id, source, label, snapshot_data(JSON) | 项目快照 |
| `project_collaborators` | id, project_id, user_id, role | 项目协作者 |

---

## 七、API 路由一览

| 前缀 | 模块 | 主要端点 |
|------|------|----------|
| `/api/v1/auth` | 认证 | POST login/register/refresh |
| `/api/v1/projects` | 项目 | CRUD + POST cover + GET cover/download |
| `/api/v1/workflows` | 工作流 | 节点/边的 CRUD |
| `/api/v1/render` | 渲染 | POST create + GET {id} + POST cancel |
| `/api/v1/media` | 媒体 | POST upload + GET {id}/download |
| `/api/v1/ai` | AI | GET models + POST generate-workflow + POST generate-subtitles |
| `/api/v1/projects/{id}/collaborators` | 协作 | GET/POST/DELETE |
| `/api/v1/projects/{id}/snapshots` | 快照 | CRUD + POST restore |
| `/api/v1/projects/{id}/invitations` | 邀请 | POST + GET /invitations/{token}/accept |
| `/socket.io/` | WebSocket | 实时协作事件 |

---

## 八、节点类型体系

| 类别 | subtype | label | 默认参数 |
|------|---------|-------|----------|
| 输入 | text_input | 文本输入 | {text: ""} |
| 输入 | image_input | 图片输入 | {url: ""} |
| 输入 | audio_input | 音频输入 | {url: ""} |
| AI推理 | text_to_image | 文生图 | {prompt: "", size: "1024x1024"} |
| AI推理 | image_to_image | 图生图 | {prompt: "", size: "1024x1024"} |
| AI推理 | image_to_video | 图生视频 | {prompt: "", duration: 5} |
| AI推理 | text_to_video | 文生视频 | {prompt: "", duration: 5} |
| AI推理 | text_to_speech | 文生语音 | {text: "", voice: "default"} |
| AI推理 | text_to_subtitle | AI 字幕 | {prompt: "", duration: 30} |
| 处理 | upscale | 高清放大 | {scale: 2} |
| 处理 | style_transfer | 风格化 | {style: ""} |
| 处理 | remove_bg | 抠图 | {} |
| 处理 | extend_image | 扩图 | {direction: "all"} |
| 控制 | if_else | 条件分支 | {condition: ""} |
| 控制 | loop | 循环 | {count: 1} |
| 控制 | merge | 合并 | {} |
| 输出 | video_output | 视频输出 | {format: "mp4"} |
| 输出 | image_output | 图片输出 | {format: "png"} |
| 输出 | audio_output | 音频输出 | {format: "mp3"} |
