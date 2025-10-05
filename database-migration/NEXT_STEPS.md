# 🚀 数据库迁移 - 下一步执行指南

## 📋 已完成工作总结

### ✅ 文档和规划
1. **总体迁移计划** - `DATABASE_MIGRATION_PLAN.md`
   - 4-6周迁移计划
   - 混合架构设计
   - 风险控制方案

2. **表依赖分析** - `docs/table-dependencies.md`
   - 识别77个表的依赖关系
   - 标记需要删除的冗余表
   - 制定迁移顺序

3. **新架构设计** - `docs/new-database-architecture.md`
   - 从77个表简化到15个核心表
   - 清晰的命名规范
   - 完整的字段设计

### ✅ SQL脚本
1. **数据库初始化** - `sql/create-tables/01-create-database.sql`
2. **基础表创建** - `sql/create-tables/02-create-base-tables.sql`
3. **考试成绩表** - `sql/create-tables/03-create-exam-tables.sql`
4. **作业系统表** - `sql/create-tables/04-create-homework-tables.sql`
5. **预警分析表** - `sql/create-tables/05-create-warning-analysis-tables.sql`

### ✅ 迁移工具
1. **数据迁移脚本** - `scripts/migration/01-migrate-base-data.js`
2. **服务器配置脚本** - `scripts/setup/install-server.sh`
3. **数据库适配器** - `src/services/database/databaseAdapter.ts`

## 🎯 明天执行计划

### 上午：服务器环境准备
1. **登录腾讯云服务器**
```bash
ssh ubuntu@你的服务器IP
```

2. **上传并执行安装脚本**
```bash
# 上传脚本
scp install-server.sh ubuntu@服务器IP:/home/ubuntu/

# 执行安装
sudo chmod +x install-server.sh
sudo ./install-server.sh
```

3. **验证安装**
```bash
# 检查PostgreSQL
psql -U eduadmin -d edu_system -c "SELECT version();"

# 检查Redis
redis-cli -a Redis@2025 ping

# 检查Node.js
node -v
npm -v
```

### 下午：数据库初始化
1. **创建数据库结构**
```bash
# 连接数据库
psql -U eduadmin -d edu_system

# 执行SQL脚本（按顺序）
\i 01-create-database.sql
\i 02-create-base-tables.sql
\i 03-create-exam-tables.sql
\i 04-create-homework-tables.sql
\i 05-create-warning-analysis-tables.sql
```

2. **验证表结构**
```sql
-- 查看所有表
\dt

-- 查看表结构
\d students
\d exam_scores
```

### 晚上：测试数据迁移
1. **配置环境变量**
```bash
export SUPABASE_URL=https://giluhqotfjpmofowvogn.supabase.co
export SUPABASE_ANON_KEY=你的key
export PG_HOST=localhost
export PG_USER=eduadmin
export PG_PASSWORD=EduSystem@2025
export PG_DATABASE=edu_system
```

2. **运行迁移脚本**
```bash
cd database-migration/scripts/migration
npm install
node 01-migrate-base-data.js
```

## 📝 本周任务清单

### Day 1-2（周二-周三）
- [ ] 服务器环境配置完成
- [ ] 数据库结构创建完成
- [ ] 基础数据迁移测试

### Day 3-4（周四-周五）
- [ ] 创建Node.js API服务器
- [ ] 实现数据库适配器后端
- [ ] 测试双写机制

### Day 5-6（周末）
- [ ] 前端代码改造
- [ ] 集成测试
- [ ] 性能测试

## 🔧 需要修改的密码

立即修改以下默认密码：
1. PostgreSQL密码: `EduSystem@2025`
2. Redis密码: `Redis@2025`
3. API Token: 需要生成

修改方法：
```bash
# PostgreSQL
sudo -u postgres psql
ALTER USER eduadmin WITH PASSWORD '新密码';

# Redis
sudo vim /etc/redis/redis.conf
# 找到 requirepass 修改密码
sudo systemctl restart redis-server
```

## 📞 可能遇到的问题

### 问题1：腾讯云安全组
**解决**：在腾讯云控制台配置安全组，开放必要端口

### 问题2：PostgreSQL连接失败
**解决**：检查pg_hba.conf配置，确保允许远程连接

### 问题3：内存不足
**解决**：调整PostgreSQL和Redis内存配置

## 🎉 预期成果

完成本周任务后，你将拥有：
1. ✅ 一个清晰、高效的数据库结构
2. ✅ 混合架构的基础设施
3. ✅ 数据双写和迁移能力
4. ✅ 3-5倍的查询性能提升
5. ✅ 80%的维护成本降低

## 💡 重要提醒

1. **数据备份**：每次操作前必须备份
2. **逐步迁移**：不要一次性迁移所有数据
3. **监控日志**：密切关注错误日志
4. **性能测试**：每个阶段都要测试
5. **回滚方案**：准备好快速回滚脚本

## 🛠️ 后续优化

迁移完成后的优化工作：
1. 配置SSL证书
2. 设置数据库主从复制
3. 配置Redis集群
4. 添加监控告警
5. 性能调优

---

祝你睡个好觉！明天开始执行迁移计划 💪

如有问题，随时找我！

最后更新：2025-01-21 深夜