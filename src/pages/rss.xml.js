import rss from '@astrojs/rss';
import { getPublishedPosts } from '../utils/content';
import { SITE } from '../config';

export async function GET(context) {
  const posts = await getPublishedPosts();
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/tech_blog/posts/${post.id}/`,
    })),
    customData: `<language>zh-cn</language>`,
  });
}
