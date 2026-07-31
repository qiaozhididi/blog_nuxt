// composables/useCodeBlockEnhancer.ts
// 代码块增强：为 <pre> 注入语言标签 + 复制按钮
// 复制状态反馈用 CSS @keyframes 动画（2s）+ animationend 事件清理，无 JS 定时器
import { nextTick, watch, type Ref } from 'vue'

// 语言标识 → 友好显示名映射；text/空 不显示标签
const langMap: Record<string, string> = {
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  python: 'Python',
  py: 'Python',
  javascript: 'JavaScript',
  js: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  html: 'HTML',
  css: 'CSS',
  sql: 'SQL',
  text: '',
  '': '',
}

/**
 * 创建复制按钮并绑定 click 事件
 * 状态切换用 CSS class（.copied/.failed）+ animationend 清理，无 JS 定时器
 */
function createCopyButton(pre: HTMLPreElement): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'code-copy-btn'
  btn.setAttribute('aria-label', '复制代码')

  const label = document.createElement('span')
  label.className = 'copy-label'
  btn.appendChild(label)

  btn.addEventListener('click', async () => {
    try {
      const text = pre.textContent || ''
      // 优先 Clipboard API，降级 execCommand（HTTP/老浏览器）
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      btn.classList.remove('failed')
      btn.classList.add('copied')
      btn.addEventListener('animationend', () => btn.classList.remove('copied'), { once: true })
    } catch {
      btn.classList.remove('copied')
      btn.classList.add('failed')
      btn.addEventListener('animationend', () => btn.classList.remove('failed'), { once: true })
    }
  })

  return btn
}

/**
 * 增强单个 pre：包装 wrapper + 注入语言标签 + 注入复制按钮
 * 防重复：dataset.enhanced 标记
 */
function enhancePre(pre: HTMLPreElement) {
  if (pre.dataset.enhanced) return
  pre.dataset.enhanced = 'true'

  // 1. 提取语言
  const lang = pre.className.match(/language-(\w+)/)?.[1] || ''

  // 2. 包装 pre：创建 wrapper，插入到 pre 之前，再移 pre 进 wrapper
  const wrapper = document.createElement('div')
  wrapper.className = 'code-block group relative'
  pre.parentNode?.insertBefore(wrapper, pre)
  wrapper.appendChild(pre)

  // 3. 注入语言标签（非 text/空 时）
  const label = langMap[lang] ?? (lang && lang !== 'text' ? lang : '')
  if (label) {
    const tag = document.createElement('span')
    tag.textContent = label
    tag.className = 'code-lang-tag'
    wrapper.appendChild(tag)
  }

  // 4. 注入复制按钮
  const btn = createCopyButton(pre)
  wrapper.appendChild(btn)
}

/**
 * 代码块增强 composable
 * @param container 滚动容器 ref（指向博客详情页最外层 div）
 * @param trigger 路由/数据变化触发器，路由切换时 DOM 重建需重新注入
 */
export function useCodeBlockEnhancer(
  container: Ref<HTMLElement | null>,
  trigger?: () => unknown,
) {
  function enhance() {
    const el = container.value
    if (!el) return
    el.querySelectorAll('pre').forEach((pre) => {
      enhancePre(pre as HTMLPreElement)
    })
  }

  // container mount 后首次注入
  watch(container, () => nextTick(enhance), { immediate: true })
  // 路由切换时 DOM 重建，container ref 不变（指向最外层 div），需 trigger 触发重新注入
  if (trigger) watch(trigger, () => nextTick(enhance))
}
