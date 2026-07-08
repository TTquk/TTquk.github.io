# TT清沫ukの博客

个人博客，基于 [Hexo](https://hexo.io/) 构建，使用 [Kira](https://github.com/kira-theme/hexo-theme-kira) 主题。

🌐 **在线地址：** [https://ttquk.github.io/](https://ttquk.github.io/)

---

## 技术栈

- **框架：** [Hexo](https://hexo.io/) v7.x
- **主题：** [Kira](https://github.com/kira-theme/hexo-theme-kira)
- **部署：** GitHub Pages
- **评论系统：** Giscus（基于 GitHub Discussions）

## 目录结构

```
├── _config.yml          # 站点配置文件
├── _config.kira.yml     # Kira 主题配置文件
├── package.json         # 项目依赖
├── scaffolds/           # 模板文件夹
│   ├── draft.md         # 草稿模板
│   ├── page.md          # 页面模板
│   └── post.md          # 文章模板
├── source/              # 源文件文件夹
│   ├── _posts/          # 文章目录
│   ├── about.md         # 关于页面
│   ├── archive.md       # 归档页面
│   ├── friends.md       # 友链页面
│   └── custom.css       # 自定义样式
└── themes/              # 主题文件夹
    └── kira/            # Kira 主题
```

## 本地开发

### 环境要求

- Node.js >= 18
- npm

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/TTquk/TTquk.github.io.git
cd TTquk.github.io

# 安装依赖
npm install

# 启动本地开发服务器（默认 http://localhost:4000）
npm run server
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run server` | 启动本地开发服务器 |
| `npm run build` | 构建静态文件（生成到 `public/` 目录） |
| `npm run clean` | 清理缓存和构建文件 |
| `npm run deploy` | 构建并部署到 GitHub Pages |
| `npx hexo new <标题>` | 创建新文章 |
| `npx hexo new page <页面名>` | 创建新页面 |

## 部署

博客使用 GitHub Pages 部署。部署流程：

1. 构建静态文件并推送到 `main` 分支
2. GitHub Actions / Pages 自动发布

手动部署：

```bash
npm run build && npm run deploy
```

## 分支说明

- `source` — 博客源代码（md 文章、配置文件等）
- `main` — 构建后的静态文件（由 `hexo deploy` 自动推送）

## 功能特性

- 📝 文章分类与标签
- 💬 Giscus 评论系统
- 🔍 文章搜索
- 📱 响应式设计
- 🌈 自定义配色
- 🤝 友链功能
- 📄 站点地图（SEO）

## License

[MIT](LICENSE)
