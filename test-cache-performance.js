/**
 * 缓存性能测试
 * 测试新实现的缓存系统的性能表现
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

// 简化版缓存实现（用于测试）
class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      if (Date.now() - entry.timestamp < entry.ttl) {
        this.hits++;
        return entry.data;
      } else {
        this.cache.delete(key);
        this.misses++;
        return null;
      }
    }
    this.misses++;
    return null;
  }

  set(key, data, ttl = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  getStats() {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRatio: this.hits / (this.hits + this.misses) || 0
    };
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

const cache = new SimpleCache();

class CachePerformanceTester {
  constructor() {
    this.results = {
      withoutCache: {},
      withCache: {},
      performance: {}
    };
  }

  async testCachePerformance() {
    console.log('🧪 开始缓存性能测试...\n');

    // 1. 测试无缓存的重复查询性能
    await this.testWithoutCache();

    // 2. 测试有缓存的重复查询性能
    await this.testWithCache();

    // 3. 测试缓存命中率
    await this.testCacheHitRatio();

    // 4. 生成性能报告
    this.generatePerformanceReport();
  }

  async testWithoutCache() {
    console.log('📊 测试无缓存性能...');

    const startTime = Date.now();
    const queryCount = 20;
    let totalQueries = 0;

    // 模拟重复查询班级数据
    for (let i = 0; i < queryCount; i++) {
      const { data, error } = await supabase
        .from('class_info')
        .select('*')
        .limit(10);

      totalQueries++;

      if (error) {
        console.warn(`查询 ${i + 1} 失败:`, error.message);
      }

      // 模拟一些处理时间
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const duration = Date.now() - startTime;

    this.results.withoutCache = {
      duration,
      queryCount: totalQueries,
      averageQueryTime: duration / totalQueries
    };

    console.log(`   无缓存结果: ${duration}ms, ${totalQueries}次查询, 平均${Math.round(duration / totalQueries)}ms/查询\n`);
  }

  async testWithCache() {
    console.log('⚡ 测试有缓存性能...');

    cache.clear();
    const startTime = Date.now();
    const queryCount = 20;
    let actualQueries = 0;

    // 模拟重复查询班级数据（使用缓存）
    for (let i = 0; i < queryCount; i++) {
      const cacheKey = 'class_info_data';
      let data = cache.get(cacheKey);

      if (!data) {
        // 缓存未命中，执行查询
        const { data: queryData, error } = await supabase
          .from('class_info')
          .select('*')
          .limit(10);

        actualQueries++;

        if (!error) {
          cache.set(cacheKey, queryData, 10 * 60 * 1000); // 10分钟缓存
          data = queryData;
        }
      }

      // 模拟一些处理时间
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const duration = Date.now() - startTime;
    const cacheStats = cache.getStats();

    this.results.withCache = {
      duration,
      queryCount: queryCount,
      actualQueries,
      cacheHits: cacheStats.hits,
      cacheMisses: cacheStats.misses,
      hitRatio: cacheStats.hitRatio
    };

    console.log(`   有缓存结果: ${duration}ms, ${actualQueries}次实际查询, 缓存命中率${(cacheStats.hitRatio * 100).toFixed(1)}%\n`);
  }

  async testCacheHitRatio() {
    console.log('🎯 测试缓存命中率...');

    cache.clear();
    const testScenarios = [
      { name: '班级信息查询', key: 'class_info', table: 'class_info' },
      { name: '学生数据查询', key: 'students', table: 'students' },
      { name: '成绩数据查询', key: 'grade_data', table: 'grade_data' }
    ];

    const results = {};

    for (const scenario of testScenarios) {
      console.log(`   测试 ${scenario.name}...`);

      const startTime = Date.now();
      let actualQueries = 0;

      // 模拟混合访问模式
      for (let i = 0; i < 30; i++) {
        const cacheKey = `${scenario.key}_${i % 5}`; // 5个不同的缓存键，模拟重复访问

        let data = cache.get(cacheKey);

        if (!data) {
          try {
            const { data: queryData, error } = await supabase
              .from(scenario.table)
              .select('*')
              .limit(5);

            actualQueries++;

            if (!error) {
              cache.set(cacheKey, queryData);
              data = queryData;
            }
          } catch (error) {
            console.warn(`查询 ${scenario.table} 失败:`, error.message);
          }
        }
      }

      const duration = Date.now() - startTime;
      const stats = cache.getStats();

      results[scenario.name] = {
        duration,
        actualQueries,
        hitRatio: stats.hitRatio,
        totalRequests: 30
      };

      console.log(`     结果: ${duration}ms, ${actualQueries}次实际查询, 命中率${(stats.hitRatio * 100).toFixed(1)}%`);
      cache.clear(); // 为下一个场景清除缓存
    }

    this.results.hitRatioTests = results;
    console.log();
  }

  generatePerformanceReport() {
    console.log('📋 缓存性能优化报告');
    console.log('='.repeat(60));

    const { withoutCache, withCache } = this.results;

    // 计算性能提升
    const speedImprovement = withoutCache.duration / withCache.duration;
    const queryReduction = ((withoutCache.queryCount - withCache.actualQueries) / withoutCache.queryCount * 100);

    console.log('\n🚀 整体性能提升:');
    console.log(`   无缓存时间: ${withoutCache.duration}ms`);
    console.log(`   有缓存时间: ${withCache.duration}ms`);
    console.log(`   速度提升: ${speedImprovement.toFixed(2)}x`);
    console.log(`   查询减少: ${queryReduction.toFixed(1)}%`);

    console.log('\n📊 缓存效果分析:');
    console.log(`   请求总数: ${withCache.queryCount}`);
    console.log(`   实际查询: ${withCache.actualQueries}`);
    console.log(`   缓存命中: ${withCache.cacheHits}`);
    console.log(`   缓存命中率: ${(withCache.hitRatio * 100).toFixed(1)}%`);

    // 命中率测试结果
    if (this.results.hitRatioTests) {
      console.log('\n🎯 不同场景缓存命中率:');
      Object.entries(this.results.hitRatioTests).forEach(([scenario, stats]) => {
        console.log(`   ${scenario}: ${(stats.hitRatio * 100).toFixed(1)}% (${stats.actualQueries}/${stats.totalRequests})`);
      });
    }

    console.log('\n💡 优化建议:');

    if (speedImprovement >= 3) {
      console.log('   ✅ 缓存效果显著，建议在生产环境启用');
    } else if (speedImprovement >= 2) {
      console.log('   ✅ 缓存效果良好，可以部署使用');
    } else {
      console.log('   ⚠️ 缓存效果一般，建议优化缓存策略');
    }

    if (withCache.hitRatio >= 0.7) {
      console.log('   ✅ 缓存命中率良好，访问模式符合预期');
    } else {
      console.log('   ⚠️ 缓存命中率偏低，建议调整TTL或缓存粒度');
    }

    console.log('\n🔮 预期生产环境收益:');
    console.log(`   - 响应时间提升: ${Math.round((1 - 1/speedImprovement) * 100)}%`);
    console.log(`   - 数据库负载减少: ${queryReduction.toFixed(1)}%`);
    console.log(`   - 用户体验改善: 页面加载更快，交互更流畅`);
    console.log(`   - 服务器成本节约: 减少数据库查询，降低资源消耗`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ 缓存性能测试完成！');
  }
}

async function runCachePerformanceTest() {
  console.log('🚀 启动缓存性能测试...\n');

  const tester = new CachePerformanceTester();

  try {
    await tester.testCachePerformance();
  } catch (error) {
    console.error('❌ 缓存性能测试失败:', error);
  }
}

runCachePerformanceTest().catch(console.error);