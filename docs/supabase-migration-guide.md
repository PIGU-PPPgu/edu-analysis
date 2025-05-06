# Supabase到自建服务器的渐进式迁移指南

本文档提供了从Supabase云服务迁移到自建服务器的详细步骤。采用渐进式迁移策略，确保系统在迁移过程中持续可用，并降低迁移风险。

## 迁移概述

迁移将分为以下几个阶段进行：

1. **准备阶段** - 建立自建服务器基础架构
2. **数据复制阶段** - 初始数据迁移 
3. **双写阶段** - 同时写入Supabase和自建服务器
4. **读取迁移阶段** - 逐步将读取操作迁移到自建服务器
5. **完全切换阶段** - 完全迁移到自建服务器

## 1. 准备阶段

### 1.1 设置自建服务器环境

```bash
# 安装Docker和Docker Compose
sudo apt update
sudo apt install -y docker.io docker-compose

# 创建服务目录
mkdir -p ~/edu-analysis-server
cd ~/edu-analysis-server

# 创建docker-compose配置
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: edudb
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build: ./api
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/edudb
      JWT_SECRET: ${JWT_SECRET}
      PORT: 3000
    ports:
      - "3000:3000"

volumes:
  postgres-data:
EOF

# 创建环境变量文件
cat > .env << 'EOF'
POSTGRES_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret
EOF

# 创建API服务目录
mkdir -p api
```

### 1.2 数据库模式准备

```bash
# 创建初始化脚本目录
mkdir -p init-scripts

# 下载当前Supabase的schema
cd init-scripts
curl -o 01-schema.sql https://raw.githubusercontent.com/your-org/your-repo/main/database-schema.sql
```

## 2. 数据复制阶段

### 2.1 创建数据导出工具

```typescript
// 创建导出脚本 export-data.ts
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const TABLES = [
  'classes',
  'students',
  'homework',
  'homework_submissions',
  'knowledge_points',
  'submission_knowledge_points',
  // 添加其他表...
]

async function exportTable(tableName: string) {
  console.log(`Exporting table ${tableName}...`)
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
  
  if (error) {
    console.error(`Error exporting ${tableName}:`, error)
    return false
  }
  
  if (!data || data.length === 0) {
    console.log(`No data in ${tableName}`)
    return true
  }
  
  const outputDir = path.join(__dirname, 'exported-data')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  fs.writeFileSync(
    path.join(outputDir, `${tableName}.json`),
    JSON.stringify(data, null, 2)
  )
  
  console.log(`Exported ${data.length} rows from ${tableName}`)
  return true
}

async function exportAllData() {
  for (const table of TABLES) {
    await exportTable(table)
  }
  console.log('Export completed')
}

exportAllData()
```

### 2.2 创建数据导入工具

```typescript
// 创建导入脚本 import-data.ts
import * as fs from 'fs'
import * as path from 'path'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

const TABLES = [
  'classes',
  'students',
  'homework',
  'homework_submissions',
  'knowledge_points',
  'submission_knowledge_points',
  // 添加其他表...
]

async function importTable(tableName: string) {
  console.log(`Importing table ${tableName}...`)
  
  const dataPath = path.join(__dirname, 'exported-data', `${tableName}.json`)
  if (!fs.existsSync(dataPath)) {
    console.log(`No data file for ${tableName}`)
    return false
  }
  
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  if (!data || data.length === 0) {
    console.log(`No data to import for ${tableName}`)
    return true
  }
  
  // 构建插入语句
  const columns = Object.keys(data[0])
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
  
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    
    for (const row of data) {
      const values = columns.map(col => row[col])
      const query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
      `
      await client.query(query, values)
    }
    
    await client.query('COMMIT')
    console.log(`Imported ${data.length} rows into ${tableName}`)
    return true
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(`Error importing ${tableName}:`, err)
    return false
  } finally {
    client.release()
  }
}

async function importAllData() {
  // 按依赖顺序导入
  for (const table of TABLES) {
    await importTable(table)
  }
  console.log('Import completed')
}

importAllData()
```

## 3. 双写阶段

### 3.1 修改服务层实现双写

创建或修改服务层，实现双写模式：

```typescript
// 修改knowledgePointService.ts实现双写
import { supabase } from '@/integrations/supabase/client';
import { selfHostedClient } from '@/integrations/selfHosted/client';
import { KnowledgePoint } from '@/types/homework';

/**
 * 创建新知识点 - 双写模式
 */
export async function createKnowledgePoint(knowledgePoint: {
  name: string;
  description?: string;
  homework_id: string;
}) {
  try {
    // 写入Supabase
    const { data: supabaseData, error: supabaseError } = await supabase
      .from('knowledge_points')
      .insert(knowledgePoint)
      .select()
      .single();
    
    if (supabaseError) {
      console.error('Supabase创建知识点失败:', supabaseError);
      return { data: null, success: false, message: supabaseError.message };
    }
    
    // 写入自建服务器（忽略错误，确保主数据源成功）
    try {
      await selfHostedClient.post('/api/knowledge-points', knowledgePoint);
    } catch (selfHostedError) {
      // 记录错误但不影响返回结果
      console.warn('自建服务器创建知识点失败:', selfHostedError);
    }
    
    return { data: supabaseData, success: true, message: '知识点创建成功' };
  } catch (error) {
    console.error('创建知识点异常:', error);
    return { data: null, success: false, message: error.message };
  }
}
```

### 3.2 创建数据同步服务

创建一个定时任务，确保两个数据源保持同步：

```typescript
// 创建 sync-service.ts
import { supabase } from './supabase-client'
import { selfHostedDb } from './self-hosted-db'
import { tables } from './tables-config'

// 运行同步作业
async function syncData() {
  console.log('Starting sync job at', new Date().toISOString())
  
  for (const table of tables) {
    await syncTable(table)
  }
  
  console.log('Sync completed at', new Date().toISOString())
}

// 同步单个表
async function syncTable(tableName) {
  console.log(`Syncing table ${tableName}...`)
  
  try {
    // 获取上次同步时间戳
    const lastSync = await getLastSyncTimestamp(tableName)
    
    // 从Supabase获取新数据
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .gt('updated_at', lastSync)
    
    if (error) {
      throw error
    }
    
    if (!data || data.length === 0) {
      console.log(`No new data in ${tableName}`)
      return
    }
    
    // 更新自建服务器
    await selfHostedDb.transaction(async (trx) => {
      for (const row of data) {
        await trx(tableName)
          .insert(row)
          .onConflict('id')
          .merge()
      }
    })
    
    // 更新同步时间戳
    await updateSyncTimestamp(tableName)
    
    console.log(`Synced ${data.length} rows from ${tableName}`)
  } catch (err) {
    console.error(`Error syncing ${tableName}:`, err)
  }
}

// 启动定时同步
setInterval(syncData, 15 * 60 * 1000) // 每15分钟
syncData() // 立即执行一次
```

## 4. 读取迁移阶段

### 4.1 创建读取策略

```typescript
// 创建 data-source-manager.ts
import { supabase } from './supabase-client'
import { selfHostedDb } from './self-hosted-db'

// 读取策略：逐步迁移到自建服务器
let readPercentage = 0 // 初始值0%从自建服务器读取

// 每周增加25%的自建服务器读取比例
function incrementReadPercentage() {
  if (readPercentage < 100) {
    readPercentage += 25
    console.log(`读取策略更新: ${readPercentage}% 从自建服务器读取`)
  }
}

// 启动定时器，每周增加一次
setInterval(incrementReadPercentage, 7 * 24 * 60 * 60 * 1000)

// 决定从哪个数据源读取
export function shouldReadFromSelfHosted() {
  // 随机决定
  return Math.random() * 100 < readPercentage
}

// 统一数据读取接口
export async function readData(tableName, query) {
  if (shouldReadFromSelfHosted()) {
    try {
      // 从自建服务器读取
      const result = await selfHostedDb(tableName).where(query)
      // 记录成功次数
      trackSuccess('selfHosted', tableName)
      return { data: result, error: null }
    } catch (error) {
      // 记录失败次数
      trackError('selfHosted', tableName, error)
      // 失败时回退到Supabase
      console.log(`自建服务器读取失败，回退到Supabase: ${error.message}`)
      return readFromSupabase(tableName, query)
    }
  } else {
    return readFromSupabase(tableName, query)
  }
}

// 从Supabase读取
async function readFromSupabase(tableName, query) {
  try {
    const result = await supabase.from(tableName).select().match(query)
    trackSuccess('supabase', tableName)
    return result
  } catch (error) {
    trackError('supabase', tableName, error)
    return { data: null, error }
  }
}

// 追踪成功/失败次数用于监控
function trackSuccess(source, tableName) {
  // 实现监控指标记录
}

function trackError(source, tableName, error) {
  // 实现错误监控记录
}
```

## 5. 完全切换阶段

### 5.1 切换检查清单

在完全切换前，确保：

- [ ] 自建服务器稳定运行超过1个月
- [ ] 数据完全同步，无差异
- [ ] 所有API端点在自建服务器上可用
- [ ] 自建服务器性能经过测试和优化
- [ ] 备份策略已经实施
- [ ] 监控系统已经部署
- [ ] 回滚计划已准备就绪

### 5.2 执行切换

1. 设置维护窗口
2. 停止应用服务
3. 执行最终数据同步
4. 更新应用配置，指向自建服务器
5. 启动应用服务
6. 验证功能正常

### 5.3 监控和支持

切换后持续监控：

- 系统性能
- 错误率
- 数据一致性
- 用户反馈

保持Supabase账户活跃一段时间，以便在需要时可以回滚。

## 故障排除

### 数据不一致问题

如果发现数据不一致：

1. 使用比较工具识别差异
2. 分析差异原因
3. 执行定向同步修复差异

```bash
# 示例：比较两个数据源的表数据
node compare-tables.js --table=knowledge_points
```

### 性能问题

如果遇到性能下降：

1. 检查数据库索引
2. 优化查询
3. 考虑添加缓存层
4. 查看数据库连接池配置

### 回滚程序

如需回滚到Supabase：

1. 更新应用配置，指回Supabase
2. 重启应用服务
3. 验证功能恢复

## 结束语

渐进式迁移策略可以最大限度地降低风险，但需要更长的迁移周期。通过精心规划和监控，可以确保平稳过渡到自建基础设施。 