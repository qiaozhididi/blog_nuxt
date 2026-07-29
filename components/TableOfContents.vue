<script setup lang="ts">
interface TocLink {
  id?: string
  text?: string
  depth?: number
  children?: TocLink[]
}

const props = defineProps<{
  container: HTMLElement | null
  toc: { links: TocLink[] } | undefined | null
}>()

const activeId = ref<string>('')
const visibleHeadings = new Set<string>()
let observer: IntersectionObserver | null = null

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

// 从可见 heading 中选取 DOM 顺序最靠前的一个作为 active
function pickActive() {
  if (!props.container) return
  const headings = props.container.querySelectorAll<HTMLElement>('article.prose h2, article.prose h3')
  for (const h of headings) {
    if (visibleHeadings.has(h.id)) {
      activeId.value = h.id
      return
    }
  }
}

function setupObserver() {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  visibleHeadings.clear()
  if (!props.container) return
  const headings = props.container.querySelectorAll<HTMLElement>('article.prose h2, article.prose h3')
  if (!headings.length) return

  // rootMargin: 底部上移 80%，留顶部 20% 区域；heading 进入视口顶部 20% 时视为 active
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).id
        if (entry.isIntersecting) {
          visibleHeadings.add(id)
        } else {
          visibleHeadings.delete(id)
        }
      }
      pickActive()
    },
    {
      root: props.container,
      rootMargin: '0px 0px -80% 0px',
      threshold: 0,
    }
  )
  headings.forEach(h => observer!.observe(h))
}

// container 或 toc 变化时重新绑定（含 SPA 路由切换文章场景）
watch(
  [() => props.container, () => props.toc],
  () => {
    nextTick(setupObserver)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
})
</script>

<template>
  <nav v-if="toc?.links?.length" aria-label="目录" class="sticky top-8 text-sm">
    <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">目录</p>
    <ul class="space-y-1 border-l border-gray-700/50">
      <li v-for="link in toc.links" :key="link.id">
        <a
          :href="`#${link.id}`"
          @click.prevent="scrollTo(link.id!)"
          :aria-current="activeId === link.id ? 'location' : undefined"
          :class="[
            'block border-l-2 -ml-px py-1 pl-3 transition-colors',
            activeId === link.id
              ? 'border-purple-400 text-purple-300 font-medium'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          ]"
        >
          {{ link.text }}
        </a>
        <ul v-if="link.children?.length" class="mt-1 space-y-1">
          <li v-for="child in link.children" :key="child.id">
            <a
              :href="`#${child.id}`"
              @click.prevent="scrollTo(child.id!)"
              :aria-current="activeId === child.id ? 'location' : undefined"
              :class="[
                'block border-l-2 -ml-px py-1 pl-6 transition-colors',
                activeId === child.id
                  ? 'border-purple-400 text-purple-300 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              ]"
            >
              {{ child.text }}
            </a>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>
