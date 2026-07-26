# RSS 订阅功能设计文档

- **日期**：2026-07-26
- **作者**：assistant + 用户协作
- **状态**：待实现
- **子项目序号**：1️⃣（共 5 个子项目中的第 1 个）

---

## 1. 背景

本项目是部署在 GitHub Pages 上的 Nuxt 3 博客，使用 @nuxt/content v3 管理 Obsidian 笔记同步的 Markdown 内容。当前已有 `sitemap.xml` 用于搜索引擎收录，但缺少 RSS 订阅源，读者无法通过 RSS 阅读器订阅更新。

引入 RSS 订阅是博客内容分发的标准能力，能：
- 让读者用 RSS 阅读器（Feedly、Inoreader 等）订阅更新
- 与 Obsidian 内容生态契合（Obsidian 有 RSS 插件）
- 增加内容触达渠道，不依赖搜索引擎

## 2. 目标

- 提供 `/rss.xml` RSS 2.0 订阅源
- 自动收录所有博客文章，按发布时间倒序，最多 20 篇
- 与现有 `sitemap.xml.ts` 架构对称，便于维护
- 部署到 GitHub Pages 后可正常访问（SSG 预渲染为静态文件）

## 3. 非目标

- 不实现 Atom 或 JSON Feed 格式（保持单一 RSS 2.0，KISS）
- 不输出全文内容（仅摘要 + 阅读链接，保护网站流量）
- 不实现文章分类/标签 RSS（暂未实现标签系统）
- 不修改 Reveal.js 主页相关逻辑
- 不引入新的 npm 依赖

## 4. 方案选择

### 候选方案对比

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| **A. 复用 sitemap 模式** ⭐ | server route 手写 RSS 2.0 XML | 与 `sitemap.xml.ts` 对称、零新依赖、复用经验 | 手写 XML 需小心转义 |
| B. 用 `feed` npm 包 | 调用 feed 库 API 生成 | 标准不易错 | 引入新依赖、与 sitemap 不一致 |
| C. 静态生成时构建 | nuxt.config hooks 中构建 | 不占运行时 | 复杂度高，违背 KISS |

**选定方案 A**：与现有 `server/routes/sitemap.xml.ts` 模式对称，零新依赖，符合 KISS 原则。

## 5. 详细设计

### 5.1 文件结构

```
新增：
  server/routes/rss.xml.ts          ← RSS 2.0 生成 server route

修改：
  nuxt.config.ts                    ← nitro.prerender.routes 加 '/rss.xml'
  app.vue                           ← 全局 useHead 加 <link rel="alternate">
```

### 5.2 关键决策（已确认）

| # | 决策 | 最终选择 |
|---|------|---------|
| 1 | 路径 | `/rss.xml` |
| 2 | 内容范围 | 摘要（frontmatter description）+ 阅读链接 |
| 3 | 文章数量 | 最近 20 篇，按 date 倒序 |
| 4 | 字段 | title / link / description / pubDate / guid / author |
| 5 | 格式 | RSS 2.0 单一格式 |
| 6 | HEAD 暴露 | 在 `app.vue` 加 `<link rel="alternate" type="application/rss+xml">` |
| 7 | 站点信息 | title=`乔治弟弟_Blog`，desc=`探索代码的无限可能`，url=`https://qzfrato.github.io/blog_nuxt/` |

### 5.3 数据流

```
queryCollection(event, 'blog').all()
  → 过滤有 date 的文章（无 date 不输出 pubDate，但仍输出 item）
  → 按 date 倒序排序
  → 取前 20 篇
  → 对每篇：title/link/description/pubDate/guid/author 字段映射
  → XML 转义（& < > " '）
  → 拼接 RSS 2.0 XML 模板
  → setHeader('content-type', 'application/rss+xml; charset=utf-8')
  → return xml
```

### 5.4 RSS 2.0 XML 模板示例

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>乔治弟弟_Blog</title>
    <link>https://qzfrato.github.io/blog_nuxt/</link>
    <description>探索代码的无限可能</description>
    <language>zh-CN</language>
    <lastBuildDate>{RFC 822 当前时间}</lastBuildDate>
    <atom:link href="https://qzfrato.github.io/blog_nuxt/rss.xml" rel="self" type="application/rss+xml" />
    <item>
      <title>{文章 title}</title>
      <link>https://qzfrato.github.io/blog_nuxt{文章 path}</link>
      <guid isPermaLink="true">https://qzfrato.github.io/blog_nuxt{文章 path}</guid>
      <description>{文章 description}</description>
      <pubDate>{RFC 822 文章 date}</pubDate>
      <author>乔治弟弟</author>
    </item>
    <!-- ... 最多 20 篇 -->
  </channel>
</rss>
```

### 5.5 关键实现细节

#### 5.5.1 日期格式

RSS 2.0 的 pubDate / lastBuildDate 必须是 RFC 822 格式（如 `Wed, 02 Oct 2026 08:00:00 GMT`）。
- 用 `new Date().toUTCString()` 转换（Node 原生支持，输出符合 RFC 822）

#### 5.5.2 XML 转义

文章 title/description 可能包含 `&`、`<`、`>`、`"`、`'`。需用工具函数转义：

```ts
function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, c => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;'
  }[c] as string))
}
```

#### 5.5.3 缺失字段兜底

- 无 description → 用 `乔治弟弟的博客文章`
- 无 date → 跳过 pubDate 字段（不输出空标签）
- 无 title → 用 path 作为 title 兜底

#### 5.5.4 预渲染

在 `nuxt.config.ts` 的 `nitro.prerender.routes` 加入 `'/rss.xml'`，确保 SSG 构建时生成 `.output/public/rss.xml` 静态文件。GitHub Pages 为纯静态托管，必须预渲染。

#### 5.5.5 HEAD 自动发现

在 `app.vue` 全局 useHead 中加入 `<link rel="alternate">`：

```ts
link: [
  { rel: 'canonical', href: `${SITE_URL}${route.path}` },
  { rel: 'alternate', type: 'application/rss+xml', title: SITE_NAME, href: `${SITE_URL}/rss.xml` },
],
```

`href` 用绝对 URL（含 SITE_URL 前缀），确保子路径部署时也能被 RSS 阅读器正确解析。

#### 5.5.6 robots.txt 暴露（可选，跳过）

robots.txt 标准仅支持 `User-agent` / `Allow` / `Disallow` / `Sitemap` / `Crawl-delay` 等指令，**不支持 `RSS:` 指令**。HEAD `<link rel="alternate">` 已足够让 RSS 阅读器自动发现，故不修改 robots.txt。

若希望给人类读者留个提示，可改为在 robots.txt 末尾加一行注释（仅人类可读，爬虫忽略）：
```
# RSS Feed: https://qzfrato.github.io/blog_nuxt/rss.xml
```

本期默认**不改 robots.txt**，保持简洁。

## 6. 错误处理

| 场景 | 处理 |
|------|------|
| 文章无 date | 跳过 pubDate 字段，仍输出 item |
| 文章无 description | 用 `乔治弟弟的博客文章` 兜底 |
| 文章无 title | 用 path 作为 title 兜底 |
| queryCollection 失败 | 返回空 channel（不抛 500，避免破坏爬虫抓取） |
| XML 转义 | 所有用户内容字段（title/description）必须转义 |

## 7. 测试策略

### 7.1 本地验证

1. `npm run generate` 后检查 `.output/public/rss.xml` 文件存在
2. 文件首行 `<?xml version="1.0" encoding="UTF-8"?>`
3. 含所有文章的 `<item>` 节点
4. 含 `<atom:link rel="self">` 自引用
5. 至少有一篇 `<pubDate>` 字段格式正确

### 7.2 格式验证

- 用 `xmllint --noout` 验证 XML 合法性
- 或用 W3C Feed Validation Service: https://validator.w3.org/feed/

### 7.3 阅读器验证

- 用 RSS 阅读器（如 Feedly、Inoreader）订阅本地预览地址，确认能正确解析

### 7.4 部署验证

- 推送到 GitHub Pages 后访问 `https://qzfrato.github.io/blog_nuxt/rss.xml`
- 确认 Content-Type 是 `application/rss+xml`

## 8. 验收标准

- [ ] 新增 `server/routes/rss.xml.ts`，生成符合 RSS 2.0 规范的 XML
- [ ] 文章按 date 倒序，最多 20 篇
- [ ] 无 date 的文章跳过 pubDate 字段
- [ ] title/description 已 XML 转义
- [ ] `nuxt.config.ts` 加入 `/rss.xml` 到预渲染路由
- [ ] `app.vue` 加入 `<link rel="alternate" type="application/rss+xml">`
- [ ] 本地 `npm run generate` 后 `.output/public/rss.xml` 存在且 XML 合法
- [ ] 通过 W3C Feed Validation 验证（或 xmllint 通过）
- [ ] 推送 GitHub Pages 后可访问

## 9. 风险与权衡

| 风险 | 缓解措施 |
|------|---------|
| 手写 XML 拼接易出错 | 严格 XML 转义；用 xmllint 验证 |
| RSS 2.0 RFC 822 日期格式不对 | 用 `Date.prototype.toUTCString()` 标准方法 |
| 子路径部署导致 link 错误 | 统一用绝对 URL `https://qzfrato.github.io/blog_nuxt` 前缀 |
| 未来扩展 Atom/JSON Feed | 当前架构易于扩展，新增 server route 即可 |

## 10. 后续可能的扩展（非本期范围）

- Atom feed（`/atom.xml`）
- JSON Feed（`/feed.json`）
- 按标签分类的 RSS（待标签系统实现后）
- 文章封面图 enclosure
