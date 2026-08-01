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

      <aside v-if="data?.body?.toc?.links?.length" class="hidden lg:block w-64 flex-shrink-0">
        <TableOfContents :container="scrollContainer" :toc="data?.body?.toc" />
      </aside>
    </div>
  </div>
</template>

<script setup>
// 滚动容器 ref：传给 ReadingProgress / TableOfContents，监听滚动与 IntersectionObserver
// 注意：本文件 <script setup> 未声明 lang="ts"，用 ref(null) 避免 TS 类型注解；
// Vue 会在 mounted 后自动将 DOM 元素赋值给 scrollContainer.value
const scrollContainer = ref(null)

const route = useRoute();
// key 随路由变化，配合组件按路由 remount（见下方已移除静态 definePageMeta key），
// 确保 SPA 切换文章时重新获取对应内容，而非复用上一篇缓存
const { data } = await useAsyncData(`page-data-${route.path}`, () => queryCollection('blog').path(route.path).first());

// 代码块增强：注入复制按钮 + 语言标签（DOM 层，hydration 后执行）
// scrollContainer 与 route 已声明，直接复用；() => route.path 作为路由切换 trigger
useCodeBlockEnhancer(scrollContainer, () => route.path)

// 深链锚点：访问 /blog/xxx#section 时自动滚动到对应章节
// 等 data 加载 + DOM 渲染后执行；用 'auto' 瞬间定位（非 smooth 动画）
watch(() => data.value, (val) => {
  if (!val) return
  const hash = route.hash.slice(1)
  if (!hash) return
  nextTick(() => {
    setTimeout(() => {
      const el = document.getElementById(hash)
      if (el) el.scrollIntoView({ behavior: 'auto' })
    }, 100)
  })
}, { immediate: true })

// 文章不存在时抛 404，避免返回 200 + 占位文本（SEO/UX）
if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: '文章不存在', fatal: true });
}

// 动态设置页面标题与描述（取自文章 frontmatter，缺失时兜底）
useHead(() => {
  const title = data.value?.title || '文章'
  const description = data.value?.description || '乔治弟弟的博客文章'
  const datePublished = data.value?.date ? new Date(data.value.date).toISOString() : ''
  const articleUrl = `https://qzfrato.github.io/blog_nuxt${route.path}`

  // Article JSON-LD：文章级结构化数据，配合 Google 富媒体结果展示
  // 日期字段仅在有 frontmatter date 时填充，避免出现空字符串
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    inLanguage: 'zh-CN',
    author: {
      '@type': 'Person',
      name: '乔治弟弟',
      url: 'https://qzfrato.github.io/blog_nuxt/',
    },
    publisher: {
      '@type': 'Organization',
      name: '乔治弟弟_Blog',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    url: articleUrl,
    image: 'https://qzfrato.github.io/blog_nuxt/images/CodePen.png',
    ...(datePublished ? { datePublished, dateModified: datePublished } : {}),
  }

  return {
    title,
    meta: [
      { name: 'description', content: description },
      // 文章页 OG 类型为 article，覆盖全局 website
      { property: 'og:type', content: 'article' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      // published_time 用 ISO 格式，兼容 frontmatter 中 string/Date 两种情况
      ...(datePublished ? [{ property: 'article:published_time', content: datePublished }] : []),
    ],
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(jsonLd),
      },
    ],
  }
})
</script>

<style>
/* 自定义 Markdown 样式优化 */
.prose h2 {
  @apply text-purple-300 border-b border-gray-700 pb-2 mt-12 scroll-mt-8;
}
.prose h3 {
  @apply text-purple-200 mt-8 scroll-mt-8;
}
.prose code {
  @apply text-pink-300 bg-gray-800 px-1 py-0.5 rounded;
}
.prose pre {
  @apply bg-gray-900 border border-gray-700;
}
.prose a {
  @apply text-blue-400 no-underline hover:text-blue-300 hover:underline;
}
.prose img {
  @apply rounded-xl shadow-lg my-8;
}

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
</style>
