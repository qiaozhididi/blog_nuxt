# 乔治弟弟的博客主页 (Nuxt 3 重构版)

这是一个使用 Nuxt 3 重构的个人博客主页项目，采用了 PPT 风格的整屏演示效果。

## ✨ 特性

- **现代化技术栈**: Nuxt 3 + Vue 3 + Tailwind CSS
- **PPT 风格演示**: 集成 **Reveal.js**，提供类似幻灯片的沉浸式浏览体验。
- **炫酷 UI**: 动态背景、平滑动画、响应式设计。
- **高性能**: 基于 Vite 构建。

## 🛠️ 安装与运行

确保你安装了 Node.js。

1. **安装依赖**

```bash
npm install
```

2. **启动开发服务器**

```bash
npm run dev
```

访问 `http://localhost:3000` 查看效果。

3. **构建生产版本**

```bash
npm run build
```

## 📁 项目结构

- `pages/index.vue`: 主页入口，集成了 Reveal.js 的幻灯片结构。
- `public/data/data.json`: 博客/项目数据源。
- `assets/css/main.css`: Tailwind CSS 入口及自定义样式。
- `nuxt.config.ts`: Nuxt 配置文件，集成了 Tailwind 模块。

## 🎨 样式

项目使用了 Tailwind CSS 进行布局和样式设计，结合 Reveal.js 的转场效果。
- **水平导航**: 切换不同的一级章节（首页、项目、关于、联系）。
- **垂直导航**: 在“项目”章节向下滚动查看详细的项目列表。
