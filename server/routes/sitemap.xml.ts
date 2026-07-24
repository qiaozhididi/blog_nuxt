import { queryCollection } from '@nuxt/content/server'

// 动态生成 sitemap.xml：自动收录首页幻灯片路由 + @nuxt/content 博客文章，
// 新增文章无需手动维护。
export default defineEventHandler(async (event) => {
  // 部署在 GitHub Pages 子路径 /blog_nuxt/，绝对 URL 用于 sitemap 规范
  const base = 'https://qiaozhididi.github.io/blog_nuxt'

  const articles = await queryCollection(event, 'blog').all()

  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'monthly' },
    { loc: '/blog', priority: '0.9', changefreq: 'weekly' },
    { loc: '/projects', priority: '0.8', changefreq: 'monthly' },
    { loc: '/about', priority: '0.6', changefreq: 'yearly' },
    { loc: '/contact', priority: '0.5', changefreq: 'yearly' },
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
