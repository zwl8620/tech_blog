# LZW 的个人主页 · tech_blog

> 拾学习之美 · 思 AI 之变
> 线上地址：https://zwl8620.github.io/tech_blog/

个人博客（非通用写作平台）：只有站长能发布与管理内容，访客仅可阅读和评论。

## 技术栈

- **Astro 5** 静态生成（默认零 JS）
- **GitHub Pages** 托管 + **GitHub Actions** 自动部署（push 触发 + 每日定时重建）
- **Pagefind** 全文搜索（构建时索引，仅文章页）
- **giscus** 评论（GitHub Discussions，未配置时评论区自动隐藏）
- 文章数据 = 仓库 `src/content/posts/*.md`；图片附件 = `public/uploads/`

## 写作

### 方式一：在线后台（推荐）

访问 `/console-lzw/`（隐藏路径，不出现在站内任何位置），输入 GitHub 细粒度 PAT 登录：

- Token 创建：GitHub → Settings → Developer settings → **Fine-grained tokens**
  - Repository access：仅勾选 `zwl8620/tech_blog`
  - Permissions → Contents：**Read and write**
  - 有效期建议 90 天
- 支持：新建/编辑/删除文章、置顶、草稿、图片/附件上传（≤40MB，>500KB 自动压缩）、合集管理

### 方式二：本地 Markdown

```bash
git clone https://github.com/zwl8620/tech_blog.git
cd tech_blog
npm install
npm run dev   # http://localhost:4321/tech_blog/
```

frontmatter schema（zod 校验，写错构建报错）：

```yaml
---
title: 必填
description: 必填，一句话摘要
date: 2026-10-23
tags: [可选]
series: 可选（合集名，需在 src/data/collections.json 注册）
seriesOrder: 可选（合集内序号）
pinned: false
draft: false
---
```

**规则**：slug 即文件名，必须 ASCII；发布后不可改（giscus 评论按路径绑定）。

## 开发命令

| 命令 | 作用 |
|------|------|
| `npm run dev` | 本地开发（localhost:4321/tech_blog/） |
| `npm run build` | 构建 + Pagefind 索引 |
| `npm run preview` | 预览构建产物 |

## 接入 giscus 评论（一次性）

1. 仓库 Settings → General → Features → 勾选 **Discussions**
2. 安装 https://github.com/apps/giscus （授权 tech_blog）
3. https://giscus.app/zh-CN 生成 repoId / categoryId，填入 `src/config.ts` 的 `GISCUS` 并把 `enabled` 改为 `true`

## 安全须知

- 绝不把 PAT 提交进仓库、文档、issue
- 后台路径在 `astro.config.mjs` 的 `CONSOLE_SECRET` / deploy.yml 环境变量中，修改需重新部署
- Token 曾泄露：立即 GitHub Settings → Tokens 撤销重发
