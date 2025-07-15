import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useModernGradeAnalysis } from '@/contexts/ModernGradeAnalysisContext';
import { debugDatabaseData } from '@/utils/debugDatabase';

const DebugDataViewer: React.FC = () => {
  const { 
    allGradeData, 
    wideGradeData, 
    filteredGradeData, 
    examList, 
    statistics, 
    loading, 
    error,
    availableSubjects,
    availableClasses
  } = useModernGradeAnalysis();

  // 自动执行数据库检查
  useEffect(() => {
    debugDatabaseData();
  }, []);

  // 调试分析函数
  const analyzeData = () => {
    console.log('🔍 详细数据分析:');
    console.log('Raw Data:', { allGradeData: allGradeData.length, wideGradeData: wideGradeData.length });
    console.log('Filtered Data:', filteredGradeData.length);
    
    if (filteredGradeData.length > 0) {
      const subjects = [...new Set(filteredGradeData.map(r => r.subject))];
      console.log('Available Subjects:', subjects);
      
      const totalScoreRecords = filteredGradeData.filter(r => r.subject === '总分');
      console.log('Total Score Records:', totalScoreRecords.length);
      
      if (totalScoreRecords.length > 0) {
        console.log('Sample Total Score Record:', totalScoreRecords[0]);
      }
    }
    
    alert('详细分析完成，请查看控制台日志');
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-orange-500">
        <CardHeader>
          <CardTitle className="text-orange-600">🔍 数据调试面板</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-blue-50 p-3 rounded">
              <div className="font-bold text-blue-600">原始Wide数据</div>
              <div className="text-2xl font-bold">{wideGradeData.length}</div>
              <div className="text-xs text-gray-600">条记录</div>
            </div>
            
            <div className="bg-green-50 p-3 rounded">
              <div className="font-bold text-green-600">转换Long数据</div>
              <div className="text-2xl font-bold">{allGradeData.length}</div>
              <div className="text-xs text-gray-600">条记录</div>
            </div>
            
            <div className="bg-purple-50 p-3 rounded">
              <div className="font-bold text-purple-600">过滤后数据</div>
              <div className="text-2xl font-bold">{filteredGradeData.length}</div>
              <div className="text-xs text-gray-600">条记录</div>
            </div>
            
            <div className="bg-yellow-50 p-3 rounded">
              <div className="font-bold text-yellow-600">考试数量</div>
              <div className="text-2xl font-bold">{examList.length}</div>
              <div className="text-xs text-gray-600">个考试</div>
            </div>
          </div>

          {/* 状态信息 */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-4 text-sm">
              <div className={`px-2 py-1 rounded ${loading ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
                {loading ? '加载中...' : '加载完成'}
              </div>
              
              <Button 
                size="sm" 
                onClick={() => debugDatabaseData()}
                className="text-xs"
              >
                🔍 检查数据库
              </Button>
              
              <Button 
                size="sm" 
                onClick={analyzeData}
                className="text-xs"
                variant="outline"
              >
                📊 分析数据
              </Button>
              
              {error && (
                <div className="px-2 py-1 rounded bg-red-100 text-red-600">
                  错误: {error}
                </div>
              )}
            </div>
          </div>

          {/* 可用选项 */}
          <div className="border-t pt-4 space-y-2">
            <div className="text-sm">
              <span className="font-bold">可用科目 ({availableSubjects.length}):</span>
              <div className="text-xs text-gray-600 mt-1">
                {availableSubjects.join(', ') || '无'}
              </div>
            </div>
            
            <div className="text-sm">
              <span className="font-bold">可用班级 ({availableClasses.length}):</span>
              <div className="text-xs text-gray-600 mt-1">
                {availableClasses.join(', ') || '无'}
              </div>
            </div>
          </div>

          {/* 数据样本 */}
          {wideGradeData.length > 0 && (
            <div className="border-t pt-4">
              <div className="text-sm font-bold mb-2">原始数据样本:</div>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                {JSON.stringify(wideGradeData[0], null, 2)}
              </pre>
            </div>
          )}

          {allGradeData.length > 0 && (
            <div className="border-t pt-4">
              <div className="text-sm font-bold mb-2">转换后数据样本:</div>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                {JSON.stringify(allGradeData[0], null, 2)}
              </pre>
            </div>
          )}

          {/* 关键调试信息 */}
          <div className="border-t pt-4">
            <div className="text-sm font-bold mb-2">🔥 关键诊断信息:</div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div className={`p-2 rounded ${filteredGradeData.length > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <span className="font-bold">过滤后数据:</span> {filteredGradeData.length} 条
                </div>
                <div className={`p-2 rounded ${availableSubjects.includes('总分') ? 'bg-green-50' : 'bg-red-50'}`}>
                  <span className="font-bold">包含总分科目:</span> {availableSubjects.includes('总分') ? '✅' : '❌'}
                </div>
              </div>
              <div className="space-y-1">
                <div className={`p-2 rounded ${statistics ? 'bg-green-50' : 'bg-red-50'}`}>
                  <span className="font-bold">统计对象:</span> {statistics ? '✅ 存在' : '❌ 不存在'}
                </div>
                <div className="p-2 rounded bg-blue-50">
                  <span className="font-bold">总分记录:</span> {filteredGradeData.filter(r => r.subject === '总分').length} 条
                </div>
              </div>
            </div>
          </div>

          {/* 统计信息 */}
          {statistics && (
            <div className="border-t pt-4">
              <div className="text-sm font-bold mb-2">统计信息:</div>
              <div className="text-xs space-y-1">
                <div>总分统计: 平均分 {statistics.totalScoreStats.avgScore.toFixed(1)}, 学生数 {statistics.totalScoreStats.studentCount}</div>
                <div>单科统计: 平均分 {statistics.subjectScoreStats.avgScore.toFixed(1)}</div>
                <div>科目数量: {statistics.subjectStats.length}</div>
                <div>班级数量: {statistics.classStats.length}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugDataViewer; 