export default defineNuxtConfig({
  compatibilityDate: '2026-02-03',
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/content'
  ],
  nitro: {
    preset: 'github-pages'
  },
  css: ['~/assets/css/main.css'],
  app: {
    baseURL: '/blog_nuxt/',
    head: {
      link: [
        {
          rel: "stylesheet",
          href: "https://cdn.staticfile.org/font-awesome/4.7.0/css/font-awesome.css",
        },
      ],
    },
  },
});