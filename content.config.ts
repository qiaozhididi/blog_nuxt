import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      source: 'blog/**/[!.]*.md',
      type: 'page',
      schema: z.object({
        title: z.string(),
        date: z.union([z.string(), z.date()]).optional(),
        description: z.string().optional(),
      })
    })
  }
})
