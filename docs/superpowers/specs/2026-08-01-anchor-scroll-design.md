# 文章目录自动锚点定位 设计规范

> 日期：2026-08-01
> 状态：已确认

## 目标

为博客详情页 TOC 目录增加 URL hash 同步和深链自动滚动能力：
1. **点击 TOC 更新 URL**：点击目录项时 URL 更新 `#hash`，便于分享和书签
2. **深链自动滚动**：访问 `/blog/xxx#section` 时自动滚动到对应章节

## 背景

现有 [TableOfContents.vue](file:///Users/qzfrato/blog_nuxt/components/TableOfContents.vue) 已实现：
- IntersectionObserver 检测当前章节高亮
- 点击目录项 `scrollIntoView({ behavior: 'smooth' })` 平滑滚动
- `<a :href="#${link.id}">` 有 href 但被 `@click.prevent` 阻止（URL 不更新）

缺失：URL hash 同步 + 页面加载时深链滚动。

## 方案

直接修改 TOC 组件 + 页面，不新建 composable（KISS）。

### 1. TOC 组件：点击更新 URL hash

修改 `scrollTo(id)` 函数，`scrollIntoView` 后追加 `history.replaceState`：

```ts
function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth' })
  history.replaceState(null, '', `#${id}`)
}
```

- 用 `replaceState`（非 `pushState`）：不堆积历史记录（用户未选历史记录功能）
- 保留 `@click.prevent`：JS 控制滚动 + URL 更新

### 2. 页面：深链自动滚动

在 [pages/blog/[...slug].vue](file:///Users/qzfrato/blog_nuxt/pages/blog/[...slug].vue) 监听 `data` 加载完成后读 `route.hash` 滚动：

```js
watch(() => data.value, (val) => {
  if (!val) return
  const hash = route.hash.slice(1)
  if (!hash) return
  nextTick(() => {
    setTimeout(() => {
      const el = document.getElementById(hash)
      if (el) el.scrollIntoView({ behavior: 'auto' })
    }, 100)
  })
}, { immediate: true })
```

- `behavior: 'auto'`（瞬间定位）：页面刚加载，不需滚动动画
- `setTimeout(100ms)`：等待 Shiki 高亮和 DOM 渲染完成，避免元素位置偏移
- `watch(data, ..., { immediate: true })`：覆盖首次加载 + SPA 路由切换
- 移动端 TOC 隐藏时深链仍工作（逻辑在页面级）

## 边界情况

- hash 找不到对应元素：静默跳过（`if (!el) return`）
- SPA 切换文章：`watch(data)` 在新文章数据加载后重新触发
- `scroll-mt-8` CSS 已存在（`.prose h2/h3`），处理固定偏移

## 不做的功能（YAGNI）

- 滚动时 URL 自动更新（用户未选）
- 浏览器后退/前进历史记录（用户未选）

## 涉及文件

- 修改：`components/TableOfContents.vue`（scrollTo 增加 replaceState）
- 修改：`pages/blog/[...slug].vue`（增加深链滚动 watch）
