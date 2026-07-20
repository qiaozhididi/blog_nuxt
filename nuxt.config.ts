export default defineNuxtConfig({
  compatibilityDate: '2026-02-07',
  // Trigger new build
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/content'
  ],
  css: ['~/assets/css/main.css'],
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
});// timestamp 2026年 2月 7日 星期六 18时22分27秒 CST
