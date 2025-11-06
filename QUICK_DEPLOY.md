# 🚀 ShelfTagSnap Web 快速部署指南

> **5 分钟快速上手 - 一键部署到生产环境**

---

## ⚡ 快速开始

### 方法一：一键脚本（推荐）

```bash
cd /Users/kent.sun/Projects/upwork/ShelfTagSnap/ShelfTagSnap-Web

# 执行一键部署
./deploy.sh
```

### 方法二：手动三步走

```bash
# 1. 构建
npm run build

# 2. 部署
firebase deploy --only hosting

# 3. 访问
open https://zoom-zone-6619c.web.app
```

---

## 📦 部署选项

| 命令 | 用途 | 说明 |
|------|------|------|
| `./deploy.sh` | 标准部署 | 包含测试、构建、部署全流程 |
| `./deploy.sh --skip-tests` | 快速部署 | 跳过测试，节省时间 |
| `./deploy.sh --preview` | 预览部署 | 临时环境，7天后过期 |

---

## ✅ 部署前检查清单

- [ ] Node.js 和 npm 已安装
- [ ] Firebase CLI 已安装（`npm install -g firebase-tools`）
- [ ] 已登录 Firebase（`firebase login`）
- [ ] 当前项目为 zoom-zone-6619c（`firebase use`）
- [ ] 后端 Cloud Functions 已部署

---

## 🌐 部署后访问

**生产环境地址：**
- 主域名：https://zoom-zone-6619c.web.app
- 备用域名：https://zoom-zone-6619c.firebaseapp.com

**验证步骤：**
1. 访问上述 URL
2. 使用管理员账号登录
3. 检查 Dashboard、Scan Records、Budget 等页面
4. 确认所有功能正常

---

## 🔄 回滚操作

```bash
# 查看部署历史
firebase hosting:releases

# 回滚到上一版本
firebase hosting:rollback
```

---

## ❓ 常见问题速查

### 问题：部署失败 - Permission Denied

```bash
firebase logout
firebase login
firebase use zoom-zone-6619c
```

### 问题：页面白屏

```bash
# 清除浏览器缓存（Cmd+Shift+R）
# 或重新构建部署
npm run build
firebase deploy --only hosting
```

### 问题：构建失败

```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

---

## 📞 需要帮助？

查看完整文档：[WEB_DEPLOYMENT.md](./WEB_DEPLOYMENT.md)

---

**预计部署时间：3-5 分钟** ⏱️
