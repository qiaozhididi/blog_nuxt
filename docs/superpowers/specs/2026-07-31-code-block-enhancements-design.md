# 代码块复制按钮 + 语言标签 设计文档

- **日期**：2026-07-31
- **作者**：assistant + 用户协作
- **状态**：待实现
- **子项目序号**：3️⃣（第一档三个推荐功能中的第 3 个，TOC+进度条已完成）

---

## 1. 背景

本项目是部署在 GitHub Pages 的 Nuxt 3 博客，使用 @nuxt/content v3 管理 Markdown 文章。博客详情页 `pages/blog/[...slug].vue` 用 `prose prose-invert prose-lg` 渲染 Markdown。

当前代码块（`<pre>`）存在两个问题：

1. **无复制按钮**：读者想复制代码需手动选中，长代码体验差
2. **无语言标识**：Markdown 代码块全是裸围栏（``` 无语言），渲染为 `<pre class="language-text">`，**无语法高亮**，读者无法判断代码语言

@nuxt/content v3 的 ContentRenderer 渲染代码块为 `<pre class="language-xxx"><code>...</code></pre>`。v3 **无 ProsePre 自定义组件机制**（runtime 仅 ContentRenderer），需用 composable + DOM 注入。

## 2. 目标

- 为每个代码块右上角添加复制按钮，点击复制代码到剪贴板
- 复制后有"✓ 已复制"绿色提示反馈，2 秒恢复
- 为代码块左上角添加语言标签（从 `language-xxx` 提取）
- 给现有 Markdown 裸围栏补语言标识（bash/text/python），启用 Shiki 语法高亮
- 零新依赖，复用现有暗色 glass 风格

## 3. 非目标

- 不实现代码块折叠/展开（YAGNI）
- 不实现代码行号
- 不实现代码主题切换（跟随暗色）
- 不实现下载代码文件
- 不实现 toast 全局通知（按钮内反馈足够）
- 不修改行内 `code`（`.prose code`），仅处理 `pre` 代码块
- 不引入 @vueuse/core 等新依赖

## 4. 方案选择

| 方案 | 描述 | 取舍 |
|------|------|------|
| **A. composable + DOM 注入 + 补 markdown 语言** ⭐ | composable 查询 pre 注入按钮/标签 + 给现有 markdown 补语言 | 语言标签有数据 + 顺便启用 Shiki 高亮 |
| B. 只做 composable，不修 markdown | 当前全 text，语言标签不显示 | 功能"看似无效" |
| C. 只做复制按钮（YAGNI 语言标签）| 范围最小但不满足"语言标签"需求 | 不完整 |

**选定方案 A**：语言标签需要语言数据，顺便补语言既让标签生效又启用语法高亮，4 篇文章代码块数量可控（约 17 个）。

## 5. 详细设计

### 5.1 文件结构

```
新增：
  composables/useCodeBlockEnhancer.ts   ← 查询 pre，注入 header（语言标签+复制按钮），绑定复制
修改：
  pages/blog/[...slug].vue              ← 调用 composable
  content/blog/AI Canvas Flow 技术文档.md  ← 裸围栏补 ```text（ASCII 图）
  content/blog/openclaw部署笔记.md      ← 裸围栏补 ```bash（shell 命令）
  content/blog/AI_RAG项目面试题.md      ← 裸围栏按内容补语言（已有 1 个 python）
```

无需修改 `nuxt.config.ts`、`app.vue`、`content.config.ts`、`components/`。

### 5.2 关键决策（已确认）

| # | 决策 | 选择 |
|---|------|------|
| 1 | 实现方式 | composable + DOM 注入（v3 无 ProsePre）|
| 2 | 复制按钮位置 | 代码块右上角（absolute top-2 right-2）|
| 3 | 复制按钮显示 | 桌面 hover 显示（group-hover），移动端常显 |
| 4 | 复制反馈 | 按钮 3 态切换："复制"→"✓ 已复制"（绿色），2 秒恢复 |
| 5 | 语言标签位置 | 代码块左上角（absolute top-2 left-2）|
| 6 | 语言标签数据 | 从 `pre.className` 的 `language-xxx` 提取 |
| 7 | language-text | 不显示语言标签（裸围栏无意义）|
| 8 | 代码内容获取 | `pre.textContent`（含 code 标签文本，Vue 注释不计）|
| 9 | markdown 补语言 | 按内容补 bash/text/python |
| 10 | 防重复注入 | `pre.dataset.enhanced = 'true'` 标记 |

### 5.3 composable 规格（`composables/useCodeBlockEnhancer.ts`）

```ts
export function useCodeBlockEnhancer(
  container: Ref<HTMLElement | null>,
  trigger?: () => unknown  // 路由/数据变化触发器，路由切换时重新注入
) {
  function enhance() {
    const el = container.value
    if (!el) return
    el.querySelectorAll('pre').forEach(pre => {
      if (pre.dataset.enhanced) return
      pre.dataset.enhanced = 'true'
      // 1. 提取语言
      const lang = pre.className.match(/language-(\w+)/)?.[1] || ''
      // 2. 包装 pre：在 pre 外加 relative group 容器（用 wrapper 包裹）
      // 3. 注入语言标签（lang 非 text 时）
      // 4. 注入复制按钮 + 绑定 click
    })
  }
  // container mount 后首次注入
  watch(container, () => nextTick(enhance), { immediate: true })
  // 路由切换时 DOM 重建，container ref 不变（指向最外层 div），需 trigger 触发重新注入
  if (trigger) watch(trigger, () => nextTick(enhance))
}
```

**SPA 路由切换**：`scrollContainer` ref 指向最外层 div（路由切换不销毁），`watch(container)` 不触发。需传入 `trigger`（如 `() => route.path`）确保路由切换后新 pre（无 `dataset.enhanced`）被注入。

### 5.4 复制按钮 + "复制成功"反馈（3 态）

按钮状态：
- **默认态**：显示"复制"文字（或图标 + 文字），`text-gray-300`
- **hover 态**：`hover:text-white hover:bg-gray-600/80`
- **已复制态**：点击后，文字变"✓ 已复制"，颜色 `text-green-400`，2 秒后恢复默认态

实现：
```ts
const btn = document.createElement('button')
btn.className = '...'
btn.textContent = '复制'
btn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(pre.textContent || '')
    btn.textContent = '✓ 已复制'
    btn.classList.add('text-green-400')
    btn.classList.remove('text-gray-300')
    setTimeout(() => {
      btn.textContent = '复制'
      btn.classList.remove('text-green-400')
      btn.classList.add('text-gray-300')
    }, 2000)
  } catch {
    // 降级：execCommand 或提示失败
    btn.textContent = '复制失败'
    setTimeout(() => { btn.textContent = '复制' }, 2000)
  }
})
```

**样式**：glass 玻璃态，`bg-gray-700/80 backdrop-blur px-2 py-1 rounded text-xs`，与现有 `.btn-primary` 风格一致。

### 5.5 语言标签

```ts
const langMap: Record<string, string> = {
  bash: 'Bash',
  sh: 'Shell',
  python: 'Python',
  py: 'Python',
  javascript: 'JavaScript',
  js: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  html: 'HTML',
  css: 'CSS',
  sql: 'SQL',
  text: '',  // 不显示
}
const label = langMap[lang] ?? (lang && lang !== 'text' ? lang : '')
if (label) {
  const tag = document.createElement('span')
  tag.textContent = label
  tag.className = 'absolute top-2 left-2 text-xs text-gray-400 ...'
  // 插入
}
```

无语言或 text → 不显示标签。

### 5.6 注入的 DOM 结构

composable 将原生 `<pre>` 包装为：
```html
<div class="code-block group relative">
  <span class="absolute top-2 left-2 ...">Bash</span>  <!-- 语言标签，无则不渲染 -->
  <button class="absolute top-2 right-2 ...">复制</button>  <!-- 复制按钮 -->
  <pre class="language-bash"><code>...</code></pre>
</div>
```

注意：包装 pre 需用 `document.createElement('div')` + `parentNode.insertBefore(wrapper, pre)` + `wrapper.appendChild(pre)`。pre 的 `relative` 由 wrapper 提供，pre 本身保持原样。

### 5.7 给 markdown 补语言标识

| 文章 | 代码块内容 | 补语言 |
|------|-----------|--------|
| AI Canvas Flow 技术文档.md | ASCII 架构图 | ` ```text ` |
| openclaw部署笔记.md | shell 命令（brew/curl/node）| ` ```bash ` |
| AI_RAG项目面试题.md | 已有 1 个 python，其余按内容 | python/text |
| hello.md | 无代码块 | 无需改 |

补语言后 @nuxt/content v3 的 Shiki 自动启用语法高亮（额外收益）。

### 5.8 pages/blog/[...slug].vue 集成

在 `<script setup>` 调用：
```js
const route = useRoute()  // 已存在
const scrollContainer = ref(null)  // 已存在（TOC+进度条声明）
useCodeBlockEnhancer(scrollContainer, () => route.path)
```

`scrollContainer` 与 `route` 均已存在（TOC+进度条 task 声明），直接复用。`() => route.path` 作为 trigger 确保路由切换后重新注入新 pre。

### 5.9 样式细节

- wrapper `code-block group relative`：提供相对定位 + group hover
- 复制按钮 `opacity-0 group-hover:opacity-100 transition-opacity`（桌面 hover 显示）
- 移动端（`lg:hidden`? 不，移动端应常显）：用 `md:opacity-0 md:group-hover:opacity-100`，默认（移动端）常显，md+ hover 显示
- pre 保持现有 `.prose pre { bg-gray-900 border }`

## 6. 错误处理 / 边界情况

| 场景 | 处理 |
|------|------|
| 无代码块的文章（hello） | `querySelectorAll('pre')` 为空，无操作 |
| `language-text` | 不显示语言标签，仅复制按钮 |
| 重复注入（路由切换） | `dataset.enhanced` 防重复；新 pre 是新 DOM 节点自动注入 |
| clipboard API 不支持（HTTP/老浏览器） | try/catch 降级 `document.execCommand('copy')`，失败显示"复制失败" |
| pre.textContent 含 Vue 注释 | Vue `<!--[-->` 是 HTML 注释，不计入 textContent，安全 |
| SSR/SSG | composable 在 watch/onMounted 执行，SSG 产物是原生 pre（无按钮），hydration 后注入 |
| 行内 code | 只处理 `pre`，不碰 `.prose code` 行内 |
| 路由切换 DOM 重建 | 新 pre 无 enhanced 标记，自动注入；旧 wrapper 随 DOM 销毁 |

## 7. 测试策略

项目无测试框架，手动验证（dev server + MCP Chrome DevTools）。

### 7.1 本地验证

`npm run dev`，访问 4 篇文章：
- `/blog/ai-canvas-flow`：ASCII 图代码块（text，无语言标签）+ 复制按钮
- `/blog/ai_rag`：python 代码块（有语言标签"Python"+ 高亮）+ 复制
- `/blog/openclaw`：bash 代码块（有语言标签"Bash"+ 高亮）+ 复制
- `/blog/hello`：无代码块，无变化

### 7.2 交互验证

- 点击复制按钮 → 文字变"✓ 已复制"绿色 → 2 秒恢复"复制"
- 粘贴验证剪贴板内容正确
- 桌面端 hover 显示按钮，移动端常显
- 路由切换文章后新代码块正确注入

### 7.3 SSG 验证

`npm run generate`，检查 `.output/public/blog/ai-canvas-flow/index.html` 含原生 `<pre>`（SSG 无按钮，hydration 后注入）。

## 8. 验收标准

- [ ] 新增 `composables/useCodeBlockEnhancer.ts`，查询 pre 注入语言标签 + 复制按钮
- [ ] `pages/blog/[...slug].vue` 调用 composable
- [ ] 复制按钮点击复制代码到剪贴板
- [ ] 复制后"✓ 已复制"绿色反馈，2 秒恢复
- [ ] 语言标签显示（bash/python），text 不显示
- [ ] 现有 markdown 代码块补语言标识
- [ ] 补语言后 Shiki 语法高亮生效
- [ ] 桌面 hover 显示按钮，移动端常显
- [ ] 路由切换正确注入，无重复
- [ ] clipboard API 降级处理
- [ ] `npm run generate` 成功

## 9. 风险与权衡

| 风险 | 缓解 |
|------|------|
| DOM 注入与 Vue 响应式冲突 | composable 在 watch/nextTick 后操作，不触碰 Vue 管辖的响应式数据 |
| 路由切换残留按钮 | 新 DOM 重建，旧 wrapper 自动销毁；dataset.enhanced 防重复 |
| clipboard API 兼容性 | try/catch + execCommand 降级 |
| Shiki 高亮补语言后样式异常 | generate 验证，prose 主题已支持高亮 |
| pre 包装破坏现有 prose 样式 | wrapper 只加 relative + group，pre 保持原 class |

## 10. 后续可能的扩展（非本期范围）

- 代码块折叠/展开
- 代码行号
- 代码主题切换
- 下载代码文件
- toast 全局复制通知
- "返回顶部"按钮（与其他功能并存）
