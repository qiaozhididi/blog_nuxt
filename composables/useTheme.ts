export type Theme = 'light' | 'dark'

export function useTheme() {
  // useState 全局共享，避免各组件实例各自维护
  const theme = useState<Theme>('theme', () => 'dark')

  // 应用主题：暗色加 dark class，亮色移除
  // Tailwind darkMode:'class' 和 Shiki dark 主题都基于 html.dark class
  function applyTheme(t: Theme) {
    if (import.meta.client) {
      const html = document.documentElement
      if (t === 'dark') {
        html.classList.add('dark')
      } else {
        html.classList.remove('dark')
      }
      try {
        localStorage.setItem('theme', t)
      } catch (e) {
        // localStorage 被禁用或隐私模式下静默失败
      }
    }
  }

  // 切换主题
  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    applyTheme(theme.value)
  }

  // 初始化：从 localStorage 读取（防闪烁脚本已设 class，此处同步状态）
  function init() {
    if (import.meta.client) {
      const stored = localStorage.getItem('theme') as Theme | null
      theme.value = stored || 'dark'
    }
  }

  return { theme, toggle, init }
}
