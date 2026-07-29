# 文章 TOC 目录 + 阅读进度条 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在博客详情页右侧添加 sticky TOC 目录（h2+h3，点击平滑滚动 + active 高亮），顶部添加 fixed 阅读进度条（3px 紫粉渐变）。

**Architecture:** 两个独立 Vue 组件通过 props 接收博客页滚动容器的 ref。ReadingProgress 用 scroll 事件 + requestAnimationFrame 计算进度百分比；TableOfContents 用 @nuxt/content v3 的 `data.body.toc` 数据 + IntersectionObserver 检测当前可见章节。布局从 `max-w-4xl` 单列改为 `max-w-6xl` flex（主内容 + 右侧 sidebar）。

**Tech Stack:** Nuxt 3.21.9, @nuxt/content v3.15.0, Tailwind CSS 3.4, @tailwindcss/typography 0.5.15, 严格 TypeScript

## Global Constraints

- Nuxt 3.21.9 + @nuxt/content v3.15.0（不升级版本）
- 零新依赖（手写 IntersectionObserver + scroll 监听，**不引入 @vueuse/core**）
- Tailwind CSS 3.4 + @tailwindcss/typography 0.5.15
- `typescript.strict: true`（nuxt.config.ts）
- 暗色主题：`bg-gray-900 text-white`，`prose prose-invert prose-lg`
- 站点 URL 前缀：`https://qzfrato.github.io/blog_nuxt`
- git commit message 用**中文简短**描述
- **不修改** `content.config.ts` / `nuxt.config.ts` / `app.vue`
- SSG 部署，每个 task 用 `npm run generate` 验证产物
- 项目无测试框架（package.json 无 vitest/jest），采用**手动验证**（dev server + 浏览器）代替单元测试
- Nuxt auto-import：`ref` / `watch` / `onBeforeUnmount` / `nextTick` 无需显式 import

---

## File Structure

```
新增：
  components/ReadingProgress.vue   ← 顶部 fixed 进度条（3px，紫粉渐变，rAF 节流）
  components/TableOfContents.vue    ← 右侧 sticky TOC（h2+h3，active 高亮，点击滚动）

修改：
  pages/blog/[...slug].vue          ← 加 scrollContainer ref；集成两组件；布局改 max-w-6xl flex；加 scroll-mt-8
```

**组件边界**：
- `ReadingProgress`：纯展示 + scroll 监听。Props: `container: HTMLElement | null`。无外部依赖。
- `TableOfContents`：渲染 toc 数据 + IntersectionObserver。Props: `container: HTMLElement | null`, `toc: { links: TocLink[] } | undefined | null`。
- `pages/blog/[...slug].vue`：提供 `scrollContainer` ref 与 `data.body.toc`，传给两个子组件。

---

## Task 1: ReadingProgress 组件 + 集成到博客页

**Files:**
- Create: `components/ReadingProgress.vue`
- Modify: `pages/blog/[...slug].vue`

**Interfaces:**
- Consumes: 无（独立组件）
- Produces: `ReadingProgress` 组件（props: `container: HTMLElement | null`）；`pages/blog/[...slug].vue` 暴露 `scrollContainer` ref 供 Task 2 复用

- [ ] **Step 1: 创建 `components/ReadingProgress.vue`**

完整文件内容：

```vue
<script setup lang="ts">
const props = defineProps<{
  container: HTMLElement | null
}>()

const progress = ref(0)
let rafId: number | null = null

function onScroll() {
  if (rafId !== null) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    const el = props.container
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    // scrollHeight <= clientHeight（无滚动空间）时进度为 0，避免 NaN
    progress.value = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0
  })
}

function bind(el: HTMLElement | null) {
  if (!el) return
  el.addEventListener('scroll', onScroll, { passive: true })
  onScroll() // 初始化进度（直接读，不经过 rAF）
}

function unbind(el: HTMLElement | null) {
  if (!el) return
  el.removeEventListener('scroll', onScroll)
}

// container 在 onMounted 后才有值，用 watch 绑定
watch(() => props.container, (el, oldEl) => {
  if (oldEl) unbind(oldEl)
  bind(el)
}, { immediate: true })

onBeforeUnmount(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
  unbind(props.container)
})
</script>

<template>
  <div
    class="fixed top-0 left-0 right-0 z-50 h-[3px] bg-gray-800/50"
    role="progressbar"
    aria-label="阅读进度"
    :aria-valuenow="Math.round(progress * 100)"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div
      class="h-full bg-gradient-to-r from-purple-400 to-pink-600 transition-[width] duration-75"
      :style="{ width: (progress * 100).toFixed(2) + '%' }"
    />
  </div>
</template>
```

- [ ] **Step 2: 修改 `pages/blog/[...slug].vue` — template 加 scrollContainer ref + ReadingProgress**

将 template 第 2 行滚动容器加 `ref="scrollContainer"`，并在其后插入 `<ReadingProgress>`。

修改前（`pages/blog/[...slug].vue:1-3`）：
```html
<template>
  <div class="h-screen overflow-y-auto bg-gray-900 text-white p-8">
    <div class="max-w-4xl mx-auto">
```

修改后：
```html
<template>
  <div ref="scrollContainer" class="h-screen overflow-y-auto bg-gray-900 text-white p-8">
    <ReadingProgress :container="scrollContainer" />
    <div class="max-w-4xl mx-auto">
```

- [ ] **Step 3: 修改 `pages/blog/[...slug].vue` — script 声明 scrollContainer ref**

在 `<script setup>` 开头（`const route = useRoute()` 之前）加：

```js
// 滚动容器 ref：传给 ReadingProgress / TableOfContents，监听滚动与 IntersectionObserver
// 注意：本文件 <script setup> 未声明 lang="ts"，用 ref(null) 避免 TS 类型注解；
// Vue 会在 mounted 后自动将 DOM 元素赋值给 scrollContainer.value
const scrollContainer = ref(null)
```

子组件 props 类型为 `HTMLElement | null`，`ref(null)` 的 unwrap 值 `null` 赋值给 `HTMLElement | null` 合法，typecheck 通过。

- [ ] **Step 4: dev server 手动验证**

Run: `npm run dev`

访问 `http://localhost:3000/blog/ai-canvas-flow`，验证：
- 顶部出现 3px 紫粉渐变进度条
- 滚动文章时进度条宽度 0→100% 平滑变化
- 滚动到文章底部时进度条为 100%
- 控制台无报错

Expected: 进度条随滚动填充，无 console error。

- [ ] **Step 5: generate 验证 SSG 产物**

Run: `npm run generate`

验证：
- 构建成功无错误
- `.output/public/blog/ai-canvas-flow/index.html` 存在

Expected: generate 成功。

- [ ] **Step 6: commit**

```bash
git add components/ReadingProgress.vue pages/blog/[...slug].vue
git commit -m "新增：阅读进度条组件，博客页顶部 fixed 紫粉渐变进度条"
```

---

## Task 2: TableOfContents 组件 + 布局改造 + scroll-margin-top

**Files:**
- Create: `components/TableOfContents.vue`
- Modify: `pages/blog/[...slug].vue`

**Interfaces:**
- Consumes: `scrollContainer` ref（Task 1 产出，已存在于 `pages/blog/[...slug].vue`）；`data.body.toc`（@nuxt/content v3 默认生成，已有）
- Produces: `TableOfContents` 组件；完成 TOC + 进度条功能

- [ ] **Step 1: 创建 `components/TableOfContents.vue`**

完整文件内容：

```vue
<script setup lang="ts">
interface TocLink {
  id?: string
  text?: string
  depth?: number
  children?: TocLink[]
}

const props = defineProps<{
  container: HTMLElement | null
  toc: { links: TocLink[] } | undefined | null
}>()

const activeId = ref<string>('')
const visibleHeadings = new Set<string>()
let observer: IntersectionObserver | null = null

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

// 从可见 heading 中选取 DOM 顺序最靠前的一个作为 active
function pickActive() {
  if (!props.container) return
  const headings = props.container.querySelectorAll<HTMLElement>('article.prose h2, article.prose h3')
  for (const h of headings) {
    if (visibleHeadings.has(h.id)) {
      activeId.value = h.id
      return
    }
  }
}

function setupObserver() {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  visibleHeadings.clear()
  if (!props.container) return
  const headings = props.container.querySelectorAll<HTMLElement>('article.prose h2, article.prose h3')
  if (!headings.length) return

  // rootMargin: 顶部 20% 到底部 70% 之外的带状区域算"可见"
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).id
        if (entry.isIntersecting) {
          visibleHeadings.add(id)
        } else {
          visibleHeadings.delete(id)
        }
      }
      pickActive()
    },
    {
      root: props.container,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0,
    }
  )
  headings.forEach(h => observer!.observe(h))
}

// container 或 toc 变化时重新绑定（含 SPA 路由切换文章场景）
watch(
  [() => props.container, () => props.toc],
  () => {
    nextTick(setupObserver)
  },
  { immediate: true, deep: true }
)

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
})
</script>

<template>
  <nav v-if="toc?.links?.length" aria-label="目录" class="sticky top-8 text-sm">
    <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">目录</p>
    <ul class="space-y-1 border-l border-gray-700/50">
      <li v-for="link in toc.links" :key="link.id">
        <a
          :href="`#${link.id}`"
          @click.prevent="scrollTo(link.id!)"
          :class="[
            'block border-l-2 -ml-px py-1 pl-3 transition-colors',
            activeId === link.id
              ? 'border-purple-400 text-purple-300 font-medium'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          ]"
        >
          {{ link.text }}
        </a>
        <ul v-if="link.children?.length" class="mt-1 space-y-1">
          <li v-for="child in link.children" :key="child.id">
            <a
              :href="`#${child.id}`"
              @click.prevent="scrollTo(child.id!)"
              :class="[
                'block border-l-2 -ml-px py-1 pl-6 transition-colors',
                activeId === child.id
                  ? 'border-purple-400 text-purple-300 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              ]"
            >
              {{ child.text }}
            </a>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>
```

- [ ] **Step 2: 修改 `pages/blog/[...slug].vue` — template 布局改 max-w-6xl flex + aside**

修改前（Task 1 后的状态，`pages/blog/[...slug].vue:1-26`）：
```html
<template>
  <div ref="scrollContainer" class="h-screen overflow-y-auto bg-gray-900 text-white p-8">
    <ReadingProgress :container="scrollContainer" />
    <div class="max-w-4xl mx-auto">
      <!-- Navigation -->
      <nav class="mb-8 flex items-center gap-4 text-sm text-gray-400">
        <NuxtLink to="/" class="hover:text-white transition">首页</NuxtLink>
        <span>/</span>
        <NuxtLink to="/blog" class="hover:text-white transition">博客</NuxtLink>
        <span>/</span>
        <span class="text-white">{{ data?.title }}</span>
      </nav>

      <!-- Content -->
      <article v-if="data" class="prose prose-invert prose-lg max-w-none bg-gray-800/50 p-8 rounded-2xl border border-gray-700/50">
        <h1 class="text-4xl md:text-5xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          {{ data.title }}
        </h1>
        <ContentRenderer :value="data" />
      </article>

      <!-- Loading/Error -->
      <div v-else class="text-center py-20 text-gray-500">
        <p>文章加载中或不存在...</p>
      </div>
    </div>
  </div>
</template>
```

修改后：
```html
<template>
  <div ref="scrollContainer" class="h-screen overflow-y-auto bg-gray-900 text-white p-8">
    <ReadingProgress :container="scrollContainer" />
    <div class="max-w-6xl mx-auto flex gap-8">
      <div class="flex-1 min-w-0 max-w-4xl">
        <!-- Navigation -->
        <nav class="mb-8 flex items-center gap-4 text-sm text-gray-400">
          <NuxtLink to="/" class="hover:text-white transition">首页</NuxtLink>
          <span>/</span>
          <NuxtLink to="/blog" class="hover:text-white transition">博客</NuxtLink>
          <span>/</span>
          <span class="text-white">{{ data?.title }}</span>
        </nav>

        <!-- Content -->
        <article v-if="data" class="prose prose-invert prose-lg max-w-none bg-gray-800/50 p-8 rounded-2xl border border-gray-700/50">
          <h1 class="text-4xl md:text-5xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            {{ data.title }}
          </h1>
          <ContentRenderer :value="data" />
        </article>

        <!-- Loading/Error -->
        <div v-else class="text-center py-20 text-gray-500">
          <p>文章加载中或不存在...</p>
        </div>
      </div>

      <aside class="hidden lg:block w-64 flex-shrink-0">
        <TableOfContents :container="scrollContainer" :toc="data?.body?.toc" />
      </aside>
    </div>
  </div>
</template>
```

**关键变化**：
- 外层 `max-w-4xl` → `max-w-6xl mx-auto flex gap-8`
- 面包屑 + 文章包进 `<div class="flex-1 min-w-0 max-w-4xl">`（`min-w-0` 防 flex 溢出，`max-w-4xl` 保持阅读宽度）
- 新增 `<aside class="hidden lg:block w-64 flex-shrink-0">` 含 TableOfContents

- [ ] **Step 3: 修改 `pages/blog/[...slug].vue` — style 加 scroll-mt-8（防 heading 被进度条遮挡）**

修改前（`pages/blog/[...slug].vue:96-101`）：
```css
.prose h2 {
  @apply text-purple-300 border-b border-gray-700 pb-2 mt-12;
}
.prose h3 {
  @apply text-purple-200 mt-8;
}
```

修改后：
```css
.prose h2 {
  @apply text-purple-300 border-b border-gray-700 pb-2 mt-12 scroll-mt-8;
}
.prose h3 {
  @apply text-purple-200 mt-8 scroll-mt-8;
}
```

`scroll-mt-8` = 2rem，补偿顶部进度条（3px）+ 面包屑 + 呼吸空间。

- [ ] **Step 4: dev server 手动验证 — 多文章**

Run: `npm run dev`

访问并验证：

| 文章 | URL | 验证点 |
|------|-----|--------|
| AI Canvas Flow | `/blog/ai-canvas-flow` | TOC 显示 h2 + h3；滚动时 active 高亮切换；点击 TOC 平滑滚动，heading 不被进度条遮挡 |
| AI_RAG | `/blog/ai_rag` | TOC 显示 Q1-Q14（h3）；active 正确 |
| openclaw | `/blog/openclaw` | TOC 只显示 h2+h3，**h4 不入 TOC** |
| hello | `/blog/hello` | 无 heading → **TOC 整体隐藏**（aside 空，不报错） |

响应式验证：
- 窗口 ≥1024px（lg）：TOC 可见
- 窗口 <1024px：TOC 隐藏，仅进度条

路由切换验证：
- 在 `/blog/ai-canvas-flow` 与 `/blog/ai_rag` 间切换，TOC 内容更新、active 重新绑定、无残留监听报错

Expected: 全部通过，控制台无报错。

- [ ] **Step 5: generate 验证 SSG 产物**

Run: `npm run generate`

验证：
- 构建成功
- 检查 `.output/public/blog/ai-canvas-flow/index.html` 含 TOC 链接（`<a href="#...">`）

```bash
grep -c 'href="#' .output/public/blog/ai-canvas-flow/index.html
```

Expected: 输出 ≥1（TOC 链接静态渲染）。

- [ ] **Step 6: commit**

```bash
git add components/TableOfContents.vue pages/blog/[...slug].vue
git commit -m "新增：TOC 目录组件，博客页右侧 sticky 目录+布局改造"
```
