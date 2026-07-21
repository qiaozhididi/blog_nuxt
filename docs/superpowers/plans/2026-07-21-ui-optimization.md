# UI 优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复博客详情页滚动异常、按钮改为玻璃态、幻灯片翻页提示与移动端优化、设置页面标题为「乔治弟弟_Blog」。

**Architecture:** 在不改变 Reveal.js 幻灯片首页架构的前提下，修改 4 处文件解决展示与交互问题：移除 app.vue 全局 overflow:hidden 让页面自治滚动；统一按钮定义为半透明玻璃态；增强幻灯片 controls 与移动端指示器；配置 Nuxt 标题与 titleTemplate。

**Tech Stack:** Nuxt 3、Vue 3、Reveal.js 5、Tailwind CSS 3.4、Nuxt Content 3

## Global Constraints

- Git commit message 用中文，简短描述
- 一功能一提交（用户偏好）
- 不引入新依赖（现有 reveal.js / tailwindcss 足够）
- 不修改 site-config.json 数据结构
- 不重构 Reveal.js 初始化逻辑（仅追加事件监听与 UI 元素）
- 项目无测试框架，验证策略为「构建验证 + 浏览器手动验证」
- 文件路径均基于 `/Users/qzfrato/blog_nuxt/`
- Tailwind 工具类通过 `@apply` 使用，scoped style 中用 `:deep()` 穿透 Reveal DOM

## File Structure

| 文件 | 职责 | 本次改动 |
|---|---|---|
| [app.vue](file:///Users/qzfrato/blog_nuxt/app.vue) | 全局根组件与基础样式 | 移除全局 overflow:hidden，让页面自治滚动 |
| [assets/css/main.css](file:///Users/qzfrato/blog_nuxt/assets/css/main.css) | 全局样式与 .btn-primary 定义 | 重写 .btn-primary 为玻璃态 |
| [pages/[...slug].vue](file:///Users/qzfrato/blog_nuxt/pages/%5B...slug%5D.vue) | 首页幻灯片（Reveal.js） | 删除 scoped .btn-primary 重复；加 controls 增强、首屏提示、移动端指示器、触摸滚动优化 |
| [pages/blog/[...slug].vue](file:///Users/qzfrato/blog_nuxt/pages/blog/%5B...slug%5D.vue) | 博客详情页 | 加 useHead 动态标题 |
| [pages/blog/index.vue](file:///Users/qzfrato/blog_nuxt/pages/blog/index.vue) | 博客列表页 | 加 useHead 标题 |
| [nuxt.config.ts](file:///Users/qzfrato/blog_nuxt/nuxt.config.ts) | Nuxt 配置 | app.head 加 title 与 titleTemplate |

---

### Task 1: 修复博客详情页滚动

**Files:**
- Modify: `app.vue:13-17`

**Interfaces:**
- Consumes: 无
- Produces: 全局 `html, body, #__nuxt` 不再强制 `overflow: hidden`，由各页面根 div 自治控制滚动。首页 `pages/[...slug].vue` 根 div 已有 `overflow-hidden`，博客详情页 `pages/blog/[...slug].vue` 与列表页 `pages/blog/index.vue` 根 div 均为 `h-screen overflow-y-auto`，移除全局 hidden 后即可正常滚动。

- [ ] **Step 1: 修改 app.vue 移除全局 overflow:hidden**

打开 [app.vue](file:///Users/qzfrato/blog_nuxt/app.vue)，定位到第 13-17 行：

```css
html, body, #__nuxt {
  height: 100%;
  width: 100%;
  overflow: hidden;
}
```

改为（删除 `overflow: hidden;` 一行，保留 height/width）：

```css
html, body, #__nuxt {
  height: 100%;
  width: 100%;
}
```

- [ ] **Step 2: 构建验证**

Run: `npm run generate`
Expected: 构建成功，无报错，`.output/public` 目录存在。

- [ ] **Step 3: 手动验证博客详情页滚动**

Run: `npm run preview`

浏览器访问 `/blog`（博客列表）与任意博客详情页（如 `/blog/openclaw`）：
- 滚动到底部继续向下滚，页面不再跳动/异常回弹
- 滚动到顶部继续向上滚，无异常
- 滚动条正常显示，滚动流畅

同时验证首页 `/` 幻灯片：
- 首页仍正常显示，无意外滚动条（首页根 div 的 `overflow-hidden` 生效）
- 幻灯片翻页正常

- [ ] **Step 4: Commit**

```bash
git add app.vue
git commit -m "修复博客详情页滚动：移除全局 overflow:hidden，由页面自治控制"
```

---

### Task 2: 按钮改为半透明玻璃态

**Files:**
- Modify: `assets/css/main.css:11-18`
- Modify: `pages/[...slug].vue:433-451`（删除 scoped 中 .btn-primary 重复定义）

**Interfaces:**
- Consumes: 无
- Produces: 全局 `.btn-primary` 统一为玻璃态（半透明背景 + backdrop-blur + 白字 + 细边框），所有使用 `.btn-primary` 的按钮（首页 hero "开始探索" 按钮、projects "查看详情" 按钮）都继承此样式。

- [ ] **Step 1: 重写 main.css 的 .btn-primary**

打开 [assets/css/main.css](file:///Users/qzfrato/blog_nuxt/assets/css/main.css)，定位到第 11-18 行：

```css
/* Global Button Style */
.btn-primary {
  @apply bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-full shadow-lg transform transition hover:scale-105 hover:shadow-2xl border-none cursor-pointer;
}

.btn-primary:hover {
  @apply from-purple-500 to-pink-500;
}
```

替换为玻璃态定义：

```css
/* Global Button Style - 半透明玻璃态 */
.btn-primary {
  @apply inline-block px-8 py-3 rounded-full font-bold text-lg
         transition-all duration-300 transform hover:-translate-y-1;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: white !important;
  box-shadow: 0 4px 14px 0 rgba(0, 0, 0, 0.25);
  cursor: pointer;
}

.btn-primary:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
}
```

保留下方第 20-22 行的 `.reveal .btn-primary { color: white !important; }` 不动。

- [ ] **Step 2: 删除 pages/[...slug].vue scoped 中的 .btn-primary 重复定义**

打开 [pages/[...slug].vue](file:///Users/qzfrato/blog_nuxt/pages/%5B...slug%5D.vue)，定位到 `<style scoped>` 块（第 433 行起）。

删除第 434-451 行的 `.btn-primary` 与 `.btn-primary:hover` 定义（包括注释 `/* 按钮基础样式规范 */`）：

```css
/* 按钮基础样式规范 */
.btn-primary {
  @apply px-8 py-3 rounded-full font-bold text-lg transition-all duration-300 transform hover:-translate-y-1 inline-block;
  /* 使用高亮背景和深色文字，确保对比度 */
  background-color: white;
  color: #0f172a !important; /* 强制覆盖 Reveal.js 的链接颜色 */
  box-shadow: 0 4px 14px 0 rgba(255, 255, 255, 0.39);
  position: relative;
  z-index: 50;
  pointer-events: auto;
  cursor: pointer;
}

.btn-primary:hover {
  @apply bg-gray-100;
  box-shadow: 0 6px 20px rgba(255, 255, 255, 0.23);
  color: #000000 !important;
}
```

保留 `<style scoped>` 块的其余部分（`.slide-content-wrapper`、`:deep(.reveal ...)` 等定义）。

- [ ] **Step 3: 构建验证**

Run: `npm run generate`
Expected: 构建成功，无 CSS syntax-error warning。

- [ ] **Step 4: 手动验证按钮样式**

Run: `npm run preview`

浏览器访问首页 `/`：
- hero 首屏"开始探索"按钮显示为半透明玻璃态（深色半透明背景 + 白字 + 细边框 + 模糊效果）
- hover 时背景变亮、边框变亮、阴影加深、按钮上移
- 点击 projects 幻灯片"查看详情"按钮，样式一致

- [ ] **Step 5: Commit**

```bash
git add assets/css/main.css pages/[...slug].vue
git commit -m "按钮改为半透明玻璃态：统一 main.css 定义，删除 scoped 重复"
```

---

### Task 3: 幻灯片翻页提示与移动端优化

**Files:**
- Modify: `pages/[...slug].vue`（template 加首屏提示与移动端指示器；script 加 currentIndex 状态与 slidechanged 更新；style 加 controls 增强、指示器样式、移动端优化）

**Interfaces:**
- Consumes: Task 2 完成的全局 `.btn-primary` 玻璃态定义
- Produces: 首页幻灯片有更明显的翻页提示（桌面端放大 controls + 首屏"向右探索"提示）；移动端有底部页面指示器（`当前/总数`）并隐藏过小的默认 controls；移动端触摸滚动有 iOS 惯性。

- [ ] **Step 1: script 中加 currentIndex 状态**

打开 [pages/[...slug].vue](file:///Users/qzfrato/blog_nuxt/pages/%5B...slug%5D.vue)，定位到第 174-176 行：

```ts
let revealInstance: any = null;
const revealContainer = ref<HTMLElement | null>(null);
const initStatus = ref('Waiting...');
```

在 `initStatus` 行之后追加 `currentIndex` 状态：

```ts
let revealInstance: any = null;
const revealContainer = ref<HTMLElement | null>(null);
const initStatus = ref('Waiting...');
const currentIndex = ref(0);
```

- [ ] **Step 2: slidechanged 事件中更新 currentIndex**

定位到第 412-422 行的 `deck.on('slidechanged', ...)` 回调：

```ts
// 监听切换事件，更新 URL
deck.on('slidechanged', (event: any) => {
    const h = event.indexh;
    const v = event.indexv;
    const newPath = getPathFromIndices(h, v);
    
    // 使用 router.replace 更新 URL
    if (route.path !== newPath) {
         router.replace(newPath);
    }
});
```

在回调开头加一行 `currentIndex.value = event.indexh;`：

```ts
// 监听切换事件，更新 URL
deck.on('slidechanged', (event: any) => {
    currentIndex.value = event.indexh;
    const h = event.indexh;
    const v = event.indexv;
    const newPath = getPathFromIndices(h, v);
    
    // 使用 router.replace 更新 URL
    if (route.path !== newPath) {
         router.replace(newPath);
    }
});
```

同时在 `deck.slide(h, v);`（第 410 行）跳转初始页之后追加一行同步初始 index：

定位第 409-410 行：
```ts
        // 跳转到初始页面
        deck.slide(h, v);
```

改为：
```ts
        // 跳转到初始页面
        deck.slide(h, v);
        currentIndex.value = h;
```

- [ ] **Step 3: template 中加首屏翻页提示**

定位到第 121-124 行的 `</section></div>` 收尾：

```vue
        </section>

      </div>
    </div>
```

在 `</section>` 之前（即每个 section 末尾、所有 type 分支之后）追加首屏翻页提示。修改后的结构：

```vue
          <!-- Type: Contact -->
          <div v-else-if="slide.type === 'contact'" class="slide-content-wrapper">
            ... existing contact content ...
          </div>

          <!-- 首屏翻页提示（仅第一张幻灯片显示） -->
          <div v-if="index === 0" class="slide-nav-hint">
            <span class="hidden md:inline">向右探索</span>
            <i class="fa fa-arrow-right"></i>
          </div>

        </section>
```

即在 `</section>`（第 121 行）之前插入上述 `slide-nav-hint` 块。注意 `v-if="index === 0"` 确保只在首屏显示。

- [ ] **Step 4: template 中加移动端页面指示器**

定位到第 15 行的 Reveal 容器开始：

```vue
    <!-- Reveal Content -->
    <div v-else class="reveal theme-font-montserrat h-full w-full" ref="revealContainer">
      <div class="slides">
        ...
      </div>
    </div>
```

在该 `</div>`（Reveal 容器闭合，第 124 行 `</div>` 之前）之后、根 div 闭合之前，加移动端指示器。修改后：

```vue
    <!-- Reveal Content -->
    <div v-else class="reveal theme-font-montserrat h-full w-full" ref="revealContainer">
      <div class="slides">
        ...
      </div>
    </div>

    <!-- 移动端页面指示器（桌面端隐藏） -->
    <div v-if="config" class="mobile-page-indicator md:hidden">
      {{ currentIndex + 1 }} / {{ config.slides.length }}
    </div>
    
  </div>
```

即在第 124 行 `</div>`（Reveal 容器闭合）之后、第 126 行 `</div>`（根 div 闭合）之前插入 `mobile-page-indicator` 块。

- [ ] **Step 5: style 中加首屏提示与指示器样式**

定位到 `<style scoped>` 块末尾（第 519-534 行的自定义动画之前）。在 `.animate-blob` 定义之前追加：

```css
/* 首屏翻页提示 */
.slide-nav-hint {
  position: absolute;
  bottom: 2rem;
  right: 2rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  z-index: 20;
  pointer-events: none;
  animation: hint-pulse 2s ease-in-out infinite;
}

@keyframes hint-pulse {
  0%, 100% { opacity: 0.5; transform: translateX(0); }
  50% { opacity: 1; transform: translateX(4px); }
}

/* 移动端页面指示器 */
.mobile-page-indicator {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  z-index: 100;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  pointer-events: none;
}
```

- [ ] **Step 6: style 中加桌面端 controls 增强**

在 `<style scoped>` 块中、移动端适配块（`@media (max-width: 767px)`，第 503 行）之前追加：

```css
/* 桌面端 Reveal controls 增强 */
:deep(.reveal .controls) {
  font-size: 24px;
}
:deep(.reveal .controls button) {
  opacity: 0.7;
  transition: opacity 0.2s;
}
:deep(.reveal .controls button:hover) {
  opacity: 1;
}
```

- [ ] **Step 7: style 中移动端隐藏默认 controls + 触摸滚动优化**

定位到第 502-517 行的移动端适配块：

```css
/* 移动端适配 */
@media (max-width: 767px) {
  :deep(.reveal) {
      overflow-y: auto !important;
  }
  :deep(.reveal .slides) {
      height: auto !important;
      text-align: left;
      overflow: visible !important;
  }
  :deep(.reveal .slides > section) {
      height: auto !important;
      min-height: 100vh;
      margin-bottom: 0;
  }
}
```

替换为（加 `-webkit-overflow-scrolling: touch` 与隐藏默认 controls）：

```css
/* 移动端适配 */
@media (max-width: 767px) {
  :deep(.reveal) {
      overflow-y: auto !important;
      -webkit-overflow-scrolling: touch;
  }
  :deep(.reveal .slides) {
      height: auto !important;
      text-align: left;
      overflow: visible !important;
  }
  :deep(.reveal .slides > section) {
      height: auto !important;
      min-height: 100vh;
      margin-bottom: 0;
  }
  /* 移动端隐藏 Reveal 默认 controls（太小难点击，用底部指示器替代） */
  :deep(.reveal .controls) {
      display: none !important;
  }
  /* 移动端隐藏首屏翻页提示（用指示器替代） */
  .slide-nav-hint {
      display: none !important;
  }
}
```

- [ ] **Step 8: 构建验证**

Run: `npm run generate`
Expected: 构建成功，无报错。

- [ ] **Step 9: 手动验证桌面端翻页提示**

Run: `npm run preview`

浏览器访问首页 `/`（桌面端宽度）：
- 首屏右下角显示"向右探索"+ 箭头，带脉冲动画
- Reveal 右下角 controls 箭头放大，hover 时透明度变化
- 点击 controls 或滚轮翻页，"向右探索"提示在第二张幻灯片后消失（仅 index===0 显示）

- [ ] **Step 10: 手动验证移动端（Chrome DevTools 移动端模拟）**

在 Chrome DevTools 切换到移动端模拟（如 iPhone 14，宽度 390px）：
- 首屏无"向右探索"提示（移动端隐藏）
- Reveal 默认 controls 不显示
- 底部中央显示页面指示器（如 `1 / 4`）
- 左右/上下滑动切换幻灯片，指示器数字更新
- 触摸滚动流畅（iOS 惯性）

- [ ] **Step 11: Commit**

```bash
git add pages/[...slug].vue
git commit -m "幻灯片翻页提示与移动端优化：controls增强、首屏提示、移动端指示器"
```

---

### Task 4: 页面标题配置

**Files:**
- Modify: `nuxt.config.ts:9-20`
- Modify: `pages/blog/[...slug].vue:29-32`
- Modify: `pages/blog/index.vue:47-58`

**Interfaces:**
- Consumes: 无
- Produces: 浏览器标签标题统一为「乔治弟弟_Blog」；博客详情页为「文章标题 - 乔治弟弟_Blog」；博客列表页为「博客 - 乔治弟弟_Blog」；首页为「乔治弟弟_Blog」。

- [ ] **Step 1: nuxt.config.ts 加 title 与 titleTemplate**

打开 [nuxt.config.ts](file:///Users/qzfrato/blog_nuxt/nuxt.config.ts)，定位到第 9-20 行的 `app` 块：

```ts
  app: {
    // baseURL 由 Nuxt 自动从 NUXT_APP_BASE_URL 环境变量读取
    // CI 中设置 NUXT_APP_BASE_URL=/blog_nuxt/，本地未设置时默认 /
    head: {
      link: [
        {
          rel: "stylesheet",
          href: "https://cdn.staticfile.org/font-awesome/4.7.0/css/font-awesome.css",
        },
      ],
    },
  },
```

在 `head:` 内、`link:` 之前加 `title` 与 `titleTemplate`：

```ts
  app: {
    // baseURL 由 Nuxt 自动从 NUXT_APP_BASE_URL 环境变量读取
    // CI 中设置 NUXT_APP_BASE_URL=/blog_nuxt/，本地未设置时默认 /
    head: {
      title: '乔治弟弟_Blog',
      titleTemplate: (title?: string) => title ? `${title} - 乔治弟弟_Blog` : '乔治弟弟_Blog',
      link: [
        {
          rel: "stylesheet",
          href: "https://cdn.staticfile.org/font-awesome/4.7.0/css/font-awesome.css",
        },
      ],
    },
  },
```

- [ ] **Step 2: 博客详情页加 useHead 动态标题**

打开 [pages/blog/[...slug].vue](file:///Users/qzfrato/blog_nuxt/pages/blog/%5B...slug%5D.vue)，定位到第 29-32 行的 script 块：

```vue
<script setup>
const route = useRoute();
// 获取当前路径对应的文章内容
const { data } = await useAsyncData('page-data', () => queryCollection('blog').path(route.path).first());

definePageMeta({
  key: 'blog-detail',
});
</script>
```

在 `const { data } = ...` 行之后、`definePageMeta` 之前加 `useHead`：

```vue
<script setup>
const route = useRoute();
// 获取当前路径对应的文章内容
const { data } = await useAsyncData('page-data', () => queryCollection('blog').path(route.path).first());

// 动态设置页面标题为文章标题
useHead(() => ({
  title: data.value?.title || '文章',
}));

definePageMeta({
  key: 'blog-detail',
});
</script>
```

- [ ] **Step 3: 博客列表页加 useHead 标题**

打开 [pages/blog/index.vue](file:///Users/qzfrato/blog_nuxt/pages/blog/index.vue)，定位到第 47-58 行的 script 块：

```vue
<script setup>
console.log('Blog list page loaded');

const { data: list, pending, error } = await useAsyncData('blog-list', async () => {
  const all = await queryCollection('blog').all();
  return all.filter(article => !article.path.split('/').pop().startsWith('.'));
});

definePageMeta({
  key: 'blog-list',
});
</script>
```

在 `definePageMeta` 之前加 `useHead`：

```vue
<script setup>
console.log('Blog list page loaded');

const { data: list, pending, error } = await useAsyncData('blog-list', async () => {
  const all = await queryCollection('blog').all();
  return all.filter(article => !article.path.split('/').pop().startsWith('.'));
});

useHead({
  title: '博客',
});

definePageMeta({
  key: 'blog-list',
});
</script>
```

- [ ] **Step 4: 构建验证**

Run: `npm run generate`
Expected: 构建成功，无报错。

- [ ] **Step 5: 手动验证页面标题**

Run: `npm run preview`

浏览器访问各页面，检查标签标题：
- 首页 `/`：标签显示「乔治弟弟_Blog」
- 博客列表 `/blog`：标签显示「博客 - 乔治弟弟_Blog」
- 博客详情 `/blog/xxx`：标签显示「文章标题 - 乔治弟弟_Blog」

- [ ] **Step 6: Commit**

```bash
git add nuxt.config.ts pages/blog/[...slug].vue pages/blog/index.vue
git commit -m "配置页面标题：首页乔治弟弟_Blog，博客页动态标题"
```

---

## Self-Review

### 1. Spec coverage
- 决策1（滚动修复）→ Task 1 ✓
- 决策2（按钮玻璃态）→ Task 2 ✓
- 决策3（翻页提示+移动端）→ Task 3（3.1 controls增强、3.2 首屏提示、3.3 移动端指示器、3.4 触摸滚动）✓
- 决策4（页面标题）→ Task 4 ✓
- 改动清单 6 个文件全部覆盖 ✓

### 2. Placeholder scan
- 无 TBD/TODO ✓
- 所有代码步骤都有完整代码 ✓
- 验证步骤都有具体命令与预期 ✓

### 3. Type consistency
- `currentIndex` 在 Task 3 Step 1 定义为 `ref(0)`，Step 2 在 slidechanged 中赋值 `event.indexh`（number），Step 4 模板中 `currentIndex + 1` —— 类型一致 ✓
- `useHead` 在 Task 4 中用法一致（详情页用函数式响应 data 变化，列表页用对象式静态值）✓
- `.btn-primary` 在 Task 2 统一定义后，Task 3 不再涉及按钮样式，无冲突 ✓

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-21-ui-optimization.md`. Two execution options:

**1. Subagent-Driven (recommended)** - 我为每个 task 派发独立 subagent，task 间做 review，快速迭代

**2. Inline Execution** - 在当前会话中按 executing-plans 批量执行，带 checkpoint 审查

请选择执行方式。
