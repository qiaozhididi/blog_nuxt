# 项目优化设计文档

- **日期**：2026-07-20
- **作者**：qzfrato
- **状态**：已设计，待实施
- **范围**：依赖升级、GitHub Actions 现代化、GitHub Pages baseURL 修复、次要配置修正

## 一、背景与动机

本项目是部署在 GitHub Pages（路径 `/blog_nuxt/`）上的 Nuxt 3 个人博客，使用 Reveal.js 做幻灯片首页 + Nuxt Content 做博客文章。最近多次提交都在反复修复 baseURL 与部署问题（`185e8f8`、`adbac2f`、`77aefe1`、`fd7f297`、`aa02b02` 等），且依赖版本陈旧、CI 配置落后、部分配置风格不统一。

本次优化在不引入架构变更的前提下，统一收口这些问题，使项目可稳定部署到 GitHub Pages。

## 二、目标与非目标

### 目标
1. 升级依赖到最新小版本（不跨大版本）
2. 修复 GitHub Pages 的 baseURL 配置不一致问题
3. 现代化 GitHub Actions（Node 版本、Action 版本、缓存策略）
4. 修正若干次要配置（Tailwind ESM、compatibilityDate、README）

### 非目标
- 不升级 Nuxt 4 或 Reveal.js 6（避免引入 breaking changes）
- 不重构业务代码（pages/、组件不动）
- 不修改 .gitignore
- 不实际推送到 GitHub 触发 Actions 验证（由用户自行推送）
- 不新增 lint/test 配置（项目当前未配置）

## 三、设计决策

### 决策 1：依赖升级策略——保守小版本更新

| 包 | 当前 | 升级到 | 理由 |
|---|---|---|---|
| `nuxt` | ^3.19.0 | ^3.21.9 | latest 3.x，规避 Nuxt 4 breaking changes |
| `@nuxt/content` | ^3.11.0 | ^3.15.0 | latest，与 Nuxt 3.21 兼容 |
| `better-sqlite3` | ^12.6.2 | ^12.11.1 | latest，保留在 dependencies |
| `vue` | `"latest"` | ^3.5.40 | 固定版本，避免 `latest` 漂移 |
| `reveal.js` | ^5.2.1 | 保持 | 不升 6.x，规避 breaking changes |
| `@types/reveal.js` | ^5.2.2 | 保持 | 与 reveal.js 5.x 配套 |
| `@nuxtjs/tailwindcss` | ^6.14.0 | 保持 | 已是 latest |
| `tailwindcss` | ^3.4.19 | 保持 | 不升 4.x |
| `@types/node` | ^25.3.0 | 保持 | 已是 latest |
| `autoprefixer` / `postcss` / `sass` / `sass-loader` | 保持 | 已是 latest 或与sass-loader配套 |

**未升级大版本的依据**：
- Nuxt 4：模块解析、目录结构、TS 配置均有 breaking changes，且需大量适配。
- Reveal.js 6：plugin 加载方式变更，会影响 [pages/[...slug].vue](file:///Users/qzfrato/blog_nuxt/pages/%5B...slug%5D.vue) 的初始化代码。

### 决策 2：GitHub Pages baseURL 修复方案——CI 传 NUXT_APP_BASE_URL

**当前问题**：
- [nuxt.config.ts#L11](file:///Users/qzfrato/blog_nuxt/nuxt.config.ts#L11) 用 `process.env.GITHUB_ACTIONS` 判断 baseURL
- [nuxtjs.yml#L76](file:///Users/qzfrato/blog_nuxt/.github/workflows/nuxtjs.yml#L76) 又设置了 `NUXT_APP_BASE_URL` 环境变量
- 两套机制并存，逻辑不一致，是反复修 baseURL 问题的根因

**修复方案**：统一用 Nuxt 官方的 `NUXT_APP_BASE_URL` 环境变量机制。
- 删除 [nuxt.config.ts](file:///Users/qzfrato/blog_nuxt/nuxt.config.ts) 中的 `baseURL: process.env.GITHUB_ACTIONS ? '/blog_nuxt/' : '/'` 整行
- 让 Nuxt 自动读取 `NUXT_APP_BASE_URL` 环境变量（Nuxt 3 官方机制：`app.baseURL` 默认从此环境变量读取）
- CI 中保留 `NUXT_APP_BASE_URL: /blog_nuxt/`
- 本地未设置该环境变量时，Nuxt 默认 `/`，无需特殊处理

**兼容性验证**：
- [pages/[...slug].vue#L159-L165](file:///Users/qzfrato/blog_nuxt/pages/%5B...slug%5D.vue#L159) 中 `resolvePath` 使用 `runtimeConfig.app.baseURL`，依然会读取到正确的 baseURL（无论是 `/` 还是 `/blog_nuxt/`）

### 决策 3：better-sqlite3 处理——保留不动

Nuxt Content v3 在静态构建时（`nuxt generate`）需要 better-sqlite3 预渲染内容。即使移到 devDependencies，CI 运行 `npm ci` 仍会安装 dev 依赖，编译时间不会减少。改 WASM adapter 需要调研且不确定静态生成是否支持。决定保留不动。

### 决策 4：GitHub Actions 现代化

| 项 | 当前 | 升级到 | 理由 |
|---|---|---|---|
| Node 版本 | 20 | 22 | Node 22 是当前 LTS |
| `actions/upload-pages-artifact` | v3 | v4 | v3 已弃用，v4 是最新 |
| `actions/checkout` | v4 | 保持 | 已是最新 |
| `actions/setup-node` | v4 | 保持 | 已是最新 |
| `actions/configure-pages` | v5 | 保持 | 已是最新 |
| `actions/cache` | v4 | 保持 | 已是最新 |
| `actions/deploy-pages` | v4 | 保持 | 已是最新 |
| `NUXT_APP_BASE_URL` 环境变量 | 保留 | 保留 | 与决策 2 配套，CI 中传给 generate |
| 缓存 key | `hashFiles('dist')` | `hashFiles('package-lock.json')` | dist 路径不存在，原 key 永远返回空 |
| 缓存路径 | `dist` + `.nuxt` | `.nuxt` | dist 不存在；node_modules 已由 setup-node 的 npm cache 处理 |

**缓存职责分工说明**：
- `setup-node` 的 `cache: npm` 负责缓存 `~/.npm`（npm 包下载缓存）
- `actions/cache` 负责缓存 `.nuxt`（Nuxt 构建中间产物，跨次构建可复用）
- 不再缓存 `node_modules`（应由 npm ci 重新构建，保证一致性）
- 不再缓存 `dist`（项目无此目录，原本就是无效配置）

### 决策 5：次要修复

1. **[tailwind.config.js](file:///Users/qzfrato/blog_nuxt/tailwind.config.js) CJS→ESM**：`module.exports = {}` → `export default {}`。项目 `package.json` 已声明 `"type": "module"`，统一 ESM。
2. **[nuxt.config.ts](file:///Users/qzfrato/blog_nuxt/nuxt.config.ts) compatibilityDate**：`'2026-02-07'` → `'2026-07-20'`（今日）。Nuxt 用此值决定默认行为版本，更新为最新日期以使用最新行为。
3. **[README.md](file:///Users/qzfrato/blog_nuxt/README.md) 纠错**：
   - 数据源：`public/data/data.json` → `public/data/site-config.json`
   - 项目结构：`pages/index.vue` → 实际为 `pages/[...slug].vue`（Reveal.js 首页）、`pages/blog/index.vue`、`pages/blog/[...slug].vue`
   - 补充 Nuxt Content 博客功能说明
   - 补充 Obsidian 笔记接入说明的链接

## 四、改动清单

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `package.json` | 修改 | 升级 nuxt / @nuxt/content / better-sqlite3，固定 vue 版本 |
| `package-lock.json` | 自动生成 | npm install 后更新 |
| `nuxt.config.ts` | 修改 | 删除 baseURL 行，更新 compatibilityDate |
| `tailwind.config.js` | 修改 | CJS → ESM |
| `.github/workflows/nuxtjs.yml` | 修改 | Node 22、upload-artifact v4、缓存 key/path 修复 |
| `README.md` | 修改 | 纠正描述 |

## 五、验证策略

1. `npm install` 无报错
2. `npm run generate` 静态构建通过，`.output/public` 目录存在
3. 本地预览 `npm run preview` 可正常访问
4. **不**实际推送到 GitHub 验证 Actions（由用户推送后观察 Actions 运行结果）

## 六、提交策略

按用户偏好"一功能一提交"，分 4 次提交：

1. **Commit 1**：升级依赖版本（package.json + package-lock.json）
2. **Commit 2**：修复 GitHub Pages baseURL 配置（nuxt.config.ts）
3. **Commit 3**：现代化 GitHub Actions（.github/workflows/nuxtjs.yml）
4. **Commit 4**：次要修复（tailwind.config.js ESM、nuxt.config.ts compatibilityDate、README）

注：Commit 2 与 Commit 4 都修改 nuxt.config.ts，需在不同提交中分别完成，避免耦合。

## 七、风险与回滚

### 风险
- 依赖升级后可能存在未知兼容性问题 → 验证 `npm run generate` 通过即可
- baseURL 修复后 GitHub Pages 可能仍部署失败 → 由用户推送后观察 Actions 日志，必要时回滚到 `process.env.GITHUB_ACTIONS` 判断
- Node 22 升级若 better-sqlite3 编译失败 → 由用户在 CI 中观察，必要时回退 Node 20

### 回滚
每个 commit 独立，可单独 revert。最坏情况整体 revert 到本次优化前的 `e9d0b90` 提交。

## 八、后续工作（不在本次范围）

- 升级 Nuxt 4 / Reveal.js 6（独立项目，需充分测试）
- 添加 ESLint/Prettier 配置
- 添加单元测试
- 优化 [pages/[...slug].vue](file:///Users/qzfrato/blog_nuxt/pages/%5B...slug%5D.vue) 中 Reveal.js 初始化代码的可读性
