# 文章 TOC 目录 + 阅读进度条 设计文档

- **日期**：2026-07-27
- **作者**：assistant + 用户协作
- **状态**：待实现
- **子项目序号**：2️⃣（第一档三个推荐功能中的第 2 个，RSS 已完成）

---

## 1. 背景

本项目是部署在 GitHub Pages 上的 Nuxt 3 博客，使用 @nuxt/content v3 管理 Markdown 文章。当前博客详情页 `pages/blog/[...slug].vue` 是单列 `max-w-4xl` 布局，仅有面包屑导航 + 文章正文。

长文章（如《AI Canvas Flow 技术文档》《AI_RAG 项目面试题》）包含 5+ 个 h2 章节和十几个 h3 子标题，读者缺少：

- **章节导航能力**：无法快速跳转到某章节、无法知道当前读到哪
- **阅读进度反馈**：不知道整篇文章读了多少、还剩多少

引入 TOC 目录 + 阅读进度条是技术博客的标准能力（VuePress / Docusaurus / GitBook 均内置），能显著提升长文阅读体验。

## 2. 目标

- 在博客详情页右侧提供 sticky TOC，展示 h2 + h3 章节结构
- TOC 项点击平滑滚动到对应章节
- 滚动时实时高亮当前所在章节（active highlighting）
- 顶部 fixed 进度条随阅读进度填充（0→100%）
- 桌面端（lg+）显示 TOC，移动端仅保留进度条
- 零新依赖，复用 @nuxt/content v3 内置 toc 数据源

## 3. 非目标

- 不实现 TOC 搜索/过滤（YAGNI）
- 不实现移动端折叠抽屉（顶部进度条已足够）
- 不实现"返回顶部"按钮（独立功能，不在本期范围）
- 不实现阅读时间估算、字数统计
- 不显示进度百分比文字（顶部细条已足够）
- 不引入 @vueuse/core 等新依赖（手写 IntersectionObserver + scroll 监听）
- 不修改 content.config.ts 的 toc searchDepth（默认配置足够）
- 不影响 Reveal.js 主页与其他页面

## 4. 方案选择

### 候选方案对比

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| **A. 右侧 sidebar TOC + 顶部 fixed 进度条** ⭐ | 主内容左 + 右侧 sticky TOC + 顶部 3px 进度条 | 技术博客主流；进度条始终可见；右侧不干扰中文左到右阅读流 | 需扩 max-w-4xl → max-w-6xl |
| B. 右侧 TOC + 进度条嵌入 TOC 顶部 | 进度条放在 sidebar 顶部 | 布局紧凑 | 进度条可见性差；窄屏 sidebar 隐藏后进度条也消失 |
| C. 顶部折叠 TOC + 顶部进度条 | TOC 是文章顶部可折叠抽屉 | 移动优先 | 桌面端长文导航不便；侧边空间浪费 |

**选定方案 A**：技术博客主流布局（VuePress / Docusaurus），进度条始终可见，符合用户预期。

## 5. 详细设计

### 5.1 文件结构

```
新增：
  components/TableOfContents.vue   ← 右侧 sticky TOC，active 高亮
  components/ReadingProgress.vue   ← 顶部 fixed 进度条

修改：
  pages/blog/[...slug].vue         ← 布局改 max-w-6xl flex，集成两组件，加 scroll-margin-top
```

无需修改 `content.config.ts`、`nuxt.config.ts`、`app.vue`。

### 5.2 关键决策（已确认）

| # | 决策 | 最终选择 |
|---|------|---------|
| 1 | TOC 位置 | 右侧 sidebar，`sticky top-8` |
| 2 | TOC 深度 | h2 + h3（depth 2/3），h4 不入 TOC |
| 3 | 进度条位置 | 顶部 `fixed top-0`，高 3px |
| 4 | 进度条颜色 | 紫粉渐变 `from-purple-400 to-pink-600`（与 hero 一致） |
| 5 | 滚动监听对象 | `pages/blog/[...slug].vue` 的滚动容器 div（非 window） |
| 6 | active 检测 | `IntersectionObserver`，root 指向滚动容器 |
| 7 | 点击滚动 | `scrollIntoView({ behavior: 'smooth' })` + `scroll-margin-top` |
| 8 | 移动端 | `< lg` 隐藏 TOC，仅保留进度条 |
| 9 | 空状态 | 无 heading 时整个 `<aside>` 隐藏 |
| 10 | 数据源 | `data.body.toc.links`（@nuxt/content v3 默认生成） |

### 5.3 数据源

@nuxt/content v3 的 `queryCollection('blog').path(route.path).first()` 返回对象包含 `body.toc` 字段，默认生成（searchDepth=2，即 h2+h3）。结构：

```ts
interface Toc {
  title?: string
  searchDepth: number
  links: TocLink[]
}
interface TocLink {
  id?: string        // heading 的 DOM id，由 @nuxt/content 根据文本生成
  text?: string      // heading 文本
  depth?: number     // 2 表示 h2，3 表示 h3
  prefix?: string
  children?: TocLink[]  // h3 是 h2 的 children（嵌套结构）
}
```

**注意嵌套结构**：h3 是对应 h2 的 `children` 数组。渲染时两层循环：外层遍历 `links`（h2），内层遍历 `children`（h3）。

### 5.4 布局改动（`pages/blog/[...slug].vue`）

**当前结构**：

```html
<div class="h-screen overflow-y-auto bg-gray-900 text-white p-8">
  <div class="max-w-4xl mx-auto">
    <nav><!-- 面包屑 --></nav>
    <article class="prose prose-invert prose-lg ...">
      <ContentRenderer :value="data" />
    </article>
  </div>
</div>
```

**改动后**：

```html
<div ref="scrollContainer" class="h-screen overflow-y-auto bg-gray-900 text-white p-8">
  <ReadingProgress :container="scrollContainer" />
  <div class="max-w-6xl mx-auto flex gap-8">
    <div class="flex-1 min-w-0 max-w-4xl">
      <nav><!-- 面包屑 --></nav>
      <article class="prose prose-invert prose-lg ...">
        <ContentRenderer :value="data" />
      </article>
    </div>
    <aside class="hidden lg:block w-64 flex-shrink-0">
      <TableOfContents :container="scrollContainer" :toc="data?.body?.toc" />
    </aside>
  </div>
</div>
```

**关键**：
- 滚动容器加 `ref="scrollContainer"`，传给两个子组件
- 主内容仍 `max-w-4xl`（阅读宽度不变），外层扩到 `max-w-6xl` 容纳 sidebar
- `<aside>` 用 `hidden lg:block` 控制移动端隐藏
- 面包屑 + 文章包裹在 `flex-1 min-w-0` 中（`min-w-0` 防止 flex 溢出）

### 5.5 ReadingProgress 组件规格

**Props**：
```ts
defineProps<{
  container: HTMLElement | null
}>()
```

**行为**：
- 监听 `container` 的 `scroll` 事件
- 用 `requestAnimationFrame` 节流，避免每帧触发
- 计算 `progress = scrollTop / (scrollHeight - clientHeight)`，clamp 到 [0, 1]
- 绑定到进度条 `style.width = (progress * 100).toFixed(2) + '%'`
- 同步更新 `aria-valuenow` 为 `Math.round(progress * 100)`（aria-valuenow 要求 0-100 整数）

**模板**：
```html
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
```

**注意**：`container` 可能为 null（初始渲染时），需在 `watch(container, ...)` 中绑定监听。

### 5.6 TableOfContents 组件规格

**Props**：
```ts
defineProps<{
  container: HTMLElement | null
  toc: { links: TocLink[] } | undefined | null
}>()
```

**行为**：
- 渲染 h2（外层）+ h3（`children`，缩进）
- 点击 → `document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })`
- `IntersectionObserver` 监听所有 h2/h3 元素，root 指向 `container`
- rootMargin：`'-20% 0px -70% 0px'`（顶部 20% 区域内的 heading 视为 active）
- active 项高亮：紫色文字 + 左侧 2px indicator 条

**模板**：
```html
<nav v-if="toc?.links?.length" aria-label="目录" class="sticky top-8 ...">
  <ul>
    <li v-for="link in toc.links" :key="link.id">
      <a :href="`#${link.id}`" @click.prevent="scrollTo(link.id)"
         :class="['...', activeId === link.id ? 'text-purple-300 ...' : 'text-gray-400 ...']">
        {{ link.text }}
      </a>
      <ul v-if="link.children?.length" class="ml-4">
        <li v-for="child in link.children" :key="child.id">
          <a :href="`#${child.id}`" @click.prevent="scrollTo(child.id)"
             :class="['...', activeId === child.id ? 'text-purple-300 ...' : 'text-gray-500 ...']">
            {{ child.text }}
          </a>
        </li>
      </ul>
    </li>
  </ul>
</nav>
```

**`scrollTo` 实现**：
```ts
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
```

**IntersectionObserver 设置**：
```ts
const observer = new IntersectionObserver(
  (entries) => {
    // 找到最靠近顶部且可见的 heading，设为 activeId
  },
  {
    root: container,
    rootMargin: '-20% 0px -70% 0px',
    threshold: 0,
  }
)
// 观察所有 h2/h3 元素
container.querySelectorAll('article h2, article h3').forEach(el => observer.observe(el))
```

### 5.7 scroll-margin-top（防止 heading 被进度条遮挡）

在 `pages/blog/[...slug].vue` 的 `<style>` 块加：

```css
.prose h2,
.prose h3 {
  scroll-margin-top: 2rem;
}
```

`2rem` 补偿顶部进度条（3px）+ 面包屑 + 呼吸空间。

### 5.8 SPA 路由切换处理

博客详情页之间切换（如 `/blog/ai-canvas-flow` → `/blog/ai_rag`）时：
- `useAsyncData` 的 key 含 `route.path`，会重新获取数据
- `data.body.toc` 更新
- **但 IntersectionObserver 仍观察旧 heading 元素**，需要 cleanup + rebind

**处理**：在 `watch` 中监听 `route.path`（或 `data`），`onBeforeUnmount` 中 `observer.disconnect()`，`onMounted` / `watch` 触发时重新观察。建议封装为 `useActiveHeading(container, toc)` composable。

### 5.9 SSG / Hydration 时序

- SSG 预渲染时，TOC 结构静态渲染（数据来自 `data.body.toc`），进度条 DOM 也在
- 进度条 width 初始为 0%（静态）
- `onMounted` 后绑定 scroll / IntersectionObserver（客户端行为，不影响 SSG）
- hydration 后监听生效

## 6. 错误处理 / 边界情况

| 场景 | 处理 |
|------|------|
| 文章无 heading（如 hello.md 只有 h1） | `toc.links` 为空，`<aside>` 整体 `v-if` 隐藏 |
| 文章极短（一屏内） | 进度条直接 100%，TOC 无 active 高亮（或首项高亮） |
| `container` 为 null（初始渲染） | `watch(container, ...)` 等待 ref 就绪后再绑定监听 |
| SPA 路由切换 | `watch(route.path)` → `observer.disconnect()` → 重新 `observe` 新 heading |
| 文章只有 h2 无 h3 | `children` 为空数组，内层 `<ul>` 不渲染 |
| IntersectionObserver 不支持（老旧浏览器） | 进度条仍可用（scroll 监听不依赖 IO），TOC active 降级为首项高亮 |
| SSG 预渲染时 `document` 不存在 | 监听绑定全部在 `onMounted` 中，SSG 不执行 |

## 7. 测试策略

项目无测试框架（package.json 无 vitest / jest），UI 交互组件采用**手动验证**为主。

### 7.1 本地验证

1. `npm run dev` 启动开发服务器
2. 访问 4 篇文章分别验证：
   - `/blog/ai-canvas-flow`：h2 + h3 渲染、点击滚动、active 高亮
   - `/blog/ai_rag`：h2 + h3（Q1-Q14）
   - `/blog/openclaw`：h2 + h3 + h4（h4 不入 TOC，验证忽略）
   - `/blog/hello`：无 heading，TOC 隐藏
3. 滚动时进度条填充、active 高亮切换
4. 点击 TOC 项平滑滚动，heading 不被进度条遮挡

### 7.2 响应式验证

- `lg` 断点（1024px）切换：
  - ≥1024px：TOC 可见
  - <1024px：TOC 隐藏，仅进度条
- 调整窗口大小验证

### 7.3 路由切换验证

- 在两篇文章间切换（如 `/blog/ai-canvas-flow` → `/blog/ai_rag`）
- 验证 TOC 内容更新、active 重新绑定、无残留监听

### 7.4 SSG 验证

- `npm run generate` 后检查 `.output/public/blog/ai-canvas-flow/index.html`
- 确认 TOC 结构静态渲染（含 h2/h3 链接）
- 确认进度条 DOM 存在（width 初始 0%）

### 7.5 可访问性验证

- 键盘 Tab 可聚焦 TOC 链接
- 屏幕阅读器朗读 `aria-label="目录"` 和 `aria-label="阅读进度"`

## 8. 验收标准

- [ ] 新增 `components/TableOfContents.vue`，渲染 h2 + h3，支持点击滚动
- [ ] 新增 `components/ReadingProgress.vue`，顶部 fixed 3px 渐变进度条
- [ ] `pages/blog/[...slug].vue` 布局改为 `max-w-6xl` flex，集成两组件
- [ ] 滚动时进度条 0→100% 填充
- [ ] 滚动时 TOC active 项高亮切换
- [ ] 点击 TOC 项平滑滚动，heading 不被遮挡（scroll-margin-top）
- [ ] 无 heading 的文章 TOC 隐藏
- [ ] `< lg` 移动端 TOC 隐藏，进度条正常
- [ ] SPA 路由切换正确 cleanup + rebind
- [ ] `npm run generate` 成功，SSG 产物含 TOC 结构
- [ ] TOC `<nav aria-label="目录">`、进度条 `role="progressbar"`

## 9. 风险与权衡

| 风险 | 缓解措施 |
|------|---------|
| 滚动容器非 window，监听易写错 | 用 `ref="scrollContainer"` 显式传递，子组件 props 接收 |
| IntersectionObserver root 设置错误导致 active 不准 | root 必须指向 scrollContainer，rootMargin 精确调参 |
| SPA 路由切换残留监听 | `onBeforeUnmount` + `watch(route.path)` 双重 cleanup |
| @nuxt/content v3 toc 结构变更 | 嵌套结构 `links[].children`，按官方类型定义 |
| 扩宽布局影响其他页面样式 | 仅改 `pages/blog/[...slug].vue`，不触 app.vue / 其他页面 |
| 进度条 z-index 冲突 | `z-50`，高于文章内容但低于 modal（本项目无 modal） |

## 10. 后续可能的扩展（非本期范围）

- "返回顶部"按钮（独立功能，可与进度条并存）
- 移动端折叠 TOC 抽屉（若用户反馈需要）
- TOC 搜索/过滤（文章章节极多时）
- 阅读时间估算、字数统计
- 进度条百分比文字显示
- 多级 TOC（h4，需调整 content.config.ts 的 searchDepth）
