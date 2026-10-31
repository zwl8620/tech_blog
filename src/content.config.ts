import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 文章集合 schema（PRD F14 v1.2：series/seriesOrder 纳入）
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    pinned: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
