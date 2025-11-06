# 📦 ShelfTagSnap Web 前端发布文档

> **版本**: v1.0.0
> **更新日期**: 2025-01-07
> **部署目标**: Firebase Hosting (zoom-zone-6619c)

---

## 📋 目录

1. [系统概述](#系统概述)
2. [前置要求](#前置要求)
3. [快速部署（一键脚本）](#快速部署)
4. [手动部署步骤](#手动部署步骤)
5. [环境配置](#环境配置)
6. [构建优化](#构建优化)
7. [部署验证](#部署验证)
8. [回滚操作](#回滚操作)
9. [常见问题](#常见问题)
10. [监控和维护](#监控和维护)

---

## 🎯 系统概述

### 技术栈

- **前端框架**: React 18.2 + TypeScript 5.3
- **构建工具**: Vite 5.0
- **UI 组件库**: Ant Design 5.12
- **路由管理**: React Router 6.20
- **状态管理**: Refine 4.47
- **后端服务**: Firebase (Firestore + Storage + Functions)
- **托管平台**: Firebase Hosting

### 部署架构

```
┌─────────────────────────────────────────┐
│   用户浏览器                             │
│   https://zoom-zone-6619c.web.app       │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│   Firebase Hosting (CDN)                │
│   • 全球 CDN 加速                        │
│   • 自动 HTTPS                           │
│   • HTTP/2 + Brotli 压缩                │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│   Static Assets (dist/)                 │
│   • index.html                          │
│   • JavaScript bundles (*.js)           │
│   • CSS stylesheets (*.css)             │
│   • Images & Fonts                      │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│   Firebase Backend Services             │
│   • Firestore (数据库)                   │
│   • Cloud Storage (图片存储)             │
│   • Cloud Functions (AI 处理)           │
└─────────────────────────────────────────┘
```

---

## ⚙️ 前置要求

### 1. 开发环境

| 工具 | 版本要求 | 验证命令 |
|------|---------|---------|
| **Node.js** | v20.x | `node --version` |
| **npm** | v10.x+ | `npm --version` |
| **Firebase CLI** | 最新版 | `firebase --version` |
| **Git** | 任意版本 | `git --version` |

### 2. 安装 Firebase CLI

```bash
# 全局安装 Firebase CLI
npm install -g firebase-tools

# 验证安装
firebase --version

# 登录 Firebase
firebase login
```

### 3. 权限要求

- Firebase 项目 **zoom-zone-6619c** 的 **Owner** 或 **Editor** 权限
- 已启用 Firebase Hosting 服务

---

## 🚀 快速部署（一键脚本）

### 方法一：标准部署（推荐）

```bash
cd /Users/kent.sun/Projects/upwork/ShelfTagSnap/ShelfTagSnap-Web

# 执行一键部署脚本
./deploy.sh
```

**脚本会自动完成以下步骤：**

1. ✅ 环境检查（Node.js、npm、Firebase CLI）
2. ✅ 清理旧构建产物
3. ✅ 安装/更新依赖
4. ✅ 运行单元测试
5. ✅ 构建生产版本
6. ✅ 部署到 Firebase Hosting
7. ✅ 健康检查验证

### 方法二：跳过测试快速部署

```bash
# 跳过测试环节（节省时间）
./deploy.sh --skip-tests
```

### 方法三：预览部署（测试环境）

```bash
# 部署到临时预览环境（7天后自动过期）
./deploy.sh --preview
```

**预览环境特点：**
- 生成临时预览链接
- 不影响生产环境
- 7 天后自动清理
- 适合测试新功能

---

## 🛠️ 手动部署步骤

如果一键脚本无法使用，可以按照以下步骤手动部署。

### 步骤 1: 环境准备

```bash
cd /Users/kent.sun/Projects/upwork/ShelfTagSnap/ShelfTagSnap-Web

# 确认当前 Firebase 项目
firebase use

# 如果不是 zoom-zone-6619c，切换项目
firebase use zoom-zone-6619c
```

### 步骤 2: 清理旧构建

```bash
# 删除旧的构建产物
rm -rf dist

# 清理 node_modules 缓存（可选）
# rm -rf node_modules
```

### 步骤 3: 安装依赖

```bash
# 安装或更新依赖
npm install --legacy-peer-deps
```

**注意**：使用 `--legacy-peer-deps` 是因为某些依赖的 peer dependencies 版本冲突。

### 步骤 4: 运行测试（可选）

```bash
# 运行单元测试
npm run test:run

# 运行测试并生成覆盖率报告
npm run test:coverage
```

### 步骤 5: 构建生产版本

```bash
# 构建生产环境代码
npm run build
```

**构建产物**：
- 输出目录：`dist/`
- 预期大小：约 1-2 MB（压缩后）
- 包含文件：`index.html`, `assets/*.js`, `assets/*.css`

**验证构建**：
```bash
# 检查 dist 目录
ls -lh dist/

# 本地预览构建结果
npm run preview
# 访问 http://localhost:4173
```

### 步骤 6: 部署到 Firebase

```bash
# 部署到生产环境
firebase deploy --only hosting
```

**预期输出**：
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/zoom-zone-6619c/overview
Hosting URL: https://zoom-zone-6619c.web.app
```

### 步骤 7: 验证部署

```bash
# 访问生产环境
open https://zoom-zone-6619c.web.app

# 或使用 curl 检查
curl -I https://zoom-zone-6619c.web.app
# 应返回 HTTP/2 200
```

---

## 🔧 环境配置

### Firebase 配置说明

**文件**: `src/firebaseConfig.ts`

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyDo-f-tgX-gNJF5hgyDF_RiHwelYfdegU8",
  authDomain: "zoom-zone-6619c.firebaseapp.com",
  projectId: "zoom-zone-6619c",
  storageBucket: "zoom-zone-6619c.firebasestorage.app",
  messagingSenderId: "96055637685",
  appId: "1:96055637685:web:35b93bd2fa9c877ea6b0fc",
  measurementId: "G-H43KFJYF5P"
};
```

**说明**：
- ✅ 配置已硬编码在代码中
- ✅ 无需创建 `.env` 文件
- ✅ 构建时自动打包进生产代码
- ⚠️  API Key 公开可见，但受 Firebase 安全规则保护

### Firebase Hosting 配置

**文件**: `firebase.json`

```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

**关键配置说明**：
- `"public": "dist"` - 部署 `dist/` 目录
- `"rewrites"` - 支持 React Router 前端路由
- `"headers"` - 启用静态资源缓存（1年）

---

## ⚡ 构建优化

### 代码分割

Vite 自动进行代码分割：
- 主包（main bundle）：核心代码
- Vendor 包：第三方库（React、Ant Design 等）
- 懒加载包：按需加载的页面组件

### 资源优化

```bash
# 查看构建产物分析
npm run build

# 输出示例：
# dist/assets/index-abc123.js     250 kB  (gzip: 80 kB)
# dist/assets/vendor-def456.js    350 kB  (gzip: 120 kB)
```

**优化建议**：
- ✅ 图片使用 WebP 格式
- ✅ 启用 Brotli 压缩（Firebase 自动启用）
- ✅ 懒加载非首屏组件
- ✅ Tree-shaking 去除未使用代码

### 缓存策略

| 资源类型 | 缓存策略 | 说明 |
|---------|---------|------|
| `index.html` | 不缓存 | 确保总是最新版本 |
| `*.js` | 1 年强缓存 | 文件名带 hash，内容变更自动失效 |
| `*.css` | 1 年强缓存 | 文件名带 hash |
| `*.jpg/png` | 7 天缓存 | 静态图片资源 |

---

## ✅ 部署验证

### 自动化验证清单

部署完成后，执行以下验证步骤：

#### 1. 网站可访问性

```bash
# 检查 HTTP 状态码
curl -I https://zoom-zone-6619c.web.app

# 预期结果：HTTP/2 200
```

#### 2. 核心页面功能

| 页面 | 验证点 |
|------|--------|
| **登录页** | ✅ 页面加载正常<br>✅ 可以输入账号密码<br>✅ 登录成功跳转 |
| **Dashboard** | ✅ 统计数据显示<br>✅ 图表渲染正常 |
| **Scan Records** | ✅ 列表加载<br>✅ 筛选功能<br>✅ CSV 导出 |
| **Budget Management** | ✅ 预算配置显示<br>✅ 编辑保存功能 |
| **Audit Logs** | ✅ 日志列表加载<br>✅ 分页功能 |

#### 3. Firebase 服务连接

**Firestore 连接**：
- 打开浏览器 DevTools → Console
- 检查是否有 Firestore 连接错误
- 应该看到 "Firestore persistence enabled" 日志

**Authentication**：
- 登录功能正常
- Token 自动刷新
- 登出功能正常

#### 4. 性能检测

```bash
# 使用 Lighthouse 进行性能检测
npx lighthouse https://zoom-zone-6619c.web.app --view

# 目标指标：
# Performance: > 90
# Accessibility: > 90
# Best Practices: > 90
# SEO: > 80
```

#### 5. 移动端适配

- 在不同设备尺寸下测试（Chrome DevTools）
- 检查响应式布局
- 验证触摸交互

---

## 🔄 回滚操作

### 查看部署历史

```bash
# 查看最近的部署记录
firebase hosting:releases

# 输出示例：
# Deployment Time      Version ID                   Message
# 2025-01-07 10:30     abc123def456                 Latest
# 2025-01-06 15:20     xyz789uvw012                 Previous
```

### 方法一：Firebase CLI 回滚

```bash
# 回滚到上一个版本
firebase hosting:rollback

# 确认回滚
# Are you sure? (y/N): y
```

### 方法二：Firebase Console 回滚

1. 访问 [Firebase Console](https://console.firebase.google.com/project/zoom-zone-6619c/hosting)
2. 选择 **Hosting** → **Release history**
3. 找到要回滚的版本
4. 点击 **"Restore"** 按钮

### 方法三：重新部署旧版本

```bash
# 切换到旧版本代码（Git）
git checkout <commit-hash>

# 重新构建和部署
npm run build
firebase deploy --only hosting

# 恢复到最新代码
git checkout main
```

---

## ❓ 常见问题

### Q1: 部署后页面白屏

**可能原因**：
1. JavaScript 加载失败
2. Firebase 配置错误
3. 浏览器缓存问题

**解决方法**：
```bash
# 1. 检查构建产物是否正常
ls -la dist/

# 2. 本地预览测试
npm run preview

# 3. 清除浏览器缓存后重试
# Chrome: Cmd+Shift+R (Mac) 或 Ctrl+Shift+R (Windows)
```

### Q2: 部署失败 - Permission Denied

**错误信息**：
```
Error: HTTP Error: 403, Missing necessary permission
```

**解决方法**：
```bash
# 1. 重新登录 Firebase
firebase logout
firebase login

# 2. 确认项目权限
firebase projects:list

# 3. 切换到正确项目
firebase use zoom-zone-6619c
```

### Q3: 构建失败 - TypeScript 错误

**错误信息**：
```
error TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'
```

**解决方法**：
```bash
# 1. 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# 2. 检查 TypeScript 版本
npx tsc --version

# 3. 修复类型错误后重试
npm run build
```

### Q4: 部署后 API 请求失败

**可能原因**：
- Cloud Functions 未部署
- CORS 配置问题
- Firebase 安全规则限制

**解决方法**：
```bash
# 1. 检查 Cloud Functions 状态
cd ../ShelfTagSnap-Web_Backend
firebase functions:list

# 2. 重新部署 Functions
firebase deploy --only functions

# 3. 检查 Firestore 规则
firebase firestore:rules get
```

### Q5: 页面加载很慢

**优化步骤**：

1. **启用 CDN 缓存**（已自动启用）
2. **检查图片大小**：
   ```bash
   # 查找大于 100KB 的图片
   find src -type f -size +100k
   ```
3. **使用 Lighthouse 分析**：
   ```bash
   npx lighthouse https://zoom-zone-6619c.web.app --view
   ```

---

## 📊 监控和维护

### 1. Firebase Hosting 监控

访问 [Firebase Console - Hosting](https://console.firebase.google.com/project/zoom-zone-6619c/hosting)

**关键指标**：
- **请求数**：每日访问量
- **带宽使用**：流量消耗
- **响应时间**：加载速度
- **错误率**：4xx/5xx 错误

### 2. 日志查看

**实时日志**（无，静态托管）

**访问日志**：
- Firebase Console → Hosting → Usage
- 查看 24 小时/7 天/30 天访问趋势

### 3. 性能监控

启用 Firebase Performance Monitoring（可选）：

```bash
# 安装 Performance SDK
npm install firebase/performance

# 在代码中初始化
import { getPerformance } from 'firebase/performance';
const perf = getPerformance(app);
```

### 4. 定期维护任务

| 任务 | 频率 | 说明 |
|------|-----|------|
| **依赖更新** | 月度 | `npm outdated` 检查更新 |
| **安全审计** | 月度 | `npm audit` 检查漏洞 |
| **构建优化** | 季度 | 分析 bundle 大小，优化加载速度 |
| **备份部署历史** | 每次发布 | 记录版本号和变更内容 |

---

## 🔐 安全最佳实践

### 1. Firebase 安全规则

确保 Firestore 和 Storage 安全规则已正确配置：

```bash
# 检查 Firestore 规则
firebase firestore:rules get

# 检查 Storage 规则
firebase storage:rules get
```

### 2. 环境变量保护

- ✅ 敏感配置使用 Firebase Functions Secrets
- ✅ 前端只包含必要的公开信息
- ❌ 不要在前端代码中存储私钥

### 3. HTTPS 强制

Firebase Hosting 自动强制 HTTPS，无需额外配置。

### 4. 内容安全策略 (CSP)

已在 `firebase.json` 中配置安全头：

```json
{
  "key": "X-Content-Type-Options",
  "value": "nosniff"
},
{
  "key": "X-Frame-Options",
  "value": "DENY"
},
{
  "key": "X-XSS-Protection",
  "value": "1; mode=block"
}
```

---

## 📞 技术支持

### 联系方式

- **开发团队**: ShelfTagSnap Team
- **文档版本**: v1.0.0
- **最后更新**: 2025-01-07

### 相关资源

| 资源 | 链接 |
|------|------|
| **Firebase Console** | https://console.firebase.google.com/project/zoom-zone-6619c |
| **Hosting 仪表板** | https://console.firebase.google.com/project/zoom-zone-6619c/hosting |
| **生产环境 URL** | https://zoom-zone-6619c.web.app |
| **备用 URL** | https://zoom-zone-6619c.firebaseapp.com |
| **Firebase 文档** | https://firebase.google.com/docs/hosting |

---

## 📝 部署记录模板

每次部署后，建议填写以下记录：

```markdown
## 部署记录 - 2025-01-XX

**部署时间**: 2025-01-XX XX:XX
**部署版本**: vX.X.X
**部署人员**: [姓名]
**Git Commit**: [commit hash]

### 变更内容
- [x] 新功能：xxx
- [x] Bug 修复：xxx
- [x] 性能优化：xxx

### 验证结果
- [x] 登录功能正常
- [x] Dashboard 加载正常
- [x] Scan Records 正常
- [x] 移动端适配正常

### 备注
[其他说明]
```

---

**祝发布顺利！🚀**
