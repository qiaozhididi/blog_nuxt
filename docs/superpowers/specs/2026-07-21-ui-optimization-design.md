# UI 优化设计文档

- **日期**：2026-07-21
- **作者**：qzfrato
- **状态**：已设计，待实施
- **范围**：博客详情页滚动修复、按钮玻璃态重构、幻灯片翻页提示与移动端优化、页面标题配置

## 一、背景与动机

项目部署修复后线上可正常访问，但存在若干展示与交互问题：

1. **博客详情页滚动异常**：[app.vue](file:///Users/qzfrato/blog_nuxt/app.vue#L13-L17) 全局设置 `html, body, #__nuxt { overflow: hidden }` 是为配合首页 Reveal.js 幻灯片（不需要页面滚动）。但 [pages/blog/[...slug].vue](file:///Users/qzfrato/blog_nuxt/pages/blog/%5B...slug%5D.vue#L2) 的 `h-screen overflow-y-auto` 在 `overflow: hidden` 的祖先里滚动到底继续滚会触发弹性滚动异常/页面跳动，移动端尤其明显。
2. **按钮样式突兀**：[main.css](file:///Users/qzfrato/blog_nuxt/assets/css/main.css#L12-L18) 定义紫粉渐变，[pages/[...slug].vue scoped](file:///Users/qzfrato/blog_nuxt/pages/%5B...slug%5D.vue#L435-L451) 覆盖为白底深字（`background-color: white; color: #0f172a`），两处定义冲突，且白底在深色幻灯片上过于刺眼。
3. **幻灯片翻页提示不明显 + 移动端体验差**：Reveal 默认 controls（右下角小箭头）不明显，用户不知道可以翻页；移动端默认控件太小难点击，无触摸提示。
4. **页面标题缺失**：[nuxt.config.ts](file:///Users/qzfrato/blog_nuxt/nuxt.config.ts#L12-L19) 未设置 `app.head.title` / `titleTemplate`，浏览器标签与 SEO 缺失。期望标题为「乔治弟弟_Blog」。

本次优化在不改变整体架构（仍保留 Reveal.js 幻灯片首页 + Nuxt Content 博客）的前提下，修复这四个展示与交互问题。

## 二、目标与非目标

### 目标
1. 修复博客详情页滚动到底/顶继续滚的异常跳动
2. 按钮统一为半透明玻璃态，与深色主题协调
3. 幻灯片翻页提示更明显，移动端翻页体验优化
4. 设置页面标题为「乔治弟弟_Blog」，博客详情页动态显示文章标题

### 非目标
- 不改变 Reveal.js 幻灯片首页的整体架构（保留幻灯片式交互）
- 不重构 Reveal 初始化逻辑（保持 `mouseWheel` + `drag` + `controls` 三种翻页方式）
- 不修改 site-config.json 数据结构
- 不增加新的幻灯片类型
- 不做 SEO 全面优化（仅设置标题）
- 不添加单元测试（项目当前未配置）

## 三、设计决策

### 决策 1：博客详情页滚动修复——移除全局 overflow:hidden，由页面自治

**方案对比**：

| 方案 | 描述 | 优点 | 缺点 |
|---|---|---|---|
| A | 页面级动态切换 body overflow（首页 mount 时设 hidden，unmount 恢复） | 精准控制 | 需改两处，有时序问题 |
| B | 博客详情页 JS 强制 body 可滚动 | 改动小 | 与全局 hidden 冲突，时序耦合 |
| **C（采用）** | 移除 app.vue 全局 `overflow: hidden`，让每个页面根 div 自治 | 最简洁，职责清晰 | 需确认首页所有状态都正确隐藏溢出 |

**决策**：采用方案 C。

**理由**：
- 首页 [pages/[...slug].vue](file:///Users/qzfrato/blog_nuxt/pages/%5B...slug%5D.vue#L2) 根 div 已有 `overflow-hidden`，自带溢出控制
- 博客详情页 [pages/blog/[...slug].vue](file:///Users/qzfrato/blog_nuxt/pages/blog/%5B...slug%5D.vue#L2) 根 div 是 `h-screen overflow-y-auto`，移除全局 hidden 后即可正常滚动
- 博客列表页 [pages/blog/index.vue](file:///Users/qzfrato/blog_nuxt/pages/blog/index.vue) 同理需要正常滚动

**改动**：
- [app.vue](file:///Users/qzfrato/blog_nuxt/app.vue#L13-L17) 的 `html, body, #__nuxt` 样式块中移除 `overflow: hidden`，保留 `height: 100%; width: 100%`
- 保留 `app.vue` 中的滚动条样式（`::-webkit-scrollbar` 等，用于 Reveal 内部滚动容器）

### 决策 2：按钮改为半透明玻璃态——统一为单处定义

**问题**：`main.css` 与 `pages/[...slug].vue` scoped 两处定义 `.btn-primary`，scoped 优先导致白底深字，且与全局紫粉渐变定义冲突。

**决策**：
- 删除 [pages/[...slug].vue](file:///Users/qzfrato/blog_nuxt/pages/%5B...slug%5D.vue#L435-L451) scoped 中的 `.btn-primary` 与 `.btn-primary:hover` 定义
- 在 [main.css](file:///Users/qzfrato/blog_nuxt/assets/css/main.css#L11-L18) 中重写 `.btn-primary` 为玻璃态：

```css
.btn-primary {
  @apply inline-block px-8 py-3 rounded-full font-bold text-lg
         transition-all duration-300 transform hover:-translate-y-1;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: white !important;
  box-shadow: 0 4px 14px 0 rgba(0, 0, 0, 0.25);
  cursor: pointer;
}

.btn-primary:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
}
```

**兼容性**：
- `backdrop-filter` 在现代浏览器（Chrome 76+、Safari 9+、Firefox 103+）支持良好，加 `-webkit-` 前缀兼容旧 Safari
- 保留 `.reveal .btn-primary { color: white !important; }` 覆盖 Reveal.js 主题色
- 玻璃态在 Reveal 幻灯片背景（渐变色）与博客详情页（深灰背景）上都协调

### 决策 3：幻灯片翻页提示 + 移动端优化

**问题分解**：
1. 桌面端：Reveal 默认 controls（右下角小箭头）太小不明显
2. 首屏（hero 类型）：用户不知道可以翻页
3. 移动端：默认 controls 难点击，无触摸提示

**方案**：

#### 3.1 桌面端 controls 增强

通过 CSS 放大 Reveal 默认 controls 并加半透明背景：

```css
:deep(.reveal .controls) {
  /* 放大控件 */
  font-size: 24px;
}
:deep(.reveal .controls button) {
  opacity: 0.7;
  transition: opacity 0.2s;
}
:deep(.reveal .controls button:hover) {
  opacity: 1;
}
```

#### 3.2 首屏翻页提示

在 hero 类型幻灯片右下角加一个半透明"向右探索"提示 + 箭头动画（仅在第一张幻灯片显示）：

```vue
<!-- 在 hero section 内追加 -->
<div v-if="index === 0" class="absolute bottom-8 right-8 text-white/50 text-sm flex items-center gap-2 animate-pulse">
  <span>向右探索</span>
  <i class="fa fa-arrow-right"></i>
</div>
```

#### 3.3 移动端优化

- 隐藏 Reveal 默认 controls（移动端太小）：
```css
@media (max-width: 767px) {
  :deep(.reveal .controls) {
    display: none !important;
  }
}
```

- 底部固定页面指示器（`当前/总数` 格式）+ 滑动手势提示（首次访问显示"左右滑动切换"）：
```vue
<!-- 在 reveal 容器外层加移动端指示器 -->
<div v-if="!pending && config" class="mobile-page-indicator md:hidden">
  <span>{{ currentIndex + 1 }} / {{ config.slides.length }}</span>
</div>
```

- 在 `slidechanged` 事件中更新 `currentIndex`
- 移动端首屏加向下/向右箭头动画提示（复用 projects cover 已有的 `animate-bounce` chevron-down 模式）

#### 3.4 移动端触摸滚动优化

当前 [pages/[...slug].vue](file:///Users/qzfrato/blog_nuxt/pages/%5B...slug%5D.vue#L503-L517) 移动端已有 `overflow-y: auto` 适配。补 `-webkit-overflow-scrolling: touch` 提升 iOS 滚动惯性：

```css
@media (max-width: 767px) {
  :deep(.reveal) {
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch;
  }
}
```

### 决策 4：页面标题配置

**改动**：[nuxt.config.ts](file:///Users/qzfrato/blog_nuxt/nuxt.config.ts#L12-L19) 的 `app.head` 增加：

```ts
app: {
  head: {
    title: '乔治弟弟_Blog',
    titleTemplate: (title) => title ? `${title} - 乔治弟弟_Blog` : '乔治弟弟_Blog',
    link: [/* 保持现有 font-awesome */],
  },
},
```

**各页面标题行为**：
- 首页幻灯片：未单独设置 title → `titleTemplate` 收到 undefined → 显示「乔治弟弟_Blog」
- 博客详情页：用 `useHead({ title: data.value?.title })` → 显示「文章标题 - 乔治弟弟_Blog」
- 博客列表页：可选设置 `useHead({ title: '博客' })` → 显示「博客 - 乔治弟弟_Blog」

**博客详情页改动**：[pages/blog/[...slug].vue](file:///Users/qzfrato/blog_nuxt/pages/blog/%5B...slug%5D.vue#L29-L32) script 中加：

```ts
const { data } = await useAsyncData('page-data', () => queryCollection('blog').path(route.path).first());
useHead(() => ({
  title: data.value?.title || '文章',
}));
```

## 四、改动清单

| 文件 | 改动类型 | 说明 |
|---|---|---|
| [app.vue](file:///Users/qzfrato/blog_nuxt/app.vue) | 修改 | 移除全局 `overflow: hidden`，保留 height/width 与滚动条样式 |
| [assets/css/main.css](file:///Users/qzfrato/blog_nuxt/assets/css/main.css) | 修改 | `.btn-primary` 重写为玻璃态 |
| [pages/[...slug].vue](file:///Users/qzfrato/blog_nuxt/pages/%5B...slug%5D.vue) | 修改 | 删除 scoped `.btn-primary` 重复定义；首屏翻页提示；移动端指示器；controls 样式增强；移动端触摸滚动优化 |
| [pages/blog/[...slug].vue](file:///Users/qzfrato/blog_nuxt/pages/blog/%5B...slug%5D.vue) | 修改 | 加 `useHead` 动态标题 |
| [pages/blog/index.vue](file:///Users/qzfrato/blog_nuxt/pages/blog/index.vue) | 修改 | 加 `useHead({ title: '博客' })` |
| [nuxt.config.ts](file:///Users/qzfrato/blog_nuxt/nuxt.config.ts) | 修改 | `app.head` 加 `title` 与 `titleTemplate` |

## 五、验证策略

1. `npm run generate` 静态构建通过
2. 本地预览 `npm run preview`：
   - 首页幻灯片翻页正常，controls 更明显，首屏有翻页提示
   - 按钮显示为半透明玻璃态，hover 有反馈
   - 浏览器标签标题为「乔治弟弟_Blog」
3. 本地访问 `/blog` 与 `/blog/xxx`：
   - 博客详情页滚动到底/顶继续滚不再跳动
   - 博客详情页标签标题为「文章标题 - 乔治弟弟_Blog」
4. 移动端模拟（Chrome DevTools 移动端模式）：
   - 首页底部有页面指示器
   - 触摸滑动翻页正常
   - iOS 滚动惯性（`-webkit-overflow-scrolling`）
5. 推送后线上验证（由用户执行）

## 六、提交策略

按用户偏好"一功能一提交"，分 4 次提交：

1. **Commit 1**：修复博客详情页滚动（app.vue 移除全局 overflow:hidden）
2. **Commit 2**：按钮玻璃态重构（main.css + pages/[...slug].vue 删除 scoped 重复定义）
3. **Commit 3**：幻灯片翻页提示与移动端优化（pages/[...slug].vue）
4. **Commit 4**：页面标题配置（nuxt.config.ts + pages/blog/[...slug].vue + pages/blog/index.vue）

## 七、风险与回滚

### 风险
- 移除全局 `overflow: hidden` 后，首页在某些加载状态可能出现短暂溢出滚动条 → 首页根 div 已有 `overflow-hidden`，应可覆盖
- `backdrop-filter` 在旧浏览器不支持 → 降级为纯半透明背景（仍可用，只是无模糊效果）
- 移动端指示器与 Reveal controls 定位冲突 → 移动端隐藏默认 controls，桌面端指示器不显示（`md:hidden`）

### 回滚
每个 commit 独立，可单独 revert。

## 八、后续工作（不在本次范围）

- Reveal.js 初始化代码可读性优化（当前 initReveal 较复杂）
- 幻灯片内容（site-config.json）的视觉精修
- 博客列表页样式优化
- 暗色主题切换功能
- SEO 全面优化（meta description、Open Graph 等）
