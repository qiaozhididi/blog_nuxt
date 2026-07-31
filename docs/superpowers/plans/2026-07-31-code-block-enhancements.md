# 代码块复制按钮 + 语言标签 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为博客详情页每个代码块注入"复制按钮 + 语言标签"，并给现有 Markdown 裸围栏补语言标识启用 Shiki 语法高亮。

**Architecture:** 通过 composable（`useCodeBlockEnhancer`）在客户端 DOM 层查询 `<pre>` 节点，包装为 `<div class="code-block group relative">` 并注入语言标签和复制按钮。复制状态反馈采用 CSS `@keyframes` 动画（2 秒）+ `animationend` 事件清理 class，**不使用 JS 定时器**。Markdown 文章补语言后 @nuxt/content v3 的 Shiki 自动启用语法高亮。

**Tech Stack:** Nuxt 3、Vue 3 Composition API、TypeScript、Tailwind CSS、@nuxt/content v3（Shiki）、原生 Clipboard API。

## Global Constraints

- Nuxt 3.x，不升级到 Nuxt 4
- 零新依赖（复用现有 Clipboard API + CSS 动画）
- 复制按钮 2 秒恢复反馈必须用 CSS `@keyframes` + `animationend` 实现，禁止 `setTimeout`
- `language-text` 不显示语言标签（裸围栏无意义）
- composable 在 `watch`/`nextTick` 后操作 DOM，不触碰 Vue 响应式数据
- 防重复注入：`pre.dataset.enhanced = 'true'`
- Markdown 补语言后启用 Shiki 语法高亮
- 暗色 glass 风格，与现有 `.btn-primary` 一致（`bg-gray-700/80 backdrop-blur`）
- Git 提交信息用中文

---

## 文件结构

```
新增：
  composables/useCodeBlockEnhancer.ts   ← DOM 查询 pre，注入语言标签 + 复制按钮，绑定复制
修改：
  pages/blog/[...slug].vue              ← 调用 composable + 添加增强 CSS
  content/blog/AI Canvas Flow 技术文档.md  ← 7 个裸围栏补 ```text（ASCII 图）
  content/blog/openclaw部署笔记.md      ← 7 个裸围栏补 ```bash（shell 命令）
  content/blog/AI_RAG项目面试题.md      ← 4 个裸围栏补 ```text / ```json
```

无需修改 `nuxt.config.ts`、`app.vue`、`content.config.ts`、`components/`。

---

## Task 1: 创建 useCodeBlockEnhancer composable + 集成到博客详情页

**Files:**
- Create: `composables/useCodeBlockEnhancer.ts`
- Modify: `pages/blog/[...slug].vue`（script setup 调用 + style 增强 CSS）

**Interfaces:**
- Consumes: `pages/blog/[...slug].vue` 已有的 `scrollContainer` ref（`Ref<HTMLElement | null>`）和 `route`（`useRoute()` 返回值）
- Produces: `useCodeBlockEnhancer(container: Ref<HTMLElement | null>, trigger?: () => unknown)` 函数，自动在 container 内查询 `<pre>` 注入按钮和标签

**关键设计决策：**
1. composable 包装 pre 为 `<div class="code-block group relative">`，pre 保持原 class
2. 语言标签从 `pre.className` 的 `language-xxx` 提取，经 `langMap` 映射为友好名
3. 复制按钮用 `<button class="code-copy-btn"><span class="copy-label"></span></button>`，状态用 CSS class（`.copied`/`.failed`）切换 `::after content`
4. CSS `@keyframes copy-feedback 2s ease`：0%-85% 绿色，100% 恢复；`animationend` 事件 `{ once: true }` 清理 class
5. 桌面端 hover 显示按钮（`.code-block:hover .code-copy-btn`），移动端常显

- [ ] **Step 1: 创建 composables/useCodeBlockEnhancer.ts**

```ts
// composables/useCodeBlockEnhancer.ts
import { nextTick, watch, type Ref } from 'vue'

// 语言标识 → 友好显示名映射；text/空 不显示标签
const langMap: Record<string, string> = {
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
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
  text: '',
  '': '',
}

/**
 * 创建复制按钮并绑定 click 事件
 * 状态切换用 CSS class（.copied/.failed）+ animationend 清理，无 JS 定时器
 */
function createCopyButton(pre: HTMLPreElement): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'code-copy-btn'
  btn.setAttribute('aria-label', '复制代码')

  const label = document.createElement('span')
  label.className = 'copy-label'
  btn.appendChild(label)

  btn.addEventListener('click', async () => {
    try {
      const text = pre.textContent || ''
      // 优先 Clipboard API，降级 execCommand（HTTP/老浏览器）
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      btn.classList.remove('failed')
      btn.classList.add('copied')
      btn.addEventListener('animationend', () => btn.classList.remove('copied'), { once: true })
    } catch {
      btn.classList.remove('copied')
      btn.classList.add('failed')
      btn.addEventListener('animationend', () => btn.classList.remove('failed'), { once: true })
    }
  })

  return btn
}

/**
 * 增强单个 pre：包装 wrapper + 注入语言标签 + 注入复制按钮
 * 防重复：dataset.enhanced 标记
 */
function enhancePre(pre: HTMLPreElement) {
  if (pre.dataset.enhanced) return
  pre.dataset.enhanced = 'true'

  // 1. 提取语言
  const lang = pre.className.match(/language-(\w+)/)?.[1] || ''

  // 2. 包装 pre：创建 wrapper，插入到 pre 之前，再移 pre 进 wrapper
  const wrapper = document.createElement('div')
  wrapper.className = 'code-block group relative'
  pre.parentNode?.insertBefore(wrapper, pre)
  wrapper.appendChild(pre)

  // 3. 注入语言标签（非 text/空 时）
  const label = langMap[lang] ?? (lang && lang !== 'text' ? lang : '')
  if (label) {
    const tag = document.createElement('span')
    tag.textContent = label
    tag.className = 'code-lang-tag'
    wrapper.appendChild(tag)
  }

  // 4. 注入复制按钮
  const btn = createCopyButton(pre)
  wrapper.appendChild(btn)
}

/**
 * 代码块增强 composable
 * @param container 滚动容器 ref（指向博客详情页最外层 div）
 * @param trigger 路由/数据变化触发器，路由切换时 DOM 重建需重新注入
 */
export function useCodeBlockEnhancer(
  container: Ref<HTMLElement | null>,
  trigger?: () => unknown,
) {
  function enhance() {
    const el = container.value
    if (!el) return
    el.querySelectorAll('pre').forEach((pre) => {
      enhancePre(pre as HTMLPreElement)
    })
  }

  // container mount 后首次注入
  watch(container, () => nextTick(enhance), { immediate: true })
  // 路由切换时 DOM 重建，container ref 不变（指向最外层 div），需 trigger 触发重新注入
  if (trigger) watch(trigger, () => nextTick(enhance))
}
```

- [ ] **Step 2: 在 pages/blog/[...slug].vue 的 script setup 调用 composable**

修改 `pages/blog/[...slug].vue`，在 `const { data } = await useAsyncData(...)` 之后、`useHead` 之前添加调用。

定位现有代码（`pages/blog/[...slug].vue:45`）：
```js
const { data } = await useAsyncData(`page-data-${route.path}`, () => queryCollection('blog').path(route.path).first());
```

在其后添加：
```js

// 代码块增强：注入复制按钮 + 语言标签（DOM 层，hydration 后执行）
// scrollContainer 与 route 已声明，直接复用；() => route.path 作为路由切换 trigger
useCodeBlockEnhancer(scrollContainer, () => route.path)
```

- [ ] **Step 3: 在 pages/blog/[...slug].vue 的 `<style>` 块追加代码块增强 CSS**

在 `pages/blog/[...slug].vue` 现有 `<style>` 块末尾（`.prose img { ... }` 之后、`</style>` 之前）追加：

```css

/* ===== 代码块增强：语言标签 + 复制按钮 ===== */
.code-block {
  position: relative;
}

/* 语言标签：左上角 */
.code-lang-tag {
  position: absolute;
  top: 0.5rem;
  left: 0.75rem;
  font-size: 0.75rem;
  color: rgba(156, 163, 175, 0.8);
  font-family: 'Fira Code', 'Fira Sans', monospace;
  pointer-events: none;
  z-index: 1;
  user-select: none;
}

/* 复制按钮：右上角 glass 风格 */
.code-copy-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  color: rgba(209, 213, 219, 0.9);
  background: rgba(55, 65, 81, 0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(75, 85, 99, 0.5);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: opacity 0.2s ease, color 0.2s ease, background 0.2s ease;
  z-index: 1;
}

/* 移动端常显，桌面端 hover 显示 */
.code-copy-btn { opacity: 1; }
@media (min-width: 768px) {
  .code-copy-btn { opacity: 0; }
  .code-block:hover .code-copy-btn { opacity: 1; }
}

.code-copy-btn:hover {
  color: white;
  background: rgba(75, 85, 99, 0.95);
}

/* 按钮文字用 ::after content 切换，避免操作 DOM 文本节点 */
.code-copy-btn .copy-label::after { content: '复制'; }
.code-copy-btn.copied .copy-label::after { content: '✓ 已复制'; }
.code-copy-btn.failed .copy-label::after { content: '复制失败'; }

/* CSS 动画控制 2 秒状态反馈，animationend 事件清理 class（无 setTimeout） */
.code-copy-btn.copied { animation: copy-feedback 2s ease; }
.code-copy-btn.failed { animation: copy-fail 2s ease; }

@keyframes copy-feedback {
  0%, 85% { color: #4ade80; }   /* 绿色持续 85% */
  100% { color: inherit; }      /* 恢复 */
}

@keyframes copy-fail {
  0%, 85% { color: #f87171; }   /* 红色持续 85% */
  100% { color: inherit; }
}
```

- [ ] **Step 4: 启动 dev server 验证 AI_RAG 文章（已有 1 个 python 代码块）**

Run: `npm run dev`
访问: `http://localhost:3000/blog/ai_rag项目面试题`（或实际 slug）

验证清单：
- [ ] 滚动到 Q8（`with_structured_output`）的 python 代码块
- [ ] 代码块左上角显示"Python"语言标签
- [ ] 代码块右上角显示"复制"按钮
- [ ] Shiki 语法高亮生效（关键字彩色）
- [ ] 点击"复制"按钮 → 文字变"✓ 已复制"绿色 → 2 秒后恢复"复制"
- [ ] 粘贴验证剪贴板内容是代码原文
- [ ] 桌面端鼠标移开代码块后按钮消失（hover 显示），移动端常显
- [ ] 其他裸围栏代码块（`language-text`）只有复制按钮，无语言标签

- [ ] **Step 5: 提交**

```bash
git add composables/useCodeBlockEnhancer.ts pages/blog/\[...slug\].vue
git commit -m "feat: 新增代码块复制按钮和语言标签功能

- 创建 useCodeBlockEnhancer composable，DOM 注入复制按钮和语言标签
- 复制状态反馈用 CSS @keyframes 动画，无 JS 定时器
- 移动端常显按钮，桌面端 hover 显示
- 支持 Clipboard API 降级 execCommand"
```

---

## Task 2: 给 Markdown 文章裸围栏补语言标识

**Files:**
- Modify: `content/blog/AI Canvas Flow 技术文档.md`（7 处 ``` → ```text）
- Modify: `content/blog/openclaw部署笔记.md`（7 处 ``` → ```bash）
- Modify: `content/blog/AI_RAG项目面试题.md`（3 处 ``` → ```text，1 处 ``` → ```json）

**Interfaces:**
- Consumes: Task 1 的 composable（语言标签从 `language-xxx` 提取）
- Produces: 补语言后 Shiki 自动启用语法高亮，语言标签显示

**修改原则：**
- 用 Edit 工具逐个替换，每个替换用代码块第一行内容作为唯一上下文
- 只修改开围栏（```\n），不碰闭围栏（单独的 ```）
- 已有语言的代码块（如 ```python）不修改

- [ ] **Step 1: 修改 content/blog/AI Canvas Flow 技术文档.md（7 处补 text）**

逐个执行以下 Edit 操作（每处 old_string 包含围栏后的第一行内容确保唯一）：

| # | old_string（围栏 + 下一行） | new_string |
|---|---------------------------|------------|
| 1 | <code>```<br>┌─────────────────────────────────────────────────────────┐</code> | <code>```text<br>┌─────────────────────────────────────────────────────────┐</code> |
| 2 | <code>```<br>backend/</code> | <code>```text<br>backend/</code> |
| 3 | <code>```<br>frontend/src/</code> | <code>```text<br>frontend/src/</code> |
| 4 | <code>```<br>executeNode(nodeId)</code> | <code>```text<br>executeNode(nodeId)</code> |
| 5 | <code>```<br>executeWorkflow()</code> | <code>```text<br>executeWorkflow()</code> |
| 6 | <code>```<br>User ──┬──< Project (owner)</code> | <code>```text<br>User ──┬──< Project (owner)</code> |
| 7 | <code>```<br>用户操作 → canvasStore 更新状态</code> | <code>```text<br>用户操作 → canvasStore 更新状态</code> |

- [ ] **Step 2: 修改 content/blog/openclaw部署笔记.md（7 处补 bash）**

| # | old_string | new_string |
|---|-----------|------------|
| 1 | <code>```<br>/bin/bash -c "$(curl -fsSL</code> | <code>```bash<br>/bin/bash -c "$(curl -fsSL</code> |
| 2 | <code>```<br>brew install node@22`</code> | <code>```bash<br>brew install node@22`</code> |
| 3 | <code>```<br>node --version  # 应显示</code> | <code>```bash<br>node --version  # 应显示</code> |
| 4 | <code>```<br>brew install ollama</code> | <code>```bash<br>brew install ollama</code> |
| 5 | <code>```<br>curl -fsSL https://openclaw.ai/install.sh</code> | <code>```bash<br>curl -fsSL https://openclaw.ai/install.sh</code> |
| 6 | <code>```<br>npm install -g openclaw@latest</code> | <code>```bash<br>npm install -g openclaw@latest</code> |
| 7 | <code>```<br>openclaw onboard --install-daemon</code> | <code>```bash<br>openclaw onboard --install-daemon</code> |

- [ ] **Step 3: 修改 content/blog/AI_RAG项目面试题.md（3 处补 text，1 处补 json）**

| # | old_string | new_string | 说明 |
|---|-----------|------------|------|
| 1 | <code>```<br>用户查询 → 向量化</code> | <code>```text<br>用户查询 → 向量化</code> | ASCII 流程图 |
| 2 | <code>```<br>chat_cleaner → customer_profiler</code> | <code>```text<br>chat_cleaner → customer_profiler</code> | ASCII 流程图 |
| 3 | <code>```<br>{<br>    "fast":</code> | <code>```json<br>{<br>    "fast":</code> | JSON 配置（注意要包含下一行 `{` 和 `"fast":` 确保唯一，因为单独 `{` 不唯一） |
| 4 | <code>```<br>Content Script (content.js)</code> | <code>```text<br>Content Script (content.js)</code> | ASCII 通信架构图 |

注意：AI_RAG 已有 2 个 ` ```python ` 代码块（Q8 和 Q22），不修改。

- [ ] **Step 4: dev server 验证补语言后效果**

访问三篇文章验证：

**AI Canvas Flow（`/blog/ai-canvas-flow` 或实际 slug）：**
- [ ] 7 个 ASCII 图代码块：左上角无语言标签（text 不显示）
- [ ] 复制按钮正常
- [ ] ASCII 图保持原样（text 不触发语法高亮，避免 ASCII 框线被错误着色）

**openclaw 部署笔记（`/blog/openclaw` 或实际 slug）：**
- [ ] 7 个 shell 命令代码块：左上角显示"Bash"标签
- [ ] Shiki 语法高亮生效（命令、字符串、注释彩色）
- [ ] 复制按钮正常

**AI_RAG 面试题（`/blog/ai_rag` 或实际 slug）：**
- [ ] 3 个 ASCII 图：无语言标签（text）
- [ ] 1 个 JSON 配置块：显示"JSON"标签 + 高亮
- [ ] 2 个 python 代码块：显示"Python"标签 + 高亮
- [ ] 复制按钮正常

- [ ] **Step 5: 提交**

```bash
git add content/blog/
git commit -m "feat: 给现有 Markdown 代码块补语言标识启用 Shiki 高亮

- AI Canvas Flow: 7 个 ASCII 图补 text
- openclaw 部署笔记: 7 个 shell 命令补 bash
- AI_RAG 面试题: 3 个 ASCII 图补 text，1 个 JSON 补 json"
```

---

## Task 3: 路由切换验证 + SSG 构建验证

**Files:**
- 无文件修改，仅验证

**Interfaces:**
- Consumes: Task 1 的 composable + Task 2 的 markdown 补语言

- [ ] **Step 1: 路由切换 SPA 重新注入验证**

dev server 运行中，执行以下导航序列：
1. 访问 `/blog/ai_rag项目面试题`（或实际 slug）
2. 点击页面内"首页"或"博客"导航
3. 再访问 `/blog/openclaw部署笔记`（或实际 slug）
4. 再访问 `/blog/ai-canvas-flow`（或实际 slug）

验证：
- [ ] 每次路由切换后，新文章的代码块都正确注入（语言标签 + 复制按钮）
- [ ] 无重复注入（按钮不会叠加出现两个）
- [ ] `dataset.enhanced` 标记生效（新 pre 是新 DOM 节点，自动注入；旧 wrapper 随 DOM 销毁）

- [ ] **Step 2: clipboard API 降级验证（可选）**

在 Chrome DevTools Console 中：
```js
// 模拟不支持 Clipboard API 的环境
Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
```
然后点击复制按钮，验证：
- [ ] 降级到 `document.execCommand('copy')` 仍能复制成功
- [ ] 显示"✓ 已复制"绿色反馈

恢复：刷新页面。

- [ ] **Step 3: SSG 构建验证**

Run: `npm run generate`
Expected: 构建成功，无错误

验证产物：
- [ ] 检查 `.output/public/blog/` 下各文章 `index.html` 存在
- [ ] 用 `grep` 确认 SSG 产物含原生 `<pre class="language-xxx">`（SSG 无按钮，hydration 后注入）

```bash
grep -l 'language-bash' .output/public/blog/*/index.html
grep -l 'language-python' .output/public/blog/*/index.html
```

预期：openclaw 的 html 含 `language-bash`，AI_RAG 的 html 含 `language-python`。

- [ ] **Step 4: 失败态验证（可选）**

在 Chrome DevTools Console 中：
```js
// 模拟 clipboard 写入失败
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: () => Promise.reject(new Error('mock fail')) },
  configurable: true,
})
```
点击复制按钮，验证：
- [ ] 显示"复制失败"红色反馈，2 秒恢复

恢复：刷新页面。

- [ ] **Step 5: 最终提交（如有验证中发现的修复）**

如果前面步骤发现问题并修复，提交修复：
```bash
git add -A
git commit -m "fix: 代码块增强验证中发现的问题修复"
```

如果无修复，跳过此步。

---

## Self-Review

**1. Spec coverage 核对：**
- ✅ 复制按钮（右上角）→ Task 1 Step 1
- ✅ 语言标签（左上角）→ Task 1 Step 1
- ✅ CSS 动画 2 秒恢复（无 JS 定时器）→ Task 1 Step 1 + Step 3
- ✅ markdown 补语言（bash/text/python/json）→ Task 2
- ✅ Shiki 语法高亮 → Task 2 补语言后自动生效
- ✅ 桌面 hover 显示，移动端常显 → Task 1 Step 3 CSS `@media`
- ✅ 路由切换重新注入 → Task 1 Step 1 `trigger` watch
- ✅ 防重复注入 → Task 1 Step 1 `dataset.enhanced`
- ✅ clipboard API 降级 → Task 1 Step 1 `execCommand` 降级
- ✅ language-text 不显示标签 → Task 1 Step 1 `langMap` text/空 返回 ''
- ✅ SSG 产物是原生 pre → Task 3 Step 3 验证

**2. Placeholder 扫描：** 无 TBD/TODO，所有 step 含完整代码或具体表格。

**3. Type consistency：** `useCodeBlockEnhancer(container: Ref<HTMLElement | null>, trigger?: () => unknown)` 在 Task 1 定义和调用处一致；`scrollContainer` 是 `ref(null)`（Vue 自动推断为 `Ref<HTMLElement | null>`），与签名匹配。

**4. 已知边界情况（spec 第 6 节）：**
- 无代码块文章（hello）→ `querySelectorAll('pre')` 为空，无操作 ✅
- pre.textContent 含 Vue 注释 → Vue `<!--[-->` 是 HTML 注释，不计入 textContent ✅
- SSR/SSG → composable 在 watch 执行，SSG 产物是原生 pre ✅
