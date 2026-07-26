<script setup lang="ts">
// 站点级常量：部署在 GitHub Pages 子路径 /blog_nuxt/
const SITE_URL = 'https://qzfrato.github.io/blog_nuxt'
const SITE_NAME = '乔治弟弟_Blog'
// 默认社交分享图：暂用现有大图占位，建议后续替换为 1200x630 专用 OG 图
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/CodePen.png`

const route = useRoute()

// 全局头部：lang、canonical、默认 OG/Twitter Card。
// - canonical 随 route.path 动态变化，避免子路径部署产生的重复内容问题
// - 各页面 useHead 覆盖 og:title/og:description/og:type 等特定字段
useHead(() => ({
  htmlAttrs: { lang: 'zh-CN' },
  // 标题模板：有子页面标题则加后缀，首页（无标题）由 else 分支返回默认站点名
  titleTemplate: (title?: string) => title ? `${title} - ${SITE_NAME}` : SITE_NAME,
  link: [
    { rel: 'canonical', href: `${SITE_URL}${route.path}` },
  ],
  meta: [
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `${SITE_URL}${route.path}` },
    { property: 'og:image', content: DEFAULT_OG_IMAGE },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:image', content: DEFAULT_OG_IMAGE },
  ],
  // WebSite JSON-LD：站点级结构化数据，配合 Google 富媒体结果展示
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        inLanguage: 'zh-CN',
        description: '乔治弟弟的个人博客 - 探索代码的无限可能',
      }),
    },
  ],
}))
</script>

<template>
  <NuxtPage />
</template>

<style>
/* Reset some basics */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #__nuxt {
  height: 100%;
  width: 100%;
}

/* 全局滚动条样式优化 (仅用于Reveal内部滚动内容) */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #1a1a1a;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
