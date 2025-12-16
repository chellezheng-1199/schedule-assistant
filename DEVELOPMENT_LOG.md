# 开发日志 (Development Log)

## 2024-12-14 - 项目初始化与前端重构 (Project Init & Frontend Refactor)
- **初始化**: 创建了 `index.html`, `style.css`, `script.js` 基础结构。
- **UI设计**: 实现了四个主要模块（待办、周历、AI助手、备忘录）的布局。
- **样式优化**: 使用了 Google Fonts (Montserrat)，调整了配色方案 (背景: `rgb(247, 218, 239)`, 悬停: `rgb(246, 176, 234)`)。
- **交互实现**: 实现了待办事项的添加、删除、勾选下沉效果；周历的动态渲染和独立滚动。

## 2024-12-14 - 全栈重构与数据库集成 (Full-stack Refactoring)
- **后端搭建**: 引入 Node.js + Express，创建 `server.js` 作为 API 服务器。
- **数据库设计**: 使用 MySQL，设计了 `todos`, `events`, `memos`, `chat_messages` 四张表 (`schema.sql`)。
- **数据持久化**:
  - 重写前端 `script.js`，将所有数据操作（增删改查）改为 `fetch` 请求后端 API。
  - 解决了日期时区问题 (MySQL `dateStrings: true`)，确保日期存储和显示一致。
- **排序算法**:
  - 待办事项：先按完成状态（未完成在前），再按截止日期或优先级排序。
  - 周历事项：先按完成状态，再按时间或优先级排序。
- **备忘录优化**: 实现了备忘录的持久化存储，并强制按照 ID (创建顺序) 排序，防止刷新后乱序。

## 2024-12-14 - AI 助手增强 (AI Assistant Enhancement)
- **API 代理**: 创建 `/api/ai` 后端路由，隐藏 SiliconFlow API Key。
- **指令解析**: 优化 Prompt，使 AI 能根据自然语言自动生成 `ADD_TODO` 或 `ADD_EVENT` 指令。
- **聊天记录**: 实现了聊天记录的数据库存储，刷新页面不丢失对话历史。

## 2024-12-14 - 版本控制与部署准备 (Git & Deployment Prep)
- **环境配置**: 安装 Git，初始化本地仓库。
- **安全配置**: 配置 `.gitignore` 排除 `node_modules`, `secrets.js`, `.env` 等敏感文件。
- **远程仓库**: 关联 GitHub 远程仓库 `schedule-assistant`。
- **安全修复**: 从 Git 历史中移除误上传的 `secrets.js` 和 `cursor_.md`，确保敏感信息不泄露。

## 2024-12-16 - 云端部署方案调整 (Deployment Strategy Adjustment)
- **尝试 Railway**: 尝试使用 Railway 部署全栈应用，但由于新用户权限限制（仅限数据库），无法部署 Node.js 服务。
- **方案变更**: 决定采用 **Vercel (前端+Serverless后端)** + **Railway (MySQL数据库)** 的混合部署架构。
- **代码适配**: 
  - 为了适应 Vercel 的 Serverless 架构，需要将 `server.js` 拆分为独立的 API 路由 (`/api/*`) 或配置 `vercel.json` 重写规则。
  - 确保数据库连接池 (`db.js`) 在 Serverless 环境下能正确管理连接（避免冷启动导致的连接耗尽）。
