---
title: Java 样品与生产计划系统后端开发文档 — 订单排产调度平台
description: 基于 Java 17 + Spring Boot 2.7 + MyBatis-Plus + SQL Server + Redis + RabbitMQ + Caffeine 的鞋业样品室与生产计划系统，涵盖订单排产策略、产能计算、条码流转、遗留系统集成等技术栈与架构设计说明。
date: 2026-11-17
---

# Java 样品与生产计划系统后端开发文档

本系统是鞋业制造企业的**样品室与生产计划调度系统**，覆盖样品/生产订单的排产调度、产能占用计算、订单变更响应、补单返修、外发加工、条码打印与工序流转、出货进度跟踪等场景，并与企业遗留 ERP 数据库做双向集成。基于 **Java 17 + Spring Boot 2.7** 构建，Maven 多模块工程（约 1900 个源文件），Docker 容器化部署于华为云。

## 技术栈

| 分类 | 技术选型 | 说明 |
| -- | -- | -- |
| 语言 / 运行时 | Java 17 | record / switch 表达式等新特性可用 |
| Web 框架 | Spring Boot 2.7.2 | web / validation / aop / cache / actuator |
| ORM / 数据库 | MyBatis-Plus + MyBatis-Plus-Join + SQL Server | 实体代码自动生成，复杂查询 XML Mapper |
| 缓存 | Spring Cache + Caffeine（本地） + Redis（分布式） | 两级缓存：配置类热数据走本地 Caffeine |
| 消息队列 | RabbitMQ（spring-amqp） | 订单变更事件（新增/取消/暂停/恢复/物料齐套） |
| 认证 | JWT（jjwt-api） | 对接平台服务的统一认证 |
| API 文档 | springdoc-openapi（Swagger UI） | 自动生成接口文档 |
| 序列化 / 工具 | fastjson2 + Hutool + Lombok | |
| 外部集成 | 飞书 OpenAPI SDK（larksuite-oapi） | 异常/审批消息推送 |
| 链路追踪 | Spring Cloud Sleuth | TraceId 日志串联 |
| 构建 | Maven + git-commit-id-plugin | 构建时注入 Git 版本信息，actuator/info 可查 |
| 测试 | JUnit + Mockito + rest-assured + 自研 REST 测试 SDK | 单元测试 + 接口级测试 profile |
| 部署 | Docker + 华为云 SWR（OpenJDK 17） | entrypoint 脚本注入启动命令 |

## 工程结构

Maven 父子多模块工程，共 7 个模块：

| 模块 | 职责 |
| -- | -- |
| common-lib | 跨项目共用的常量、异常、通用配置与处理器 |
| bom | 第三方依赖版本清单（Bill of Materials） |
| api | 对外契约：Feign Client、Request/Response、VO/DTO、枚举、Excel 导出模型 |
| db | 本系统数据库访问层：实体、Mapper、MP Service（**代码自动生成，禁止手改**） |
| legacy-db | 遗留 ERP 数据库访问层：69 张旧表实体与 Mapper，与主库物理隔离 |
| biz | 纯业务逻辑：排产日历、订单加工、尺码转换等，**不依赖 Spring、禁止访问 db，全部可单测** |
| svc | 应用启动模块：Controller、AppService、UnitService、Scheduler、MQ Consumer、配置 |

仓库还维护独立的 **db-script 目录**（175 个 SQL 脚本：建表、视图、存储过程、报表查询、历史数据脚本），数据库变更与代码同库评审。

**分层调用约定**（readme 中明文规定的团队规范）：

```text
Controller（只做两件事：入参校验 + 业务规则校验）
   ↓
AppService（从 db 取数 → 交给 biz 加工 → 流程编排，事务边界）
   ├─ biz（纯函数式业务逻辑，可脱离 Spring 单测）
   ├─ db / legacy-db（MyBatis-Plus CRUD + Join 查询）
   └─ EventSender → RabbitMQ（订单变更事件）
```

设计要点：**db 层实体由代码生成器产出，入参出参都是实体，禁止修改**；核心业务算法（排产、产能）必须落在 biz 模块以保证可测试性——"可测试性是代码质量的重要指标"。简单子域（如设备管理）允许不设 biz 层，直接在 svc 处理，避免过度分层。

## 核心业务设计

### 订单排产调度（核心复杂度所在）

系统最有技术含量的部分是订单排产，采用**策略模式 + 注册表 + 构建者模式**组合：

- **策略抽象**：`AbstractOrderSchedulingStrategy` 定义排产算法骨架（模板方法），正式订单（Formal）与预订单（Preorder）各有具体策略子类，排产规则差异（如正式单锁产能、预订单只预估）在子类中体现；
- **策略注册表**：`SchedulingStrategyRegistry` 按订单类型路由到对应策略，新增订单类型只需加策略类 + 注册，不动调度入口；
- **产能计算构建者**：`AbstractProdCapacityUsageBuilder` + 正式/预订单两个 Builder 实现，配合 `ScheduleContext`（上下文对象）与 `ScheduleContextBuilder` 装载排产所需的订单、日历、产能配置等输入；
- **并发与一致性**：订单执行锁（OrderExecutionLock）防止同一订单并发排产；执行日志、重排触发器（OrderRescheduleTrigger）、风险与建议（OrderScheduleRisk/Suggest）落库，排产结果可解释、可追溯。

该模块是测试密度最高的区域——策略、构建者、锁、异常、负载均有对应测试类（如 `LockScheduleTest`、`OrderScheduleLoadTest`），印证了"核心算法必须可单测"的约定。

### 订单变更事件驱动

订单变更（新增/取消/暂停/恢复）与物料齐套通过 RabbitMQ 事件驱动下游：

- 事件载荷统一定义（Payload 类），发送侧封装 `EventSender` 接口与 RabbitMQ 实现；
- 消费侧为每类事件一个 Handler（OrderAdd/Cancel/Pause/Resume/MaterialCompleted），由 Consumer 统一接收后分发；
- 典型联动：订单暂停 → 释放产能占用 → 触发受影响的相邻订单重排；物料齐套 → 预订单转正式排产。

### 双数据库集成

主库（本系统 74 张表）与遗留 ERP 库（69 张表：BOM、物料需求、底单、企业基础资料等）通过两个独立数据源模块隔离访问，业务层编排时组合两边数据。新旧系统并行期，数据一致性依赖业务编排而非分布式事务。

### 条码与工序流转

产品/部件条码的打印申请、重打管控（原因配置 + 部门授权）、打印历史、工序站点配置（站点/接收方式/代理）、工序流转记录全链路落库，支撑车间扫码追溯与防错。

## REST API 约定

团队约定了统一的 URL 规划：域名与网关前缀由 Nginx 处理，服务级前缀用 `server.servlet.context-path`，资源路径走 RESTful 风格（`/api/v1/plants/{id}`），复杂动作用子资源或动作式端点（如 `task-transfer`）。版本信息通过 `actuator/info`（结合 git-commit-id-plugin）对外可查，发布时要求版本号包含 sprint 与 tag。

## 测试体系

readme 中将单元测试定义为**任务完成（DoD）的证据之一**，并有硬性约定：

- 每个 AppService 接口方法至少一个 `@SpringBootTest` 测试；
- 每个 MyBatis-Plus Service 方法至少一个 `@MybatisPlusTest`（切片测试，只加载 MyBatis 层）；
- biz 模块全部逻辑必须可脱离 Spring 环境单测；
- 接口级测试：rest-assured + 独立 Maven profile（`mvn test -P rest-api-test`），配合 dev/sit/test 三套测试环境配置。

## 部署与配置

- Docker 基于华为云 SWR 的 OpenJDK 17 镜像，`docker-entrypoint.sh` 通过环境变量注入启动命令，同镜像多环境复用；
- 多环境 properties（local/dev/sit/test），本地缓存用 Caffeine（最大 500 条、访问后 10 分钟过期），分布式状态走 Redis；
- 与第一篇 .NET 系统、第二篇平台服务共用同一套飞书应用与基础设施，属同一企业系统矩阵。


