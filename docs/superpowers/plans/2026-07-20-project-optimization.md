# 项目优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化 Nuxt 3 博客项目——升级依赖小版本、修复 GitHub Pages baseURL 配置不一致、现代化 GitHub Actions、修正若干次要配置问题。

**Architecture:** 纯配置层修改，不动业务代码。四个独立 task 顺序执行，每个 task 自带验证（npm install / npm run generate / 文件内容校验）并独立提交。所有改动可单独 revert。

**Tech Stack:** Nuxt 3、@nuxt/content、Tailwind CSS、Reveal.js、GitHub Actions、GitHub Pages。

## Global Constraints

- 依赖升级仅限小版本：nuxt ^3.19.0 → ^3.21.9、@nuxt/content ^3.11.0 → ^3.15.0、better-sqlite3 ^12.6.2 → ^12.11.1
- `vue` 从 `"latest"` 固定为 `^3.5.40`
- 不升级 Nuxt 4 / Reveal.js 6 / Tailwind 4
- baseURL 统一用 `NUXT_APP_BASE_URL` 环境变量，删除 `process.env.GITHUB_ACTIONS` 判断
- Node 22 LTS、`actions/upload-pages-artifact@v4`
- 项目是 ESM（`"type": "module"`），配置文件统一 ESM
- 提交信息用中文，简短描述
- 一功能一提交，分 4 次提交
- 当前分支：master，已领先 origin/master（用户最后会自行 push）

## File Structure

改动清单（已确认）：

| 文件 | 改动类型 | Task |
|---|---|---|
| `package.json` | 修改 | Task 1 |
| `package-lock.json` | 自动生成 | Task 1 |
| `nuxt.config.ts` | 修改（删 baseURL + 更新 compatibilityDate） | Task 2、Task 4 |
| `.github/workflows/nuxtjs.yml` | 修改 | Task 3 |
| `tailwind.config.js` | 修改（CJS→ESM） | Task 4 |
| `README.md` | 修改 | Task 4 |

**文件职责说明**：
- `package.json`：依赖声明与脚本入口
- `nuxt.config.ts`：Nuxt 应用配置（baseURL、modules、css、head）
- `.github/workflows/nuxtjs.yml`：CI/CD 流水线，构建并部署到 GitHub Pages
- `tailwind.config.js`：Tailwind CSS 配置
- `README.md`：项目文档

---

## Task 1: 升级依赖版本

**Files:**
- Modify: `package.json`
- Auto-generate: `package-lock.json`

**Interfaces:**
- Produces: 升级后的 `package.json`，后续 task 的验证步骤依赖于此 task 完成后的 `npm install`

- [ ] **Step 1: 检查当前 package.json 内容**

Read `package.json`，确认当前依赖版本：
```json
{
  "dependencies": {
    "@types/reveal.js": "^5.2.2",
    "better-sqlite3": "^12.6.2",
    "nuxt": "^3.19.0",
    "reveal.js": "^5.2.1",
    "vue": "latest"
  },
  "devDependencies": {
    "@nuxt/content": "^3.11.0",
    "@nuxtjs/tailwindcss": "^6.14.0",
    "@types/node": "^25.3.0",
    "autoprefixer": "^10.4.24",
    "postcss": "^8.5.6",
    "sass": "^1.83.4",
    "sass-loader": "^16.0.4",
    "tailwindcss": "^3.4.19"
  }
}
```

- [ ] **Step 2: 修改 package.json 中的依赖版本**

用 Edit 工具，将 `dependencies` 中：
- `"nuxt": "^3.19.0"` → `"nuxt": "^3.21.9"`
- `"better-sqlite3": "^12.6.2"` → `"better-sqlite3": "^12.11.1"`
- `"vue": "latest"` → `"vue": "^3.5.40"`

将 `devDependencies` 中：
- `"@nuxt/content": "^3.11.0"` → `"@nuxt/content": "^3.15.0"`

其他依赖保持不变。最终 `dependencies` 与 `devDependencies` 应为：
```json
{
  "dependencies": {
    "@types/reveal.js": "^5.2.2",
    "better-sqlite3": "^12.11.1",
    "nuxt": "^3.21.9",
    "reveal.js": "^5.2.1",
    "vue": "^3.5.40"
  },
  "devDependencies": {
    "@nuxt/content": "^3.15.0",
    "@nuxtjs/tailwindcss": "^6.14.0",
    "@types/node": "^25.3.0",
    "autoprefixer": "^10.4.24",
    "postcss": "^8.5.6",
    "sass": "^1.83.4",
    "sass-loader": "^16.0.4",
    "tailwindcss": "^3.4.19"
  }
}
```

- [ ] **Step 3: 安装依赖并更新 lock 文件**

Run: `npm install`
Expected:
- 命令退出码 0
- 输出中包含 `added X packages` 或类似成功信息
- `package-lock.json` 自动更新
- 不应有 `npm warn ERESOLVE overriding peer dependency` 之外的致命错误

如果出现 `EBADENGINE` 警告：忽略（仅是 Node 版本提示）。
如果出现 `ERESOLVE` 错误：检查 `@nuxt/content` 与 `nuxt` 版本兼容性，必要时降回 `@nuxt/content: ^3.13.0`。

- [ ] **Step 4: 验证依赖安装成功**

Run: `ls node_modules/nuxt node_modules/@nuxt/content node_modules/better-sqlite3`
Expected: 三个目录都存在，无 "No such file or directory" 报错。

Run: `npm ls nuxt @nuxt/content better-sqlite3 vue 2>&1 | head -20`
Expected: 输出版本号符合预期（nuxt 3.21.x、@nuxt/content 3.15.x、better-sqlite3 12.11.x、vue 3.5.x）。

- [ ] **Step 5: 验证静态构建可用（关键回归点）**

Run: `npm run generate 2>&1 | tail -30`
Expected:
- 命令退出码 0
- 输出中包含 `ℾ Generated public dist` 或 `.output/public` 目录
- 不应有 `Error` 或 `Cannot find module` 等致命错误

如果出现 Nuxt Content 报错：可能是 3.15 与现有 content.config.ts 不兼容，记录错误并回滚 `@nuxt/content` 到 3.13 或 3.14。

- [ ] **Step 6: 验证产物路径存在**

Run: `ls .output/public/index.html .output/public/_payload.json 2>&1`
Expected: 两个文件都存在（静态生成成功）。

- [ ] **Step 7: 提交依赖升级**

```bash
git add package.json package-lock.json
git commit -m "升级依赖版本：nuxt 3.21、@nuxt/content 3.15、better-sqlite3 12.11、固定 vue 版本"
```

Run: `git log --oneline -1`
Expected: 最新 commit 是本次升级提交。

---

## Task 2: 修复 GitHub Pages baseURL 配置

**Files:**
- Modify: `nuxt.config.ts:1-21`

**Interfaces:**
- Consumes: Task 1 升级后的依赖（确保 nuxt 3.21 仍读取 `NUXT_APP_BASE_URL`）
- Produces: 删除 `process.env.GITHUB_ACTIONS` 判断的 nuxt.config.ts，依赖 Nuxt 内置的 `NUXT_APP_BASE_URL` 环境变量读取机制

- [ ] **Step 1: 检查当前 nuxt.config.ts 内容**

Read `nuxt.config.ts`，确认当前内容（重点第 11 行）：
```typescript
export default defineNuxtConfig({
  compatibilityDate: '2026-02-07',
  // Trigger new build
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/content'
  ],
  css: ['~/assets/css/main.css'],
  app: {
    // 在 GitHub Pages 上部署时使用 /blog_nuxt/，其他环境（如 Vercel、本地）使用 /
    baseURL: process.env.GITHUB_ACTIONS ? '/blog_nuxt/' : '/',
    head: {
      link: [
        {
          rel: "stylesheet",
          href: "https://cdn.staticfile.org/font-awesome/4.7.0/css/font-awesome.css",
        },
      ],
    },
  },
});// timestamp 2026年 2月 7日 星期六 18时22分27秒 CST
```

- [ ] **Step 2: 删除 baseURL 配置行**

用 Edit 工具，将：
```typescript
  app: {
    // 在 GitHub Pages 上部署时使用 /blog_nuxt/，其他环境（如 Vercel、本地）使用 /
    baseURL: process.env.GITHUB_ACTIONS ? '/blog_nuxt/' : '/',
    head: {
```
改为：
```typescript
  app: {
    // baseURL 由 Nuxt 自动从 NUXT_APP_BASE_URL 环境变量读取
    // CI 中设置 NUXT_APP_BASE_URL=/blog_nuxt/，本地未设置时默认 /
    head: {
```

- [ ] **Step 3: 验证修改后的 nuxt.config.ts**

Read `nuxt.config.ts`，确认：
- 第 11 行的 `baseURL: process.env.GITHUB_ACTIONS ? '/blog_nuxt/' : '/',` 已删除
- 替换为两行注释
- 其余结构未变

最终内容应为：
```typescript
export default defineNuxtConfig({
  compatibilityDate: '2026-02-07',
  // Trigger new build
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/content'
  ],
  css: ['~/assets/css/main.css'],
  app: {
    // baseURL 由 Nuxt 自动从 NUXT_APP_BASE_URL 环境变量读取
    // CI 中设置 NUXT_APP_BASE_URL=/blog_nuxt/，本地未设置时默认 /
    head: {
      link: [
        {
          rel: "stylesheet",
          href: "https://cdn.staticfile.org/font-awesome/4.7.0/css/font-awesome.css",
        },
      ],
    },
  },
});// timestamp 2026年 2月 7日 星期六 18时22分27秒 CST
```

注：`compatibilityDate` 在 Task 4 中统一更新，本 task 保持 `'2026-02-07'`。

- [ ] **Step 4: 本地验证默认 baseURL 行为**

Run: `unset NUXT_APP_BASE_URL; npm run generate 2>&1 | tail -10`
Expected:
- 构建成功，退出码 0
- 输出中无 `baseURL` 相关报错

Run: `grep -o 'baseURL[^,]*' .output/public/_payload.json | head -3` 或直接 `grep -c 'blog_nuxt' .output/public/_payload.json`
Expected: 输出 0（本地未设置 NUXT_APP_BASE_URL，不应出现 `/blog_nuxt/`）

- [ ] **Step 5: 模拟 CI 环境验证 baseURL 行为**

Run: `NUXT_APP_BASE_URL=/blog_nuxt/ npm run generate 2>&1 | tail -10`
Expected:
- 构建成功，退出码 0

Run: `grep -c 'blog_nuxt' .output/public/_payload.json` 或 `grep -c 'blog_nuxt' .output/public/index.html`
Expected: 输出 > 0（baseURL 已正确注入 `/blog_nuxt/`）

如果输出 0：说明 Nuxt 3.21 未自动读取 `NUXT_APP_BASE_URL`，需要恢复手动配置：`baseURL: process.env.NUXT_APP_BASE_URL || '/'`。这种情况记录在 task 报告中，由后续调整。

- [ ] **Step 6: 清理本地构建产物**

Run: `rm -rf .output .nuxt`
Expected: 静默成功（避免后续 task 受旧产物干扰）。

- [ ] **Step 7: 提交 baseURL 修复**

```bash
git add nuxt.config.ts
git commit -m "修复 baseURL 配置：删除 GITHUB_ACTIONS 判断，统一用 NUXT_APP_BASE_URL 环境变量"
```

Run: `git log --oneline -2`
Expected: 最近两个 commit 分别是 baseURL 修复、依赖升级。

---

## Task 3: 现代化 GitHub Actions

**Files:**
- Modify: `.github/workflows/nuxtjs.yml`

**Interfaces:**
- Consumes: Task 2 修复后的 baseURL 机制（CI 中保留 `NUXT_APP_BASE_URL` 环境变量传给 generate 步骤）
- Produces: 现代化的 CI 配置，Node 22 + upload-pages-artifact v4 + 修复缓存策略

- [ ] **Step 1: 检查当前 nuxtjs.yml 内容**

Read `.github/workflows/nuxtjs.yml`，确认当前内容。重点检查：
- 第 52 行：`node-version: "20"`
- 第 62-70 行：缓存配置（path 包含 `dist`、key 用 `hashFiles('dist')`）
- 第 79 行：`uses: actions/upload-pages-artifact@v3`
- 第 76 行：`NUXT_APP_BASE_URL: /blog_nuxt/`

- [ ] **Step 2: 升级 Node 版本**

用 Edit 工具，将：
```yaml
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: ${{ steps.detect-package-manager.outputs.manager }}
```
改为：
```yaml
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: ${{ steps.detect-package-manager.outputs.manager }}
```

- [ ] **Step 3: 修复缓存配置**

用 Edit 工具，将：
```yaml
      - name: Restore cache
        uses: actions/cache@v4
        with:
          path: |
            dist
            .nuxt
          key: ${{ runner.os }}-nuxt-build-${{ hashFiles('dist') }}
          restore-keys: |
            ${{ runner.os }}-nuxt-build-
```
改为：
```yaml
      - name: Restore cache
        uses: actions/cache@v4
        with:
          path: |
            .nuxt
          key: ${{ runner.os }}-nuxt-build-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-nuxt-build-
```

变更说明：
- path 删除 `dist`（项目无此目录，原配置无效）
- key 从 `hashFiles('dist')` 改为 `hashFiles('package-lock.json')`（lock 文件变化才需重建缓存）

- [ ] **Step 4: 升级 upload-pages-artifact 版本**

用 Edit 工具，将：
```yaml
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: .output/public
```
改为：
```yaml
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: .output/public
```

- [ ] **Step 5: 确认 NUXT_APP_BASE_URL 在 generate 步骤保留**

Read `.github/workflows/nuxtjs.yml` 的 `Static HTML export with Nuxt` 步骤，确认包含：
```yaml
      - name: Static HTML export with Nuxt
        run: ${{ steps.detect-package-manager.outputs.manager }} run generate
        env:
          NUXT_APP_BASE_URL: /blog_nuxt/
          NITRO_PRESET: github-pages
```

如果 `NUXT_APP_BASE_URL` 缺失，需要补上（与 Task 2 配套）。

- [ ] **Step 6: 验证完整 workflow 文件**

Read `.github/workflows/nuxtjs.yml`，确认完整文件内容符合预期：
- `node-version: "22"`
- 缓存 path 仅 `.nuxt`
- 缓存 key 用 `hashFiles('package-lock.json')`
- `actions/upload-pages-artifact@v4`
- `NUXT_APP_BASE_URL: /blog_nuxt/` 保留

- [ ] **Step 7: 本地 YAML 语法校验**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/nuxtjs.yml'))" && echo "YAML OK"`
Expected: 输出 `YAML OK`，无语法错误。

如果 Python 不可用或无 yaml 模块，改用：
Run: `npx --yes yaml-lint .github/workflows/nuxtjs.yml`
Expected: 输出 `✓ Lint OK` 或类似成功信息。

- [ ] **Step 8: 提交 GitHub Actions 现代化改动**

```bash
git add .github/workflows/nuxtjs.yml
git commit -m "现代化 GitHub Actions：Node 22、upload-pages-artifact v4、修复缓存策略"
```

Run: `git log --oneline -3`
Expected: 最近三个 commit 分别是 Actions 现代化、baseURL 修复、依赖升级。

---

## Task 4: 次要修复（Tailwind ESM、compatibilityDate、README）

**Files:**
- Modify: `tailwind.config.js`
- Modify: `nuxt.config.ts:2`
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 1 升级后的依赖、Task 2 修复后的 nuxt.config.ts
- Produces: 统一 ESM 风格的配置文件、最新 compatibilityDate、与实际代码对齐的 README

- [ ] **Step 1: 转换 tailwind.config.js 为 ESM**

Read `tailwind.config.js`，确认当前 CJS 内容：
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

用 Edit 工具，将 `module.exports = {` 改为 `export default {`。

最终内容：
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 2: 更新 nuxt.config.ts 的 compatibilityDate**

Read `nuxt.config.ts`，确认第 2 行当前内容：
```typescript
  compatibilityDate: '2026-02-07',
```

用 Edit 工具，将 `'2026-02-07'` 改为 `'2026-07-20'`。

同时清理文件末尾的注释（line 21）：
```typescript
});// timestamp 2026年 2月 7日 星期六 18时22分27秒 CST
```
改为：
```typescript
});
```

最终 `nuxt.config.ts` 应为：
```typescript
export default defineNuxtConfig({
  compatibilityDate: '2026-07-20',
  // Trigger new build
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/content'
  ],
  css: ['~/assets/css/main.css'],
  app: {
    // baseURL 由 Nuxt 自动从 NUXT_APP_BASE_URL 环境变量读取
    // CI 中设置 NUXT_APP_BASE_URL=/blog_nuxt/，本地未设置时默认 /
    head: {
      link: [
        {
          rel: "stylesheet",
          href: "https://cdn.staticfile.org/font-awesome/4.7.0/css/font-awesome.css",
        },
      ],
    },
  },
});
```

- [ ] **Step 3: 重写 README.md 内容**

Read `README.md`，确认当前内容。

用 Write 工具完整重写 README.md，新内容如下：

```markdown
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
```

- [ ] **Step 4: 验证 tailwind.config.js 转换**

Run: `node -e "import('./tailwind.config.js').then(m => console.log('ESM OK:', JSON.stringify(Object.keys(m.default || m))))"`
Expected: 输出类似 `ESM OK: ["content","theme","plugins"]`，无报错。

如果报错：检查是否漏改 `module.exports`。

- [ ] **Step 5: 验证 nuxt.config.ts 修改**

Read `nuxt.config.ts`，确认：
- 第 2 行是 `compatibilityDate: '2026-07-20',`
- 末尾不再有 `// timestamp` 注释
- baseURL 配置部分仍为 Task 2 的两行注释

- [ ] **Step 6: 本地端到端验证（关键回归点）**

Run: `npm run generate 2>&1 | tail -20`
Expected:
- 构建成功，退出码 0
- `.output/public` 目录存在
- 输出中无 `Error` 或 `Cannot find module` 等致命错误

如果失败：
- 检查 tailwind.config.js 的 ESM 转换是否完整
- 检查 nuxt.config.ts 是否有语法错误

- [ ] **Step 7: 验证产物路径**

Run: `ls .output/public/index.html && echo "OK"`
Expected: 输出 `OK`，确认静态构建产物存在。

- [ ] **Step 8: 清理本地构建产物**

Run: `rm -rf .output .nuxt`
Expected: 静默成功。

- [ ] **Step 9: 提交所有次要修复**

```bash
git add tailwind.config.js nuxt.config.ts README.md
git commit -m "次要修复：tailwind 配置转 ESM、更新 compatibilityDate、修正 README 描述"
```

Run: `git log --oneline -5`
Expected: 最近 5 个 commit 分别是：
1. 次要修复
2. GitHub Actions 现代化
3. baseURL 修复
4. 依赖升级
5. docs: 新增项目优化设计文档

---

## Self-Review

**1. Spec 覆盖度核查**：

- ✅ 决策 1（依赖升级保守小版本）→ Task 1
- ✅ 决策 2（CI 传 NUXT_APP_BASE_URL）→ Task 2 + Task 3 Step 5
- ✅ 决策 3（better-sqlite3 保留不动）→ Task 1 不修改 better-sqlite3 位置
- ✅ 决策 4（GitHub Actions 现代化）→ Task 3
- ✅ 决策 5 次要修复 → Task 4（tailwind ESM、compatibilityDate、README）
- ✅ 验证策略（npm install / npm run generate / 文件校验）→ 每个 task 内置
- ✅ 提交策略（4 次独立提交）→ 每个 task 末尾 commit 步骤

**2. Placeholder 扫描**：
- 无 TBD / TODO / "implement later"
- 每个步骤都给出完整代码或具体命令
- 无 "类似 Task N" 引用

**3. 类型一致性**：
- `package.json` 的 4 处版本号修改与 spec 决策 1 完全一致
- `nuxt.config.ts` baseURL 注释内容在 Task 2 Step 2 与 Task 4 Step 2 期望最终内容一致
- `tailwind.config.js` 仅一处改动 `module.exports` → `export default`
- README.md 完整内容已给出，无引用未定义项

**4. 依赖关系**：
- Task 1 必须先于其他 task（其他 task 验证步骤需要 npm install 后的环境）
- Task 2 必须先于 Task 3（Task 3 Step 5 验证 NUXT_APP_BASE_URL 与 Task 2 配套）
- Task 4 在 Task 2 之后（修改同一文件 nuxt.config.ts，但改动不同行）

执行顺序：Task 1 → Task 2 → Task 3 → Task 4，严格顺序执行。
