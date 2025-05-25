# 学生画像系统 - Notion集成工具

这个工具用于将学生画像系统的项目状态同步到Notion，实现项目管理和进度跟踪功能。

## 功能特点

- 自动从项目状态文件提取项目进度数据
- 将项目进度实时更新到Notion页面
- 支持创建和更新两种模式
- 按模块和功能点细分进度数据
- 生成可视化仪表盘和任务清单
- 全中文界面，支持中文属性名称
- 健壮的错误处理和日志记录
- **新增：与Supabase数据库双向同步**

## 安装

1. 确保已安装Node.js环境
2. 在项目根目录下运行:

```bash
# 安装依赖
npm install @notionhq/client dotenv @supabase/supabase-js
```

3. 在`tools/notion-integration`目录下创建`.env`文件，并添加以下配置:

```
# Notion配置
NOTION_API_KEY=your_notion_integration_token
NOTION_PROJECT_PAGE_ID=your_notion_page_id
NOTION_DASHBOARD_ID=your_dashboard_id

# Supabase配置（可选，用于双向同步）
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

## 使用方法

### 获取Notion API密钥和页面ID

1. 前往 [Notion Integrations](https://www.notion.so/my-integrations) 创建一个新的集成
2. 复制生成的API密钥到`.env`文件的`NOTION_API_KEY`
3. 在Notion中创建一个新页面用于项目仪表盘
4. 在该页面上点击"分享"，邀请您刚创建的集成
5. 在浏览器地址栏复制页面ID (格式为`https://www.notion.so/yourworkspace/{PAGE_ID}?...`)
6. 将页面ID复制到`.env`文件的`NOTION_PROJECT_PAGE_ID`

### 创建新的项目仪表盘

运行以下命令创建新的项目仪表盘:

```bash
cd tools/notion-integration
node create-project-dashboard.js create
```

此命令将:
1. 读取`进度统计.md`文件中的项目进度数据
2. 在Notion中创建新的数据库，包含以下中文属性:
   - 模块 (标题)
   - 完成度 (数字，百分比格式)
   - 进度状态 (选择，包括"未开始"、"进行中"、"已完成")
   - 优先级 (选择，包括"高"、"中"、"低")
   - 类别 (选择，包括"核心模块"、"子功能"、"概览")
   - 父模块 (文本，用于子功能关联)
   - 剩余工作 (公式，计算1-完成度)
3. 添加项目总体、各模块和子功能数据

### 更新已有的项目仪表盘

运行以下命令更新已有的项目仪表盘:

```bash
# 方式1: 使用.env中的NOTION_DASHBOARD_ID
cd tools/notion-integration
node create-project-dashboard.js update

# 方式2: 直接在命令行指定数据库ID
cd tools/notion-integration
node create-project-dashboard.js update your_database_id
```

更新模式将:
1. 读取最新的项目进度数据
2. 更新Notion中已有数据库的条目
3. 添加新的条目，但不会删除现有条目

### Supabase数据库集成 (新功能)

本工具现在支持与Supabase数据库双向同步，将项目进度数据存储到Supabase并与Notion保持同步。

#### 设置Supabase数据库

1. 运行SQL迁移脚本创建必要的表:

```bash
cd supabase
npx supabase migration up
```

2. 导入项目模块数据到Supabase:

```bash
cd tools/notion-integration
node import-modules-to-supabase.js
```

#### 使用Edge Function进行双向同步

项目包含一个Supabase Edge Function，用于在数据更新时自动同步到Notion:

1. 部署Edge Function:

```bash
cd supabase
npx supabase functions deploy sync-notion-data
```

2. 在前端使用同步服务:

```javascript
import { syncAllModules } from '../services/notion-sync';

// 手动触发同步
const result = await syncAllModules();
if (result.success) {
  console.log('同步成功');
} else {
  console.error('同步失败:', result.error);
}
```

### 查看仪表盘

当脚本成功执行后，您可以在Notion中查看生成的仪表盘。为获得最佳效果，建议创建以下视图:

1. **看板视图** - 按"进度状态"分组查看
2. **进度条视图** - 按"完成度"排序，可视化进度
3. **表格视图** - 查看详细数据
4. **日历视图** - 按时间查看项目计划

## 自定义

### 添加新的功能模块

要添加新的功能模块进度数据:

1. 更新项目根目录下的`进度统计.md`文件
2. 用以下格式添加新的功能模块:

```markdown
## 模块名称 [完成度百分比]

- 功能1 [状态]
- 功能2 [状态]
...
```

3. 运行更新命令同步到Notion
4. 如果使用Supabase集成，还可以运行`import-modules-to-supabase.js`更新数据库

### 自定义数据库结构

如需自定义数据库结构或字段，请修改`create-project-dashboard.js`文件中的以下部分:

- `createDashboardDatabase()` 函数中的`properties`对象 - 修改数据库字段定义
- `createPropertyData()` 函数 - 修改数据如何分配到属性

## 错误处理

脚本包含全面的错误处理和日志记录功能:

- 验证数据库是否存在所需的所有属性
- 对每个操作进行单独的错误捕获，确保一个条目失败不影响整个流程
- 统计成功和失败的操作数量，便于排查问题
- 详细记录每一步操作和发生的错误

## 注意事项

- 脚本执行后会输出数据库ID，请将其添加到`.env`文件的`NOTION_DASHBOARD_ID`字段
- 每次运行创建模式时，会生成一个新的数据库（除非检测到同名数据库）
- 更新模式不会生成新数据库，仅更新已有数据库
- Notion API限制不允许直接创建复杂视图，请在Notion界面手动添加视图
- 使用Supabase集成时，需要确保数据库中已创建必要的表和函数

## 常见问题

**Q: 每次运行都会创建新的页面/数据库?**

A: 这通常是因为未正确设置`NOTION_DASHBOARD_ID`环境变量。成功创建数据库后，将输出的ID添加到`.env`文件中，并在后续使用`update`模式而非`create`模式。确保正确调用：`node create-project-dashboard.js update`。

**Q: 如何在Notion中创建不同的视图?**

A: Notion API目前只能创建数据库，但无法直接创建复杂视图。创建数据库后，您需要在Notion界面手动添加不同视图（看板、日历、进度条等）。

**Q: 同步数据会删除我在Notion中手动添加的任务吗?**

A: 在"创建"模式下会清空数据库后重新填充数据。在"更新"模式下，只会更新已有条目的进度，不会删除其他条目。

**Q: 我修改了进度统计.md文件，但Notion中数据没有更新?**

A: 您需要手动运行脚本来同步数据。修改文件后，运行`create-project-dashboard.js update`命令来更新Notion数据。

**Q: 如果脚本报错：某属性不存在怎么办?**

A: 这通常是因为Notion API中的属性名称与脚本中使用的不匹配。查看脚本输出的"数据库属性"部分，确认属性名称和ID，然后修改`requiredProperties`数组中的名称使其匹配。

**Q: Supabase与Notion的数据可以双向同步吗?**

A: 是的，使用提供的Edge Function和客户端服务可以实现双向同步。从Supabase到Notion的同步通过`syncAllModules()`函数实现，从Notion到Supabase的同步通过`updateFromNotion()`函数实现。 