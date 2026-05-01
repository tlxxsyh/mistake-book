# 言念错题本

一款基于 Tauri + React + TypeScript 构建的桌面错题本应用，支持 Windows/macOS/Linux。

## 功能特性

### 📋 错题管理
- 添加、编辑、删除错题
- 支持文本和图片两种形式记录题目与答案
- 学科分类管理
- 错题来源标注
- 收藏与标签系统
- KaTeX 数学公式支持

### 📊 学习统计
- 学习热力图展示
- 番茄钟专注计时
- 正确/错误次数统计
- 学习时长追踪

### 📅 学习计划
- 计划任务管理
- 复习提醒
- 倒计时功能

### 📝 笔记系统
- 个人笔记记录
- 笔记分类管理

### ⚙️ 设置
- 主题切换（浅色/深色模式）
- 个性化配置

## 技术栈

**前端**
- React 19
- TypeScript
- Tailwind CSS
- Recharts (图表)
- KaTeX (数学公式)

**桌面端**
- Tauri 2.x
- Rust

## 开发环境

### 前置要求
- Node.js 18+
- Rust 1.70+
- npm / pnpm / yarn

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run tauri dev
```

### 构建应用

```bash
npm run tauri build
```

## 项目结构

```
mistake-book/
├── src/                    # React 前端源码
│   ├── components/         # React 组件
│   ├── App.tsx            # 主应用组件
│   └── main.tsx           # 入口文件
├── src-tauri/             # Tauri Rust 后端源码
│   ├── src/               # Rust 源代码
│   ├── icons/             # 应用图标
│   └── tauri.conf.json    # Tauri 配置
├── public/                # 静态资源
└── package.json           # 前端依赖配置
```

## 许可证

MIT License
