<template>
  <div class="h-screen w-full bg-black text-white overflow-hidden">
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
    <div v-else class="reveal theme-font-montserrat h-full w-full" ref="revealContainer">
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
            <h1 class="text-3xl md:text-9xl font-black mb-6 md:mb-8 tracking-tight relative z-10 text-center drop-shadow-2xl">
              <span class="text-white">
                {{ slide.title }}
              </span>
            </h1>
            <p class="text-base md:text-4xl text-gray-200 mb-8 md:mb-12 relative z-10 fragment fade-up text-center font-light tracking-wide px-4">
              {{ slide.subtitle }}
            </p>
            <div v-if="slide.actionButton" class="relative z-10 fragment fade-up">
              <button @click.stop="handleHeroButtonClick(slide.actionButton.link)" class="btn-primary text-base md:text-lg px-6 py-2 md:px-8 md:py-3">
                {{ slide.actionButton.text }}
              </button>
            </div>
          </div>

          <!-- Type: Projects (Vertical Stack) -->
          <template v-else-if="slide.type === 'projects'">
            <!-- Cover Slide -->
            <section :data-background-color="slide.cover.backgroundColor || '#111827'" :data-slug="slide.cover.slug">
              <div class="slide-content-wrapper">
                <h2 class="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-6 md:mb-8 text-center">
                  {{ slide.cover.title }}
                </h2>
                <p class="text-lg md:text-xl text-gray-400 text-center px-4">
                  {{ slide.cover.subtitle }}
                </p>
                <div class="mt-8 md:mt-12 animate-bounce text-gray-500">
                  <i class="fa fa-chevron-down text-2xl md:text-3xl"></i>
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
              <div class="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-16 max-w-7xl mx-auto p-4 h-full w-full overflow-y-auto">
                <!-- Image Side -->
                <div class="w-full lg:w-1/2 flex justify-center items-center shrink-0">
                   <div class="relative group w-full max-w-[280px] md:max-w-md">
                     <div class="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                     <img :src="resolvePath(item.image)" :alt="item.title" class="relative w-full rounded-xl shadow-2xl object-cover transform transition duration-500 hover:scale-[1.02]" />
                   </div>
                </div>
                
                <!-- Content Side -->
                <div class="w-full lg:w-1/2 text-center lg:text-left flex flex-col justify-center shrink-0">
                  <div class="flex items-center justify-center lg:justify-start gap-3 md:gap-4 mb-4 md:mb-6">
                    <div class="p-2 md:p-3 bg-gray-800 rounded-full shadow-lg">
                        <i :class="item.icon" class="text-2xl md:text-3xl text-purple-400"></i>
                    </div>
                    <h3 class="text-2xl md:text-4xl font-bold text-white">{{ item.title }}</h3>
                  </div>
                  <div class="prose prose-invert prose-sm md:prose-lg max-w-none mb-6 md:mb-8 mx-auto lg:mx-0">
                      <p class="text-gray-300 leading-relaxed text-base md:text-xl">
                        {{ item.text }}
                      </p>
                  </div>
                  <div class="flex justify-center lg:justify-start">
                      <button @click.stop="handleProjectClick(item.href)" class="btn-primary inline-flex items-center text-sm md:text-lg px-6 py-2 md:px-8 md:py-3">
                        <span>查看详情</span>
                      </button>
                  </div>
                </div>
              </div>
            </section>
          </template>

          <!-- Type: About -->
          <div v-else-if="slide.type === 'about'" class="slide-content-wrapper">
            <h2 class="text-3xl md:text-5xl font-bold mb-8 md:mb-12 text-white">{{ slide.title }}</h2>
            <div class="max-w-4xl mx-auto bg-gray-800/40 p-6 md:p-14 rounded-3xl backdrop-blur-md border border-gray-700/50 shadow-2xl mx-4">
              <p class="text-gray-200 text-base md:text-2xl leading-relaxed text-center md:text-left" v-html="slide.content"></p>
            </div>
          </div>

          <!-- Type: Contact -->
          <div v-else-if="slide.type === 'contact'" class="slide-content-wrapper">
            <h2 class="text-2xl md:text-4xl font-bold text-white mb-8 md:mb-10">{{ slide.title }}</h2>
            <div class="flex justify-center gap-6 md:gap-8 mb-12 md:mb-16">
              <a v-for="(link, lIndex) in slide.socialLinks" :key="lIndex" :href="link.href" target="_blank" class="text-gray-400 hover:text-white transition transform hover:scale-110">
                <i :class="link.icon" class="text-4xl md:text-5xl"></i>
              </a>
            </div>
            <p class="text-gray-500 text-xs md:text-base font-medium">
              {{ slide.copyright }}
            </p>
          </div>

        </section>

      </div>
    </div>
    
    <!-- Init Status (Debug) -->
    <div class="fixed bottom-0 left-0 bg-white/10 text-white text-[10px] p-1 z-[9999] pointer-events-none">
       Status: {{ initStatus }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, nextTick, onUnmounted, watch } from 'vue';
import { useRoute, useRouter, onBeforeRouteUpdate } from 'vue-router';

// Import Reveal styles
import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/black.css';

const route = useRoute();
const router = useRouter();

definePageMeta({
  key: 'blog-main',
  pageTransition: false, // 禁用页面过渡，避免 Reveal.js DOM 冲突
});

function handleHeroButtonClick(link: string) {
  console.log('Hero button clicked:', link);
  router.push(link);
}

function handleProjectClick(href: string) {
  console.log('Project button clicked:', href);
  if (href.startsWith('/') && !href.startsWith('//')) {
    router.push(href);
  } else {
    window.open(href, '_blank');
  }
}

const runtimeConfig = useRuntimeConfig();
function resolvePath(path: string) {
  if (path && path.startsWith('/') && !path.startsWith('http')) {
     return (runtimeConfig.app.baseURL.replace(/\/$/, '') + path);
  }
  return path;
}

// 使用 Nuxt 的 useFetch 来获取数据
const { data: config, pending, error } = useFetch<any>(() => resolvePath('/data/site-config.json'), {
  key: 'site-config', // 固定的 key，防止路由切换时重新请求导致闪烁
  server: false, // 强制在客户端获取，因为 Reveal.js 是纯客户端库
  lazy: true
});

let revealInstance: any = null;
const revealContainer = ref<HTMLElement | null>(null);
const initStatus = ref('Waiting...');

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
  document.removeEventListener('mousedown', handleMouseDown);
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
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

const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

// Variables for drag handling
let startX = 0;
let startY = 0;
let isDragging = false;
const DRAG_THRESHOLD = 50; // pixels

function handleMouseDown(e: MouseEvent) {
  // Ignore clicks on buttons or links to allow them to function
  if ((e.target as HTMLElement).closest('button, a')) return;
  
  startX = e.clientX;
  startY = e.clientY;
  isDragging = true;
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging) return;
  // e.preventDefault(); // Prevent text selection
}

function handleMouseUp(e: MouseEvent) {
  if (!isDragging) return;
  isDragging = false;
  
  const deltaX = e.clientX - startX;
  const deltaY = e.clientY - startY;
  
  // Determine dominant axis
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // Horizontal
    if (Math.abs(deltaX) > DRAG_THRESHOLD) {
      if (deltaX > 0) {
        revealInstance?.left(); // Drag right -> go left (prev)
      } else {
        revealInstance?.right(); // Drag left -> go right (next)
      }
    }
  } else {
    // Vertical
    if (Math.abs(deltaY) > DRAG_THRESHOLD) {
       if (deltaY > 0) {
         revealInstance?.up(); // Drag down -> go up (prev)
       } else {
         revealInstance?.down(); // Drag up -> go down (next)
       }
    }
  }
}

async function initReveal() {
  initStatus.value = 'Starting init...';
  await nextTick();
  
  // Retry mechanism for DOM element availability
  let retries = 0;
  while (!revealContainer.value && retries < 20) {
      initStatus.value = `Waiting for DOM (${retries})...`;
      await new Promise(r => setTimeout(r, 100));
      retries++;
  }

  if (!revealContainer.value) {
      initStatus.value = 'Failed: No Container';
      console.error('Reveal container not found');
      return;
  }
  
  setTimeout(async () => {
    // 确保组件没有被卸载
    if (!revealContainer.value) return;

    const revealEl = revealContainer.value;
    if (revealEl && !revealInstance) {
      try {
        initStatus.value = 'Importing Reveal...';
        // Dynamic import for client-side only
        const Reveal = (await import('reveal.js')).default;
        const Markdown = (await import('reveal.js/plugin/markdown/markdown.esm.js')).default;

        initStatus.value = 'Initializing Reveal...';

        // 根据当前路由计算初始 slide
        const slugArray = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug || 'home'];
        const { h, v } = getIndicesFromSlug(slugArray as string[]);

        // Check mobile
        const mobile = window.innerWidth < 768;

        // 初始化 Reveal 实例
        const deck = new Reveal(revealEl, {
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
            // Mobile Optimization
            width: mobile ? window.innerWidth : 960,
            height: mobile ? window.innerHeight : 700,
            margin: mobile ? 0 : 0.04,
            minScale: mobile ? 1.0 : 0.2,
            maxScale: mobile ? 1.0 : 2.0,
            disableLayout: mobile, // 移动端禁用缩放，完全靠 CSS
        });

        // 保存实例
        revealInstance = deck;

        // 初始化
        await deck.initialize();
        initStatus.value = 'Ready';
        
        // Add mouse drag listeners
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        // 跳转到初始页面
        deck.slide(h, v);

        // 监听切换事件，更新 URL
        deck.on('slidechanged', (event: any) => {
            const h = event.indexh;
            const v = event.indexv;
            const newPath = getPathFromIndices(h, v);
            
            // 使用 router.replace 更新 URL
            if (route.path !== newPath) {
                 router.replace(newPath);
            }
        });

      } catch (e) {
        initStatus.value = 'Error: ' + (e instanceof Error ? e.message : String(e));
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
  position: relative;
  z-index: 50;
  pointer-events: auto;
  cursor: pointer;
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
  position: relative;
  z-index: 10;
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