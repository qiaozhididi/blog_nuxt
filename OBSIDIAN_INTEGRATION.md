# Obsidian 接入指南

本指南详细说明如何将 Obsidian 笔记无缝集成到当前的 Nuxt 3 博客项目中。

## 1. 原理概述

我们将使用 **Nuxt Content v2** 模块作为核心引擎。该模块允许 Nuxt 直接读取、解析和渲染 Markdown 文件。
Obsidian 本质上是一个 Markdown 编辑器，因此我们可以直接将 Obsidian 的 Vault（或其中特定的文件夹）作为 Nuxt 的数据源。

## 2. 接入步骤

### 第一步：安装依赖

项目需要安装 `@nuxt/content` 模块：

```bash
npm install @nuxt/content --save-dev
```

### 第二步：配置 Nuxt

在 `nuxt.config.ts` 中启用模块：

```typescript
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/content' // 新增
  ],
  content: {
    // 配置选项（可选）
    highlight: {
      theme: 'github-dark'
    }
  }
})
```

### 第三步：建立内容目录

在项目根目录下创建 `content` 文件夹。
这是 Obsidian 笔记存放的地方。

```bash
mkdir content
```

### 第四步：Obsidian 同步流程

你有两种方式将笔记同步到博客：

1.  **直接编辑**：将 Obsidian 的 Vault 根目录直接设置为项目的 `content` 文件夹（适合本地写作）。
2.  **Git 同步**：
    *   在 Obsidian 中使用 `Obsidian Git` 插件将笔记推送到 GitHub。
    *   在博客项目中通过 Git Submodule 或 CI/CD 流水线拉取笔记到 `content` 目录。

### 第五步：前端页面开发

我们需要创建专门的路由来展示博客文章，与现有的 Reveal.js 首页共存。

1.  **文章列表页** (`pages/blog/index.vue`): 展示所有文章的列表。
2.  **文章详情页** (`pages/blog/[...slug].vue`): 渲染具体的 Markdown 文章内容。

## 3. 目录结构示例

```
/
├── content/               <-- Obsidian 笔记存放处
│   ├── article-1.md
│   ├── tech/
│   │   └── vue3-guide.md
│   └── about.md
├── pages/
│   ├── [...slug].vue      <-- 现有的 Reveal.js 首页
│   └── blog/              <-- 新增博客板块
│       ├── index.vue      <-- 文章列表
│       └── [...slug].vue  <-- 文章详情
└── nuxt.config.ts
```

## 4. 路由策略

*   访问 `/` 或 `/projects`：进入炫酷的 Reveal.js 演示模式。
*   访问 `/blog`：进入传统博客文章列表。
*   访问 `/blog/article-1`：阅读具体的 Obsidian 笔记。

---
**开始实施**：接下来的步骤将自动执行上述代码修改。
