<template>
  <div class="h-screen overflow-y-auto bg-gray-900 text-white p-8">
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

<script setup>
const route = useRoute();
// key 随路由变化，配合组件按路由 remount（见下方已移除静态 definePageMeta key），
// 确保 SPA 切换文章时重新获取对应内容，而非复用上一篇缓存
const { data } = await useAsyncData(`page-data-${route.path}`, () => queryCollection('blog').path(route.path).first());

// 文章不存在时抛 404，避免返回 200 + 占位文本（SEO/UX）
if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: '文章不存在', fatal: true });
}

// 动态设置页面标题为文章标题
useHead(() => ({
  title: data.value?.title || '文章',
}));
</script>

<style>
/* 自定义 Markdown 样式优化 */
.prose h2 {
  @apply text-purple-300 border-b border-gray-700 pb-2 mt-12;
}
.prose h3 {
  @apply text-purple-200 mt-8;
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
</style>
