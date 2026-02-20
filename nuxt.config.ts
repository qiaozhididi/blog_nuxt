export default defineNuxtConfig({
  compatibilityDate: '2026-02-07',
  // Trigger new build
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/content'
  ],
  css: ['~/assets/css/main.css'],
  app: {
    // 在 GitHub Pages 上部署时使用 /blog_nuxt/，其他环境（如 Vercel、本地）使用 /
    baseURL: process.env.GITHUB_ACTIONS ? '/blog_nuxt/' : '/',
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
