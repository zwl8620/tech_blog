// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 后台路径构建时注入：默认 console-lzw，可用环境变量 CONSOLE_SECRET 覆盖
const CONSOLE_SECRET = process.env.CONSOLE_SECRET || 'console-lzw';

export default defineConfig({
  site: 'https://zwl8620.github.io',
  base: '/tech_blog',
  trailingSlash: 'ignore',
  output: 'static',
  integrations: [
    sitemap({
      // 后台路径不进 sitemap（PRD §2.2 防枚举层）
      filter: (page) => !page.includes(CONSOLE_SECRET),
    }),
  ],
  build: {
    inlineStylesheets: 'auto',
  },
  // 关闭 Astro 开发工具栏（2026-10-24 志伟反馈：右下角图标无用且干扰）
  devToolbar: {
    enabled: false,
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      wrap: true,
    },
  },
  vite: {
    define: {
      __CONSOLE_SECRET__: JSON.stringify(CONSOLE_SECRET),
    },
  },
});
