import { queryCollection } from '@nuxt/content/server'

// 动态生成 sitemap.xml：自动收录首页幻灯片路由 + @nuxt/content 博客文章，
// 新增文章无需手动维护。
export default defineEventHandler(async (event) => {
  // 部署在 GitHub Pages 子路径 /blog_nuxt/，绝对 URL 用于 sitemap 规范
  // 域名需与 app.vue 的 SITE_URL 保持一致，否则 sitemap 收录的 URL 会指向错误站点
  const base = 'https://qzfrato.github.io/blog_nuxt'

  const articles = await queryCollection(event, 'blog').all()

  // 仅收录有独立预渲染 HTML 的路由：
  // /projects、/about、/contact 是首页 SPA 内部幻灯片路由，无独立 HTML，
  // GitHub Pages 直接访问会 404，收录反而损害 SEO，故排除。
  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'monthly' },
    { loc: '/blog', priority: '0.9', changefreq: 'weekly' },
    ...articles.map((a) => ({ loc: a.path, priority: '0.7', changefreq: 'monthly' })),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${base}${encodeURI(u.loc)}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  setHeader(event, 'content-type', 'application/xml')
  return xml
})
