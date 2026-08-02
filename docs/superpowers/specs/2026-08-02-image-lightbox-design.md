# 图片 Lightbox 设计规范

> 日期：2026-08-02
> 状态：已确认

## 目标

为博客详情页的图片添加 lightbox 功能：
- 点击 `.prose img` → 弹出全屏大图查看
- Esc / 点击遮罩 / 点击关闭按钮 → 关闭
- ← → 键 / 点击箭头 → 切换图片（多图时）
- lightbox 打开时禁止 body 滚动

## 背景

- 当前文章无图片引用，但 `content/blog/images/20260306/` 有一张 PNG（Obsidian 残留）
- 功能为未来添加图片时自动支持
- 与 useCodeBlockEnhancer 同模式的 DOM 注入式增强
- 项目用 `<script setup>`（无 lang="ts"），defineProps 用运行时声明

## 技术方案

### 1. useLightbox composable

与 useCodeBlockEnhancer 同模式：监听容器内 `img` 点击，管理 lightbox 状态。

```ts
export function useLightbox(
  container: Ref<HTMLElement | null>,
  trigger?: () => unknown  // 路由/数据变化触发器
) {
  const isOpen = ref(false)
  const images = ref<string[]>([])
  const currentIndex = ref(0)

  function open(index: number) {
    currentIndex.value = index
    isOpen.value = true
    document.body.style.overflow = 'hidden'  // 禁止背景滚动
  }

  function close() {
    isOpen.value = false
    document.body.style.overflow = ''
  }

  function next() {
    if (currentIndex.value < images.value.length - 1) currentIndex.value++
  }

  function prev() {
    if (currentIndex.value > 0) currentIndex.value--
  }

  // 键盘：Esc 关闭、← → 切换
  function onKeydown(e: KeyboardEvent) {
    if (!isOpen.value) return
    if (e.key === 'Escape') close()
    else if (e.key === 'ArrowRight') next()
    else if (e.key === 'ArrowLeft') prev()
  }

  function enhance() {
    const el = container.value
    if (!el) return
    const imgs = el.querySelectorAll('img')
    // 收集所有图片 src（每次 enhance 重新收集，应对 SPA 路由切换）
    images.value = Array.from(imgs).map(img => img.src)
    imgs.forEach((img, i) => {
      if (img.dataset.lightboxEnhanced) return
      img.dataset.lightboxEnhanced = 'true'
      img.style.cursor = 'zoom-in'
      img.addEventListener('click', (e) => {
        e.preventDefault()
        open(i)
      })
    })
  }

  watch(container, () => nextTick(enhance), { immediate: true })
  if (trigger) watch(trigger, () => nextTick(enhance))

  // 键盘监听只在客户端注册
  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''  // 兜底清理
  })

  return { isOpen, images, currentIndex, open, close, next, prev }
}
```

### 2. Lightbox.vue 组件

用 `<Teleport to="body">` 避免 z-index/overflow 父级裁剪问题。

```vue
<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      @click="close"
    >
      <!-- 关闭按钮 -->
      <button
        class="absolute top-4 right-4 text-white hover:text-gray-300 transition"
        @click.stop="close"
        aria-label="关闭"
      >
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- 上一张（多图且非第一张时显示） -->
      <button
        v-if="images.length > 1 && currentIndex > 0"
        class="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition"
        @click.stop="prev"
        aria-label="上一张"
      >
        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- 下一张（多图且非最后一张时显示） -->
      <button
        v-if="images.length > 1 && currentIndex < images.length - 1"
        class="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition"
        @click.stop="next"
        aria-label="下一张"
      >
        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- 图片 -->
      <img
        :src="images[currentIndex]"
        class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        @click.stop
        alt=""
      >

      <!-- 计数器 -->
      <div v-if="images.length > 1" class="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
        {{ currentIndex + 1 }} / {{ images.length }}
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  isOpen: Boolean,
  images: Array,
  currentIndex: Number,
})

const emit = defineEmits(['close', 'next', 'prev'])

const close = () => emit('close')
const next = () => emit('next')
const prev = () => emit('prev')
</script>
```

### 3. 集成到博客详情页

```js
// pages/blog/[...slug].vue <script setup>
const { isOpen: lightboxOpen, images: lightboxImages, currentIndex: lightboxIndex, close: closeLightbox, next: nextLightbox, prev: prevLightbox } = useLightbox(scrollContainer, () => route.path)
```

```html
<!-- template 末尾，scrollContainer div 内 -->
<Lightbox
  :is-open="lightboxOpen"
  :images="lightboxImages"
  :current-index="lightboxIndex"
  @close="closeLightbox"
  @next="nextLightbox"
  @prev="prevLightbox"
/>
```

## 实现步骤清单

### Task 1: useLightbox composable

**Files:**
- Create: `composables/useLightbox.ts`

**步骤:**

1. **创建 composable 文件**：按"技术方案"第 1 节的代码创建 `composables/useLightbox.ts`

2. **导入依赖**：`ref`, `watch`, `nextTick`, `onMounted`, `onUnmounted` 从 'vue'（Nuxt 3 自动导入，但显式导入更清晰）

### Task 2: Lightbox.vue 组件

**Files:**
- Create: `components/Lightbox.vue`

**步骤:**

1. **创建组件文件**：按"技术方案"第 2 节的代码创建 `components/Lightbox.vue`
   - `<Teleport to="body">` 包裹
   - 关闭按钮 + 左右切换按钮 + 图片 + 计数器
   - `defineProps` 运行时声明（Boolean/Array/Number）
   - `defineEmits(['close', 'next', 'prev'])`
   - 交互按钮 aria-label（可访问性）

### Task 3: 集成到博客详情页

**Files:**
- Modify: `pages/blog/[...slug].vue`

**步骤:**

1. **在 `<script setup>` 中调用 useLightbox**

现有代码（已有 useCodeBlockEnhancer）：
```js
useCodeBlockEnhancer(scrollContainer, () => route.path)
```

在其后添加：
```js
// 图片 lightbox
const { isOpen: lightboxOpen, images: lightboxImages, currentIndex: lightboxIndex, close: closeLightbox, next: nextLightbox, prev: prevLightbox } = useLightbox(scrollContainer, () => route.path)
```

2. **在 `<template>` 中添加 Lightbox 组件**

在 `</aside>` 之后、`</div>`（max-w-6xl）之前添加：
```html
    <!-- 图片 lightbox -->
    <Lightbox
      :is-open="lightboxOpen"
      :images="lightboxImages"
      :current-index="lightboxIndex"
      @close="closeLightbox"
      @next="nextLightbox"
      @prev="prevLightbox"
    />
```

### Task 4: 验证与提交

**步骤:**

1. **临时添加测试图片到 hello.md**

在 `content/blog/hello.md` 末尾添加（验证后移除）：
```markdown
![测试图片1](/images/CodePen.png)
![测试图片2](/images/GitHub.png)
```

2. **启动 dev server 验证:**
   - 访问 `/blog/hello`
   - 点击图片 → 弹出 lightbox
   - Esc 关闭
   - 点击遮罩关闭
   - 左右箭头切换（2 张图片）
   - 计数器显示 "1/2"、"2/2"
   - 切换到上一篇/下一篇再切回 → lightbox 正常工作（SPA 路由切换重注入）

3. **移除测试图片**：删除 hello.md 中临时添加的图片引用

4. **SSG 构建验证:**
   - `npm run generate` 成功

5. **提交:**
   - `新增：图片 lightbox（点击放大+键盘导航+多图切换）`

## 边界情况

- **无图片**：`images` 为空数组，lightbox 永不打开
- **单图片**：不显示左右箭头和计数器
- **第一张/最后一张**：对应方向的箭头隐藏
- **SPA 路由切换**：`watch(trigger)` 重新 enhance，重新收集 images
- **body 滚动**：`open` 时 `overflow: hidden`，`close` 时恢复；`onUnmounted` 兜底清理
- **SSR 安全**：`onMounted` 内注册 `window` 事件，避免 SSR 报错
- **Teleport**：渲染到 body，避免父级 overflow/z-index 裁剪

## 不做的功能（YAGNI）

- 缩放/旋转——保持简单
- 拖拽移动——YAGNI
- 图片标题/描述显示——文章图片无 alt 文本
- 触摸滑动切换——桌面端优先
- 动画过渡——保持简单（v-if 直接显示/隐藏）

## 涉及文件清单

**新建:**
- `composables/useLightbox.ts`
- `components/Lightbox.vue`

**修改:**
- `pages/blog/[...slug].vue`（调用 composable + 添加 Lightbox 组件）

无新依赖。

## 测试策略

1. **点击图片**：弹出 lightbox，显示大图
2. **Esc 关闭**：lightbox 消失，body 恢复滚动
3. **点击遮罩关闭**：lightbox 消失
4. **点击关闭按钮**：lightbox 消失
5. **左右箭头**：切换图片，计数器更新
6. **键盘 ← →**：切换图片
7. **单图片**：不显示箭头和计数器
8. **SPA 路由切换**：切换文章再切回，lightbox 正常工作
9. **SSG 构建**：`npm run generate` 成功
