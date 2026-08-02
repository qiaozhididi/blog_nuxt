<template>
  <div class="h-screen overflow-y-auto bg-white text-gray-900 dark:bg-gray-900 dark:text-white p-8">
    <div class="max-w-4xl mx-auto">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
          我的 Obsidian 笔记
        </h1>
        <NuxtLink to="/" class="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition">
          返回首页
        </NuxtLink>
      </div>

      <!-- 搜索框 -->
      <div class="mb-8">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索文章..."
          class="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
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

        <!-- 搜索无结果 -->
        <div v-else-if="searchQuery && filteredList.length === 0" class="text-center text-gray-500 dark:text-gray-500 py-12">
          <p>无匹配"<span class="font-medium">{{ searchQuery }}</span>"的文章</p>
        </div>

        <div v-else class="grid gap-6">
            <NuxtLink
              v-for="article in filteredList"
              :key="article.path"
              :to="article.path"
              class="block p-6 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition transform hover:-translate-y-1 hover:shadow-xl border border-gray-300 dark:border-gray-700"
            >
              <h2 class="text-2xl font-bold mb-2 text-gray-900 dark:text-white" v-html="highlight(article.title || article.path, searchQuery)"></h2>
              <p class="text-gray-600 dark:text-gray-400 mb-4" v-html="highlight(article.description || '暂无描述', searchQuery)"></p>
              <div class="flex items-center text-sm text-gray-500">
                <span class="mr-4">
                  <Icon name="clock" class="mr-1" />
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
// 点文件已由 content.config.ts 的 source glob（[!.]*.md）排除，无需再过滤
const { data: list, pending, error } = await useAsyncData('blog-list', () => queryCollection('blog').all());

// ===== 全文搜索 =====
// 从 @nuxt/content body AST 递归提取纯文本（type=text 节点的 value）
function extractPlainText(node) {
  if (!node) return ''
  if (node.type === 'text') return node.value || ''
  if (Array.isArray(node.children)) return node.children.map(extractPlainText).join('')
  return ''
}

const searchQuery = ref('')

// 预处理：每篇文章的可搜索文本（title + description + body 纯文本，小写）
const searchableList = computed(() =>
  (list.value || []).map(a => ({
    ...a,
    _searchText: [a.title || '', a.description || '', extractPlainText(a.body)].join(' ').toLowerCase()
  }))
)

// 实时过滤：空 query 返回全部
const filteredList = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list.value
  return searchableList.value.filter(a => a._searchText.includes(q))
})

// XSS 防护：转义 HTML 特殊字符
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c] || c))
}

// 高亮匹配关键词：先转义，再用 <mark> 包裹匹配项
function highlight(text, query) {
  const escaped = escapeHtml(text || '')
  const q = query.trim()
  if (!q) return escaped
  // 转义正则特殊字符，避免 query 含 . * + ? 等导致 RegExp 报错
  const pattern = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return escaped.replace(
    new RegExp(`(${pattern})`, 'gi'),
    '<mark class="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5">$1</mark>'
  )
}

useHead({
  title: '博客',
  meta: [
    { property: 'og:title', content: '博客' },
    { property: 'og:description', content: '乔治弟弟的 Obsidian 笔记库' },
  ],
});

definePageMeta({
  key: 'blog-list',
});
</script>
