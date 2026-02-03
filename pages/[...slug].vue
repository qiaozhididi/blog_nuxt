<template>
  <div class="h-screen w-screen bg-black text-white">
    <!-- Loading State -->
    <div v-if="pending || !config" class="flex items-center justify-center h-full">
      <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex flex-col items-center justify-center h-full text-red-500">
      <p class="text-xl">无法加载配置</p>
      <p class="text-sm mt-2">{{ error }}</p>
    </div>

    <!-- Reveal Content -->
    <div v-else class="reveal theme-font-montserrat h-full w-full">
      <div class="slides">
        
        <section 
          v-for="(slide, index) in config.slides" 
          :key="index"
          :data-background-gradient="slide.backgroundGradient"
          :data-background-color="slide.backgroundColor"
          :data-slug="slide.slug"
        >
          
          <!-- Type: Hero -->
          <div v-if="slide.type === 'hero'" class="slide-content-wrapper">
            <h1 class="text-6xl md:text-9xl font-black mb-8 tracking-tight relative z-10 text-center drop-shadow-2xl">
              <span class="text-white">
                {{ slide.title }}
              </span>
            </h1>
            <p class="text-2xl md:text-4xl text-gray-200 mb-12 relative z-10 fragment fade-up text-center font-light tracking-wide">
              {{ slide.subtitle }}
            </p>
            <div v-if="slide.actionButton" class="relative z-10 fragment fade-up">
              <NuxtLink :to="slide.actionButton.link" class="btn-primary">
                {{ slide.actionButton.text }}
              </NuxtLink>
            </div>
          </div>

          <!-- Type: Projects (Vertical Stack) -->
          <template v-else-if="slide.type === 'projects'">
            <!-- Cover Slide -->
            <section :data-background-color="slide.cover.backgroundColor || '#111827'" :data-slug="slide.cover.slug">
              <div class="slide-content-wrapper">
                <h2 class="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-8 text-center">
                  {{ slide.cover.title }}
                </h2>
                <p class="text-xl text-gray-400 text-center">
                  {{ slide.cover.subtitle }}
                </p>
                <div class="mt-12 animate-bounce text-gray-500">
                  <i class="fa fa-chevron-down text-3xl"></i>
                </div>
              </div>
            </section>

            <!-- Project Items -->
            <section 
              v-for="(item, itemIndex) in slide.items" 
              :key="itemIndex"
              data-background-color="#1f2937"
              :data-slug="item.slug"
            >
              <div class="flex flex-col lg:flex-row items-center justify-center gap-8 md:gap-16 max-w-7xl mx-auto p-4 h-full w-full">
                <!-- Image Side -->
                <div class="w-full lg:w-1/2 flex justify-center items-center">
                   <div class="relative group w-full max-w-md">
                     <div class="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                     <img :src="item.image" :alt="item.title" class="relative w-full rounded-xl shadow-2xl object-cover transform transition duration-500 hover:scale-[1.02]" />
                   </div>
                </div>
                
                <!-- Content Side -->
                <div class="w-full lg:w-1/2 text-left flex flex-col justify-center">
                  <div class="flex items-center gap-4 mb-6">
                    <div class="p-3 bg-gray-800 rounded-full shadow-lg">
                        <i :class="item.icon" class="text-3xl text-purple-400"></i>
                    </div>
                    <h3 class="text-3xl md:text-4xl font-bold text-white">{{ item.title }}</h3>
                  </div>
                  <div class="prose prose-invert prose-lg max-w-none mb-8">
                      <p class="text-gray-300 leading-relaxed text-lg md:text-xl">
                        {{ item.text }}
                      </p>
                  </div>
                  <div>
                      <a :href="item.href" target="_blank" class="btn-primary inline-flex items-center gap-2">
                        <span>查看详情</span>
                        <i class="fa fa-external-link text-sm"></i>
                      </a>
                  </div>
                </div>
              </div>
            </section>
          </template>

          <!-- Type: About -->
          <div v-else-if="slide.type === 'about'" class="slide-content-wrapper">
            <h2 class="text-4xl md:text-5xl font-bold mb-12 text-white">{{ slide.title }}</h2>
            <div class="max-w-4xl mx-auto bg-gray-800/40 p-10 md:p-14 rounded-3xl backdrop-blur-md border border-gray-700/50 shadow-2xl">
              <p class="text-gray-200 text-lg md:text-2xl leading-relaxed text-left" v-html="slide.content"></p>
            </div>
          </div>

          <!-- Type: Contact -->
          <div v-else-if="slide.type === 'contact'" class="slide-content-wrapper">
            <h2 class="text-3xl md:text-4xl font-bold text-white mb-10">{{ slide.title }}</h2>
            <div class="flex justify-center gap-8 mb-16">
              <a v-for="(link, lIndex) in slide.socialLinks" :key="lIndex" :href="link.href" target="_blank" class="text-gray-400 hover:text-white transition transform hover:scale-110">
                <i :class="link.icon" class="text-5xl"></i>
              </a>
            </div>
            <p class="text-gray-500 text-sm md:text-base font-medium">
              {{ slide.copyright }}
            </p>
          </div>

        </section>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, nextTick, onUnmounted, watch } from 'vue';
import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown/markdown.esm.js';
import { useRoute, useRouter, onBeforeRouteUpdate } from 'vue-router';

// Import Reveal styles
import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/black.css';

const route = useRoute();
const router = useRouter();

// 使用 Nuxt 的 useFetch 来获取数据
const { data: config, pending, error } = useFetch<any>('/data/site-config.json', {
  server: false, // 强制在客户端获取，因为 Reveal.js 是纯客户端库
  lazy: true
});

let revealInstance: any = null;

// 处理路由更新（例如点击浏览器后退按钮）
onBeforeRouteUpdate((to, from, next) => {
  if (!revealInstance || !config.value) {
    next();
    return;
  }

  const slugArray = Array.isArray(to.params.slug) ? to.params.slug : [to.params.slug || 'home'];
  const { h, v } = getIndicesFromSlug(slugArray as string[]);
  
  const current = revealInstance.getIndices();
  // 只有当目标幻灯片与当前不同时才跳转，避免循环
  if (current.h !== h || current.v !== v) {
    revealInstance.slide(h, v);
  }
  
  next();
});

onMounted(async () => {
  // 监听 config 变化，确保数据加载完成后再初始化
  watch(config, async (newConfig) => {
    if (newConfig) {
      await initReveal();
    }
  }, { immediate: true });
});

onUnmounted(() => {
  if (revealInstance) {
    revealInstance = null;
  }
});

// Helper: 根据 slug 获取 slide 索引
function getIndicesFromSlug(slugs: string[]) {
  if (!config.value || !config.value.slides) return { h: 0, v: 0 };
  
  const rootSlug = slugs[0] || 'home';
  const subSlug = slugs[1];

  let h = 0, v = 0;

  // 查找水平索引
  const hIndex = config.value.slides.findIndex((s: any) => s.slug === rootSlug);
  if (hIndex !== -1) {
    h = hIndex;
    const slide = config.value.slides[hIndex];
    
    // 如果有垂直子幻灯片
    if (subSlug && slide.type === 'projects') {
        // projects 类型比较特殊，第一个 section 是 cover，后面是 items
        // 我们的结构是:
        // section (h)
        //   section (cover, v=0) -> slug: cover
        //   section (item 1, v=1) -> slug: item.slug
        
        if (subSlug === 'cover') {
            v = 0;
        } else if (slide.items) {
            const itemIndex = slide.items.findIndex((item: any) => item.slug === subSlug);
            if (itemIndex !== -1) {
                v = itemIndex + 1; // +1 因为 cover 占了 v=0
            }
        }
    }
  }

  return { h, v };
}

// Helper: 根据索引获取 URL 路径
function getPathFromIndices(h: number, v: number) {
  if (!config.value || !config.value.slides) return '/';
  
  const slide = config.value.slides[h];
  if (!slide) return '/';

  const rootSlug = slide.slug || '';
  
  if (v > 0 && slide.type === 'projects' && slide.items) {
      // v=0 is cover (mapped to /projects)
      // v=1 is item[0] (mapped to /projects/slug)
      const item = slide.items[v - 1];
      if (item && item.slug) {
          return `/${rootSlug}/${item.slug}`;
      }
  }

  // 默认返回根 slug (例如 /projects, /about)
  // 如果是 home, 返回 /
  return rootSlug === 'home' ? '/' : `/${rootSlug}`;
}

async function initReveal() {
  await nextTick();
  setTimeout(() => {
    if (document.querySelector('.reveal') && !revealInstance) {
      try {
        // 根据当前路由计算初始 slide
        const slugArray = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug || 'home'];
        const { h, v } = getIndicesFromSlug(slugArray as string[]);

        revealInstance = Reveal.initialize({
            controls: true,
            progress: true,
            center: true,
            hash: false, // 禁用默认 hash
            history: false, // 禁用默认 history，我们自己接管
            mouseWheel: true,
            transition: 'slide',
            plugins: [Markdown],
            touch: true,
            controlsTutorial: false,
            disableLayout: false, 
        });

        // 初始化完成后跳转到指定页面
        revealInstance.on('ready', () => {
             Reveal.slide(h, v);
        });

        // 监听切换事件，更新 URL
        revealInstance.on('slidechanged', (event: any) => {
            const h = event.indexh;
            const v = event.indexv;
            const newPath = getPathFromIndices(h, v);
            
            // 使用 router.replace 更新 URL
            // onBeforeRouteUpdate 会被触发，但我们在其中做了 check 避免循环跳转
            if (route.path !== newPath) {
                 router.replace(newPath);
            }
        });

      } catch (e) {
        console.error("Reveal initialization failed:", e);
      }
    }
  }, 100);
}
</script>

<style scoped>
/* 按钮基础样式规范 */
.btn-primary {
  @apply px-8 py-3 rounded-full font-bold text-lg transition-all duration-300 transform hover:-translate-y-1 inline-block;
  /* 使用高亮背景和深色文字，确保对比度 */
  background-color: white;
  color: #0f172a !important; /* 强制覆盖 Reveal.js 的链接颜色 */
  box-shadow: 0 4px 14px 0 rgba(255, 255, 255, 0.39);
}

.btn-primary:hover {
  @apply bg-gray-100;
  box-shadow: 0 6px 20px rgba(255, 255, 255, 0.23);
  color: #000000 !important;
}

/* 使用自定义类来控制内容居中，避免全局覆盖 section 导致 Reveal 计算错误 */
.slide-content-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

/* 修复图片在 Reveal 中的默认样式 */
.reveal img {
    margin: 0;
    background: transparent;
    border: none;
    box-shadow: none;
}

/* 自定义动画 */
.animate-blob {
    animation: blob 7s infinite;
}
.animation-delay-2000 {
    animation-delay: 2s;
}
.animation-delay-4000 {
    animation-delay: 4s;
}
@keyframes blob {
    0% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(30px, -50px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
    100% { transform: translate(0px, 0px) scale(1); }
}
</style>