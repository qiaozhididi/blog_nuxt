---
title: Java 平台服务后端项目开发文档 — 企业级权限与消息通知平台
description: 基于 Java 17 + Spring Boot 2.7 + MyBatis-Plus + SQL Server + Redis + RabbitMQ 的企业级基础平台服务，涵盖 RBAC 权限体系、多语言、审计日志、邮件/站内信通知等技术栈与架构设计说明。
date: 2026-11-17
---

# Java 平台服务后端项目开发文档

本系统是企业级应用的基础平台服务（Platform Service），为上层业务系统提供**用户、角色、菜单、权限、组织架构、数据字典、多语言、消息通知、操作审计**等公共能力，以 REST API 形式对内网多个业务系统输出。基于 **Java 17 + Spring Boot 2.7** 构建，Maven 多模块工程，以 Docker 容器部署于华为云。

## 技术栈

| 分类 | 技术选型 | 说明 |
| -- | -- | -- |
| 语言 / 运行时 | Java 17 | Maven 编译级别 17 |
| Web 框架 | Spring Boot 2.7.3 | spring-boot-starter-web / validation / aop / actuator |
| ORM / 数据库 | MyBatis-Plus + MyBatis-Plus-Join + SQL Server | CRUD 用 MP 增强，多表关联用 MP-Join，复杂 SQL 用 XML Mapper |
| 缓存 | Spring Data Redis | 登录令牌、权限缓存、数据字典缓存 |
| 消息队列 | RabbitMQ（spring-boot-starter-amqp） | 审计、邮件、站内通知、缓存清理四类事件，均配死信队列 |
| 认证安全 | JWT（jjwt）+ BCrypt（jbcrypt） | 无状态令牌 + 密码哈希 |
| 邮件 | Spring Boot Starter Mail | HTML 模板邮件（中/英双语模板） |
| 链路追踪 | Spring Cloud Sleuth | TraceId 贯穿日志 |
| 序列化 | fastjson2 | 高性能 JSON 序列化 |
| 工具库 | Hutool + Lombok | 集合/对象工具、样板代码消除 |
| 内部 SDK | 自研 API 常量包 / Web 启动包 / REST 测试包 | 私有 Maven 仓库分发 |
| 测试 | Spring Boot Test + JUnit + 自研 REST 测试 SDK | 接口级测试 |
| 部署 | Docker + 华为云 SWR（OpenJDK 17 镜像） | entrypoint 脚本注入启动命令 |

## 工程结构

Maven 父子多模块工程（父 POM 统一管理依赖版本）：

| 模块 | 职责 |
| -- | -- |
| api | 对外契约：请求/响应对象（Req/Vo）、枚举、常量、MQ 事件名，供本服务与其他系统共用 |
| bom | 依赖清单模块（Bill of Materials），统一第三方库版本 |
| db | 数据访问层：实体（Entity）、Mapper、MP Service/Impl，与表结构一一对应 |
| biz | 业务规则层：纯静态业务算法（如权限继承计算），不依赖 Spring 容器，便于单测 |
| svc | 应用层（启动模块）：Controller、AppService、UnitService、MQ Consumer、配置类 |

**分层调用约定**：

```text
Controller（参数校验 @Validated，组装出入参）
   ↓
AppService（业务用例编排，事务边界 @Transactional）
   ├─ UnitService（领域能力：邮件、通知、收件人、缓存清理…）
   ├─ db 模块 Service（MyBatis-Plus CRUD + Join 查询）
   └─ EventSender → RabbitMQ（异步事件）
```

AppService 与 UnitService 的职责划分：**AppService 面向用例**（一个接口对应一个业务场景），**UnitService 面向能力**（可被多个用例复用的领域逻辑，如发邮件、算收件人），biz 模块放**纯算法**（如权限菜单的父子继承计算），三层从外到内依赖递减，内层不依赖 Spring 便于测试。

## 核心功能域

62 张表对应的功能可归纳为六个域：

| 功能域 | 主要实体 | 说明 |
| -- | -- | -- |
| 组织与账号 | Company / Factory / Department / DevelopCenter / Person / User / UserAccountApplication | 多公司多工厂组织树、人员账号、账号申请审批 |
| RBAC 权限 | Role / Menu / Page / Function / Report / PdaFunction + 五类 RoleTo* 关联 | 角色到菜单、页面、功能按钮、报表、PDA 功能的细粒度授权 |
| 数据权限 | UserToFactory / UserToDepartment / UserToArea / UserToJob 等 | 用户到工厂、部门、区域、岗位的数据范围绑定 |
| 通知消息 | NotificationType / NotificationTemplate / InternalNotice* / ExternalNotice* / Sender / VendorBusinessEmail | 站内信 + 外部邮件双通道，模板化、按类型配置 |
| 审计日志 | EntityHistory / EntityOperationLog(Detail/Snapshot) / LoginLog / LogoutLog / LoginFailedLog | 实体变更历史、操作快照、登录登出审计 |
| 系统配置 | DictType / DictValues / I18nGroup / I18nDetail / ApplicationConfiguration / AppVersion / QuickSearch / TransactionStateControl | 数据字典、多语言词条、应用配置、快捷搜索、单据流转状态控制 |

## 关键设计

### RBAC 权限模型

采用经典 RBAC 并做两层扩展：

- **资源五分类**：菜单（导航）、页面、功能按钮、报表、PDA 功能分别建表与角色关联，覆盖 Web 端与 PDA 手持端两套终端；
- **数据权限独立建模**：功能权限（能做什么）与数据权限（能看哪些工厂/部门）分离，通过 UserTo* 关联表实现；
- **权限继承计算下沉到 biz 纯函数**：如勾选某菜单时自动级联父菜单与子菜单、反选时自动回收，这类树形继承算法写成无状态静态方法，单元测试覆盖核心分支。

### 消息通知：策略模式 + 工厂

通知发送采用**策略模式**消除 if-else：`NotificationStrategy` 接口定义发送能力，站内信（SiteMessage）与邮件（Email）各一个实现类并标注类型编码；`NotificationFactory` 实现 `ApplicationContextAware`，启动时从 Spring 容器收集全部策略 Bean 装配成 `Map<类型, 策略>`，运行时按消息类型路由。新增通知渠道只需加一个实现类，符合开闭原则。

### RabbitMQ 事件设计

声明式配置四个 Topic 交换机与队列：**审计**（实体变更）、**邮件**、**站内通知**、**缓存清理**（数据变更后广播清缓存）。所有业务队列统一配置**死信队列**（利用默认交换机 + 死信路由键），消费失败的消息自动转入死信避免丢失。事件名与路由键集中在常量类，api 模块对外共享，保证生产/消费两端契约一致。

### 认证与登录安全

JWT 无状态令牌：登录签发 JWT，网关/过滤器校验；密码使用 BCrypt 加盐哈希存储。配套安全设施：登录失败日志、登录/登出审计日志。登出与踢登采用 **Redis 令牌存在性校验**方案——登出即删 Redis 中的 token，支持按登录端（浏览器/App）区分的踢登能力。

### 多语言与邮件模板

词条表（分组 + 明细）支撑运行时多语言；邮件使用 HTML 模板文件（中/英两套），发送时按接收人语言渲染。邮件发送有独立发送日志表，失败可追溯重发。

### 数据访问策略

- 单表 CRUD：MyBatis-Plus 的 `IService`/`ServiceImpl`，零 XML；
- 多表关联：MyBatis-Plus-Join，以 Lambda 方式写 join 避免手写 SQL；
- 复杂报表/层级查询：XML Mapper 手写 SQL + 数据库视图（如权限继承层级视图）；
- 逻辑删除：全局配置 `logic-del-type=on`，删除即标记。

## 部署与配置

- **Docker**：基于华为云 SWR 的 OpenJDK 17 镜像，拷贝可执行 jar，通过 `docker-entrypoint.sh` 以环境变量 `RUN_COMMAND` 注入启动命令，便于同镜像多环境复用；
- **配置**：`application.properties` 集中管理，含数据源、Redis、RabbitMQ、SMTP、飞书机器人等；服务端口 8086，context-path 独立前缀便于网关路由；
- **可观测**：Actuator 健康检查 + Sleuth TraceId + 全局请求日志过滤器。

