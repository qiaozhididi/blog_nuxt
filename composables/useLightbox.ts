// composables/useLightbox.ts
// 图片 lightbox：监听容器内 img 点击，弹出全屏大图查看
// 支持 Esc 关闭、← → 切换、点击遮罩关闭、多图切换
// 与 useCodeBlockEnhancer 同模式的 DOM 注入式增强
import { nextTick, watch, onMounted, onUnmounted, ref, type Ref } from 'vue'

/**
 * 图片 lightbox composable
 * @param container 滚动容器 ref（指向博客详情页最外层 div）
 * @param trigger 路由/数据变化触发器，路由切换时 DOM 重建需重新注入
 */
export function useLightbox(
  container: Ref<HTMLElement | null>,
  trigger?: () => unknown,
) {
  const isOpen = ref(false)
  const images = ref<string[]>([])
  const currentIndex = ref(0)

  /** 打开 lightbox：记录当前索引，禁止 body 滚动 */
  function open(index: number) {
    currentIndex.value = index
    isOpen.value = true
    document.body.style.overflow = 'hidden'
  }

  /** 关闭 lightbox：恢复 body 滚动 */
  function close() {
    isOpen.value = false
    document.body.style.overflow = ''
  }

  /** 下一张（非最后一张时） */
  function next() {
    if (currentIndex.value < images.value.length - 1) currentIndex.value++
  }

  /** 上一张（非第一张时） */
  function prev() {
    if (currentIndex.value > 0) currentIndex.value--
  }

  /** 键盘事件：Esc 关闭、← → 切换 */
  function onKeydown(e: KeyboardEvent) {
    if (!isOpen.value) return
    if (e.key === 'Escape') close()
    else if (e.key === 'ArrowRight') next()
    else if (e.key === 'ArrowLeft') prev()
  }

  /**
   * 增强容器内所有 img：收集 src、绑定点击、设置 cursor
   * 防重复：dataset.lightboxEnhanced 标记
   */
  function enhance() {
    const el = container.value
    if (!el) return
    const imgs = el.querySelectorAll('img')
    // 每次 enhance 重新收集 src（应对 SPA 路由切换后图片变化）
    images.value = Array.from(imgs).map((img) => img.src)
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

  // container mount 后首次注入
  watch(container, () => nextTick(enhance), { immediate: true })
  // 路由切换时 DOM 重建，需 trigger 触发重新注入
  if (trigger) watch(trigger, () => nextTick(enhance))

  // 键盘监听只在客户端注册（SSR 安全）
  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = '' // 兜底清理
  })

  return { isOpen, images, currentIndex, open, close, next, prev }
}
