# 智能日程助手 (Schedule Assistant)

> 本人时常忘事，记性不好，常以ADHD患者著称。
> 因此一款面向 本ADHD 患者的智能日程管理工具，集成 AI 对话助手，通过自然语言交互帮助用户高效管理待办事项、日程和备忘。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)

## 项目简介

本项目是一个全栈 Web 应用，采用四宫格布局将**待办事项**、**周历**、**AI 助手**和**备忘录**四大模块整合在一个页面中。用户可以通过 AI 助手用自然语言快速创建待办和日程，无需手动填写表单。

在线演示：[schedule-assistant-chi.vercel.app](https://schedule-assistant-chi.vercel.app)

## 功能特性

### 待办事项
- 支持高/中/低三级优先级
- 截止日期倒计时（紧急/临近/正常三级颜色提示）
- 按截止日期或优先级排序
- 双击可内联编辑文本、日期、优先级
- 已完成事项自动沉底

### 周历视图
- 7 天周历，自动展示待办事项和日程事件
- 支持前后翻周
- 当天高亮显示
- 待办与日程混合排序（未完成优先，再按时间/优先级）
- 不同优先级以颜色区分

### AI 助手
- 接入 SiliconFlow 大模型 API（默认 Qwen2.5-VL-72B-Instruct）
- 自然语言对话，自动识别日期和事件
- 智能解析指令，自动创建待办或日程（如"明天下午3点开会"）
- 聊天记录持久化，刷新页面不丢失

### 备忘录
- 卡片式便签布局
- 支持新增、编辑、删除
- 按创建时间排序

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | HTML5 / CSS3 / JavaScript (原生) |
| 后端 | Node.js / Express 5 |
| 数据库 | MySQL (mysql2 连接池) |
| AI 接口 | SiliconFlow API (Qwen/Qwen2.5-VL-72B-Instruct) |
| 部署 | Vercel (Serverless) + Railway (MySQL) |
| UI 图标 | Font Awesome 6 |
| 字体 | Google Fonts (Montserrat) |

## 项目结构

```
schedule-assistant/
├── api/
│   └── index.js            # Vercel Serverless 入口
├── public/
│   ├── index.html           # 主页面
│   ├── style.css            # 样式文件
│   └── script.js            # 前端逻辑
├── server.js                # Express 服务器 & API 路由
├── db.js                    # MySQL 连接池配置
├── config.js                # 配置管理（环境变量 / secrets）
├── schema.sql               # 数据库建表脚本
├── vercel.json              # Vercel 部署配置
├── package.json             # 项目依赖
└── DEVELOPMENT_LOG.md       # 开发日志
```

## 快速开始

### 环境要求

- Node.js >= 18
- MySQL 数据库

### 1. 克隆项目

```bash
git clone https://github.com/chellezheng-1199/schedule-assistant.git
cd schedule-assistant
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置数据库

创建 MySQL 数据库并初始化表结构：

```bash
mysql -u root -p < schema.sql
```

### 4. 配置环境变量

在项目根目录创建 `secrets.js`（仅本地开发使用）：

```javascript
module.exports = {
    DB_HOST: 'localhost',
    DB_PORT: 3306,
    DB_USER: 'root',
    DB_PASSWORD: 'your_password',
    DB_NAME: 'schedule_assistant',
    AI_API_KEY: 'your_siliconflow_api_key',
    AI_API_URL: 'https://api.siliconflow.cn/v1/chat/completions',
    AI_MODEL: 'Qwen/Qwen2.5-VL-72B-Instruct'
};
```

也可以通过环境变量配置，`config.js` 会优先读取环境变量。

### 5. 启动服务

```bash
npm start
# 或
node server.js
```

服务默认运行在 `http://localhost:3000`。

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/todos` | 获取所有待办事项 |
| `POST` | `/api/todos` | 添加待办事项 |
| `PUT` | `/api/todos/:id` | 更新待办事项 |
| `DELETE` | `/api/todos/:id` | 删除待办事项 |
| `GET` | `/api/events` | 获取所有日程 |
| `POST` | `/api/events` | 添加日程 |
| `DELETE` | `/api/events/:id` | 删除日程 |
| `GET` | `/api/memos` | 获取所有备忘录 |
| `POST` | `/api/memos` | 添加备忘录 |
| `PUT` | `/api/memos/:id` | 更新备忘录 |
| `DELETE` | `/api/memos/:id` | 删除备忘录 |
| `GET` | `/api/chat` | 获取聊天记录（最近 50 条） |
| `POST` | `/api/chat` | 添加聊天记录 |
| `POST` | `/api/ai` | AI 对话代理接口 |

## 部署

### Vercel + Railway 方案

1. **数据库**：在 [Railway](https://railway.app) 创建 MySQL 实例，导入 `schema.sql`
2. **应用**：在 [Vercel](https://vercel.com) 导入项目，配置环境变量：
 - `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME`
 - `AI_API_KEY`
3. Vercel 会自动根据 `vercel.json` 配置 Serverless 函数和静态资源路由

## 数据库设计

```
todos           - 待办事项（文本、截止日期、优先级、完成状态）
events          - 日程事件（标题、日期、时间）
memos           - 备忘录（内容）
chat_messages   - 聊天记录（角色、内容、时间戳）
```

## 许可证

MIT
