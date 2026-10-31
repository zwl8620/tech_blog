// 站点全局配置（PRD §3.2 / §5）
export const SITE = {
  title: 'LZW 的个人主页',
  subtitle: 'LZW 的技术手记',
  tagline: '拾学习之美 · 思 AI 之变',
  description:
    'Lian ZhiWei 的个人博客：分享个人学习和工作中遇到的值得分享的内容，以及 AI 时代的小小自我思考。',
  repo: 'zwl8620/tech_blog',
  url: 'https://zwl8620.github.io/tech_blog',
  email: '862085716@qq.com',
  github: 'https://github.com/zwl8620',
  author: 'LZW',
};

// giscus 评论配置：未填 repoId/categoryId 前 enabled 必须为 false（PRD F19）
export const GISCUS = {
  enabled: false,
  repo: 'zwl8620/tech_blog',
  repoId: '', // TODO: giscus.app 生成后填入
  category: 'Announcements',
  categoryId: '', // TODO: giscus.app 生成后填入
  mapping: 'pathname',
  reactionsEnabled: '1',
  inputPosition: 'bottom',
  lang: 'zh-CN',
};
