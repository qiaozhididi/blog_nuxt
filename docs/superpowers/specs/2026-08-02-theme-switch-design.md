# 暗色/亮色主题切换（代码块跟随）设计规范

> 日期：2026-08-02
> 状态：设计中

## 目标

实现完整的页面暗色/亮色主题切换功能，代码块 Shiki 高亮主题跟随页面主题切换。

- 用户可通过切换按钮在亮色/暗色模式间切换
- 主题选择持久化到 localStorage，刷新后保持
- 代码块高亮主题（Shiki）跟随页面主题
- 防止页面加载时的主题闪烁（FOUC）
- 默认暗色模式（与现有体验一致）

## 背景

- 现有项目纯暗色模式：硬编码 `bg-gray-900`、`text-white`、`prose-invert`，无 `dark:` 前缀
- Tailwind 未配置 `darkMode`（默认 `media`）
- @nuxt/content v3 使用默认 Shiki 配置（单主题 `github-dark`）
- 8 个文件、39 处硬编码暗色样式需适配双主题

## 技术方案

### 1. Tailwind `darkMode: 'class'`

通过 `html` 元素的 class 切换主题。默认（无 `dark` class）为亮色，`dark` class 存在时为暗色。

现有暗色样式需反转为：亮色默认 + `dark:` 暗色变体。

### 2. Shiki 多主题

@nuxt/content v3 配置多主题后，会在代码块 `<span>` 上生成 `--shiki-light` / `--shiki-dark` CSS 变量，`<pre>` 上生成 `--shiki-light-bg` / `--shiki-dark-bg`。通过 CSS 按 `html.dark` / `html.light` 切换。

### 3. 防闪烁（FOUC）

在 `<head>` 注入内联脚本，在页面渲染前读 localStorage 设 class。

### 4. 主题状态管理

`useState` 全局状态 + `localStorage` 持久化。

## 实现步骤清单

### Task 1: 基础配置（Tailwind + Shiki）

**Files:**
- Modify: `tailwind.config.js`
- Modify: `nuxt.config.ts`
- Modify: `assets/css/main.css`

**步骤:**

1. **修改 `tailwind.config.js`**：添加 `darkMode: 'class'`

```js
export default {
  darkMode: 'class',  // 新增：class 策略，通过 html 元素 class 切换
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
  ],
  theme: {
    extend: {},
  },
  plugins: [typography],
}
```

2. **修改 `nuxt.config.ts`**：添加 @nuxt/content Shiki 多主题配置

@nuxt/content v3 配置路径为 `content.build.markdown.highlight`，`theme` 对象的键名对应 `html` 上的 class（`default` 为无 class 时的主题，`dark` 为 `html.dark` 时的主题）：

```ts
// 在 modules 后添加 content 配置
content: {
  build: {
    markdown: {
      highlight: {
        // 多主题：default=亮色（html 无 dark class），dark=暗色（html.dark）
        theme: {
          default: 'github-light',
          dark: 'github-dark',
        },
      },
    },
  },
},
```

3. **修改 `assets/css/main.css`**：添加 Shiki 多主题 CSS 变量切换样式

```css
/* Shiki 多主题：暗色模式（html.dark）覆盖为 dark 主题变量 */
/* 亮色（默认）使用 default 主题的内联颜色，无需额外 CSS */
html.dark .shiki,
html.dark .shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}
```

### Task 2: 主题状态管理 + 防闪烁

**Files:**
- Create: `composables/useTheme.ts`
- Modify: `app.vue`

**步骤:**

1. **创建 `composables/useTheme.ts`**

```ts
export type Theme = 'light' | 'dark'

export function useTheme() {
  // useState 全局共享，避免各组件实例各自维护
  const theme = useState<Theme>('theme', () => 'dark')

  // 应用主题：暗色加 dark class，亮色移除
  // Tailwind darkMode:'class' 和 Shiki dark 主题都基于 html.dark class
  function applyTheme(t: Theme) {
    if (import.meta.client) {
      const html = document.documentElement
      if (t === 'dark') {
        html.classList.add('dark')
      } else {
        html.classList.remove('dark')
      }
      try {
        localStorage.setItem('theme', t)
      } catch (e) {
        // localStorage 被禁用或隐私模式下静默失败
      }
    }
  }

  // 切换主题
  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    applyTheme(theme.value)
  }

  // 初始化：从 localStorage 读取（防闪烁脚本已设 class，此处同步状态）
  function init() {
    if (import.meta.client) {
      const stored = localStorage.getItem('theme') as Theme | null
      theme.value = stored || 'dark'
    }
  }

  return { theme, toggle, init }
}
```

2. **修改 `app.vue`**：注入防闪烁脚本 + 初始化主题

在 `useHead` 中添加内联脚本：

```ts
useHead(() => ({
  htmlAttrs: { lang: 'zh-CN' },
  titleTemplate: (title?: string) => title ? `${title} - ${SITE_NAME}` : SITE_NAME,
  // ... 现有 link/meta/script ...

  // 防闪烁脚本：在页面渲染前读 localStorage，亮色不加 class，其他加 dark class
  script: [
    // 现有 WebSite JSON-LD...
    {
      // 内联脚本，在 body 渲染前执行，避免主题闪烁
      // 只接受 'light'，其他值（含 null）默认暗色加 dark class
      innerHTML: `if(localStorage.getItem('theme')!=='light')document.documentElement.classList.add('dark')`,
      tagPosition: 'head',
    },
  ],
}))
```

在 `app.vue` 的 `<script setup>` 中调用 `init`：

```ts
const { init } = useTheme()
onMounted(() => init())
```

### Task 3: 主题切换 UI

**Files:**
- Create: `components/ThemeToggle.vue`
- Modify: `pages/blog/[...slug].vue`

**步骤:**

1. **创建 `components/ThemeToggle.vue`**

```vue
<template>
  <button
    @click="toggle"
    :aria-label="theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'"
    class="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
  >
    <!-- 暗色模式显示太阳（点击切换到亮色） -->
    <svg v-if="theme === 'dark'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
    <!-- 亮色模式显示月亮（点击切换到暗色） -->
    <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  </button>
</template>

<script setup lang="ts">
const { theme, toggle } = useTheme()
</script>
```

2. **修改 `pages/blog/[...slug].vue`**：在导航栏添加 ThemeToggle

在现有 nav 中添加：

```html
<nav class="mb-8 flex items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-400">
  <div class="flex items-center gap-4">
    <NuxtLink to="/" class="hover:text-gray-900 dark:hover:text-white transition">首页</NuxtLink>
    <span>/</span>
    <NuxtLink to="/blog" class="hover:text-gray-900 dark:hover:text-white transition">博客</NuxtLink>
    <span>/</span>
    <span class="text-gray-900 dark:text-white">{{ data?.title }}</span>
  </div>
  <ThemeToggle />
</nav>
```

### Task 4: 页面 CSS 主题适配（39 处改动）

**Files:**
- Modify: `pages/blog/[...slug].vue`
- Modify: `pages/blog/index.vue`
- Modify: `pages/index.vue`
- Modify: `pages/[...slug].vue`（PPT 页面，仅改外层背景）
- Modify: `error.vue`
- Modify: `components/ReadingProgress.vue`
- Modify: `components/TableOfContents.vue`

**主题映射规则:**

| 暗色（现有） | 亮色 + 暗色变体 |
|---|---|
| `bg-gray-900` | `bg-white dark:bg-gray-900` |
| `bg-gray-800/50` | `bg-gray-100 dark:bg-gray-800/50` |
| `text-white` | `text-gray-900 dark:text-white` |
| `text-gray-400` | `text-gray-600 dark:text-gray-400` |
| `text-gray-500` | `text-gray-500 dark:text-gray-500`（不变） |
| `border-gray-700/50` | `border-gray-300 dark:border-gray-700/50` |
| `prose-invert` | `dark:prose-invert`（亮色用默认 prose） |
| `from-purple-400 to-pink-600` | 不变（渐变在双主题都适用） |

**步骤:**

对每个文件，按映射规则将硬编码暗色类改为双主题变体。示例（博客详情页）：

```html
<!-- 改前 -->
<div class="h-screen overflow-y-auto bg-gray-900 text-white p-8">
<!-- 改后 -->
<div class="h-screen overflow-y-auto bg-white text-gray-900 dark:bg-gray-900 dark:text-white p-8">

<!-- 改前 -->
<article class="prose prose-invert prose-lg ... bg-gray-800/50 ... border-gray-700/50">
<!-- 改后 -->
<article class="prose dark:prose-invert prose-lg ... bg-gray-100 dark:bg-gray-800/50 ... border-gray-300 dark:border-gray-700/50">
```

**博客详情页 `<style>` 块中的 Shiki 背景调整:**

现有 `.prose pre { @apply bg-gray-900 border border-gray-700; }` 会覆盖 Shiki 主题色。需改为：

```css
.prose pre {
  @apply border border-gray-300 dark:border-gray-700;
  /* 背景由 Shiki CSS 变量控制，不硬编码 */
}
```

### Task 5: 验证与提交

**步骤:**

1. **启动 dev server 验证:**
   - 默认暗色：页面加载无闪烁，代码块暗色高亮
   - 点击切换到亮色：背景变白，文字变深，代码块亮色高亮
   - 刷新页面：主题保持，无 FOUC
   - SPA 路由切换：主题保持

2. **SSG 构建验证:**
   - `npm run generate` 成功
   - 构建产物包含双主题 CSS

3. **提交（分 3 次）:**
   - `基础：Tailwind darkMode + Shiki 多主题 + useTheme + 防闪烁`
   - `新增：ThemeToggle 组件 + 博客详情页集成`
   - `适配：全站 CSS 亮/暗双主题变体`

## 边界情况

- **首次访问无 localStorage**：默认暗色（`|| 'dark'`）
- **localStorage 被禁用**：`applyTheme` 中 try/catch 保护（需补充）
- **SSG 构建**：防闪烁脚本在静态 HTML 中，客户端 hydration 前执行
- **PPT 页面**（`pages/[...slug].vue`）：Reveal.js 自带主题，暂不适配双主题，仅外层容器背景适配
- **prose 排版**：亮色用默认 `prose`，暗色用 `dark:prose-invert`

## 不做的功能（YAGNI）

- 系统偏好检测（`prefers-color-scheme`）——用户手动切换优先
- 主题切换动画过渡——保持简单
- 首页/列表页的切换按钮——先做博客详情页（布局允许后续扩展）
- PPT 页面（Reveal.js）主题适配——Reveal 自有主题系统

## 涉及文件清单

**新建:**
- `composables/useTheme.ts`
- `components/ThemeToggle.vue`

**修改:**
- `tailwind.config.js`（darkMode）
- `nuxt.config.ts`（content.highlight）
- `assets/css/main.css`（Shiki CSS 变量）
- `app.vue`（防闪烁脚本 + init）
- `pages/blog/[...slug].vue`（CSS 适配 + ThemeToggle）
- `pages/blog/index.vue`（CSS 适配）
- `pages/index.vue`（CSS 适配）
- `pages/[...slug].vue`（PPT 外层背景适配）
- `error.vue`（CSS 适配）
- `components/ReadingProgress.vue`（CSS 适配）
- `components/TableOfContents.vue`（CSS 适配）

## 测试策略

1. **功能验证**：暗→亮→暗切换，代码块主题跟随
2. **持久化**：刷新后主题保持
3. **防闪烁**：刷新页面无白屏/暗屏闪烁
4. **SSG**：`npm run generate` 构建成功
5. **可访问性**：切换按钮有 aria-label，图标 aria-hidden
