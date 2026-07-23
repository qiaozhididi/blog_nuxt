export default defineNuxtConfig({
  compatibilityDate: '2026-07-20',
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/content'
  ],
  css: ['~/assets/css/main.css'],
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
          crossorigin: "anonymous",
          // SRI 完整性校验：CDN 内容被篡改时浏览器拒绝加载，防 XSS
          integrity: "sha384-FckWOBo7yuyMS7In0aXZ0aoVvnInlnFMwCv77x9sZpFgOonQgnBj1uLwenWVtsEj",
        },
      ],
    },
  },
});
