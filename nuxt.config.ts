export default defineNuxtConfig({
  compatibilityDate: '2026-07-20',
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/content'
  ],
  css: ['~/assets/css/main.css'],
  nitro: {
    prerender: {
      // SSG 预渲染 sitemap.xml 为静态文件：GitHub Pages 为纯静态托管，
      // 无法运行 server route，必须显式预渲染生成 .output/public/sitemap.xml
      routes: ['/sitemap.xml'],
    },
  },
  app: {
    // baseURL 由 Nuxt 自动从 NUXT_APP_BASE_URL 环境变量读取
    // CI 中设置 NUXT_APP_BASE_URL=/blog_nuxt/，本地未设置时默认 /
    head: {
      // title 与 titleTemplate 移至 app.vue 的 useHead：
      // nuxt.config 的 app.head 类型为可序列化形式，titleTemplate 仅支持 string，
      // 而条件格式化需函数形式，故改在运行时 useHead 设置
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      meta: [
        // theme-color 与首页 hero 背景一致（slate-900），影响移动端浏览器 UI 着色
        { name: 'theme-color', content: '#0f172a' },
      ],
    },
  },
  // 严格 TypeScript：编译期捕获类型错误，提升代码健壮性
  typescript: {
    strict: true,
  },
});
