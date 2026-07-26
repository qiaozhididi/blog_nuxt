import { queryCollection } from '@nuxt/content/server'

// 站点级常量：与 app.vue 的 SITE_URL/SITE_NAME 保持一致
// 域名变更时需同步修改 app.vue、sitemap.xml.ts、robots.txt
const SITE_URL = 'https://qzfrato.github.io/blog_nuxt'
const SITE_NAME = '乔治弟弟_Blog'
const SITE_DESCRIPTION = '探索代码的无限可能'
const AUTHOR = '乔治弟弟'
const MAX_ITEMS = 20

// XML 转义：title/description 可能含 & < > " '
// RSS 2.0 规范要求这些字符必须转义，否则 XML 解析失败
function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, c => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;'
  }[c] as string))
}

// 动态生成 rss.xml：自动收录 @nuxt/content 博客文章，
// 按 frontmatter date 倒序，最多 20 篇。新增文章无需手动维护。
export default defineEventHandler(async (event) => {
  // spec §6：queryCollection 失败时返回空 channel（不抛 500，避免破坏爬虫抓取）
  let articles: { path: string; title?: string; description?: string; date?: string | Date }[] = []
  try {
    articles = await queryCollection(event, 'blog').all()
  } catch (e) {
    console.error('[rss.xml] queryCollection failed:', e)
  }

  // 排序：有 date 的按 date 倒序在前，无 date 的排最后
  // 取前 MAX_ITEMS 篇
  const sorted = [...articles]
    .sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : 0
      const tb = b.date ? new Date(b.date).getTime() : 0
      return tb - ta
    })
    .slice(0, MAX_ITEMS)

  const lastBuildDate = new Date().toUTCString()
  const selfUrl = `${SITE_URL}/rss.xml`

  const items = sorted.map(a => {
    const title = escapeXml(a.title || a.path)
    const link = `${SITE_URL}${a.path}`
    const description = escapeXml(a.description || '乔治弟弟的博客文章')
    const pubDate = a.date ? new Date(a.date).toUTCString() : ''
    return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${description}</description>${pubDate ? `\n      <pubDate>${pubDate}</pubDate>` : ''}
      <dc:creator>${escapeXml(AUTHOR)}</dc:creator>
    </item>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${SITE_URL}/</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${selfUrl}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  setHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')
  return xml
})
