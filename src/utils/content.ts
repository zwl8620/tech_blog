import { getCollection, type CollectionEntry } from 'astro:content';
import collectionsRegistry from '../data/collections.json';
import { toAsciiSlug } from './slug';

export interface CollectionMeta {
  name: string;
  slug: string;
  description: string;
  postCount: number;
  lastUpdated?: Date;
}

/** 已发布的文章（排除草稿，PRD F12） */
export async function getPublishedPosts(): Promise<CollectionEntry<'posts'>[]> {
  const all = await getCollection('posts', ({ data }) => !data.draft);
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** 置顶浮顶 + 日期倒序（PRD B3） */
export function sortWithPinnedFirst(posts: CollectionEntry<'posts'>[]) {
  return [...posts].sort((a, b) => {
    if (a.data.pinned !== b.data.pinned) return a.data.pinned ? -1 : 1;
    return b.data.date.getTime() - a.data.date.getTime();
  });
}

/** 标签 → 文章映射（构建时归集，PRD F4） */
export async function getTagMap(): Promise<Map<string, CollectionEntry<'posts'>[]>> {
  const posts = await getPublishedPosts();
  const map = new Map<string, CollectionEntry<'posts'>[]>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      const list = map.get(tag) ?? [];
      list.push(post);
      map.set(tag, list);
    }
  }
  return map;
}

/**
 * 合集视图：注册表优先，文章按 series 名归卷（PRD B4/F17）
 * 空合集合法存在（"待更新"）
 */
export async function getCollections(): Promise<(CollectionMeta & { posts: CollectionEntry<'posts'>[] })[]> {
  const posts = await getPublishedPosts();
  const bySeries = new Map<string, CollectionEntry<'posts'>[]>();
  for (const post of posts) {
    if (!post.data.series) continue;
    const list = bySeries.get(post.data.series) ?? [];
    list.push(post);
    bySeries.set(post.data.series, list);
  }

  return collectionsRegistry.map((meta) => {
    const members = (bySeries.get(meta.name) ?? []).sort(
      (a, b) => (a.data.seriesOrder ?? 999) - (b.data.seriesOrder ?? 999)
    );
    const lastUpdated = members[0]?.data.date;
    return {
      ...meta,
      slug: meta.slug || toAsciiSlug(meta.name),
      postCount: members.length,
      lastUpdated,
      posts: members,
    };
  });
}

/** 详情页尾部导航（PRD B2 互斥规则）：
 *  有合集 → 合集导航盒 { type: 'series', prev, next }
 *  无合集 → 全局时间序前后篇 { type: 'global', prev, next }
 */
export function getFooterNav(post: CollectionEntry<'posts'>, all: CollectionEntry<'posts'>[]) {
  if (post.data.series) {
    const members = all
      .filter((p) => p.data.series === post.data.series)
      .sort((a, b) => (a.data.seriesOrder ?? 999) - (b.data.seriesOrder ?? 999));
    const idx = members.findIndex((p) => p.id === post.id);
    return {
      type: 'series' as const,
      seriesName: post.data.series,
      seriesSlug: collectionsRegistry.find((c) => c.name === post.data.series)?.slug ?? toAsciiSlug(post.data.series),
      prev: idx > 0 ? members[idx - 1] : null,
      next: idx < members.length - 1 ? members[idx + 1] : null,
      index: idx + 1,
      total: members.length,
    };
  }
  const sorted = [...all].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  const idx = sorted.findIndex((p) => p.id === post.id);
  return {
    type: 'global' as const,
    seriesName: null,
    seriesSlug: null,
    prev: idx < sorted.length - 1 ? sorted[idx + 1] : null,
    next: idx > 0 ? sorted[idx - 1] : null,
    index: idx + 1,
    total: sorted.length,
  };
}
