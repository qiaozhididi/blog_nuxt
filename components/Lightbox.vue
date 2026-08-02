<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      @click="close"
    >
      <!-- 关闭按钮 -->
      <button
        type="button"
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
        type="button"
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
        type="button"
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
// 图片 lightbox 组件：全屏遮罩 + 大图 + 关闭/切换按钮
// 通过 Teleport 渲染到 body，避免父级 overflow/z-index 裁剪
defineProps({
  isOpen: Boolean,
  images: Array,
  currentIndex: Number,
})

const emit = defineEmits(['close', 'next', 'prev'])

const close = () => emit('close')
const next = () => emit('next')
const prev = () => emit('prev')
</script>
