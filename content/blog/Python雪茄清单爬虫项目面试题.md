---
title: Python 定时爬虫邮件推送系统面试题 — 限量雪茄清单监控与自动下单
description: 基于 Python asyncio + Playwright + Firecrawl + APScheduler + SMTP 的定时文章爬虫邮件推送系统面试题集，涵盖反爬对抗、并发轮询、启发式 HTML 解析、邮件长连接与定时调度。
date: 2026-11-12
---

# Python 定时爬虫邮件推送系统面试题 — 限量雪茄清单监控与自动下单

> 项目是一个面向真实业务场景的自动化系统：定时监控海外雪茄论坛（FOH）特定用户的活动页，第一时间发现 "24:24" 限量雪茄清单文章，抓取并解析商品清单后自动完成两件事——把完整清单推送给自己，同时按关键词匹配自动组装英文订单邮件发给商家抢购。核心诉求是**快**（热门款几分钟售罄，先到先得）和**稳**（7×24 无人值守）。

***

## 一、项目概览

### Q1: 用一两分钟介绍一下这个项目

**答案（STAR 模板）：**

- **Situation**：FOH 论坛每周二至周五发布 "24:24" 限量雪茄清单，限时 24 小时、先到先得，热门款往往几分钟内售罄。人工刷页面、手动写英文订单邮件根本来不及。
- **Task**：做一个无人值守的自动化系统，在清单发布后最短时间内完成「发现文章 → 抓取解析 → 推送清单 → 自动发订单邮件」全链路。
- **Action**：
  1. 用 APScheduler 配置多个 cron 定时点，并**提前 4 分钟**启动任务，进入轮询等待状态；
  2. 爬虫层做**双模式策略**：Playwright 隐身浏览器（反检测）+ Firecrawl API（绕 Cloudflare），可配置切换；
  3. 检测阶段用 asyncio + 信号量做**并发批次轮询**（每批 3 个请求、最多 100 批），并利用 Firecrawl 的分级缓存策略把详情页抓取提速约 5 倍；
  4. 解析层针对论坛无规律的富文本 HTML，设计了一套**基于样式特征的启发式商品提取算法**（字号、加粗、红色大字识别售罄）；
  5. 邮件层实现 SMTP **长连接懒加载 + 心跳保活 + 断线自动重连**，清单邮件与订单邮件并发发送。
- **Result**：系统 7×24 部署在 Linux 服务器上稳定运行，清单发布后秒级检测、自动下单，全程无需人工干预。

**追问：这个项目最大的难点是什么？**

两个：一是**反爬对抗**——目标站有 Cloudflare 防护，纯 requests 直接 403，最终用「Firecrawl 为主、Playwright stealth 为兜底」的方案解决；二是**解析准确率**——文章是用户富文本编辑器产出的无规范 HTML，商品名可能被拆成多个标签、数字被空格截断（"Magnum 5" + "0"）、售罄标识没有固定结构，需要大量启发式规则。

***

### Q2: 技术栈和整体架构是怎样的？

**答案：**

| 层次 | 选型 | 作用 |
| -- | -- | -- |
| 语言 | Python 3.11 | 开发语言 |
| 异步 | asyncio | 并发抓取、并发发邮件 |
| 定时 | APScheduler（BlockingScheduler + CronTrigger） | 多时间点 cron 调度 |
| 爬虫 A | Playwright（Chromium + stealth 注入） | 浏览器模拟，反检测兜底 |
| 爬虫 B | Firecrawl API | 绕过 Cloudflare 的主力方案 |
| 解析 | BeautifulSoup4 + lxml | DOM 解析与商品提取 |
| 邮件 | smtplib（内置） | SMTP 发送，465 SSL / STARTTLS |
| 配置 | PyYAML + python-dotenv | 非敏感配置与敏感凭据分离 |
| 日志 | logging + TimedRotatingFileHandler | 按天滚动、保留 30 天 |

**整体流程：**

```text
APScheduler 定时触发（提前 4 分钟）
   ↓
并发轮询用户活动页（Firecrawl / Playwright）
   ↓
Parser 查找目标文章链接（24:24 前缀 + 星期位置启发式 + 取最大 topic_id）
   ↓
抓取文章详情页（利用 1 小时缓存提速）
   ↓
Parser 启发式提取商品清单（名称 / 价格 / 售罄状态）
   ↓
Cleaner 数据清洗格式化（零宽字符、断字数字修复、时区转换）
   ↓
asyncio.gather 并发发送两类邮件：
   ├─ 清单邮件 → 自己的邮箱（完整清单存档）
   └─ 订单邮件 → 商家邮箱（关键词命中的商品，一品一封英文订单）
   ↓
日志记录 / 异常时发送告警邮件
```

***

### Q3: 项目的目录结构是怎么划分的？

**答案：**

```text
article-mail-crawler/
├── app/
│   ├── main.py                    # 入口 + 任务编排（FOHCrawlerApp）
│   ├── crawler/
│   │   ├── playwright_crawler.py  # Playwright 隐身浏览器爬虫
│   │   ├── firecrawl_crawler.py   # Firecrawl API 爬虫
│   │   ├── parser.py              # HTML 解析：找文章、提商品
│   │   └── cleaner.py             # 数据清洗与格式化
│   ├── scheduler/
│   │   └── task_scheduler.py      # APScheduler 多时间点 cron 调度
│   ├── mailer/
│   │   └── mail_sender.py         # SMTP 长连接邮件发送
│   ├── storage/
│   │   └── file_saver.py          # 本地 TXT 存档
│   └── utils/
│       ├── config_loader.py       # 单例配置加载（yaml + env）
│       └── logger.py              # 按天滚动日志（北京时间）
├── config/
│   ├── config.yaml                # 非敏感配置（URL、定时、爬虫策略）
│   └── .env                       # 敏感配置（SMTP 授权码、收件人、关键词）
└── requirements.txt
```

按**职责单一原则**分层：爬虫只负责拿 HTML，解析只负责提数据，清洗只负责格式化，邮件只负责发送，`main.py` 只做编排。任何一层替换实现（比如换一个爬虫服务）不影响其他层。

***

### Q4: 为什么配置要拆成 config.yaml 和 .env 两份？

**答案：**

按**敏感级别**分离：

- `config.yaml`：目标 URL、定时规则、重试次数、缓存策略等**非敏感**配置，可以进 Git 仓库，改起来有注释、结构清晰；
- `.env`：SMTP 授权码、发件/收件邮箱、触发关键词、个人下单信息等**敏感凭据**，通过 python-dotenv 加载，不进版本库。

`ConfigLoader` 用**单例模式**实现，全局只有一个实例，启动时一次性加载两份配置；业务代码通过 `config_loader.get("crawler.timeout", 60)` 这种**点路径**取值并带默认值，避免层层 `dict.get` 判空。

**追问：单例模式有什么坑？**

- 多线程下首次实例化要加锁（本项目单进程单事件循环，启动时即初始化，无竞争）；
- 单例导致配置运行期不可热更新——但定时任务场景下配置变更频率极低，重启进程成本可接受；
- 测试时单例会带状态，需要重置 `_instance`。这是用简单性换便利性，符合 KISS 原则。

***

## 二、反爬对抗（核心难点一）

### Q5: 目标站有 Cloudflare 防护，你是怎么绕过的？

**答案：**

经历了三个阶段的演进：

**阶段一：纯 requests** —— 直接 403，Cloudflare 的 JS Challenge 过不了，放弃。

**阶段二：Playwright + stealth 注入** —— 用真实 Chromium 执行 JS 挑战，并做全套反检测：

```python
# 启动参数层面
args=["--disable-blink-features=AutomationControlled", "--no-sandbox", ...]

# JS 注入层面（add_init_script，在页面任何脚本之前执行）
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
window.chrome = { runtime: {}, loadTimes: function(){}, ... };
// 伪装 plugins、languages、WebGL vendor（37445/37446 返回 NVIDIA 真实显卡信息）
```

再配合：随机 UA 池、美国时区/地理位置模拟（`timezone_id="America/New_York"`）、随机鼠标移动与随机等待模拟人类行为、`wait_for_cloudflare()` 轮询页面标题检测 "Just a moment..." 是否消失。

**阶段三：Firecrawl API（最终主力）** —— 把 Cloudflare 绕过交给专业抓取服务，它服务端维护浏览器集群和代理池，自己不用对抗升级。Playwright 保留为 `crawler_mode` 可切换的降级方案。

**追问：为什么不一开始就上 Firecrawl？**

成本和可控性的权衡：Firecrawl 按额度收费且是外部依赖，自建 Playwright 零成本但维护成本高（Cloudflare 规则会变）。架构上把两种爬虫抽象成**同一接口的策略模式**（`fetch_activity_page` / `fetch_article_page` / `wait_for_cloudflare`），`main.py` 通过 `_get_crawler()` 按配置选择，切换零成本——这正是当初留两条路的价值。

***

### Q6: Firecrawl 的缓存策略是怎么设计的？为什么？

**答案：**

这是**时效性与速度的平衡**设计，按页面类型分级：

```yaml
max_age:
  activity: 0        # 活动列表页：禁用缓存，文章一发布立即能检测到
  article: 3600000   # 文章详情页：1 小时缓存
```

- **活动页（发现阶段）**：轮询目的是"第一时间发现新文章"，缓存会造成检测延迟，必须 `maxAge=0` 绝对实时；
- **详情页（抓取阶段）**：文章发布后内容基本不变，命中 Firecrawl 服务端缓存后，官方数据可**提速约 500%**——而这一步恰好在抢购链路的关键路径上，省下的每一秒都直接提升抢购成功率。

本质是把"缓存一致性要求"按业务阶段拆解：发现阶段要强一致，消费阶段可接受弱一致。

***

## 三、并发与异步设计（核心难点二）

### Q7: 检测新文章的轮询机制是怎么设计的？

**答案：**

业务特点决定设计：文章在**某个时间点前后不确定地发布**，定时任务到点时文章可能还没发出来。所以采用「**提前启动 + 并发批次轮询**」：

1. **提前启动**：cron 触发时间比目标发布时间**提前 4 分钟**（`advance_minutes`），任务进入轮询等待；
2. **并发批次**：每批用 asyncio 并发发起 `concurrency=3` 个活动页请求，任何一批中任一请求发现了目标文章即停止；
3. **上限保护**：最多 `max_retries=100` 次尝试后放弃，避免无限轮询烧 API 额度；
4. **并发控制**：用 `asyncio.Semaphore(3)` 限制同时在飞的请求数，防止打爆 API 额度或被限流。

```python
semaphore = asyncio.Semaphore(self.concurrency)

async def _fetch_one(url, page_type):
    async with semaphore:
        try:
            return (url, await self.fetch_page(url, page_type))
        except Exception as e:
            return (url, e)   # 异常作为结果返回，不中断整批

results = await asyncio.gather(*tasks)  # 顺序与输入一致
```

**设计细节：**

- 单个请求失败**不让整批失败**——异常封装成结果返回，主循环跳过该结果继续；
- 并发数可配置，官方建议 3-5（免费额度有限时 2-3），把成本和速度的权衡暴露给配置。

**追问：为什么用并发而不是加快单请求轮询频率？**

同一时刻发 N 个请求，拿到的是 N 个"几乎同时"的页面快照，任何时刻文章发布都大概率落在某次请求之后被立即捕获。串行快速轮询的请求间隔是固定的盲区，而并发批次把检测延迟压缩到单请求耗时以内。另外 Firecrawl 的请求耗时主要在服务端渲染（秒级），串行轮询的频率上限远低于并发方案。

***

### Q8: Firecrawl 的 SDK 是同步的，你怎么在 asyncio 里用它？

**答案：**

用 `loop.run_in_executor` 把同步阻塞调用**扔进默认线程池**，包装成 awaitable，避免阻塞事件循环：

```python
loop = asyncio.get_event_loop()
html = await loop.run_in_executor(
    None,                                    # None = 默认 ThreadPoolExecutor
    partial(self._scrape_sync, url, page_type)  # partial 固化参数
)
```

关键点：如果不做这层包装，`client.scrape()` 会**阻塞整个事件循环**，其他并发请求全部卡住，并发就失去意义。这也是"同步库接入异步生态"的标准解法（类似 FastAPI 的 `run_in_threadpool`）。

**追问：为什么不用多进程？**

- 瓶颈是 **I/O（网络等待）** 而非 CPU，asyncio + 线程池足够；
- 多进程带来进程间通信、状态共享、资源占用的额外复杂度，违背 KISS；
- GIL 只锁 CPU 计算，网络 I/O 会释放 GIL，线程池跑同步 HTTP 没有问题。

***

### Q9: 两类邮件是怎么并发发送的？

**答案：**

抓完文章后用 `asyncio.gather` 并发走两条独立的邮件流水线：

```python
await asyncio.gather(
    self._send_list_email(content, article_data),    # 清单邮件 → 自己存档
    self._send_keyword_emails(article_data)          # 订单邮件 → 商家抢购
)
```

- **清单邮件**：清洗后的完整商品列表（🟢有货 / 🔴售罄 + 价格 + 发布时间），发往 `RECEIVE_LIST_EMAILS`；
- **订单邮件**：用 `TRIGGER_KEYWORDS` 对商品名做**大小写不敏感的子串匹配**，命中的商品跨关键词**去重合并**后，每个商品单独发一封英文订单（论坛规则就是一品一邮），正文自动带上个人信息（姓名、论坛 ID、国家、省份）。

**追问：这里有哪些保护措施防止误发？**

1. **`PRODUCTION_MODE=false`** 时全局跳过邮件发送——测试调试不会骚扰商家；
2. 收件人为空时逐级跳过并打 warning，不会发出"空收件人"邮件；
3. 关键词未命中时静默跳过，只有真正匹配才发订单；
4. 订单邮件逐封发送并在日志记录 `成功数/总数`，失败单封不影响其他。

***

## 四、HTML 解析与数据清洗（核心难点三）

### Q10: 文章 HTML 没有规范结构，商品信息是怎么提取的？

**答案：**

论坛文章是用户用富文本编辑器手排的，没有语义化 class，只能靠**样式特征启发式**：

**第一步：定位商品标题容器。** 商品名在页面里有固定的视觉特征——`font-size:24px` 的 span，或者加粗标签：

```python
def _find_product_title_containers(self, content_div):
    containers = []
    for span in content_div.find_all('span'):
        if 'font-size:24px' in span.get('style', ''):
            containers.append(span)
    for bold in content_div.find_all(['b', 'strong']):
        if self._looks_like_product_name(bold.get_text(strip=True)):
            containers.append(bold)   # 需排除已包含在 24px span 内的
    return containers
```

**第二步：过滤伪商品名。** `_looks_like_product_name` 用三层规则：

1. **排除模式**（`EXCLUDE_PATTERNS`）：纯数字、纯符号、邮箱提示语、运费/关税说明、sampler 套装说明等十几条正则；
2. **命中模式**（`PRODUCT_PATTERNS`）：必须包含规格特征如 `(10's)`、`25's`，或品牌大小写模式；
3. **基础约束**：长度 5-150、词数 2-15、大小写混合。

**第三步：识别售罄状态。** 售罄标记同样没有固定结构，用**多特征联合判定**：

```python
# 文本特征：包含 ALL SOLD / SOLD OUT
# 样式特征：红色（#ff0000 / rgb(255,0,0)）且大字号（36px/48px）
# _get_effective_style 会向上回溯 5 层父节点收集继承样式
```

文本命中即判售罄；没有文本时"红色 + 大字号"组合也可判定——因为卖家经常只把售罄标成红色大字而不写字。

**追问：这种启发式规则脆弱吗？怎么应对网站改版？**

脆弱是事实，缓解手段有三个：规则全部**外置为常量模式列表**便于调整；解析失败时有完善日志（找不到商品会 warning 并记录候选链接）；以及通过**异常告警邮件**在第一时间感知解析失效。这是爬虫类项目的固有 trade-off——用规则维护成本换取对无规范数据源的适配能力。

***

### Q11: 商品名被拆成多个标签、数字被截断的问题怎么解决？

**答案：**

卖家排版时商品名常被拆成多个 `<b>` 标签，且数字可能被空格截断（`"H. Upmann Magnum 5"` + `"0 (10's)"` 实际是一个商品）。解法是**智能合并**：

```python
def _merge_name_parts(self, parts):
    # 前段以数字结尾 + 后段以数字开头 → 直接拼接不加空格
    #   "Magnum 5" + "0 (10's)" → "Magnum 50 (10's)"
    # 前段以数字结尾 + 后段以 ( 开头 → 直接拼接
    #   "50" + "(10's)" → "50(10's)"
    # 其他情况 → 加空格拼接
```

清洗阶段还有一道兜底正则修复被空格劈开的数字：

```python
name = re.sub(r'(\d)\s+(\d)', r'\1\2', name)   # "5 0" → "50"
```

此外清洗还要处理：`\xa0`（`&nbsp;`）、`\u200b`（零宽空格）、控制字符 `\x00-\x1f`、首尾残留的 SOLD 标记和标点。这些都是在真实数据上逐个 case 修出来的——数据清洗规则的本质是**对脏数据样本的回归集合**。

***

### Q12: 如何从活动页的一堆链接里找到"今天那篇"目标文章？

**答案：**

活动页有几十个 `/topic/` 链接，需要精确锁定最新的 24:24 文章，规则是多重启发式：

1. **前缀匹配**：标题包含 `24:24`（可配置）；
2. **星期位置判断**：活动页里同用户历史文章标题可能形如 "MONDAY 24:24 ..."（星期在前，是旧文章索引），只有当星期出现在 `24:24` **之后**（如 "24:24 TUESDAY ..."）或标题直接以 `24:24` 开头时才是当日新文章；
3. **topic_id 降序取最大**：所有候选按 URL 中的数字 topic_id 排序，取最大者——论坛 topic_id 单调递增，最大的即最新发布；
4. **相对链接补全**：拼上站点域名。

找不到时日志会输出"包含 24:24 但被排除的链接"前 5 条，方便排查是规则问题还是文章真的没发。

***

## 五、邮件系统与可靠性

### Q13: 邮件发送的 SMTP 连接管理是怎么做的？

**答案：**

SMTP 建连（TCP + TLS 握手 + 登录认证）开销不小，抢购场景下一次任务可能连发多封订单邮件，所以实现了**懒加载长连接 + 心跳保活 + 断线重连**：

```python
def _get_server(self):
    if self._server is not None and self._is_connected:
        try:
            self._server.noop()        # NOOP 心跳探测连接是否还活着
            return self._server
        except (smtplib.SMTPException, socket.error, OSError):
            self._close_connection()   # 失效则清理，走重建逻辑

    if smtp_port == 465:
        server = smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=30)  # SSL 直连
    else:
        server = smtplib.SMTP(smtp_server, smtp_port, timeout=30)
        server.starttls()                                              # 587 走 STARTTLS
    server.login(send_email, auth_code)  # 授权码而非明文密码
```

- **懒加载**：首次发信才建连，避免定时任务空跑期间占用连接被服务器踢掉；
- **心跳复用**：每次发信前 `noop()` 探活，活着就直接复用；
- **发送失败自动重连重试一次**：`_send_smtp` 捕获网络异常后关闭旧连接、重建、重发，仍失败才返回 False；
- **协议自适应**：465 端口用 `SMTP_SSL`，其他端口用 `STARTTLS`。

**追问：为什么用邮箱授权码而不是密码？**

QQ/163 等主流邮箱的 SMTP 服务要求使用独立授权码，授权码与登录密码隔离，泄露后可单独吊销且不影响邮箱本身，同时授权码只授予 SMTP 权限，符合最小权限原则。授权码放在 `.env` 不进版本库。

***

### Q14: 系统的异常处理和容错机制完整吗？

**答案：**

分层容错：

| 层级 | 机制 |
| -- | -- |
| 单请求 | Firecrawl 重试 3 次，退避间隔递增（5s/10s/15s） |
| 单批并发 | 单请求异常封装为结果返回，不中断整批 |
| 任务级 | 找不到目标文章不算失败（文章可能没发），打日志正常结束 |
| 邮件级 | 单封失败不影响其他，发送失败自动重连重试一次 |
| 进程级 | 任务异常捕获后记录完整堆栈（`exc_info=True`），可选发送异常告警邮件，进程不退出、不影响下一次定时触发 |
| 日志 | 按天滚动保留 30 天，北京时间，便于事后审计 |

设计原则是**让失败局部化**：任何单点失败都不能让守护进程崩溃，也不能影响下一个定时点。

***

## 六、定时调度与工程化

### Q15: 定时调度为什么选 APScheduler？多时间点怎么配置？

**答案：**

选型理由：

- 需要 **cron 表达式级**的灵活调度（每周二至周五 08:30），`schedule` 库表达力不够；
- 需要**时区感知**——服务器可能不在国内，但业务时间锚定北京时间；
- 进程内常驻、无需分布式，没必要上 Celery + 消息队列的重量方案。

实现上用 `BlockingScheduler`（独占进程阻塞运行，适合纯守护脚本）+ `CronTrigger`，支持**多时间点列表**：

```yaml
schedule_times:
  - day: "星期二"
    time: "08:30"
  - day: "星期三"
    time: "08:30"
```

星期字段做了**中英文双映射**（`WEEKDAY_MAP` 同时支持 "星期二"/"周二"/"tuesday"），配置容错性好。每个时间点注册为独立 job，启动时打印每个 job 的下次执行时间便于核对。

**追问：CronTrigger 的"提前 4 分钟"是怎么实现的？**

不是在任务内部 sleep，而是在注册 cron 时直接**把时间往前拨**（分钟减 4，处理跨小时/跨天借位），让调度器提前触发，任务启动后立即进入轮询等待循环。这样"等待"逻辑由轮询机制自己控制，比 sleep 更灵活——能边等边检测。

***

### Q16: 日志系统怎么设计的？

**答案：**

基于标准库 `logging` + `TimedRotatingFileHandler`：

- **按天滚动**：`when="midnight"`，每天午夜切分新文件；
- **保留 30 天**：`backupCount=30` 自动清理过期日志；
- **北京时间格式化**：自定义 `BeijingTimeFormatter` 把 `record.created` 转到 Asia/Shanghai 时区再格式化——服务器在境外时日志时间仍然符合业务直觉；
- **双输出**：文件 + 控制台同一 formatter，SSH 上 `tail -f` 和翻历史日志体验一致。

***

### Q17: 项目是怎么部署的？

**答案：**

Linux 服务器（宝塔面板）守护进程方式运行：

- 虚拟环境安装依赖 + `playwright install chromium`；
- 配置好 `config.yaml` 与 `.env` 后用进程守护（宝塔 Python 项目管理器 / systemd / nohup）保持 7×24 常驻；
- 支持 `--once` 参数立即执行一次任务，用于部署后的验证和日常调试，不影响定时配置。

仓库中有完整的 `DEPLOYMENT.md` 和 `BAOTA_DEPLOY.md` 部署文档，覆盖环境准备、依赖安装、守护配置、排错清单。

***

## 七、开放性问题（高频追问）

### Q18: 这个系统如何保证"不漏单也不重复下单"？

**答案：**

- **不漏**：提前启动 + 100 次轮询覆盖了发布时间的抖动窗口；topic_id 取最大保证不会抓到昨天的旧文章；解析不到商品时记 error 日志并可触发告警邮件；
- **不重**：每次任务独立运行，目标是"当日最新一篇文章"（topic_id 最大者），清单邮件一篇只发一次；订单邮件发送前对跨关键词命中的商品做**名称去重合并**，同一商品不会因命中多个关键词而重复下单；
- 当前设计未做"本地已下单记录持久化"（跨天的幂等），因为业务上同一天同一商品重复下单会被商家侧去重，且 24:24 清单每天商品不同。若要做到严格幂等，可以把已下单商品名 + 日期落盘 SQLite，发送前先查重。

***

### Q19: 如果让你重新设计/继续迭代，会改进哪些地方？

**答案（展示技术视野）：**

1. **解析层结构化**：把启发式正则抽到独立的 YAML 规则配置，网站改版不改代码；更进一步可用 LLM 做商品信息抽取兜底（规则失败时降级到 LLM 解析）；
2. **状态持久化**：引入 SQLite 记录任务执行历史和已下单清单，支持幂等、对账和运行报表；
3. **通知渠道多元化**：除邮件外接入 Telegram Bot / 企业微信 webhook，抢购结果秒级触达手机；
4. **可观测性**：加 Prometheus 指标（检测延迟、解析成功率、邮件成功率）或至少一个简易健康检查端点；
5. **配置热更新**：调度层支持 reload 配置，改时间点不用重启；
6. **测试**：目前缺单测，解析器是最值得补的部分——把历史文章 HTML 存为 fixture，对 Parser 做回归测试，网站改版时能立刻发现规则失效。

***

### Q20: 爬虫的合规性怎么考虑？

**答案：**

- **频率克制**：仅在固定时段对单个页面轮询，无全站遍历、无高并发压测，并发数限制在 3；
- **只抓公开页面**：目标文章是论坛公开内容，不破解登录、不绕过付费墙；
- **数据用途个人化**：抓取结果仅用于个人邮件通知和下单，不做二次分发、不商用；
- **尊重对方规则**：邮件下单本身是论坛官方规定的购买方式，自动化只是替代人工写邮件，不改变业务流程；
- 敏感凭据（SMTP 授权码、API Key）全部 `.env` 隔离，不进版本库。

***

## 八、知识点速记卡片

| 知识点 | 一句话答案 |
| -- | -- |
| 同步库接入 asyncio | `loop.run_in_executor(None, partial(fn, *args))` 丢线程池 |
| 限制并发量 | `asyncio.Semaphore(n)`，`async with` 包裹临界区 |
| 并发收集且容错 | `asyncio.gather(*tasks)` + 任务内 try 把异常作为返回值 |
| SMTP 长连接保活 | 发送前 `noop()` 心跳，失效重建，失败重连重试一次 |
| 465 vs 587 端口 | 465 = SMTP_SSL 直连；587 = 先明文后 `starttls()` 升级 |
| 单例配置 | `__new__` 拦截 + 类属性存实例，点路径 `get("a.b", default)` |
| 按天滚动日志 | `TimedRotatingFileHandler(when="midnight", backupCount=30)` |
| cron 调度指定时区 | `CronTrigger(hour=..., timezone=pytz.timezone("Asia/Shanghai"))` |
| 反检测核心三件套 | 隐藏 `navigator.webdriver`、补 `window.chrome`、伪装 WebGL vendor |
| 缓存分级策略 | 强一致性需求禁缓存，弱一致性需求用缓存换速度 |
| BeautifulSoup 解析器 | lxml 比 html.parser 快且对畸形 HTML 更宽容 |
| 提前触发 cron | 注册时直接拨早触发时间，而不是任务内 sleep |
