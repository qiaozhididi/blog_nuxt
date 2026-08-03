// utils/content.ts
// 从 @nuxt/content body AST 递归提取纯文本
// 支持 minimark 格式（{ type: 'minimark', value: [[tag, props, ...children]] }）
// 和标准 AST 格式（{ type: 'text', value } / { children: [...] }）
// 用于全文搜索和阅读时间计算，被 blog/index.vue 和 blog/[...slug].vue 复用

/** 提取 minimark 节点（[tag, props, ...children]）的纯文本 */
function extractMinimarkNode(node) {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) {
    // [tag, props, ...children]：跳过 tag(0) 和 props(1)，递归 children
    return node.slice(2).map(extractMinimarkNode).join('')
  }
  return ''
}

export function extractPlainText(node) {
  if (!node) return ''
  // 标准 AST: type === 'text'
  if (node.type === 'text') return node.value || ''
  // minimark 格式: { type: 'minimark', value: [[...]] }
  if (node.type === 'minimark') {
    if (Array.isArray(node.value)) return node.value.map(extractMinimarkNode).join('')
    return ''
  }
  // 标准 AST: children 数组
  if (Array.isArray(node.children)) return node.children.map(extractPlainText).join('')
  return ''
}
