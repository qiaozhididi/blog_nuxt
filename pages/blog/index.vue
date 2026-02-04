<template>
  <div class="h-screen overflow-y-auto bg-gray-900 text-white p-8">
    <div class="max-w-4xl mx-auto">
      <div class="flex justify-between items-center mb-12">
        <h1 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
          我的 Obsidian 笔记
        </h1>
        <NuxtLink to="/" class="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
          返回首页
        </NuxtLink>
      </div>

      <div class="grid gap-6">
        <div v-if="pending" class="text-center text-gray-500 py-12">
          加载中...
        </div>
        <div v-else-if="error" class="text-center text-red-500 py-12">
          加载失败: {{ error.message }}
        </div>
        <div v-else-if="!list || list.length === 0" class="text-center text-gray-500 py-12">
          <p>暂无文章，请在 content/blog 目录下添加 Markdown 文件</p>
          <p class="text-xs mt-2">Current path: /blog</p>
        </div>
        
        <div v-else class="grid gap-6">
            <NuxtLink 
              v-for="article in list" 
              :key="article.path" 
              :to="article.path"
              class="block p-6 bg-gray-800 rounded-xl hover:bg-gray-750 transition transform hover:-translate-y-1 hover:shadow-xl border border-gray-700"
            >
              <h2 class="text-2xl font-bold mb-2 text-white">{{ article.title || article.path }}</h2>
              <p class="text-gray-400 mb-4">{{ article.description || '暂无描述' }}</p>
              <div class="flex items-center text-sm text-gray-500">
                <span class="mr-4">
                  <i class="fa fa-clock-o mr-1"></i>
                  {{ article.date ? new Date(article.date).toLocaleDateString() : '未知日期' }}
                </span>
              </div>
            </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
console.log('Blog list page loaded');

const { data: list, pending, error } = await useAsyncData('blog-list', () => queryCollection('blog').all());

definePageMeta({
  key: 'blog-list',
});
</script>
