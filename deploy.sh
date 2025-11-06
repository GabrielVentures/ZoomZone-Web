#!/bin/bash

###############################################################################
# ShelfTagSnap Web 一键部署脚本
# 用途：自动化构建和部署 Web Admin 到 Firebase Hosting
# 使用：./deploy.sh [--skip-tests] [--preview]
###############################################################################

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📦 $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# 解析参数
SKIP_TESTS=false
PREVIEW_MODE=false

for arg in "$@"; do
    case $arg in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --preview)
            PREVIEW_MODE=true
            shift
            ;;
        *)
            # 未知参数
            ;;
    esac
done

# 显示欢迎信息
echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════╗
║   ShelfTagSnap Web 一键部署脚本                   ║
║   Version: 1.0.0                                  ║
║   Target: Firebase Hosting (zoom-zone-6619c)      ║
╚═══════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# 步骤 1: 环境检查
print_step "步骤 1: 环境检查"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js 未安装，请先安装 Node.js"
    exit 1
fi
NODE_VERSION=$(node --version)
print_success "Node.js 版本: $NODE_VERSION"

# 检查 npm
if ! command -v npm &> /dev/null; then
    print_error "npm 未安装"
    exit 1
fi
NPM_VERSION=$(npm --version)
print_success "npm 版本: $NPM_VERSION"

# 检查 Firebase CLI
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI 未安装，请运行: npm install -g firebase-tools"
    exit 1
fi
FIREBASE_VERSION=$(firebase --version)
print_success "Firebase CLI 版本: $FIREBASE_VERSION"

# 检查 Firebase 登录状态
print_info "检查 Firebase 登录状态..."
if ! firebase projects:list &> /dev/null; then
    print_error "未登录 Firebase，请运行: firebase login"
    exit 1
fi
print_success "Firebase 已登录"

# 检查当前项目
CURRENT_PROJECT=$(firebase use 2>&1 | grep "Active" | awk '{print $4}' || echo "unknown")
print_info "当前 Firebase 项目: $CURRENT_PROJECT"

if [ "$CURRENT_PROJECT" != "zoom-zone-6619c" ]; then
    print_warning "当前项目不是 zoom-zone-6619c，正在切换..."
    firebase use zoom-zone-6619c
    print_success "已切换到 zoom-zone-6619c"
fi

# 步骤 2: 清理旧构建
print_step "步骤 2: 清理旧构建产物"

if [ -d "dist" ]; then
    print_info "删除旧的 dist 目录..."
    rm -rf dist
    print_success "旧构建已清理"
else
    print_info "无需清理（dist 目录不存在）"
fi

# 步骤 3: 安装依赖
print_step "步骤 3: 安装/更新依赖"

print_info "运行 npm install..."
npm install --legacy-peer-deps
print_success "依赖安装完成"

# 步骤 4: 运行测试（可选）
if [ "$SKIP_TESTS" = false ]; then
    print_step "步骤 4: 运行单元测试"

    print_info "运行测试套件..."
    if npm run test:run; then
        print_success "所有测试通过"
    else
        print_error "测试失败，终止部署"
        print_warning "提示：使用 --skip-tests 跳过测试"
        exit 1
    fi
else
    print_step "步骤 4: 跳过测试 (--skip-tests)"
    print_warning "已跳过测试步骤"
fi

# 步骤 5: 构建生产版本
print_step "步骤 5: 构建生产版本"

print_info "运行 npm run build..."
if npm run build; then
    print_success "构建成功"
else
    print_error "构建失败"
    exit 1
fi

# 检查构建产物
if [ ! -d "dist" ]; then
    print_error "构建失败：dist 目录不存在"
    exit 1
fi

# 显示构建产物大小
DIST_SIZE=$(du -sh dist | awk '{print $1}')
print_info "构建产物大小: $DIST_SIZE"

# 步骤 6: 部署到 Firebase Hosting
print_step "步骤 6: 部署到 Firebase Hosting"

if [ "$PREVIEW_MODE" = true ]; then
    print_info "部署到预览环境（Preview Channel）..."
    CHANNEL_ID="preview-$(date +%s)"

    if firebase hosting:channel:deploy "$CHANNEL_ID" --expires 7d; then
        print_success "预览部署成功！"
        print_info "预览链接将在上方输出中显示"
        print_warning "预览环境将在 7 天后自动过期"
    else
        print_error "预览部署失败"
        exit 1
    fi
else
    print_info "部署到生产环境..."
    print_warning "即将部署到正式环境，是否继续？(y/n)"

    read -p "请输入 (y/n): " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "部署已取消"
        exit 0
    fi

    if firebase deploy --only hosting; then
        print_success "生产部署成功！"

        # 获取部署 URL
        HOSTING_URL="https://zoom-zone-6619c.web.app"
        print_info "访问地址: $HOSTING_URL"
    else
        print_error "部署失败"
        exit 1
    fi
fi

# 步骤 7: 部署后验证
print_step "步骤 7: 部署后验证"

if [ "$PREVIEW_MODE" = false ]; then
    print_info "等待 5 秒后进行健康检查..."
    sleep 5

    HOSTING_URL="https://zoom-zone-6619c.web.app"
    print_info "检查网站可访问性: $HOSTING_URL"

    if curl -s -o /dev/null -w "%{http_code}" "$HOSTING_URL" | grep -q "200"; then
        print_success "网站健康检查通过 (HTTP 200)"
    else
        print_warning "健康检查失败，请手动验证"
    fi
fi

# 完成
print_step "🎉 部署完成！"

echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════╗
║              部署成功！                           ║
╚═══════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

if [ "$PREVIEW_MODE" = false ]; then
    echo -e "${BLUE}🌐 生产环境地址:${NC}"
    echo -e "   ${GREEN}https://zoom-zone-6619c.web.app${NC}"
    echo -e "   ${GREEN}https://zoom-zone-6619c.firebaseapp.com${NC}"
    echo ""
    echo -e "${BLUE}📊 后续步骤:${NC}"
    echo -e "   1. 访问上述 URL 验证部署"
    echo -e "   2. 使用管理员账号登录测试"
    echo -e "   3. 检查所有核心功能正常"
    echo -e "   4. 查看 Firebase Console 监控数据"
    echo ""
    echo -e "${YELLOW}💡 提示:${NC}"
    echo -e "   - 查看部署历史: firebase hosting:releases"
    echo -e "   - 回滚上一版本: firebase hosting:rollback"
    echo -e "   - 查看访问日志: Firebase Console → Hosting"
fi

echo ""
print_success "感谢使用 ShelfTagSnap 部署脚本！"
