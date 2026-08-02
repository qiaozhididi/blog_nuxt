# 博客全文搜索 设计规范

> 日期：2026-08-02
> 状态：已确认

## 目标

为博客列表页添加 client-side 全文搜索功能：
- 搜索框位于列表页顶部，输入时实时过滤下方文章列表
- 搜索范围：文章标题（title）+ 描述（description）+ 正文纯文本（body AST 提取）
- 匹配关键词在结果中高亮显示
- 零依赖，自实现（4 篇文章 64K 内容，无需搜索库）

## 背景

- 项目部署在 GitHub Pages（静态托管），无法运行 server route，只能 client-side 搜索
- 现有 `pages/blog/index.vue` 用 `queryCollection('blog').all()` 加载文章列表
- @nuxt/content v3 返回的 `body` 是 AST 结构（非纯文本），需递归遍历提取文本
- 文章少（4 篇，~64K），自实现搜索完全够用

## 技术方案

### 1. body AST 纯文本提取

@nuxt/content v3 的 body 是类 AST 结构，节点包含 `type`（`'text'`、`'element'` 等）和 `children`。递归遍历 `type === 'text'` 的节点提取 `value`：

```ts
function extractPlainText(node: any): string {
  if (!node) return ''
  if (node.type === 'text') return node.value || ''
  if (Array.isArray(node.children)) return node.children.map(extractPlainText).join('')
  return ''
}
```

### 2. 搜索逻辑（computed 实时过滤）

```ts
const searchQuery = ref('')

// 预处理：每篇文章的 _searchText（title + description + body 纯文本，小写）
const searchableList = computed(() =>
  (list.value || []).map(a => ({
    ...a,
    _searchText: [a.title || '', a.description || '', extractPlainText(a.body)].join(' ').toLowerCase()
  }))
)

// 实时过滤：空 query 返回全部，否则按 _searchText.includes(q) 过滤
const filteredList = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list.value
  return searchableList.value.filter(a => a._searchText.includes(q))
})
```

### 3. 关键词高亮（XSS 安全）

对 title/description 做高亮：先转义 HTML 特殊字符，再用 `<mark>` 包裹匹配项。内容来自 Markdown 文章（非用户输入），但仍转义以防 frontmatter 含特殊字符。

```ts
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]!))
}

function highlight(text: string, query: string): string {
  const escaped = escapeHtml(text || '')
  const q = query.trim()
  if (!q) return escaped
  // 转义正则特殊字符，避免 query 含 . * + ? 等导致 RegExp 报错
  const pattern = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return escaped.replace(
    new RegExp(`(${pattern})`, 'gi'),
    '<mark class="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5">$1</mark>'
  )
}
```

### 4. UI（搜索框 + 实时过滤 + 空结果）

搜索框位于列表页标题下方，双主题适配：

```html
<input
  v-model="searchQuery"
  type="text"
  placeholder="搜索文章..."
  class="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
>
```

- `v-for` 遍历 `filteredList`（替代 `list`）
- title/description 用 `v-html="highlight(...)"` 渲染高亮
- 空结果显示"无匹配文章"

## 实现步骤清单

### Task 1: 搜索逻辑 + 纯文本提取

**Files:**
- Modify: `pages/blog/index.vue`（`<script setup>` 部分）

**步骤:**

1. **添加 `extractPlainText` 函数**：递归遍历 body AST 提取纯文本

```ts
// 从 @nuxt/content body AST 递归提取纯文本（type=text 节点的 value）
function extractPlainText(node: any): string {
  if (!node) return ''
  if (node.type === 'text') return node.value || ''
  if (Array.isArray(node.children)) return node.children.map(extractPlainText).join('')
  return ''
}
```

2. **添加 `searchQuery` ref + `searchableList` + `filteredList` computed**

```ts
const searchQuery = ref('')

// 预处理：每篇文章的可搜索文本（title + description + body 纯文本，小写）
const searchableList = computed(() =>
  (list.value || []).map(a => ({
    ...a,
    _searchText: [a.title || '', a.description || '', extractPlainText(a.body)].join(' ').toLowerCase()
  }))
)

// 实时过滤：空 query 返回全部
const filteredList = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list.value
  return searchableList.value.filter(a => a._searchText.includes(q))
})
```

### Task 2: 高亮函数

**Files:**
- Modify: `pages/blog/index.vue`（`<script setup>` 部分）

**步骤:**

1. **添加 `escapeHtml` + `highlight` 函数**

```ts
// XSS 防护：转义 HTML 特殊字符
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]!))
}

// 高亮匹配关键词：先转义，再用 <mark> 包裹匹配项
function highlight(text: string, query: string): string {
  const escaped = escapeHtml(text || '')
  const q = query.trim()
  if (!q) return escaped
  const pattern = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return escaped.replace(
    new RegExp(`(${pattern})`, 'gi'),
    '<mark class="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5">$1</mark>'
  )
}
```

### Task 3: 搜索 UI + 实时过滤

**Files:**
- Modify: `pages/blog/index.vue`（`<template>` 部分）

**步骤:**

1. **在标题下方添加搜索框**

现有结构：
```html
<div class="flex justify-between items-center mb-12">
  <h1>我的 Obsidian 笔记</h1>
  <NuxtLink to="/">返回首页</NuxtLink>
</div>
```

改为（搜索框紧跟标题区下方）：
```html
<div class="flex justify-between items-center mb-8">
  <h1>我的 Obsidian 笔记</h1>
  <NuxtLink to="/">返回首页</NuxtLink>
</div>

<!-- 搜索框 -->
<div class="mb-8">
  <input
    v-model="searchQuery"
    type="text"
    placeholder="搜索文章..."
    class="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
  >
</div>
```

2. **修改 `v-for` 遍历 `filteredList`**

现有：
```html
<NuxtLink v-for="article in list" ...>
  <h2 class="...">{{ article.title || article.path }}</h2>
  <p class="...">{{ article.description || '暂无描述' }}</p>
```

改为（用 `filteredList` + `v-html` 高亮）：
```html
<NuxtLink v-for="article in filteredList" ...>
  <h2 class="..." v-html="highlight(article.title || article.path, searchQuery)"></h2>
  <p class="..." v-html="highlight(article.description || '暂无描述', searchQuery)"></p>
```

3. **空结果处理**

在 `v-else-if="!list || list.length === 0"` 之后，添加搜索无结果分支：

```html
<!-- 搜索无结果 -->
<div v-else-if="searchQuery && filteredList.length === 0" class="text-center text-gray-500 dark:text-gray-500 py-12">
  <p>无匹配"<span class="font-medium">{{ searchQuery }}</span>"的文章</p>
</div>
```

注意：现有条件分支顺序需调整：
- `v-if="pending"` → 加载中
- `v-else-if="error"` → 加载失败
- `v-else-if="!list || list.length === 0"` → 无文章
- `v-else-if="searchQuery && filteredList.length === 0"` → 搜索无结果（新增）
- `v-else` → 正常列表（遍历 `filteredList`）

### Task 4: 验证与提交

**步骤:**

1. **启动 dev server 验证:**
   - 空搜索：显示全部文章
   - 输入关键词：实时过滤，标题/描述高亮
   - 搜索正文关键词（如 "RAG"）：匹配正文包含该词的文章
   - 无结果：显示"无匹配"
   - 清空搜索：恢复全部文章
   - 亮/暗主题下高亮样式正确

2. **SSG 构建验证:**
   - `npm run generate` 成功

3. **提交:**
   - `新增：博客全文搜索（列表页搜索框 + 实时过滤 + 关键词高亮）`

## 边界情况

- **空搜索**：`searchQuery` 为空时 `filteredList` 返回全部文章
- **大小写**：`_searchText` 和 `q` 都 `toLowerCase()`，大小写不敏感
- **正则特殊字符**：`highlight` 中转义 `.*+?^${}()|[]\` 等，避免 RegExp 报错
- **XSS**：`escapeHtml` 转义 `&<>"'`，内容来自 Markdown 非用户输入
- **body 为空**：`extractPlainText` 处理 null/undefined，返回空字符串
- **搜索正文词**：`_searchText` 包含 body 纯文本，可匹配正文内容

## 不做的功能（YAGNI）

- 搜索库（Minisearch/FlexSearch）——4 篇文章无需
- 搜索结果相关度排序——包含即匹配
- 全局搜索/独立搜索页——列表页内搜索足够
- 搜索历史/书签
- 分词搜索（中文分词）——简单 `includes` 匹配足够
- 防抖——computed 实时过滤，4 篇文章无性能问题

## 涉及文件清单

**修改:**
- `pages/blog/index.vue`（搜索框 + 过滤逻辑 + 高亮 + 空结果）

无新建文件，无新依赖。

## 测试策略

1. **空搜索**：显示全部 4 篇文章
2. **标题搜索**：输入 "RAG" → 匹配 AI_RAG 文章，标题高亮
3. **正文搜索**：输入 "LangChain" → 匹配正文含该词的文章
4. **无结果**：输入 "xyz123" → 显示"无匹配"
5. **大小写**：输入 "rag" → 匹配 "RAG"（大小写不敏感）
6. **特殊字符**：输入 "C++" → 不报错（正则转义）
7. **主题适配**：亮/暗模式下搜索框和高亮样式正确
8. **SSG**：`npm run generate` 构建成功
