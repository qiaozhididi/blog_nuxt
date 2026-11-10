---
title: Nuxt 3 博客站项目面试题 — 从 PPT 首页到内容系统
description: 基于 Nuxt 3 + Vue 3 + Nuxt Content + Reveal.js 的个人博客项目面试题集，涵盖 SSR/SSG、内容系统、路由同步、性能优化、SEO 与 CI 部署。
date: 2026-11-10
---

# Nuxt 3 博客站项目面试题 — 从 PPT 首页到内容系统

> 项目采用 Nuxt 3 + Vue 3 + Tailwind CSS + Nuxt Content v3 + Reveal.js，首页是 PPT 式全屏演示，博客部分是基于 Markdown 的内容系统，最终静态部署到 GitHub Pages 子路径。

***

## 一、项目概览

### Q1: 介绍一下这个项目的技术栈和核心功能

**答案：**

**技术栈：**

| 层次 | 选型 |
| -- | -- |
| 框架 | Nuxt 3（Vue 3、Vite） |
| 样式 | Tailwind CSS + `@tailwindcss/typography` |
| 内容 | Nuxt Content v3（Markdown → SQLite 内容库） |
| 演示 | Reveal.js 5 |
| 语言 | TypeScript（`strict: true`） |
| 部署 | GitHub Actions → GitHub Pages（SSG） |

**核心功能：**

1. **PPT 式首页**：Reveal.js 横向 + 纵向幻灯片，URL 与幻灯片页码双向同步，支持键盘、滚轮、触摸、鼠标拖拽翻页
2. **博客系统**：Markdown 文章列表 + 详情页，带全文搜索、目录、阅读进度、上下篇导航
3. **阅读体验增强**：代码块语言标签与一键复制、图片 Lightbox、锚点深链、亮暗主题切换
4. **SEO**：动态 `sitemap.xml`、`rss.xml`、canonical、Open Graph、JSON-LD 结构化数据
5. **静态部署**：`nuxt generate` 预渲染后发布到 GitHub Pages 子路径 `/blog_nuxt/`

***

### Q2: 项目的目录结构是怎么划分的？

**答案：**

```text
blog_nuxt/
├── app.vue                  # 全局 head、主题初始化、防闪烁脚本
├── pages/
│   ├── [...slug].vue        # Reveal.js 幻灯片（catch-all，兜住非 /blog 路由）
│   └── blog/
│       ├── index.vue        # 文章列表 + 全文搜索
│       └── [...slug].vue    # 文章详情
├── components/              # ReadingProgress / TableOfContents / Lightbox / BackToTop / ThemeToggle / Icon
├── composables/             # useTheme / useCodeBlockEnhancer / useLightbox
├── utils/content.ts         # body AST → 纯文本（搜索、阅读时间共用）
├── content/blog/            # Markdown 文章源（Obsidian 笔记）
├── data/site-config.json    # 首页幻灯片配置
├── server/routes/           # rss.xml.ts / sitemap.xml.ts
├── content.config.ts        # Nuxt Content 集合与 schema
└── nuxt.config.ts           # 模块、预渲染、TS 严格模式
```

所有目录都属于 Nuxt 约定目录，因此 `components/`、`composables/`、`utils/` 下的导出无需手动 import，框架自动注册。

***

### Q3: 首页的 `[...slug].vue` 和博客的 `/blog` 路由如何共存？

**答案：**

Nuxt 的路由基于文件系统，优先级按**路径具体程度**排序：

- `pages/blog/index.vue` → `/blog`
- `pages/blog/[...slug].vue` → `/blog/xxx`
- `pages/[...slug].vue` → catch-all，匹配 `/`、`/about`、`/projects`、`/contact` 等其余所有路径

因此访问 `/blog` 时命中更具体的 `pages/blog/index.vue`，不会被 catch-all 抢走。catch-all 的作用是把"除博客外的所有路径"都交给幻灯片页，从而用一张幻灯片定义一个站内路由（`/projects/github` 对应"项目"章节的第 1 个纵向页）。

**追问：catch-all 会不会把 404 也吃掉？**

会。当前设计里未匹配的任意路径都会渲染幻灯片首页。若要更严谨，可以在 `[...slug].vue` 内校验 slug 是否存在于 `site-config.json`，不存在则 `throw createError({ statusCode: 404 })`。

***

## 二、Nuxt 3 核心机制

### Q4: SSR、SSG、预渲染在本项目里分别体现在哪？

**答案：**

- **SSR（服务端渲染）**：`npm run dev` 与 `nuxt build` 时，页面在 Node 端生成 HTML 再水合（hydration）
- **SSG（静态生成）**：CI 中执行 `nuxt generate`，构建期把路由产物写成静态 HTML，部署到 GitHub Pages
- **预渲染（prerender）**：`nitro.prerender.routes` 显式声明需要生成静态文件的动态路由

```ts
nitro: {
  prerender: {
    routes: ['/sitemap.xml', '/blog', '/rss.xml'],
  },
},
```

**为什么必须显式预渲染这三个？**

GitHub Pages 只提供静态文件，不能运行 Nitro server route。`/sitemap.xml` 和 `/rss.xml` 是 server routes，如果不预渲染，线上访问就是 404；`/blog` 显式预渲染是为了保证列表页有独立 HTML（文章页由 Nuxt Content 自动发现并预渲染）。

***

### Q5: Nuxt 的自动导入（auto-import）是怎么工作的？

**答案：**

Nuxt 在构建期扫描约定目录并生成 `.nuxt/imports.d.ts` 与自动导入插件：

- `components/` → 组件按目录名+文件名注册（如 `ReadingProgress.vue` → `<ReadingProgress />`）
- `composables/` → 顶层导出自动可调用（如 `useTheme()`）
- `utils/` → 顶层导出自动可用（如 `extractPlainText()`）
- Vue API（`ref`、`computed`、`watch`、`nextTick`）与 Nuxt API（`useHead`、`useAsyncData`、`useRoute`）全局可用

好处是模板代码更干净；代价是隐式依赖，排查时需知道"这个名字从哪来"。项目里 `useCodeBlockEnhancer` 和 `extractPlainText` 都是靠自动导入直接使用的。

***

### Q6: `useAsyncData` 和 `useFetch` 有什么区别？为什么这里全用 `useAsyncData`？

**答案：**

| 维度 | `useFetch` | `useAsyncData` |
| -- | -- | -- |
| 数据源 | 只能是 URL（内部包了 `$fetch`） | 任意异步函数 |
| 适用场景 | 调 HTTP 接口 | 调用任意异步逻辑（如数据库/内容查询） |

Nuxt Content 的 `queryCollection()` 返回的是本地内容查询结果，不是 HTTP 请求，所以用 `useAsyncData` 包一层即可获得 SSR 数据传递、去重、缓存与 `pending/error` 状态：

```ts
const { data: list, pending, error } = await useAsyncData(
  'blog-list',
  () => queryCollection('blog').all()
)
```

`key` 必须唯一，否则多个 `useAsyncData` 会互相覆盖缓存。

***

### Q7: 博客详情页的 `useAsyncData` key 为什么带上 `route.path`？

**答案：**

```ts
const { data } = await useAsyncData(
  `page-data-${route.path}`,
  () => queryCollection('blog').path(route.path).first()
)
```

如果 key 固定为 `'page-data'`，在 SPA 内从文章 A 跳到文章 B 时会命中 A 的缓存，页面显示旧内容。把 `route.path` 拼进 key，等于"每篇文章一个缓存槽"，路由变化时 key 变化，数据自然重新请求。

**追问：为什么列表页反而用固定 key？**

列表数据与具体路由无关，所有列表页共用一份缓存反而更省。同时列表页用 `definePageMeta({ key: 'blog-list' })` 固定组件实例 key。

***

## 三、Nuxt Content v3

### Q8: `content.config.ts` 做了什么？schema 有什么作用？

**答案：**

```ts
export default defineContentConfig({
  collections: {
    blog: defineCollection({
      source: 'blog/**/[!.]*.md',
      type: 'page',
      schema: z.object({
        title: z.string(),
        date: z.union([z.string(), z.date()]).optional(),
        description: z.string().optional(),
      })
    })
  }
})
```

三个关键点：

1. **`source` glob**：`blog/**/[!.]*.md` 只收录 `content/blog` 下的 Markdown，并且用 `[!.]` 排除点开头的文件（如 `.DS_Store`、Obsidian 的隐藏配置）
2. **`type: 'page'`**：按"页面"建模，自动生成 `path`、`title`、`body`、`toc` 等字段，可直接用于路由
3. **`schema`（Zod）**：对 frontmatter 做运行时校验与类型推导，`title` 必填，缺失会在构建期报错而不是线上渲染空白

`date` 用 `z.union([z.string(), z.date()])` 是因为 YAML frontmatter 解析出来可能是字符串（`2026-07-20`）也可能是 Date 对象，统一兼容避免构建失败。

***

### Q9: `queryCollection` 有哪几种常用写法？

**答案：**

```ts
// 列表（服务端 route 中需要传 event）
queryCollection('blog').all()

// 按路径查单篇
queryCollection('blog').path('/blog/hello').first()

// 链式筛选/排序
queryCollection('blog').where('date', '>=', '2026-01-01').order('date', 'DESC').all()
```

注意两个环境差异：

- 在 **Vue 页面/composable** 里：`queryCollection('blog')`，由 Nuxt 注入上下文
- 在 **server route** 里：`queryCollection(event, 'blog')`，必须显式传 H3 event

项目里 `server/routes/rss.xml.ts` 和 `sitemap.xml.ts` 都用的第二种写法。

***

### Q10: 为什么需要 `extractPlainText`？内容 body 的结构是什么样的？

**答案：**

Nuxt Content 返回的 `body` 是 AST，不是 HTML 字符串，而且存在两种形态：

```ts
// 标准 AST
{ type: 'text', value: 'hello' }
{ children: [...] }

// minimark（v3 默认压缩格式）
{ type: 'minimark', value: [[tag, props, ...children]] }
```

`utils/content.ts` 用递归统一处理三者：

```ts
export function extractPlainText(node: ContentNode | null | undefined): string {
  if (!node) return ''
  if (node.type === 'text') return typeof node.value === 'string' ? node.value : ''
  if (node.type === 'minimark' && Array.isArray(node.value)) {
    return node.value.map(extractMinimarkNode).join('')
  }
  if (Array.isArray(node.children)) return node.children.map(extractPlainText).join('')
  return ''
}
```

minimark 节点是 `[tag, props, ...children]` 数组，所以 `node.slice(2)` 跳过标签名和属性，只递归子节点。提取出的纯文本同时服务于**全文搜索**和**阅读时间估算**，避免两处重复写解析逻辑。

***

### Q11: 代码块的亮暗双主题是怎么实现的？

**答案：**

Nuxt Content 使用 Shiki 做高亮，配置了双主题：

```ts
content: {
  build: {
    markdown: {
      highlight: {
        theme: { default: 'github-light', dark: 'github-dark' },
      },
    },
  },
},
```

Shiki 会把两套颜色都输出为 CSS 变量（`--shiki-dark`、`--shiki-dark-bg`），再由 `main.css` 在 `html.dark` 下覆盖：

```css
html.dark .shiki,
html.dark .shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
}
```

好处是**切换主题不需要重新高亮**，纯 CSS 生效，零 JS 开销。

***

## 四、Reveal.js 深度集成

### Q12: 为什么选 Reveal.js？SSR 场景下怎么初始化？

**答案：**

选型理由：Reveal.js 天然支持横向 + 纵向嵌套结构、键盘/触摸/滚轮交互、fragment 逐步显示，正好匹配"个人主页做成 PPT"的交互诉求。

初始化分三层处理：

1. **结构在 SSR 阶段就渲染**：`v-for` 直接输出 `<section>`，保证爬虫能拿到全部文字（SEO 友好）
2. **运行时按需加载**：`initReveal()` 里动态 `import('reveal.js')` 与 CSS，避免进入博客页的 bundle
3. **客户端就绪前显示遮罩**：`revealReady` 为 false 时盖一层 loading，初始化成功或失败后移除，防止无样式堆叠闪烁

```ts
const deck = new Reveal(revealEl, {
  controls: true,
  progress: true,
  center: false,
  hash: false,
  history: false,
  transition: 'slide',
  disableLayout: true,
})
await deck.initialize()
deck.slide(h, v)
```

`disableLayout: true` + `hash/history: false` 是关键：布局完全交给 Tailwind CSS，URL 完全交给 vue-router，避免 Reveal 和 Vue Router 抢同一份状态。

***

### Q13: 幻灯片的 URL 和页码是怎么做双向同步的？

**答案：**

**方向一：幻灯片 → URL**

监听 Reveal 的 `slidechanged` 事件，根据 `(indexh, indexv)` 反算路径，用 `router.replace` 更新地址栏（不产生历史记录，避免后退键在幻灯片里"卡住"）：

```ts
deck.on('slidechanged', (event) => {
  const e = event as SlideChangedEvent
  const newPath = getPathFromIndices(e.indexh, e.indexv)
  if (route.path !== newPath) router.replace(newPath)
})
```

**方向二：URL → 幻灯片**

用户点浏览器后退、或直接访问 `/projects/github` 时，用 `onBeforeRouteUpdate` 解析 slug 并调用 `deck.slide(h, v)`：

```ts
onBeforeRouteUpdate((to, _from, next) => {
  const { h, v } = getIndicesFromSlug(to.params.slug as string[])
  const current = revealInstance.getIndices()
  if (current.h !== h || current.v !== v) revealInstance.slide(h, v)
  next()
})
```

**映射规则**（`projects` 类型是嵌套结构）：横向索引 = `slides` 数组下标；纵向索引 = `0` 是封面，项目条目从 `1` 开始（`itemIndex + 1`）。

必须判断"目标与当前不同"再跳转，否则 `slide()` 又会触发 `slidechanged` → `router.replace` → `onBeforeRouteUpdate`，形成死循环。

***

### Q14: Reveal.js 体积不小，怎么避免拖慢博客页？

**答案：**

把 Reveal 的运行时和样式全部改成**路由级按需加载**：

```ts
// 只保留类型，不打包运行时代码
import type Reveal from 'reveal.js'

async function initReveal() {
  await import('reveal.js/dist/reveal.css')
  await import('reveal.js/dist/theme/black.css')
  const Reveal = (await import('reveal.js')).default
  const Markdown = (await import('reveal.js/plugin/markdown/markdown.esm.js')).default
}
```

效果：`reveal.css` + `black.css` + `source-sans-pro` 字体（约 2.1MB）只会在 PPT 首页加载，博客页面完全不下载。由于 PPT 页有 loading 遮罩，CSS 到位后才移除遮罩，不会出现无样式闪烁。

**追问：为什么不直接在 `nuxt.config.ts` 的 `css` 里全局引入？**

全局引入会让 CSS 进入主 bundle，博客页也要下载这些字体，直接违背"按路由分包"的优化目标。

***

### Q15: 从 PPT 页跳到博客页后，滚轮会莫名跳回 PPT，为什么？

**答案：**

Reveal.js 初始化时会在 `document` 上绑定约 9 个事件监听（`wheel`、`keydown`、`mousedown` 等）并配合 `router.replace`。SPA 导航只是卸载组件、不会刷新页面，如果不在 `onUnmounted` 里清理，残留监听会继续捕获博客页的滚轮事件，把 URL 改回 PPT 路由。

```ts
onUnmounted(() => {
  if (revealInstance) {
    revealInstance.destroy()   // 清理 Reveal 绑定的全部 document 监听
    revealInstance = null
  }
  document.removeEventListener('mousedown', handleMouseDown)
  document.removeEventListener('mouseup', handleMouseUp)
})
```

结论：**任何在 `document`/`window` 上注册监听的第三方实例，都必须在组件卸载时显式销毁**，这是 SPA 场景最容易泄漏的一类问题。

***

### Q16: 鼠标拖拽翻页是怎么实现的？

**答案：**

在 `mousedown` 记录起点，`mouseup` 计算位移，按主轴方向判断：

```ts
const DRAG_THRESHOLD = 50 // 像素阈值，避免误触

if (Math.abs(deltaX) > Math.abs(deltaY)) {
  if (Math.abs(deltaX) > DRAG_THRESHOLD) {
    deltaX > 0 ? revealInstance?.left() : revealInstance?.right()
  }
} else {
  if (Math.abs(deltaY) > DRAG_THRESHOLD) {
    deltaY > 0 ? revealInstance?.up() : revealInstance?.down()
  }
}
```

两个细节：

- **排除按钮和链接**：`if ((e.target as HTMLElement).closest('button, a')) return`，否则点击"查看详情"会被判定为拖拽
- **位移方向与翻页方向相反**：向右拖 = 上一页，符合"拖动内容"的直觉

***

### Q17: 移动端和桌面端的布局差异怎么处理？

**答案：**

桌面端靠 Reveal 的全屏幻灯片 + 键盘/滚轮；移动端屏幕太窄，纵向内容会溢出，所以用 CSS 媒体查询把 Reveal 的"固定视口"改成"自然文档流"：

```css
@media (max-width: 767px) {
  :deep(.reveal) {
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch;
  }
  :deep(.reveal .slides) { height: auto !important; overflow: visible !important; }
  :deep(.reveal .slides > section) { height: auto !important; min-height: 100vh; }
  :deep(.reveal .controls) { display: none !important; }
}
```

同时隐藏桌面端的翻页箭头，改用底部固定页码指示器（`currentIndex + 1 / total`），触控体验更好。

***

## 五、主题系统

### Q18: 亮暗主题切换如何避免首屏闪烁（FOUC）？

**答案：**

闪烁的根因是：HTML 先按默认亮色渲染，JS 水合后才读到 `localStorage` 加 `dark` class，中间有一帧白色。

解决方案是**在 `<head>` 里内联一段同步脚本，渲染前就把 class 加上**：

```ts
{
  innerHTML: `if(localStorage.getItem('theme')!=='light')document.documentElement.classList.add('dark')`,
  tagPosition: 'head',
}
```

- 默认深色：只要用户没明确选过 `light`，就直接加 `dark`
- 脚本执行在 CSS 应用之前，首帧就是正确配色，无闪烁

`useTheme` 的 `init()` 只负责把 `localStorage` 同步到 `useState`，不负责改 class，避免和脚本抢职责。

***

### Q19: 为什么用 `useState` 而不是 Pinia 管理主题？

**答案：**

主题只有一个布尔状态，全局共享即可。`useState` 是 Nuxt 内置的 SSR 安全跨组件共享状态：

```ts
const theme = useState<Theme>('theme', () => 'dark')
```

相比 Pinia：

- 无需安装依赖、无需定义 store 文件
- 同样支持 SSR 状态序列化，不会出现服务端/客户端状态不一致
- 代码量只有几行

反过来，如果状态复杂（多模块、异步 action、devtools 调试需求），就应该上 Pinia。**状态管理的选型应该由复杂度决定，而不是默认引入最重的方案。**

**追问：`localStorage` 为什么要包 try/catch？**

Safari 隐私模式、部分内嵌 WebView 下访问 `localStorage` 会直接抛异常。主题属于"丢了也能用"的非关键状态，静默降级比让整个应用崩溃更合理。

***

## 六、博客功能实现

### Q20: 全文搜索是怎么做的？为什么不上搜索库？

**答案：**

文章量级是几十篇，直接在客户端做内存过滤足够：

```ts
const searchableList = computed(() =>
  (list.value || []).map(a => ({
    ...a,
    _searchText: [a.title || '', a.description || '', extractPlainText(a.body)]
      .join(' ')
      .toLowerCase()
  }))
)

const filteredList = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list.value
  return searchableList.value.filter(a => a._searchText.includes(q))
})
```

预计算 `_searchText` 避免每次输入都重新解析 AST；`computed` 自带缓存，输入变化只做数组过滤。

**为什么不上 Fuse.js / Algolia：**

- Fuse.js 需要额外打包体积，且几十篇文章的模糊匹配收益有限
- Algolia 需要外部服务、构建期推送索引，对纯静态个人博客是过度设计

**改进方向**：文章量上百后可引入 `minisearch`（体积小、支持中文分词需要额外处理），或构建期生成倒排索引 JSON。

***

### Q21: 搜索结果高亮为什么不能直接 `innerHTML` 拼接关键词？

**答案：**

因为 `v-html` 会执行任意 HTML，攻击者只要在搜索框输入 `<img src=x onerror=alert(1)>`，或文章标题里带脚本，就会造成 XSS。

项目采用"**先转义、再高亮**"的顺序：

```ts
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c] || c))
}

function highlight(text, query) {
  const escaped = escapeHtml(text || '')
  const q = query.trim()
  if (!q) return escaped
  const pattern = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // 转义正则元字符
  return escaped.replace(
    new RegExp(`(${pattern})`, 'gi'),
    '<mark class="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5">$1</mark>'
  )
}
```

两个关键点：

1. **顺序不能反**：先高亮再转义会把 `<mark>` 标签本身转义掉；先转义再高亮，注入内容已经被中和，`<mark>` 是唯一可信的 HTML
2. **正则元字符必须转义**：否则用户输入 `.*` 会导致匹配范围爆炸，输入 `[` 会直接抛 `SyntaxError`

***

### Q22: 阅读时间是怎么估算的？

**答案：**

按中文阅读速度 300 字/分钟：

```ts
const readingTime = computed(() => {
  const text = extractPlainText(data.value?.body)
  return Math.max(1, Math.ceil(text.length / 300))
})
```

`Math.max(1, ...)` 保证极短文章也显示"约 1 分钟"，而不是"0 分钟"。复用 `extractPlainText` 而非 `JSON.stringify(body).length`，避免把 AST 的结构字符也算进字数。

***

### Q23: 上一篇/下一篇是怎么算出来的？

**答案：**

取出全部文章，按日期升序排序，找到当前文章下标，前后各取一个：

```ts
const posts = [...allPosts.value].sort((a, b) => new Date(a.date) - new Date(b.date))
const currentIndex = posts.findIndex(p => p.path === route.path)
return {
  prev: currentIndex > 0 ? posts[currentIndex - 1] : null,
  next: currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null,
}
```

`[...allPosts.value]` 先拷贝再排序，避免 `sort` 原地修改 `useAsyncData` 的缓存数组，导致其他组件读到的顺序被意外改变。

边界用 `> 0` 和 `< length - 1` 判断，首篇没有上一篇、末篇没有下一篇，模板里对应位置渲染空占位保持网格对齐。

***

### Q24: 文章目录（TOC）的高亮是怎么跟随滚动的？

**答案：**

用 `IntersectionObserver` 监听 `article.prose` 内的 `h2/h3`，而不是监听 `scroll` 自己算位置：

```ts
observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    entry.isIntersecting
      ? visibleHeadings.add(entry.target.id)
      : visibleHeadings.delete(entry.target.id)
  }
  pickActive()
}, {
  root: props.container,          // 滚动容器，不是 viewport
  rootMargin: '0px 0px -80% 0px', // 只把视口顶部 20% 视为激活区
  threshold: 0,
})
```

三个设计要点：

1. **`root` 必须是真实的滚动容器**：详情页是 `h-screen overflow-y-auto` 的自定义容器，用默认 viewport 会导致判定完全错位
2. **`rootMargin` 收窄激活区**：只在标题进入顶部 20% 区域时激活，避免一屏多个标题同时高亮
3. **`pickActive` 按 DOM 顺序取第一个可见标题**：`Set` 的遍历顺序不可靠，必须再按文档顺序排一遍，否则快速滚动时高亮会跳来跳去

点击目录项时用 `scrollIntoView({ behavior: 'smooth' })`，并用 `history.replaceState` 更新 hash（不新增历史记录）。

***

### Q25: 阅读进度条为什么用 `requestAnimationFrame`？

**答案：**

`scroll` 事件触发频率极高（一次滚动可能几十次），直接在回调里读 `scrollTop` + 写响应式状态会造成**读写交替触发布局抖动**。

处理方式：

```ts
function onScroll() {
  if (rafId !== null) return          // 已有帧在排队，直接丢弃本次事件
  rafId = requestAnimationFrame(() => {
    rafId = null
    const max = el.scrollHeight - el.clientHeight
    progress.value = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 1
  })
}
```

- **rAF 合并**：一帧内最多更新一次，把高频事件降频到屏幕刷新率
- **`{ passive: true }`**：告诉浏览器不会调用 `preventDefault`，滚动不等待 JS，提升流畅度
- **`max <= 0` 时返回 1**：文章不足一屏时 `scrollHeight === clientHeight`，`0/0` 会得到 `NaN`，直接兜底为 100%

***

### Q26: 代码块的"复制"按钮是怎么注入的？为什么要用 DOM 注入而不是写组件？

**答案：**

Markdown 由 Nuxt Content 的 `ContentRenderer` 渲染，**没有 Vue 插槽可以插入按钮**，所以采用"水合后 DOM 增强"的模式：

```ts
function enhancePre(pre: HTMLPreElement) {
  if (pre.dataset.enhanced) return       // 幂等标记，防重复注入
  pre.dataset.enhanced = 'true'

  const lang = pre.className.match(/language-(\w+)/)?.[1] || ''
  const wrapper = document.createElement('div')
  wrapper.className = 'code-block group relative'
  pre.parentNode?.insertBefore(wrapper, pre)
  wrapper.appendChild(pre)

  // 语言标签 + 复制按钮都挂在 wrapper 上
}
```

复制逻辑做了两级降级：

```ts
if (navigator.clipboard?.writeText) {
  await navigator.clipboard.writeText(text)
} else {
  // HTTP 环境或老浏览器：隐藏 textarea + execCommand('copy')
}
```

**状态反馈用 CSS 动画而非 setTimeout**：

```ts
btn.classList.add('copied')
btn.addEventListener('animationend', () => btn.classList.remove('copied'), { once: true })
```

好处是组件卸载时不会残留定时器，点击多次也不会出现"上一个定时器把新状态清掉"的竞态。

**`dataset` 幂等标记**解决了 SPA 路由切换后重复注入的问题；再配合 `watch(() => route.path)` 重新扫描，保证每篇文章的代码块都被增强。

***

### Q27: 图片 Lightbox 是怎么实现的？

**答案：**

同样采用 DOM 增强模式（`useLightbox`）：

1. `enhance()` 收集容器内所有 `img.src` 到 `images` 数组（每次路由切换重新收集）
2. 给每个 `img` 绑定点击，记录下标后 `open(index)`
3. `open` 时设置 `document.body.style.overflow = 'hidden'` 锁定背景滚动
4. 键盘监听：`Esc` 关闭、`←/→` 切换
5. `onUnmounted` 移除键盘监听并兜底恢复 `overflow`（防止异常退出后页面永久无法滚动）
6. 追加 `img.loading = 'lazy'` 与 `decoding = 'async'`，减少首屏请求

Lightbox 组件用 `<Teleport to="body">` 渲染，避开父级 `overflow: hidden` 和 `z-index` 层叠上下文的裁剪问题。

***

### Q28: 分享链接带 `#标题` 时，为什么打开文章没滚动到对应位置？

**答案：**

因为锚点定位发生在 DOM 渲染之前：`data` 还没加载时 `document.getElementById(hash)` 返回 `null`，浏览器的原生 hash 滚动也找不到目标元素。

项目在数据就绪后手动补一次滚动：

```ts
watch(() => data.value, (val) => {
  if (!val) return
  const hash = route.hash.slice(1)
  if (!hash) return
  nextTick(() => {
    setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'auto' })
    }, 100)
  })
}, { immediate: true })
```

`nextTick` 等 Vue 把 DOM 更新完，`setTimeout(100)` 再等 `ContentRenderer` 内部渲染稳定（Shiki 高亮等）。标题元素上的 `scroll-mt-8` 则保证滚动后标题不会贴死在容器顶部。

***

## 七、SEO 与可发现性

### Q29: 全局 head 和页面级 head 是怎么分工的？

**答案：**

- **`app.vue`**：站点级默认值 —— `lang`、`canonical`、favicon、默认 OG/Twitter Card、WebSite JSON-LD、`titleTemplate`
- **各页面 `useHead`**：覆盖页面特定字段 —— 文章标题、描述、`og:type=article`、Article JSON-LD

```ts
titleTemplate: (title?: string) => title ? `${title} - ${SITE_NAME}` : SITE_NAME
```

这个函数形式的模板特意从 `nuxt.config.ts` 搬到了 `app.vue`：`nuxt.config` 的 `app.head` 需要可序列化，`titleTemplate` 只支持字符串，函数形式必须写在运行时 `useHead` 里。

**合并规则**：后声明的覆盖先声明的同名字段，未声明的继承全局默认值，所以文章页只写差异部分即可。

***

### Q30: canonical 为什么要随路由变化？子路径部署有什么坑？

**答案：**

站点部署在 `https://qzfrato.github.io/blog_nuxt/`，如果 canonical 写死成 `/`，所有文章都会被搜索引擎视为首页的副本，导致收录异常。

```ts
{ rel: 'canonical', href: `${SITE_URL}${route.path}` }
```

而**静态资源路径**必须带 baseURL：

```ts
const faviconHref = `${useRuntimeConfig().app.baseURL}favicon.ico`
```

因为 CI 里 `NUXT_APP_BASE_URL=/blog_nuxt/`，本地是 `/`。`public/` 下的图片同理，页面里用 `resolvePath()` 手动拼 baseURL：

```ts
function resolvePath(path: string) {
  if (path && path.startsWith('/') && !path.startsWith('http')) {
    return runtimeConfig.app.baseURL.replace(/\/$/, '') + path
  }
  return path
}
```

这是子路径部署最容易翻车的地方：**路由跳转由 router 处理没问题，但 `<img src="/images/x.png">` 这类绝对路径不会自动加前缀。**

***

### Q31: JSON-LD 结构化数据在项目里怎么用的？

**答案：**

两处：

- **`app.vue`**：`WebSite` 类型，声明站点名称、URL、语言
- **`pages/blog/[...slug].vue`**：`Article` 类型，声明 `headline`、`description`、`author`、`publisher`、`datePublished`、`mainEntityOfPage`

```ts
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: title,
  description,
  author: { '@type': 'Person', name: '乔治弟弟', url: SITE_URL },
  mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
  ...(datePublished ? { datePublished, dateModified: datePublished } : {}),
}
```

用展开运算符**按条件补字段**：frontmatter 没写 `date` 时不输出空字符串，避免结构化数据校验报错（Google 对空日期会判定无效）。

***

### Q32: sitemap 为什么排除了 `/projects`、`/about`、`/contact`？

**答案：**

这三个路径是 Reveal 首页**内部的幻灯片视角**，通过 `router.replace` 改地址栏实现，构建产物里**没有对应的独立 HTML 文件**。直接访问时 GitHub Pages 找不到文件，返回 404。

如果把它们写进 sitemap：

- 爬虫抓取到 404 页面
- 站点质量评分下降
- 用户的搜索结果点进去是错误页

所以 sitemap 只收录真正有静态产物的路由：

```ts
const urls = [
  { loc: '/', priority: '1.0', changefreq: 'monthly' },
  { loc: '/blog', priority: '0.9', changefreq: 'weekly' },
  ...articles.map(a => ({ loc: a.path, priority: '0.7', changefreq: 'monthly' })),
]
```

文章还额外输出 `lastmod`（来自 frontmatter `date`），方便爬虫判断更新频率。

**这条设计的通用原则**：sitemap 里的每个 URL 都必须是"用户直接访问能正常打开"的地址。

***

### Q33: RSS 是怎么生成的？做了哪些容错？

**答案：**

`server/routes/rss.xml.ts` 用 server route 动态生成 RSS 2.0：

1. `queryCollection(event, 'blog').all()` 取全部文章
2. 按 `date` 倒序，无日期的排最后，取前 20 篇（`MAX_ITEMS`）
3. 手写 XML 字符串，`title`/`description` 全部经过 `escapeXml`
4. `setHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')`

**关键容错**：`queryCollection` 失败时**不抛 500**，而是返回一个空 channel：

```ts
try {
  articles = await queryCollection(event, 'blog').all()
} catch (e) {
  console.error('[rss.xml] queryCollection failed:', e)
}
```

原因是 RSS 会被爬虫和订阅器高频抓取，一次 500 可能导致订阅器把这个源标记为失效。返回合法的空 feed 至少保证"订阅源仍然存在"。

**XML 转义为什么必须做**：文章标题里出现 `&`、`<` 会让 XML 解析器直接报错，整个 feed 失效。转义表覆盖 `& < > " '` 五个字符。

***

## 八、性能优化

### Q34: 这个项目做了哪些性能优化？按收益排序说说

**答案：**

| 优化项 | 做法 | 收益 |
| -- | -- | -- |
| 按路由代码分割 | Reveal.js 的 JS + CSS + 字体全部动态 `import` | 博客页少下载约 2.1MB 字体与样式 |
| 静态内容预渲染 | `nuxt generate` 生成 HTML，无服务端实时渲染 | 首屏 TTFB 接近 CDN 静态文件 |
| 图片懒加载 | 详情页图片统一 `loading="lazy"` + `decoding="async"` | 减少首屏请求数 |
| 图标内联 SVG | 自建 `Icon.vue`，只打包用到的 path | 替代 Font Awesome 全量 CDN（约 30KB CSS + 字体） |
| 滚动事件节流 | `requestAnimationFrame` + `{ passive: true }` | 滚动不掉帧 |
| IntersectionObserver | TOC 高亮替代 scroll 计算 | 无强制同步布局 |
| CDN 级缓存 | GitHub Pages 天然静态托管 | 全球边缘节点分发 |

**追问：为什么不用 NPM 图标库（如 `@nuxt/icon`）？**

本项目只用到 7 个图标。自建组件把 path 直接内联，最终产物只有几 KB，且零运行时依赖；图标库虽然开发方便，但会引入额外模块、图标集下载与客户端解析成本。**图标数量少时内联更划算，数量多时再换图标库。**

***

### Q35: 为什么幻灯片数据用静态 `import` 而不是 `useFetch`？

**答案：**

```ts
import siteConfig from '~/data/site-config.json'
```

原因有两个：

1. **SSG 下 `useFetch('/data/site-config.json')` 在服务端会因为 baseURL 前缀（`/blog_nuxt/`）拼出不存在的路径而 404**，导致预渲染时拿到空数据
2. 静态导入是**构建期**把 JSON 打进 bundle，SSR 和客户端都能直接拿到数据，没有首屏 loading 闪烁

代价是修改 JSON 后需要重新构建。对"幻灯片配置"这种低频变更的数据，完全可接受；如果改成后台可编辑，就应该走接口 + `useAsyncData`。

***

## 九、工程化与部署

### Q36: GitHub Actions 部署流程是怎样的？

**答案：**

```yaml
on:
  push:
    branches: ["master"]

jobs:
  build:
    steps:
      - checkout
      - 检测包管理器（有 yarn.lock 用 yarn，否则 npm ci）
      - setup-node@v4（Node 22 + 依赖缓存）
      - configure-pages@v5
      - 缓存 .nuxt
      - npm ci
      - npm run generate
        env:
          NUXT_APP_BASE_URL: /blog_nuxt/
          NITRO_PRESET: github-pages
      - upload-pages-artifact（path: .output/public）
  deploy:
    needs: build
    steps:
      - deploy-pages@v4
```

要点：

- **`npm ci`** 而不是 `npm install`：严格按 `package-lock.json` 安装，保证 CI 与本地依赖一致
- **`permissions`**：`pages: write` + `id-token: write`，OIDC 方式部署，无需 PAT
- **`concurrency`**：同一时间只允许一个部署，但 `cancel-in-progress: false`，避免把生产部署打断
- **`.nuxt` 缓存**：key 用 `package-lock.json` 的 hash，依赖没变时复用构建缓存

***

### Q37: `NUXT_APP_BASE_URL` 和 `NITRO_PRESET` 分别起什么作用？

**答案：**

- **`NUXT_APP_BASE_URL=/blog_nuxt/`**：设置 `app.baseURL`，让生成的 HTML 里所有资源引用、路由前缀都带上 `/blog_nuxt/`，匹配 GitHub Pages 的项目子路径
- **`NITRO_PRESET=github-pages`**：指定 Nitro 输出预设，产出适配 GitHub Pages 的静态目录结构（`.output/public`）

本地不设置这两个变量时，baseURL 为 `/`，所以 `npm run dev` 和本地 `npm run generate` 都能正常工作。

***

### Q38: 为什么 CI 里没有用 `configure-pages` 的 `static_site_generator: nuxt` 参数？

**答案：**

那个参数是 **Nuxt 2 时代**的设计：它会用 `ConfigParser` 在仓库里创建/修改 `nuxt.config.js`，注入 `router.base` 和 `target: 'static'`。

本项目用的是 `nuxt.config.ts`。`configure-pages` 检测不到 `.js` 文件时会**新建一个空白的 `nuxt.config.js`**，而 Nuxt 3 的配置解析优先级会让这个空白 JS 覆盖掉 TS 配置，结果是 `modules`、`css` 全部丢失，Tailwind 不加载，页面样式整体失效。

正确做法就是 Nuxt 3 的方式：只用环境变量 `NUXT_APP_BASE_URL` 设置 baseURL，不碰配置文件。

**这是一个很典型的"工具还在按上一代框架工作，升级后必须关掉旧开关"的案例。**

***

### Q39: TypeScript 严格模式在这个项目里带来了什么？

**答案：**

`nuxt.config.ts` 里开启：

```ts
typescript: { strict: true }
```

配合 `npm run typecheck`（`vue-tsc --noEmit`）可以在提交前拦截类型错误。

实际收益的例子：`site-config.json` 的 `slides` 被定义为**可辨识联合类型**：

```ts
type Slide = HeroSlide | ProjectsSlide | AboutSlide | ContactSlide
```

模板里 `slide.type === 'projects'` 会自动收窄到 `ProjectsSlide`，只有这个分支能访问 `slide.items`，写错字段名编译期就报错。

另外 `@types/reveal.js` 把 `deck.on` 定义为 `HTMLElement['addEventListener']`，事件参数被推断成 `Event`，访问 `indexh` 会报错。项目用 `interface SlideChangedEvent extends Event` 做精确化断言，而不是直接 `any`：

```ts
const e = event as SlideChangedEvent
currentIndex.value = e.indexh
```

**原则**：第三方类型不完整时，用最小范围的 interface + 断言补齐，而不是全局关掉检查。

***

### Q40: `.npmrc` 里的 `legacy-peer-deps=true` 是干什么的？

**答案：**

npm 7+ 默认严格校验 peerDependencies，任何版本冲突都会让 `npm install` 直接失败。项目里 Nuxt、Tailwind、Content 生态的 peer 声明经常滞后于主版本，开启 `legacy-peer-deps` 后 npm 退回 npm 6 的行为：**冲突只警告，不阻断安装**。

代价是可能装出实际不兼容的组合，所以这个开关应该配合"安装后必须跑一次 `npm run build` / `typecheck` 验证"来使用，不能当作万能的解药。

***

## 十、踩坑复盘与改进方向

### Q41: 这个项目遇到过哪些典型问题？怎么定位的？

**答案：**

| 现象 | 根因 | 解决 |
| -- | -- | -- |
| 从 PPT 页回博客，滚轮把页面弹回 PPT | Reveal 在 `document` 上的监听未清理 | `onUnmounted` 调 `destroy()` |
| CI 部署后页面完全没有样式 | `configure-pages` 生成了空白 `nuxt.config.js` 覆盖 TS 配置 | 移除 `static_site_generator: nuxt`，改用环境变量 |
| 预渲染时幻灯片数据为空 | SSG 下 `useFetch` 请求被 baseURL 前缀破坏 | 改为静态 `import` JSON |
| 预览静态站，图片 404 | `public/` 绝对路径未加 baseURL | `resolvePath()` 手动拼前缀 |
| 阅读进度条显示 `NaN%` | 文章不足一屏时 `scrollHeight - clientHeight = 0` | `max > 0 ? ... : 1` 兜底 |
| SPA 切换文章显示上一篇内容 | `useAsyncData` key 固定，命中旧缓存 | key 拼接 `route.path` |
| 搜索框输入 `[` 页面报错 | 动态 `RegExp` 未转义元字符 | `replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` |

**定位方法论**：先判断是"构建期问题"还是"运行时问题"——构建期看 CI 日志与产物目录，运行时用浏览器 DevTools 看元素、监听器与网络请求，比反复改代码试错高效得多。

***

### Q42: 如果文章量增长到上千篇，这个架构要怎么改？

**答案：**

按瓶颈逐个处理：

1. **搜索**：客户端全量过滤改为构建期生成索引 + `minisearch`/`orama` 增量检索，或接入 Algolia
2. **列表分页**：`queryCollection` 加 `limit/offset` 与服务端分页，避免一次性下发全部文章元数据
3. **详情页数据**：`useAsyncData` 每次仍会查内容库，可以按 `path` 预生成静态 JSON
4. **图片**：接入图片 CDN + `srcset` 响应式尺寸，或在构建期压缩转 WebP
5. **RSS/Sitemap**：超过单文件合理体积后拆分索引文件（`sitemapindex`）
6. **CI 构建时间**：开启 Nuxt Content 的构建缓存，或改为按需增量构建

当前架构的好处是这些改造都是**局部替换**：`extractPlainText`、`queryCollection` 的调用点都很集中，不需要重写页面。

***

### Q43: 这个项目还有哪些可以改进的地方？

**答案：**

- **404 处理**：catch-all 会吞掉所有未知路径，应校验 slug 是否存在后抛 404
- **无障碍**：Reveal 幻灯片可补充 `aria-live` 区域播报当前页码；Lightbox 可加焦点陷阱（focus trap）
- **测试**：目前没有自动化测试，至少应加 `typecheck` + 关键页面 SSR 状态码的冒烟测试到 CI
- **内容校验**：schema 中 `title` 已必填，但可以进一步约束日期格式、slug 唯一性
- **主题闪烁**：当前内联脚本是"默认深色"，若要支持跟随系统，应读 `prefers-color-scheme`
- **依赖维护**：`@nuxt/content`、`nuxt` 等大版本升级需要单独评估 breaking changes，不宜和日常升级混在一起

***

## 附：高频八股速答

### Q44: Nuxt 3 和 Vue 3 的关系是什么？

Nuxt 3 是建立在 Vue 3 之上的**全栈框架**：在 Vue 的基础上增加了文件路由、自动导入、SSR/SSG、Nitro 服务端、数据获取（`useAsyncData`/`useFetch`）、SEO head 管理等。Vue 负责视图层，Nuxt 负责工程与运行时能力。

### Q45: 什么是 hydration？hydration mismatch 怎么产生？

SSR 输出的 HTML 在客户端被 Vue 接管、复用已有 DOM 并绑定响应式的过程叫 hydration。如果服务端与客户端渲染结果不一致（如直接读 `window`/`localStorage`、`Date.now()`、随机数），Vue 会警告 mismatch 并回退重渲染。

规避方式：浏览器专属逻辑放 `onMounted` 或 `import.meta.client` 分支；主题这类必须在首帧生效的，用 head 内联脚本提前处理，再让组件状态与之对齐。

### Q46: `prerender` 和 `ssr: false` 的区别？

- **prerender**：构建期生成 HTML，仍然是 SSR 产物，只是提前算好，首屏有内容、SEO 友好
- **`ssr: false`**：完全客户端渲染，首屏是空壳，SEO 差，但部署最简单

本项目用 prerender + `nuxt generate`，兼顾 SEO 与静态托管。

### Q47: 为什么 `onBeforeRouteUpdate` 和 `watch(route)` 要区分使用？

`onBeforeRouteUpdate` 在**同一路由组件复用**、仅参数变化时触发（如 `/blog/a` → `/blog/b`），适合做导航前的同步；`watch(() => route.path)` 在任何路径变化后触发，适合做"DOM 更新后"的副作用（如重新注入代码块增强）。前者在导航流程内，后者在渲染之后。

### Q48: 静态站如何做 301/重定向？

GitHub Pages 不支持服务端重定向。可行方案：在 `nuxt.config.ts` 的 `routeRules` 里配置 `redirect`（构建期生成 meta refresh 或静态跳转页），或在 `public/` 放对应目录的 `index.html` 做跳转。纯静态环境下不要指望 HTTP 301。
