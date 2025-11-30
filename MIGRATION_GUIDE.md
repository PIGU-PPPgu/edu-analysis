# 🔧 测试环境设置指南

## 📋 概述

本指南帮助您设置测试环境，包括创建test_schema、配置环境变量以及运行集成测试。

**完成时间**: 约10-15分钟

---

## ✅ 完成的工作

已修复以下代码问题：

1. ✅ **db-setup.ts响应解析错误** (`src/test/db-setup.ts:158-175`)
   - 修复了 `insertTestData` 函数的PostgrestBuilder响应解析
   - 修复了 `cleanTestData` 函数的delete响应解析

2. ✅ **Schema隔离支持** (`src/test/db-setup.ts:21-51`)
   - `createTestSupabaseClient` 现在支持通过环境变量配置schema
   - 默认使用 `test_schema` 隔离测试数据

3. ✅ **测试Schema迁移** (`supabase/migrations/20251130_create_test_schema.sql`)
   - 创建了test_schema及所有必要的表结构
   - 配置了宽松的RLS策略（仅用于测试）

4. ✅ **环境配置模板** (`.env.local.example`)
   - 提供了测试环境配置示例

---

## 📝 待完成步骤

### 步骤 1: 应用测试Schema迁移

有两种方法可以执行迁移：

#### 方法A: 使用Supabase Dashboard（推荐）

1. 访问 [Supabase Dashboard](https://app.supabase.com)
2. 选择您的项目 (giluhqotfjpmofowvogn)
3. 进入 **SQL Editor**
4. 打开文件 `supabase/migrations/20251130_create_test_schema.sql`
5. 复制全部内容
6. 粘贴到SQL Editor并点击 **Run**
7. 验证输出显示 "✅ test_schema创建完成"

#### 方法B: 使用psql命令行（如果已安装）

```bash
psql "postgresql://postgres.giluhqotfjpmofowvogn:Ypy990410@aws-0-us-west-1.pooler.supabase.com:6543/postgres" \
  -f supabase/migrations/20251130_create_test_schema.sql
```

### 步骤 2: 配置测试环境变量

1. 复制环境配置模板:

```bash
cp .env.local.example .env.local
```

2. 编辑 `.env.local`，填入您的实际配置:

```bash
# 生产环境（从Supabase Dashboard获取）
VITE_SUPABASE_URL=https://giluhqotfjpmofowvogn.supabase.co
VITE_SUPABASE_ANON_KEY=你的实际anon_key

# 测试环境（使用相同配置 + test_schema）
VITE_TEST_SUPABASE_URL=https://giluhqotfjpmofowvogn.supabase.co
VITE_TEST_SUPABASE_ANON_KEY=你的实际anon_key
VITE_TEST_SUPABASE_SCHEMA=test_schema
```

**获取anon_key的方法**:
- 进入 Supabase Dashboard → Settings → API
- 复制 `anon` / `public` key

### 步骤 3: 验证测试环境

创建并运行验证脚本:

```bash
# 创建验证脚本
cat > scripts/verify-test-env.ts << 'EOF'
import { testSupabase } from '../src/test/db-setup';

async function verify() {
  console.log('🔍 验证测试环境...\n');

  // 1. 测试连接
  const { data, error } = await testSupabase
    .from('students')
    .select('count')
    .limit(1);

  if (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
  console.log('✅ 数据库连接成功');

  // 2. 测试插入
  const testId = crypto.randomUUID();
  const { error: insertError } = await testSupabase
    .from('students')
    .insert({
      id: testId,
      student_id: 'VERIFY_001',
      name: '测试学生',
      class_name: '测试班级'
    });

  if (insertError) {
    console.error('❌ 插入失败:', insertError.message);
    process.exit(1);
  }
  console.log('✅ 插入权限验证通过');

  // 3. 清理
  await testSupabase.from('students').delete().eq('student_id', 'VERIFY_001');
  console.log('✅ 清理权限验证通过');

  console.log('\n🎉 测试环境配置成功！');
}

verify();
EOF

# 运行验证
npx tsx scripts/verify-test-env.ts
```

### 步骤 4: 运行集成测试

```bash
# 运行所有集成测试
npx vitest run src/api/__tests__/

# 或单独运行每个测试文件
npx vitest run src/api/__tests__/gradeDataAPI.integration.test.ts
npx vitest run src/api/__tests__/advancedStatisticsAPI.integration.test.ts
npx vitest run src/api/__tests__/optimizedGradeAPI.integration.test.ts
```

**预期结果**:
- ✅ 30个测试用例（12 + 10 + 8）
- ✅ 通过率 ≥ 95%
- ✅ 无数据库连接错误

---

## 🔍 故障排查

### 问题1: "Failed to create Supabase client"

**原因**: 环境变量未正确设置

**解决**:
1. 确认 `.env.local` 文件存在
2. 确认已填入正确的URL和anon_key
3. 重启开发服务器: `npm run dev`

### 问题2: "Table 'students' does not exist"

**原因**: test_schema迁移未执行

**解决**:
1. 按照步骤1重新执行迁移
2. 在Supabase Dashboard的SQL Editor中运行:
   ```sql
   SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'test_schema';
   ```
3. 如果返回空，说明迁移未成功

### 问题3: "Permission denied for schema test_schema"

**原因**: RLS策略未正确配置

**解决**:
1. 在SQL Editor中运行:
   ```sql
   GRANT USAGE ON SCHEMA test_schema TO anon, authenticated;
   GRANT ALL ON ALL TABLES IN SCHEMA test_schema TO anon, authenticated;
   ```

### 问题4: 测试数据污染了生产环境

**原因**: 未正确使用test_schema

**检查**:
1. 确认 `VITE_TEST_SUPABASE_SCHEMA=test_schema` 已设置
2. 查看测试日志，确认显示 "schema: test_schema"
3. 在Supabase Dashboard运行:
   ```sql
   -- 检查test_schema中的数据
   SELECT COUNT(*) FROM test_schema.students;

   -- 检查public schema（生产）
   SELECT COUNT(*) FROM public.students;
   ```

---

## 📊 测试覆盖范围

### gradeDataAPI.integration.test.ts (12 tests)
- 成绩数据查询（无筛选、班级筛选、分页）
- 空结果集处理
- 专项查询（按科目、按班级）
- 统计计算（平均分、中位数、标准差、及格率）
- 考试信息查询

### advancedStatisticsAPI.integration.test.ts (10 tests)
- 批量统计（单维度、多维度分组）
- 缓存机制（缓存命中、独立缓存）
- 相关性分析（Pearson系数）
- 异常检测（Z-score方法）
- 错误处理（空数据、参数验证）

### optimizedGradeAPI.integration.test.ts (8 tests)
- RPC优化查询
- 降级查询
- 重试机制（失败重试、最大重试）
- 缓存性能（缓存命中、缓存清除）
- 数据预取
- 数据新鲜度检测

---

## 🎯 验收标准

完成以上步骤后，应达到以下标准：

- ✅ test_schema已创建并包含所有必要的表
- ✅ `.env.local` 已正确配置
- ✅ 验证脚本执行成功
- ✅ 所有30个集成测试通过
- ✅ 测试数据与生产数据完全隔离
- ✅ 无 "undefined" 错误或RLS权限错误

---

## 📞 需要帮助？

如遇到问题，请提供以下信息：
1. 具体的错误信息
2. 执行的命令
3. 相关的环境配置（隐藏敏感信息）
4. Supabase Dashboard中test_schema的状态截图

---

**创建时间**: 2024-11-30
**适用版本**: Supabase Client v2.x, Vitest v3.x
**预计完成时间**: 10-15分钟
