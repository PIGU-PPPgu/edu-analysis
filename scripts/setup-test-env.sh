#!/bin/bash

echo "🚀 开始配置测试环境..."

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 数据库连接信息
DB_URL="postgresql://postgres.giluhqotfjpmofowvogn:Ypy990410@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
MIGRATION_FILE="supabase/migrations/20251130_create_test_schema.sql"

echo ""
echo "📋 步骤1: 检查迁移文件..."
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ 迁移文件不存在: $MIGRATION_FILE${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 迁移文件存在${NC}"

echo ""
echo "📋 步骤2: 应用test_schema迁移到数据库..."
echo "正在连接到Supabase..."

if command -v psql &> /dev/null; then
    # 使用psql执行迁移
    psql "$DB_URL" -f "$MIGRATION_FILE" 2>&1 | tee migration.log
    
    if grep -q "ERROR" migration.log; then
        echo -e "${RED}❌ 迁移执行失败，请查看 migration.log${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ test_schema迁移成功应用${NC}"
    rm migration.log
else
    echo -e "${YELLOW}⚠️  未安装psql，请手动执行以下步骤：${NC}"
    echo ""
    echo "1. 访问 https://app.supabase.com"
    echo "2. 选择项目 giluhqotfjpmofowvogn"
    echo "3. 进入 SQL Editor"
    echo "4. 复制并执行文件内容: $MIGRATION_FILE"
    echo ""
    read -p "完成后按Enter继续..." 
fi

echo ""
echo "📋 步骤3: 配置.env.local文件..."

if [ ! -f ".env.local" ]; then
    echo "复制.env.local.example..."
    cp .env.local.example .env.local
    echo -e "${GREEN}✅ .env.local已创建${NC}"
    
    echo ""
    echo -e "${YELLOW}⚠️  请编辑.env.local，填入实际的VITE_SUPABASE_ANON_KEY${NC}"
    echo "从 https://app.supabase.com → Settings → API 获取 anon key"
    echo ""
    read -p "完成后按Enter继续..." 
else
    echo -e "${GREEN}✅ .env.local已存在${NC}"
fi

echo ""
echo "📋 步骤4: 验证test_schema创建..."
if command -v psql &> /dev/null; then
    SCHEMA_CHECK=$(psql "$DB_URL" -t -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'test_schema';")
    
    if [[ "$SCHEMA_CHECK" == *"test_schema"* ]]; then
        echo -e "${GREEN}✅ test_schema已成功创建${NC}"
    else
        echo -e "${RED}❌ test_schema未找到，迁移可能失败${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  跳过验证（无psql）${NC}"
fi

echo ""
echo "📋 步骤5: 运行验证脚本（如果存在）..."
if [ -f "scripts/verify-test-env.ts" ]; then
    npx tsx scripts/verify-test-env.ts
else
    echo -e "${YELLOW}⚠️  验证脚本不存在，跳过${NC}"
fi

echo ""
echo "🎉 测试环境配置完成！"
echo ""
echo "下一步: 运行测试"
echo "  npx vitest run src/services/__tests__/"
