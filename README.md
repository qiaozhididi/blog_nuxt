# 乔治弟弟的博客主页 (Nuxt 3)

一个使用 Nuxt 3 构建的个人博客主页项目，采用 PPT 风格的整屏演示效果首页 + 基于 Nuxt Content 的博客文章系统，并支持 Obsidian 笔记接入。

## ✨ 特性

- **现代化技术栈**: Nuxt 3 + Vue 3 + Tailwind CSS
- **PPT 风格演示**: 集成 **Reveal.js**，首页提供类似幻灯片的沉浸式浏览体验
- **博客系统**: 基于 **Nuxt Content v3**，直接渲染 Markdown 文件
- **Obsidian 接入**: 支持将 Obsidian Vault 作为博客数据源（详见 [Obsidian 接入指南](./OBSIDIAN_INTEGRATION.md)）
- **炫酷 UI**: 动态背景、平滑动画、响应式设计
- **高性能**: 基于 Vite 构建，可静态部署到 GitHub Pages

## 🛠️ 安装与运行

确保你安装了 Node.js 22+。

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

4. **静态导出（用于 GitHub Pages 部署）**

```bash
# 本地导出（baseURL 为 /）
npm run generate

# 模拟 GitHub Pages 部署（baseURL 为 /blog_nuxt/）
NUXT_APP_BASE_URL=/blog_nuxt/ NITRO_PRESET=github-pages npm run generate
```

## 📁 项目结构

- `pages/[...slug].vue`: Reveal.js 幻灯片首页，处理所有非 `/blog` 路由
- `pages/blog/index.vue`: 博客文章列表
- `pages/blog/[...slug].vue`: 博客文章详情页
- `content/blog/`: Markdown 文章存放目录（Obsidian 笔记源）
- `public/data/site-config.json`: 首页幻灯片配置数据源
- `assets/css/main.css`: Tailwind CSS 入口及自定义样式
- `nuxt.config.ts`: Nuxt 配置文件
- `content.config.ts`: Nuxt Content 集合配置
- `tailwind.config.js`: Tailwind CSS 配置（ESM）
- `.github/workflows/nuxtjs.yml`: GitHub Actions 部署流水线

## 🚀 部署

项目通过 GitHub Actions 自动部署到 GitHub Pages：

- 推送到 `master` 分支即触发部署
- CI 中设置 `NUXT_APP_BASE_URL=/blog_nuxt/` 以匹配 GitHub Pages 子路径
- 部署 URL: `https://qiaozhididi.github.io/blog_nuxt/`

## 🎨 样式

项目使用 Tailwind CSS 进行布局和样式设计，结合 Reveal.js 的转场效果：
- **水平导航**: 切换不同的一级章节（首页、项目、关于、联系）
- **垂直导航**: 在"项目"章节向下滚动查看详细的项目列表
