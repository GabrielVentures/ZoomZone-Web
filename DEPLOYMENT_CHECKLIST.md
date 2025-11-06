# ✅ ShelfTagSnap Web 部署检查清单

> **每次部署前必看 - 确保生产环境稳定性**

---

## 📋 部署前检查（Pre-Deployment）

### 环境准备

- [ ] Node.js v20.x 已安装
- [ ] npm 已更新到最新版本
- [ ] Firebase CLI 已安装并登录
- [ ] 当前 Firebase 项目为 `zoom-zone-6619c`
- [ ] 本地开发服务器运行正常（`npm run dev`）

### 代码质量

- [ ] 所有 TypeScript 编译错误已修复
- [ ] ESLint 检查通过（`npm run lint`）
- [ ] 单元测试全部通过（`npm run test:run`）
- [ ] 测试覆盖率达标（> 60%）
- [ ] 无 console.error 或未处理的 Promise rejection

### 功能测试

- [ ] 登录/登出功能正常
- [ ] Dashboard 数据加载正确
- [ ] Scan Records 列表、筛选、导出功能正常
- [ ] Budget Management 配置保存正常
- [ ] Audit Logs 显示正常
- [ ] 移动端响应式布局正常

### 后端服务

- [ ] Cloud Functions 已部署最新版本
- [ ] Firestore 安全规则已更新
- [ ] Storage 安全规则已更新
- [ ] OpenAI API Key 已配置
- [ ] Budget 配置已设置（$50/天）

---

## 🚀 部署执行（Deployment）

### 方法选择

选择以下一种方法：

- [ ] **方法一**：一键脚本 `./deploy.sh`
- [ ] **方法二**：手动部署 `npm run build && firebase deploy --only hosting`
- [ ] **方法三**：预览部署 `./deploy.sh --preview`（用于测试）

### 构建验证

- [ ] 构建成功完成（无错误）
- [ ] `dist/` 目录已生成
- [ ] 构建产物大小合理（< 3 MB）
- [ ] 本地预览正常（`npm run preview`）

### 部署确认

- [ ] Firebase 部署成功
- [ ] 获得 Hosting URL：`https://zoom-zone-6619c.web.app`
- [ ] 部署版本号已记录

---

## ✅ 部署后验证（Post-Deployment）

### 网站可访问性

- [ ] 生产 URL 可访问：https://zoom-zone-6619c.web.app
- [ ] 备用 URL 可访问：https://zoom-zone-6619c.firebaseapp.com
- [ ] HTTP 状态码为 200
- [ ] HTTPS 证书有效
- [ ] 页面加载时间 < 3 秒

### 核心功能验证

**登录系统：**
- [ ] 登录页加载正常
- [ ] 可以输入账号密码
- [ ] 登录成功后跳转到 Dashboard
- [ ] 登出功能正常
- [ ] Session 持久化正常

**Dashboard 页面：**
- [ ] 统计卡片数据正常显示
- [ ] AI Status 饼图渲染正常
- [ ] Cost Trend 折线图显示正常
- [ ] Records Activity 柱状图正常
- [ ] 数据刷新功能正常

**Scan Records 页面：**
- [ ] 记录列表加载正常
- [ ] 搜索功能正常
- [ ] 状态筛选正常
- [ ] 日期范围筛选正常
- [ ] 分页功能正常
- [ ] 图片预览正常
- [ ] CSV 导出功能正常（14 个字段）
- [ ] 批量操作正常

**Budget Management 页面：**
- [ ] 预算配置加载正常
- [ ] 显示 $50 每日配额
- [ ] 当前使用率显示正常
- [ ] 编辑保存功能正常
- [ ] 告警阈值设置正常

**Audit Logs 页面：**
- [ ] 日志列表加载正常
- [ ] 时间筛选正常
- [ ] 操作类型筛选正常
- [ ] 分页功能正常
- [ ] 详情展示正常

### Firebase 服务连接

- [ ] Firestore 连接正常（检查 DevTools Console）
- [ ] Storage 图片加载正常
- [ ] Functions 调用正常（如有直接调用）
- [ ] Authentication Token 刷新正常
- [ ] 离线持久化启用（IndexedDB）

### 跨浏览器测试

- [ ] Chrome（最新版）
- [ ] Safari（Mac）
- [ ] Firefox（最新版）
- [ ] Edge（最新版）
- [ ] 移动端 Safari（iOS）
- [ ] 移动端 Chrome（Android）

### 性能指标

- [ ] Lighthouse Performance > 90
- [ ] Lighthouse Accessibility > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3.0s
- [ ] Total Blocking Time < 300ms

### 安全检查

- [ ] HTTPS 强制启用
- [ ] Security Headers 已配置（X-Frame-Options, CSP 等）
- [ ] Firebase API Key 受规则保护
- [ ] 无明文敏感信息泄露
- [ ] CORS 配置正确

---

## 📊 监控配置（Monitoring）

### Firebase Console

- [ ] 访问 [Firebase Hosting Dashboard](https://console.firebase.google.com/project/zoom-zone-6619c/hosting)
- [ ] 检查实时流量监控
- [ ] 确认无异常错误率
- [ ] 查看带宽使用情况

### 告警配置

- [ ] Firebase Hosting 配额告警已设置
- [ ] Google Cloud Platform 计费告警已设置
- [ ] 错误率告警已配置（如有）

---

## 📝 部署记录（Documentation）

### 必填信息

```markdown
**部署日期**: 2025-01-XX
**部署时间**: XX:XX
**部署人员**: [你的名字]
**Git Commit**: [commit hash]
**部署版本**: v1.0.X
```

### 变更内容

```markdown
- [ ] 新功能：[描述]
- [ ] Bug 修复：[描述]
- [ ] 性能优化：[描述]
- [ ] 配置更新：[描述]
```

### 测试结果

```markdown
- [ ] 本地测试通过
- [ ] 预览环境测试通过
- [ ] 生产环境验证通过
```

---

## 🔄 回滚准备（Rollback Plan）

### 回滚触发条件

如果出现以下情况，立即回滚：

- [ ] 关键功能无法使用（登录、数据加载等）
- [ ] 错误率超过 5%
- [ ] 性能严重下降（加载时间 > 10 秒）
- [ ] 数据丢失或损坏
- [ ] 安全漏洞发现

### 回滚步骤

1. **立即回滚**：
   ```bash
   firebase hosting:rollback
   ```

2. **通知相关人员**：
   - 发送回滚通知
   - 说明回滚原因

3. **问题排查**：
   - 在本地或预览环境重现问题
   - 修复后重新部署

---

## 🎯 成功标准（Success Criteria）

本次部署被视为成功，当且仅当：

- ✅ 所有核心功能正常
- ✅ 无严重 Bug 或错误
- ✅ 性能指标达标
- ✅ 用户反馈良好
- ✅ 监控数据正常

---

## 📞 紧急联系（Emergency Contacts）

| 角色 | 联系方式 | 职责 |
|------|---------|------|
| 技术负责人 | [电话/邮箱] | 部署决策、回滚批准 |
| 后端开发 | [电话/邮箱] | Cloud Functions、数据库问题 |
| 前端开发 | [电话/邮箱] | Web Admin 问题 |
| 运维支持 | [电话/邮箱] | Firebase 配置、监控 |

---

## 🚨 常见紧急情况处理

### 情况 1: 网站完全无法访问

```bash
# 立即回滚
firebase hosting:rollback

# 检查 Firebase 状态
# https://status.firebase.google.com
```

### 情况 2: 部分用户无法登录

```bash
# 检查 Authentication 服务
firebase auth:export users.json

# 查看错误日志
# Firebase Console → Authentication → Users
```

### 情况 3: 数据加载失败

```bash
# 检查 Firestore 规则
firebase firestore:rules get

# 检查后端 Functions 状态
cd ../ShelfTagSnap-Web_Backend
firebase functions:log
```

---

**部署完成后，将此清单存档备查！** 📁
