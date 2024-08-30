// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["nuxt-swiper"],
  swiper: {
    // Swiper options
    //----------------------
    // prefix: 'Swiper',
    // styleLang: 'css',
    // modules: ['navigation', 'pagination'], // all modules are imported by default
  },
  app: {
    head: {
      script: [
        // <script src="https://myawesome-lib.js"></script>
        {
          src: "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js",
        },
      ],
      link: [
        {
          rel: "stylesheet",
          href: "https://cdn.staticfile.org/font-awesome/4.7.0/css/font-awesome.css",
        },
      ],
    },
  },
});
