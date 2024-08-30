// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      script: [
        // <script src="https://myawesome-lib.js"></script>
        {
          src: "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js",
        },
        {
          src: "https://cdnjs.cloudflare.com/ajax/libs/Swiper/4.3.5/js/swiper.min.js",
        },
      ],
      link: [
        {
          rel: "stylesheet",
          href: "https://cdnjs.cloudflare.com/ajax/libs/Swiper/4.3.5/css/swiper.min.css",
        },
        {
          rel: "stylesheet",
          href: "https://cdn.staticfile.org/font-awesome/4.7.0/css/font-awesome.css",
        },
      ],
    },
  },
});
