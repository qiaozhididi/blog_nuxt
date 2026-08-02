<script setup lang="ts">
const props = defineProps<{
  container: HTMLElement | null
}>()

const progress = ref(0)
let rafId: number | null = null

function onScroll() {
  if (rafId !== null) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    const el = props.container
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    // scrollHeight <= clientHeight（无滚动空间，即文章一屏内）时进度为 1（100%），避免 NaN
    progress.value = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 1
  })
}

function bind(el: HTMLElement | null) {
  if (!el) return
  el.addEventListener('scroll', onScroll, { passive: true })
  onScroll() // 初始化进度（首次调用经 rAF 调度，确保 mounted 后立即同步一次进度）
}

function unbind(el: HTMLElement | null) {
  if (!el) return
  el.removeEventListener('scroll', onScroll)
}

// container 在 onMounted 后才有值，用 watch 绑定
watch(() => props.container, (el, oldEl) => {
  if (oldEl) unbind(oldEl)
  bind(el)
}, { immediate: true })

onBeforeUnmount(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
  unbind(props.container)
})
</script>

<template>
  <div
    class="fixed top-0 left-0 right-0 z-50 h-[3px] bg-gray-200/50 dark:bg-gray-800/50"
    role="progressbar"
    aria-label="阅读进度"
    :aria-valuenow="Math.round(progress * 100)"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div
      class="h-full bg-gradient-to-r from-purple-400 to-pink-600 transition-[width] duration-75"
      :style="{ width: (progress * 100).toFixed(2) + '%' }"
    />
  </div>
</template>
