import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGradeAnalysis } from '@/contexts/GradeAnalysisContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DataTypeAnalysisResult {
  dataType: 'single' | 'multi' | 'mixed';
  totalRecords: number;
  subjectCount: number;
  subjects: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  completenessScore: number; // 数据完整性评分 (0-100)
  qualityAssessment: {
    hasValidScores: boolean;
    hasSubjectInfo: boolean;
    hasStudentInfo: boolean;
    hasExamInfo: boolean;
  };
}

const DataTypeAnalyzer: React.FC = () => {
  const { gradeData } = useGradeAnalysis();

  // 分析数据类型和质量
  const analysisResult: DataTypeAnalysisResult = useMemo(() => {
    if (!gradeData || gradeData.length === 0) {
      return {
        dataType: 'single',
        totalRecords: 0,
        subjectCount: 0,
        subjects: [],
        completenessScore: 0,
        qualityAssessment: {
          hasValidScores: false,
          hasSubjectInfo: false,
          hasStudentInfo: false,
          hasExamInfo: false
        }
      };
    }

    // 统计科目信息
    const subjectMap = new Map<string, number>();
    let validScoreCount = 0;
    let hasStudentInfo = 0;
    let hasExamInfo = 0;

    gradeData.forEach(item => {
      // 统计科目
      if (item.subject) {
        subjectMap.set(item.subject, (subjectMap.get(item.subject) || 0) + 1);
      }
      
      // 统计有效分数
      if (typeof item.score === 'number' && item.score >= 0 && item.score <= 100) {
        validScoreCount++;
      }
      
      // 统计学生信息完整性
      if (item.student_name || item.student_id) {
        hasStudentInfo++;
      }
      
      // 统计考试信息完整性
      if (item.exam_id || item.exam_name) {
        hasExamInfo++;
      }
    });

    // 构建科目统计数据
    const subjects = Array.from(subjectMap.entries()).map(([name, count]) => ({
      name,
      count,
      percentage: (count / gradeData.length) * 100
    })).sort((a, b) => b.count - a.count);

    // 判断数据类型
    let dataType: 'single' | 'multi' | 'mixed';
    if (subjects.length === 0) {
      dataType = 'single';
    } else if (subjects.length === 1) {
      dataType = 'single';
    } else if (subjects.length <= 5) {
      dataType = 'multi';
    } else {
      dataType = 'mixed';
    }

    // 计算数据完整性评分
    const qualityAssessment = {
      hasValidScores: validScoreCount / gradeData.length > 0.9,
      hasSubjectInfo: subjects.length > 0 && subjectMap.size > 0,
      hasStudentInfo: hasStudentInfo / gradeData.length > 0.8,
      hasExamInfo: hasExamInfo / gradeData.length > 0.8
    };

    const qualityScore = Object.values(qualityAssessment).filter(Boolean).length;
    const completenessScore = (qualityScore / 4) * 100;

    return {
      dataType,
      totalRecords: gradeData.length,
      subjectCount: subjects.length,
      subjects,
      completenessScore,
      qualityAssessment
    };
  }, [gradeData]);

  // 数据类型描述
  const getDataTypeDescription = (type: string) => {
    switch (type) {
      case 'single':
        return '单科目数据 - 适合单一学科深度分析';
      case 'multi':
        return '多科目数据 - 适合跨学科对比分析';
      case 'mixed':
        return '混合数据 - 包含多个学科，适合综合性分析';
      default:
        return '未知数据类型';
    }
  };

  // 获取完整性评级
  const getCompletenessGrade = (score: number) => {
    if (score >= 90) return { grade: '优秀', color: 'bg-green-500' };
    if (score >= 75) return { grade: '良好', color: 'bg-blue-500' };
    if (score >= 60) return { grade: '一般', color: 'bg-yellow-500' };
    return { grade: '较差', color: 'bg-red-500' };
  };

  const completenessGrade = getCompletenessGrade(analysisResult.completenessScore);

  // 科目分布数据（用于饼图）
  const subjectPieData = analysisResult.subjects.map((subject, index) => ({
    ...subject,
    fill: `hsl(${(index * 137.5) % 360}, 70%, 50%)` // 生成不同颜色
  }));

  return (
    <div className="space-y-6">
      {/* 数据类型概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            数据类型分析
            <Badge variant={analysisResult.dataType === 'multi' ? 'default' : 'secondary'}>
              {analysisResult.dataType === 'single' ? '单科' : 
               analysisResult.dataType === 'multi' ? '多科' : '混合'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{analysisResult.totalRecords}</div>
              <div className="text-sm text-blue-800">总记录数</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{analysisResult.subjectCount}</div>
              <div className="text-sm text-green-800">科目数量</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{analysisResult.completenessScore.toFixed(0)}%</div>
              <div className="text-sm text-purple-800">数据完整度</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Badge className={`${completenessGrade.color} text-white`}>
                {completenessGrade.grade}
              </Badge>
              <div className="text-sm text-orange-800 mt-1">质量评级</div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>数据类型：</strong>{getDataTypeDescription(analysisResult.dataType)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 科目分布分析 */}
      {analysisResult.subjects.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 科目分布图 */}
          <Card>
            <CardHeader>
              <CardTitle>科目分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subjectPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                    >
                      {subjectPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} 条记录`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 科目记录数统计 */}
          <Card>
            <CardHeader>
              <CardTitle>各科目记录数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysisResult.subjects}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [`${value} 条记录 (${((value as number) / analysisResult.totalRecords * 100).toFixed(1)}%)`, '记录数']}
                    />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 数据质量详情 */}
      <Card>
        <CardHeader>
          <CardTitle>数据质量评估</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${analysisResult.qualityAssessment.hasValidScores ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">有效分数数据</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${analysisResult.qualityAssessment.hasSubjectInfo ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">科目信息</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${analysisResult.qualityAssessment.hasStudentInfo ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">学生信息</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${analysisResult.qualityAssessment.hasExamInfo ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">考试信息</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataTypeAnalyzer; 