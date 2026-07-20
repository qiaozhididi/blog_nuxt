# 寰通Talk AI销售助手 — 面试题与答案

> 基于项目实际技术栈和架构设计，涵盖 RAG、LangChain/LangGraph、记忆系统、Prompt 工程、系统设计等核心主题。

---

## 一、RAG（检索增强生成）

### Q1: RAG 是什么？为什么要用 RAG？

**答案：**

RAG（Retrieval-Augmented Generation，检索增强生成）是一种将"信息检索"与"LLM 生成"结合的技术架构。核心思路是：**先从外部知识库检索相关文档，再将检索结果作为上下文注入 Prompt，让 LLM 基于真实数据生成回答**。

**为什么需要 RAG：**

1. **解决幻觉问题**：LLM 会"编造"看似合理但实际错误的信息，RAG 让模型基于检索到的真实文档回答，大幅降低幻觉
2. **知识时效性**：LLM 的训练数据有截止日期，RAG 可以实时检索最新信息
3. **领域知识注入**：通用 LLM 缺乏企业私有知识（产品规格、价格政策、物流规则等），RAG 将企业知识库接入 LLM
4. **可追溯性**：每个回答都可以追溯到具体文档来源，便于验证和审计
5. **成本效率**：相比微调（Fine-tuning），RAG 无需重新训练模型，更新知识只需更新知识库

**本项目实践：** 系统通过 WeKnora 知识库进行 RAG 检索，支持语义搜索、关键词搜索和混合搜索。在知识库模式下，系统提示词强制要求"基于知识库检索结果回答，禁止编造"。

---

### Q2: RAG 的基本流程是什么？本项目做了哪些增强？

**答案：**

**基本 RAG 流程：**
```
用户查询 → 向量化 → 向量检索 → 检索结果拼接 → LLM 生成
```

**本项目的增强设计：**

1. **关键词增强**：`KeywordExtractor` 用正则从客户消息中提取产品/价格/物流关键词，将关键词追加到原始查询，提升检索召回率
2. **分类路由**：根据关键词类型决定搜索哪些知识库分类（product/pricing/logistics/faq），而非全库盲目搜索
3. **混合搜索**：支持 semantic（语义）、keyword（关键词）、hybrid（混合）三种搜索模式，兼顾语义理解和精确匹配
4. **搜索缓存**：Redis 缓存搜索结果，按分类设置不同 TTL，减少重复检索
5. **降级容错**：WeKnora 不可用时返回 `WeKnoraDegradedFallback`，告知 LLM 基于通用知识回答，保证服务可用性
6. **重试策略**：内置 `RetryExecutor`，网络抖动时自动重试

---

### Q3: 语义搜索和关键词搜索的区别？什么时候用混合搜索？

**答案：**

| 维度 | 语义搜索 | 关键词搜索 |
|------|----------|------------|
| 原理 | 将文本转为向量，计算语义相似度 | 精确匹配关键词/词组 |
| 优势 | 理解同义词、语义关联 | 精确匹配产品型号、价格数字 |
| 劣势 | 可能遗漏精确匹配 | 无法理解语义变体 |
| 场景 | "运费怎么算" → 匹配"物流费用政策" | "LED-2000" → 精确匹配产品型号 |

**混合搜索（Hybrid）** 结合两者优势，本项目默认使用混合搜索。例如客户问"LED-2000 的运费多少"，关键词搜索精确匹配产品型号，语义搜索匹配运费政策，两者结果融合后提供更完整的上下文。

---

### Q4: RAG 中如何处理检索结果的质量？如果检索到不相关内容怎么办？

**答案：**

**检索质量保障措施：**

1. **相关度阈值过滤**：检索结果带有 `score` 字段，可以设置阈值过滤低相关度文档
2. **分类路由**：只搜索与查询相关的知识库分类，减少噪声
3. **关键词增强**：提升查询的精确度，减少不相关结果
4. **上下文截断**：`format_for_llm()` 将文档内容截断为 500 字，避免冗长噪声

**不相关内容的处理：**

1. **Prompt 层面**：系统提示词明确指示"如果知识库中没有相关信息，请如实告知，不要编造"
2. **降级模式**：WeKnora 不可用时切换到 AI 模式，基于通用知识回答
3. **反馈闭环**：用户标记"无用"的回复，其教训会注入后续 Prompt，避免类似问题

---

## 二、LangChain 与 LangGraph

### Q5: LangChain 是什么？为什么需要 LangChain？

**答案：**

LangChain 是一个用于构建 LLM 应用的框架，核心价值是**将 LLM 与外部数据源、工具、记忆等组件标准化地连接起来**。

**为什么需要 LangChain：**

1. **统一接口**：不同 LLM 提供商（OpenAI、Anthropic、Google 等）API 各异，LangChain 提供统一的 `ChatModel` 接口，切换模型只需改配置
2. **组件复用**：Prompt 模板、输出解析器、检索器、记忆等组件开箱即用
3. **链式编排**：将多个 LLM 调用和工具调用串联成工作流
4. **结构化输出**：`with_structured_output` 让 LLM 输出符合 Pydantic 模型定义的结构化数据
5. **生态集成**：与向量数据库、工具、Agent 等生态无缝集成

**本项目实践：** 使用 `init_chat_model()` 统一创建不同 provider 的 ChatModel，通过 `with_structured_output` 获取包含 confidence/alternatives/reasoning 的结构化回复。

---

### Q6: LangGraph 是什么？和 LangChain 是什么关系？

**答案：**

LangGraph 是 LangChain 团队推出的**有状态多步工作流编排框架**，基于图（Graph）结构定义节点和边，支持条件分支、循环、状态持久化。

**与 LangChain 的关系：**
- LangChain 提供**组件**（LLM、检索器、工具等）
- LangGraph 提供**编排**（将组件组织成有状态的工作流图）
- LangGraph 是 LangChain 生态的一部分，但可以独立使用

**为什么需要 LangGraph 而不是直接链式调用：**

| 维度 | 直接链式调用 | LangGraph |
|------|-------------|-----------|
| 可观测性 | 难以追踪中间状态 | 每个节点的输入/输出可追踪 |
| 条件分支 | if-else 嵌套 | 图的边支持条件路由 |
| 状态管理 | 手动传递 | `WorkflowState` 自动流转 |
| 可扩展性 | 修改链路影响全局 | 增删节点不影响其他节点 |
| 调试 | 断点难设 | 可在任意节点暂停/检查 |

**本项目实践：** 定义了推荐回复图（7 节点线性流水线）和标题生成图（单节点），通过 `LANGGRAPH_ENABLED` 配置切换 LangGraph 路径和直接路径。

---

### Q7: 本项目的 LangGraph 工作流是如何设计的？为什么选择线性流水线？

**答案：**

**推荐回复图：**
```
chat_cleaner → customer_profiler → memory_retriever → weknora_rag → web_search → prompt_builder → llm → END
```

**选择线性流水线的原因：**

1. **业务逻辑天然有序**：必须先清洗消息 → 再检索记忆/RAG → 再组装 Prompt → 最后调用 LLM，存在严格的数据依赖
2. **简单可靠**：线性流水线没有条件分支和循环，执行路径确定，易于调试
3. **性能考虑**：虽然 memory_retriever 和 weknora_rag 理论上可以并行，但实际测试中并行带来的性能提升有限（两者都是 IO 密集型，且 Redis/DB 连接池有限），线性执行更稳定

**如果未来需要扩展：**
- 可以将 memory_retriever 和 weknora_rag 改为并行节点（fan-out/fan-in 模式）
- 可以在 llm 节点后添加条件分支（如低置信度时触发二次检索）

---

### Q8: `with_structured_output` 是什么？如何工作的？

**答案：**

`with_structured_output` 是 LangChain ChatModel 的方法，用于**让 LLM 输出符合指定 Pydantic 模型的结构化数据**。

**工作原理：**

1. 将 Pydantic 模型转换为 JSON Schema
2. 通过 function calling / tool use 机制传给 LLM
3. LLM 以结构化格式输出
4. LangChain 自动解析为 Pydantic 对象

**本项目实践：**

```python
class StructuredReply(BaseModel):
    reply: str           # 推荐回复
    confidence: float    # 置信度 0-1
    alternatives: list   # 备选回复
    reasoning: str       # 推荐理由
```

通过 `generate_structured_reply()` 调用 `model.with_structured_output(StructuredReply)`，获取结构化的 AI 回复，前端可展示置信度、备选方案和推荐理由。

---

## 三、记忆系统

### Q9: 为什么需要三层记忆？一层不够吗？

**答案：**

**单层记忆的问题：**

- **全放 Redis**：成本高，长期数据丢失风险，无法持久化客户画像
- **全放 DB**：每次请求都查 DB，近期对话的实时性差，延迟高
- **全放 Prompt**：Token 有限，历史对话太长会超出上下文窗口

**三层记忆的设计哲学：**

| 层级 | 存储 | 内容 | 特点 |
|------|------|------|------|
| L1 短期 | Redis | 最近 20 条消息 | 毫秒级访问，1 小时 TTL，即时上下文 |
| L2 中期 | PostgreSQL | 摘要/意图/价格敏感度 | 持久化，压缩历史，重要背景 |
| L3 长期 | PostgreSQL | 标签/行业/兴趣/购买意向 | 持久化，客户画像，核心参考 |

**核心思想：** 不同时效的信息需要不同的存储策略——即时对话需要低延迟（Redis），历史摘要需要压缩（DB），客户画像需要长期积累（DB）。三层协同既保证了实时性，又控制了成本和 Token 消耗。

---

### Q10: 记忆权重标注是什么？为什么要在 Prompt 中标注权重？

**答案：**

**记忆权重标注**是在 Prompt 中为每层记忆数据标记重要程度，指导 LLM 分配注意力：

- **核心参考**：有实质内容的 L1 近期对话（即时上下文最重要）
- **重要背景**：有实质内容的 L2/L3 数据（历史画像提供背景）
- **补充参考**：空记忆或低价值信息（不要过度依赖）

**为什么需要权重标注：**

1. **引导注意力**：LLM 对 Prompt 不同部分的关注度不同，明确标注权重可以让模型优先关注最重要的信息
2. **处理空记忆**：当客户是新客户、L2/L3 为空时，标注"补充参考"避免模型"脑补"不存在的客户信息
3. **减少幻觉**：明确告知哪些信息是"核心参考"（真实数据），哪些是"补充参考"（可能不完整），减少基于不完整信息的推断

---

### Q11: L1 记忆为什么用 Redis 而不是直接放在请求里？

**答案：**

1. **跨请求共享**：同一个客户的多次请求需要共享近期对话上下文，Redis 作为共享存储天然支持
2. **自动过期**：Redis 的 TTL 机制自动清理过期数据，无需手动维护
3. **性能**：Redis 读写延迟 <1ms，远快于 DB 查询
4. **解耦**：前端不需要维护完整的对话历史，每次请求只需发送当前消息，后端自动从 Redis 补充上下文
5. **多端同步**：Chrome 扩展和 WebManager 可能同时访问同一客户数据，Redis 保证一致性

**实现方式：** 使用 Redis List（`lpush` + `ltrim`），按 `customer_id` 隔离，保留最近 20 条，1 小时 TTL。

---

## 四、Prompt 工程

### Q12: 本项目的 System Prompt 有哪两种模式？为什么需要两种？

**答案：**

| 模式 | 核心指令 | 适用场景 |
|------|----------|----------|
| 知识库模式 | "必须基于知识库检索结果回答，禁止编造" | 客户询问产品规格、价格、物流等具体问题 |
| AI 模式 | "基于通用知识自由回答，涉及具体产品时建议切换知识库模式" | 客户闲聊、通用咨询、知识库未覆盖的问题 |

**为什么需要两种模式：**

1. **知识库模式**保证准确性：涉及企业产品/政策时，必须基于真实数据，不能让 LLM "自由发挥"
2. **AI 模式**保证灵活性：不是所有问题都能在知识库中找到答案（如行业趋势、通用建议），AI 模式允许 LLM 发挥通用能力
3. **用户选择权**：业务员根据实际情况选择模式，知识库模式更安全但可能"答不上来"，AI 模式更灵活但可能不够精确

---

### Q13: 反馈教训如何注入 Prompt？这个设计有什么价值？

**答案：**

**注入方式：**

1. 用户对 AI 回复标记"有用/无用"
2. 低评分反馈存储到 `ai_feedback` 表
3. 下次推荐时，`AIService` 从 `FeedbackRepo` 获取该业务员的低评分教训
4. 教训以 `feedback_lessons` 字段注入 System Prompt

**价值：**

1. **持续优化**：不需要修改代码或 Prompt 模板，通过反馈数据自动优化
2. **个性化**：不同业务员的教训不同，每个业务员得到定制化的 Prompt 优化
3. **闭环反馈**：形成"生成 → 评价 → 学习 → 改进"的闭环
4. **低成本**：相比 Fine-tuning，反馈教训注入是零成本的优化手段

---

## 五、系统设计

### Q14: 双路径执行（LangGraph vs 直接调用）的设计考量是什么？

**答案：**

| 维度 | LangGraph 路径 | 直接路径 |
|------|---------------|----------|
| 优势 | 可观测、可扩展、状态可追踪 | 简单、快速、依赖少 |
| 劣势 | 引入 LangGraph 依赖、略复杂 | 难以追踪中间状态、扩展需改代码 |
| 适用 | 生产环境、需要调试和监控 | 快速验证、简单场景 |

**设计考量：**

1. **渐进式架构**：项目初期用直接路径快速验证，成熟后切换 LangGraph 获得可观测性
2. **配置切换**：`LANGGRAPH_ENABLED` 环境变量控制，无需改代码
3. **功能对等**：两种路径支持完全相同的功能（RAG、联网搜索、反馈注入等），只是编排方式不同
4. **风险控制**：LangGraph 出问题时可以快速回退到直接路径

---

### Q15: 多模型路由（ModelRouter）的设计意义是什么？

**答案：**

**核心设计：** 按 `scene`（场景）路由到不同 LLM 模型：

```json
{
    "fast": {"provider": "openai", "model": "gpt-4o-mini"},      // 快速场景：简单问题
    "default": {"provider": "openai", "model": "gpt-4o"},        // 默认场景：标准回复
    "premium": {"provider": "anthropic", "model": "claude-sonnet-4"}, // 高质量：复杂问题
    "summary": {"provider": "openai", "model": "gpt-4o-mini"}    // 摘要场景：摘要生成
}
```

**设计意义：**

1. **成本优化**：简单问题用便宜模型（gpt-4o-mini），复杂问题用贵模型（claude-sonnet-4），避免"杀鸡用牛刀"
2. **性能优化**：fast 场景用小模型，响应更快，用户体验更好
3. **质量优化**：premium 场景用大模型，回复质量更高
4. **灵活性**：前端可以选择场景，业务员根据问题复杂度手动切换
5. **容灾**：某个 provider 不可用时可以快速切换到另一个

**实现关键：** 使用 `init_chat_model()` 统一创建不同 provider 的 ChatModel，`_model_cache` 缓存实例避免重复创建。

---

### Q16: 数据隔离是如何实现的？为什么重要？

**答案：**

**实现方式：**

1. **数据模型层**：所有业务表（Customer、ChatMessage、Session 等）都包含 `sales_rep_id` 字段
2. **Repository 层**：所有查询都按 `sales_rep_id` 过滤，例如 `chat_repo.get_by_customer_id(customer_id, sales_rep_id)`
3. **Service 层**：业务逻辑验证数据归属，如 `AIService.recommend_reply()` 先验证 customer 属于当前 sales_rep
4. **API 层**：从 JWT Token 中提取 `sales_rep_id`，传入后续调用

**为什么重要：**

1. **数据安全**：B2B SaaS 系统的基本要求，业务员 A 不能看到业务员 B 的客户数据
2. **合规要求**：外贸场景涉及客户隐私，数据隔离是法律合规的基础
3. **多租户基础**：数据隔离是多租户架构的前提，为未来 SaaS 化铺路

---

### Q17: 降级容错策略有哪些？为什么需要降级？

**答案：**

**本项目的降级策略：**

| 组件 | 降级策略 | 影响 |
|------|----------|------|
| WeKnora 知识库 | 返回 `WeKnoraDegradedFallback`，告知 LLM 基于通用知识回答 | 回复可能不够精确，但服务可用 |
| 联网搜索 | 静默跳过，不注入搜索结果 | 缺少实时信息，但不影响核心功能 |
| Redis (L1 记忆) | 降级为无近期对话上下文 | 回复缺少即时上下文，但 L2/L3 仍可用 |
| LLM 调用 | 重试策略（`RetryExecutor`） | 短暂网络抖动自动恢复 |

**为什么需要降级：**

1. **可用性优先**：AI 助手是辅助工具，不能因为知识库/搜索不可用就完全停止服务
2. **部分降级 > 完全不可用**：没有 RAG 上下文的回复虽然不够精确，但仍然有价值
3. **用户体验**：用户更愿意接受"不够精确的回答"而非"服务不可用"

---

## 六、前端架构

### Q18: Chrome 扩展为什么选择 Manifest V3？和 V2 有什么区别？

**答案：**

**选择 V3 的原因：** Google 已逐步淘汰 Manifest V2，V3 是 Chrome 扩展的当前标准。

**V2 vs V3 关键区别：**

| 维度 | V2 | V3 |
|------|----|----|
| 后台脚本 | background page（持久） | service worker（非持久） |
| 远程代码 | 允许 eval / 远程 JS | 禁止，只能用本地代码 |
| API | chrome.extension.* | chrome.action.* / chrome.scripting.* |
| 安全性 | 较弱 | 更严格的内容安全策略 |

**本项目适配：** `service-worker.js` 作为后台服务，处理消息路由和 API 代理。由于 service worker 非持久，需要注意状态管理和连接保活。

---

### Q19: SSE 流式响应的实现原理是什么？和 WebSocket 有什么区别？

**答案：**

**SSE（Server-Sent Events）原理：**

1. 客户端发起 HTTP 请求，设置 `Accept: text/event-stream`
2. 服务端保持连接，逐条发送 `data: ...` 格式的事件
3. 客户端通过 `EventSource` 或手动解析接收

**本项目实现：** 后端将 LLM 回复按 3 字符分块，通过 SSE 逐块推送，前端实时渲染，实现"打字机"效果。

**SSE vs WebSocket：**

| 维度 | SSE | WebSocket |
|------|-----|-----------|
| 方向 | 服务端 → 客户端（单向） | 双向 |
| 协议 | HTTP | WS |
| 重连 | 自动重连 | 需手动实现 |
| 适用 | 流式输出（LLM 回复） | 双向通信（实时通知） |

**本项目同时使用两者：** SSE 用于 AI 回复的流式输出，WebSocket 用于双向事件推送（AI 回复完成通知、画像更新等）。

---

### Q20: Content Script 和 Side Panel 如何通信？

**答案：**

**通信架构：**

```
Content Script (content.js)
    ↓ chrome.runtime.sendMessage
Service Worker (service-worker.js)
    ↓ chrome.runtime.sendMessage / chrome.sidePanel
Side Panel (sidepanel.js)
```

**具体流程：**

1. `content.js` 解析当前页面 DOM，提取聊天消息
2. 通过 `chrome.runtime.sendMessage` 发送到 service-worker
3. service-worker 转发到 sidepanel（或 sidepanel 主动请求）
4. sidepanel 处理消息，调用后端 API

**为什么需要 service-worker 中转：** Manifest V3 中，content script 和 side panel 不能直接通信，必须通过 service-worker 中转。

---

## 七、数据库与缓存

### Q21: 为什么选择 PostgreSQL + Redis 的组合？

**答案：**

**PostgreSQL：**
- 关系型数据（客户、会话、消息、反馈）需要事务和复杂查询
- JSONB 字段存储灵活结构（客户画像、记忆数据）
- 成熟的异步驱动（asyncpg），与 FastAPI 的异步架构匹配

**Redis：**
- L1 短期记忆需要毫秒级读写
- 搜索结果缓存减少 WeKnora 调用
- Celery 消息队列的 broker
- Token 黑名单管理

**组合优势：** PostgreSQL 保证数据持久化和一致性，Redis 提供低延迟的热数据访问，两者互补而非替代。

---

### Q22: SQLAlchemy 2.0 的异步 ORM 如何使用？有什么注意事项？

**答案：**

**基本用法：**

```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

engine = create_async_engine(DATABASE_URL)
async with AsyncSession(engine) as session:
    result = await session.execute(select(Customer).where(...))
    customers = result.scalars().all()
```

**注意事项：**

1. **必须使用 async 驱动**：PostgreSQL 用 asyncpg，SQLite 用 aiosqlite
2. **Session 生命周期**：使用 `async with` 管理，确保连接归还连接池
3. **懒加载问题**：异步环境下不能使用懒加载（`lazy='select'`），需要用 `selectinload` 或 `joinedload` 显式加载关联数据
4. **连接池配置**：异步环境需要合理设置 `pool_size` 和 `max_overflow`

**本项目实践：** `db/session.py` 管理 AsyncSession 的创建，工作流节点通过 `state._db_session` 传递数据库会话。

---

## 八、异步与并发

### Q23: FastAPI 的异步架构有什么优势？什么场景下应该用同步？

**答案：**

**异步优势：**

1. **高并发 IO**：AI 推荐、RAG 检索、数据库查询都是 IO 密集型，异步可以在等待 IO 时处理其他请求
2. **流式响应**：SSE 流式输出天然适合异步生成器
3. **WebSocket**：长连接需要异步管理

**应该用同步的场景：**

1. **CPU 密集型任务**：如图像处理、大量计算，异步反而增加开销（应放到线程池/进程池）
2. **同步依赖库**：某些库只有同步接口，需要用 `run_in_executor` 包装

**本项目实践：** 核心路径全部异步（`async def`），Celery 处理 CPU 密集型的画像生成和摘要任务。

---

### Q24: Celery 异步任务在本项目中用于什么场景？

**答案：**

| 任务 | 调度 | 用途 |
|------|------|------|
| 批量更新过期客户画像 | 每日 02:00 | L3 画像定期刷新 |
| 清理审计日志 | 每日 03:00 | 数据生命周期管理 |
| 清理过期会话 | 每日 04:00 | 释放存储空间 |
| 检测知识库变更 | 每小时 30 分 | 增量更新缓存 |

**为什么用 Celery 而不是直接异步：**

1. **定时调度**：Celery Beat 提供可靠的定时任务调度
2. **任务持久化**：任务状态持久化到 Redis，重启不丢失
3. **重试机制**：任务失败自动重试
4. **监控**：Flower 提供任务监控面板
5. **解耦**：后台任务不占用 Web 服务器资源

---

## 九、安全与认证

### Q25: JWT 认证流程是什么？Token 刷新机制如何设计？

**答案：**

**认证流程：**

1. 业务员提交 username + password 到 `/api/v1/auth/login`
2. 后端验证密码（bcrypt），生成 access_token（2h）+ refresh_token（7d）
3. 前端存储 Token，后续请求携带 `Authorization: Bearer <access_token>`
4. 后端中间件验证 Token 有效性

**Token 刷新机制：**

- 前端在 access_token 过期前 5 分钟主动刷新
- 使用 refresh_token 调用刷新接口，获取新的 access_token
- 避免用户在使用过程中突然被登出

**为什么 access_token 设 2 小时：** 平衡安全性和用户体验——太短需要频繁刷新，太长增加被盗风险。

---

### Q26: 限流策略是如何设计的？

**答案：**

| 接口类型 | 限流规则 | 原因 |
|----------|----------|------|
| AI 推荐 | 20/min | LLM 调用成本高，防止滥用 |
| 认证 | 5/min | 防止暴力破解 |
| 默认 | 60/min | 通用保护 |

**实现方式：** 使用 SlowAPI（基于 limits 库），按 IP + 路由维度限流。

**为什么 AI 接口限流最严格：** LLM 调用按 Token 计费，一次请求可能消耗数千 Token，恶意调用会导致高额账单。

---

## 十、综合设计题

### Q27: 如果要给系统添加"多语言支持"（客户用西班牙语沟通），你会怎么设计？

**答案：**

1. **语言检测节点**：在 LangGraph 工作流中 `chat_cleaner` 之后添加 `language_detector` 节点，检测客户消息语言
2. **Prompt 调整**：在 System Prompt 中添加"请用客户使用的语言回复"
3. **RAG 适配**：知识库需要包含多语言文档，或使用翻译 API 将检索结果翻译为目标语言
4. **记忆适配**：L2/L3 记忆需要记录客户的偏好语言
5. **前端适配**：Side Panel UI 多语言化

**关键考虑：** LLM 本身具备多语言能力，核心挑战在于 RAG 检索的多语言匹配和知识库的多语言内容覆盖。

---

### Q28: 如何评估 AI 回复的质量？有哪些指标？

**答案：**

**本项目已有的评估机制：**

1. **置信度（confidence）**：LLM 自评的 0-1 分数，反映模型对回复的确定程度
2. **用户反馈**：业务员标记"有用/无用"，直接反映实际价值
3. **备选回复（alternatives）**：提供多个选项，业务员选择最合适的

**可扩展的评估指标：**

1. **RAG 相关度**：检索结果与查询的相关度分数
2. **采纳率**：业务员实际使用 AI 回复的比例
3. **编辑距离**：业务员最终发送的消息与 AI 推荐的相似度
4. **响应时间**：端到端延迟（从请求到首字输出）
5. **幻觉率**：AI 回复中与知识库矛盾的比例

---

### Q29: 系统的水平扩展方案是什么？

**答案：**

**当前架构的扩展点：**

1. **FastAPI 无状态**：每个请求独立，可以水平扩展多个实例，通过负载均衡分发
2. **Redis 共享**：多个 FastAPI 实例共享同一个 Redis，L1 记忆和缓存一致
3. **PostgreSQL 连接池**：使用 PgBouncer 管理连接池，支持多实例并发访问
4. **Celery Worker**：可以增加 Worker 数量，提高异步任务处理能力

**扩展挑战：**

1. **WebSocket 连接**：`ConnectionManager` 在内存中管理连接，多实例时需要 Redis Pub/Sub 同步
2. **SSE 连接**：流式响应绑定到特定实例，需要 sticky session 或消息队列
3. **ModelRouter 缓存**：`_model_cache` 是进程内缓存，多实例各自缓存，但影响不大（ChatModel 创建成本低）

---

### Q30: 如果让你重新设计这个系统，你会做哪些改进？

**答案：**

1. **RAG 并行化**：memory_retriever 和 weknora_rag 可以并行执行，减少端到端延迟
2. **流式 RAG**：先返回高相关度文档的回复，再补充低相关度文档的细节
3. **Agent 架构**：从线性流水线升级为 Agent 架构，让 LLM 自主决定是否需要检索、搜索、或直接回答
4. **向量数据库**：将 WeKnora 的向量检索功能内化，使用 Milvus/Qdrant 自建，减少外部依赖
5. **A/B 测试**：对不同的 Prompt 策略、模型配置进行 A/B 测试，数据驱动优化
6. **多租户架构**：从 `sales_rep_id` 隔离升级为完整的租户隔离（schema 隔离或数据库隔离）
7. **可观测性**：集成 LangSmith/LangFuse 进行 LLM 调用链追踪和评估
8. **缓存预热**：业务员登录时预加载常用客户的 L1/L2 记忆，减少首次请求延迟

---

## 附录：项目核心文件速查

| 文件 | 路径 | 核心职责 |
|------|------|----------|
| llm_client.py | `app/ai/llm_client.py` | LLM 多模型路由 |
| graph.py | `app/ai/graph.py` | LangGraph 工作流定义 |
| state.py | `app/ai/state.py` | 工作流状态 |
| ai_service.py | `app/services/ai_service.py` | AI 推荐核心服务 |
| retriever.py | `app/core/weknora/retriever.py` | RAG 高级检索器 |
| system_prompt.py | `app/ai/prompts/system_prompt.py` | 系统提示词 |
| sales_prompt.py | `app/ai/prompts/sales_prompt.py` | 销售用户提示词 |
| l1_cache.py | `app/ai/memory/l1_cache.py` | L1 Redis 短期记忆 |
| l2_summary.py | `app/ai/memory/l2_summary.py` | L2 DB 中期摘要 |
| l3_profile.py | `app/ai/memory/l3_profile.py` | L3 DB 长期画像 |
| sidepanel.js | `frontend/sidepanel/sidepanel.js` | Chrome 扩展侧边栏 |
| content.js | `frontend/content/content.js` | 页面 DOM 解析 |
