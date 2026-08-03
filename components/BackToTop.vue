<template>
  <Transition name="fade">
    <button
      v-show="visible"
      type="button"
      @click="scrollToTop"
      class="fixed bottom-8 right-8 z-40 w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 shadow-lg flex items-center justify-center transition-colors"
      aria-label="返回顶部"
    >
      <svg class="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    </button>
  </Transition>
</template>

<script setup>
// 返回顶部按钮：滚动超过 300px 显示，点击平滑回顶
// 用 watch 监听 container prop（子组件 onMounted 时父 ref 可能未赋值）
const props = defineProps({
  container: Object,
})

const visible = ref(false)
let currentContainer = null

function onScroll() {
  if (currentContainer) {
    visible.value = currentContainer.scrollTop > 300
  }
}

function scrollToTop() {
  if (currentContainer) {
    currentContainer.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

watch(() => props.container, (el) => {
  // 切换 container 时清理旧监听
  if (currentContainer) currentContainer.removeEventListener('scroll', onScroll)
  currentContainer = el
  if (currentContainer) {
    currentContainer.addEventListener('scroll', onScroll, { passive: true })
    onScroll() // 初始检查
  }
}, { immediate: true })

onUnmounted(() => {
  if (currentContainer) currentContainer.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
